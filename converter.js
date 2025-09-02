
/* converter.js — conversion widget logic (modularized) */
import { q, setStatus, validatePriceData } from './utils.js';

const COIN_IDS = { dogec: 'dogecash', btc: 'bitcoin', eth: 'ethereum', ltc: 'litecoin' };
const DEFAULTS = { crypto: 'dogec', fiat: 'usd' };
const baseApi = 'https://api.coingecko.com/api/v3';

async function getJ(url){
  const ac = new AbortController();
  const to = setTimeout(()=>ac.abort(), 12000);
  const r = await fetch(url, { cache:'no-store', signal: ac.signal, mode:'cors', credentials:'omit' });
  clearTimeout(to);
  if (!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}

export function setupConverter(){
  const selCrypto = q('#cryptoSelect');
  const selFiat = q('#fiatSelect');
  const inCrypto = q('#cryptoAmount');
  const inFiat = q('#fiatAmount');
  const btnRefresh = q('#refreshPrice');
  const statusEl = q('#convertStatus');

  if (!selCrypto || !selFiat || !inCrypto || !inFiat) return;

  let price = NaN;

  function tooLongDigits(s){ return (String(s||'').replace(/\D/g,'').length > 32); }
  let lastEdit = 'crypto';

  function setSuffixes(){
    const cryptoCode = (selCrypto.value || DEFAULTS.crypto).toUpperCase();
    const fiatCode = (selFiat.value || DEFAULTS.fiat).toUpperCase();
    const wrapCrypto = selCrypto.closest('.input-wrap');
    const wrapFiat = selFiat.closest('.input-wrap');
    if (wrapCrypto) wrapCrypto.setAttribute('data-suffix', cryptoCode);
    if (wrapFiat) wrapFiat.setAttribute('data-suffix', fiatCode);
  }

  async function fetchPrice(){
    const c = (selCrypto.value || DEFAULTS.crypto).toLowerCase();
    const f = (selFiat.value || DEFAULTS.fiat).toLowerCase();
    const id = COIN_IDS[c] || COIN_IDS[DEFAULTS.crypto];

    let attempts = 0;
    while (attempts < 3) {
      try {
        setStatus('convertStatus', 'Fetching price…');
        const data = await getJ(`${baseApi}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=${encodeURIComponent(f)}`);
        price = Number(data?.[id]?.[f]);
        validatePriceData({ price, change: 0 });
        setStatus('convertStatus', '');
        recalc();
        return;
      } catch (e) {
        attempts++;
        if (attempts < 3) {
          setStatus('convertStatus', 'Retrying fetch…');
          await new Promise(r => setTimeout(r, 1500));
        } else {
          setStatus('convertStatus', 'Unable to fetch current prices. Please try again.', true);
        }
      }
    }
  }

  function recalc(){
    if (!isFinite(price)) return;
    if (lastEdit === 'crypto') {
      const raw = inCrypto.value; if (tooLongDigits(raw)) { setStatus('convertStatus','Input too long',true); return; } const v = parseFloat(raw); if (isFinite(v)) {
        const out = v * price;
        inFiat.value = out === 0 ? '' : (Math.round(out * 100) / 100).toString();
      }
    } else {
      const raw2 = inFiat.value; if (tooLongDigits(raw2)) { setStatus('convertStatus','Input too long',true); return; } const v = parseFloat(raw2); if (isFinite(v)) {
        const out = v / price;
        inCrypto.value = out === 0 ? '' : (Math.round(out * 1e8) / 1e8).toString();
      }
    }
  }

  selCrypto.addEventListener('change', () => { lastEdit = 'crypto'; setSuffixes(); fetchPrice(); });
  selFiat.addEventListener('change', () => { lastEdit = 'fiat'; setSuffixes(); fetchPrice(); });
  inCrypto.addEventListener('input', () => { lastEdit = 'crypto'; recalc(); });
  inFiat.addEventListener('input', () => { lastEdit = 'fiat'; recalc(); });
  if (btnRefresh) btnRefresh.addEventListener('click', fetchPrice);

  if (!selCrypto.value) selCrypto.value = DEFAULTS.crypto;
  if (!selFiat.value) selFiat.value = DEFAULTS.fiat;
  setSuffixes();
  fetchPrice();
}
