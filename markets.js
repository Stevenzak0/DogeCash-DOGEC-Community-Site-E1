
/* markets.js — live markets table (modularized) */
import { q, renderMarketRows, setStatus, getJSON } from './utils.js';

const base='https://api.coingecko.com/api/v3', id='dogecash';
let marketsInterval;
let isPolling = false;

function ensureStakeCubeRows(tbody){
  const urlBTC = "https://stakecube.net/app/exchange/dogec_btc";
  const hasRow = Array.from(tbody.querySelectorAll('tr')).some(tr => tr.textContent.toLowerCase().includes('stakecube'));
  if (!hasRow) {
    const tr = document.createElement('tr');
    {
    const td1=document.createElement('td'); td1.textContent='StakeCube';
    const td2=document.createElement('td'); td2.textContent='DOGEC/BTC';
    const td3=document.createElement('td'); td3.textContent='—';
    const td4=document.createElement('td'); td4.textContent='—';
    const td5=document.createElement('td'); const span=document.createElement('span'); span.className='trust-badge'; td5.appendChild(span);
    const td6=document.createElement('td'); const a=document.createElement('a'); a.href=urlBTC; a.target='_blank'; a.rel='noopener noreferrer'; a.referrerPolicy='no-referrer'; a.textContent='Trade'; td6.appendChild(a);
    tr.append(td1,td2,td3,td4,td5,td6);
}

    tbody.appendChild(tr);
  }
}

export async function loadMarkets(){
  if (document.hidden || !navigator.onLine) return;
  const tbody=q('#marketsTable tbody'); if(!tbody) return;
  const note=q('#marketsNote');
  tbody.setAttribute('aria-busy','true');
  try {
    const res = await getJSON(`${base}/coins/${id}/tickers?include_exchange_logo=true`, { ttlMs: 120_000, retries: 2 });
    const tickers = (res && Array.isArray(res.tickers)) ? res.tickers : [];
    const rows = tickers
      .filter(t => ['BTC','USDT','USD'].includes(t.target))
      .map(t => {
        const ex=t.market?.name||'—';
        const pair=`${t.base}/${t.target}`;
        const price = t.converted_last?.usd ?? (t.last ?? null);
        const spread=t.bid_ask_spread_percentage;
        const trust=t.trust_score||'';
        const url=t.trade_url || t.url || '#';
        return {ex,pair,price,spread,trust,url};
      })
      .filter((r, i, a) => a.findIndex(x => x.ex===r.ex && x.pair===r.pair) === i)
      .slice(0,25);

    if(!rows.length){
      while(tbody.firstChild) tbody.removeChild(tbody.firstChild);
      const tr = document.createElement('tr');
      {
    const td=document.createElement('td');
    td.colSpan=6; td.className='muted'; td.textContent='No live markets available right now.';
    tr.appendChild(td);
}

      tbody.appendChild(tr);
      setStatus('marketsStatus','No markets returned by API. Added StakeCube fallback row.');
    } else {
      renderMarketRows(tbody, rows);
      setStatus('marketsStatus','Live markets loaded.');
    }
    if (note) note.textContent = 'Data via CoinGecko tickers. Always verify liquidity, spreads, and official communities before trading.';
  } catch (e) {
    setStatus('marketsStatus','Unable to fetch market data. Please try again.', true);
    console.warn('Markets error:', e);
  } finally {
    tbody.setAttribute('aria-busy','false');
    try { ensureStakeCubeRows(tbody); } catch(e){ console.warn(e); }
  }
}

export function startMarketsPolling(){
  if (isPolling) return;
  stopMarketsPolling();
  loadMarkets();
  const marketMs = 600000; // 10 min
  marketsInterval = setInterval(loadMarkets, marketMs);
  isPolling = true;
}
export function stopMarketsPolling(){
  if (marketsInterval) { clearInterval(marketsInterval); marketsInterval = null; }
  isPolling = false;
}
