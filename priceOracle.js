import fetch from 'node-fetch';

const SUPPORTED = { dogec: 'dogecash', btc:'bitcoin', eth:'ethereum', ltc:'litecoin' };
const FIATS = new Set(['usd','eur','gbp','cad','aud']);

const WEIGHTS = { coingecko: 0.3, cmc: 0.3, binance: 0.2, kraken: 0.2 };

const __cache = new Map();
function __ck(symbol, fiat){ return (String(symbol||'').toLowerCase().trim()+':'+String(fiat||'').toLowerCase().trim()); }


function within(x, lo, hi){ return typeof x==='number' && isFinite(x) && x>=lo && x<=hi; }
function median(arr){ const a=[...arr].sort((a,b)=>a-b); const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
function stddev(arr){ const m=median(arr); const v=arr.reduce((s,x)=>s+(x-m)*(x-m),0)/arr.length; return Math.sqrt(v); }

async function fetchJSON(url, options={}){
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), options.timeout||6000);
  const r = await fetch(url, { signal: controller.signal, headers: options.headers||{} });
  clearTimeout(timeout);
  if(!r.ok) throw new Error('HTTP '+r.status);
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  if ((ct.split(';')[0]||'').trim() !== 'application/json') throw new Error('Invalid content-type');
  return r.json();
}

async function fromCoinGecko(id, fiat){
  const d = await fetchJSON(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
  const md=d.market_data||{};
  return {
    source:'coingecko',
    price: Number(md.current_price?.[fiat]),
    changePct24h: Number(md.price_change_percentage_24h),
    marketCap: Number(md.market_cap?.[fiat]),
    volume24h: Number(md.total_volume?.[fiat]),
    circulating: Number(md.circulating_supply),
    timestamp: new Date().toISOString()
  };
}

async function fromCMC(id, fiat){
  const key = process.env.COINMARKETCAP_API_KEY||'';
  if(!key) throw new Error('no cmc key');
  const map = { dogecash: 'DOGEC', bitcoin:'BTC', ethereum:'ETH', litecoin:'LTC' };
  const sym = map[id];
  const d = await fetchJSON(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${sym}&convert=${fiat}`, { timeout:6000, headers: { 'X-CMC_PRO_API_KEY': key } });
  const q = d?.data?.[sym]?.[0]?.quote?.[fiat.toUpperCase()];
  return { source:'cmc', price: Number(q?.price), changePct24h: Number(q?.percent_change_24h), marketCap: Number(q?.market_cap), volume24h: Number(q?.volume_24h), circulating: Number(d?.data?.[sym]?.[0]?.circulating_supply), timestamp: new Date().toISOString() };
}

async function fromBinance(sym, fiat){
  const mapFiat = { usd:'USDT', eur:'EUR', gbp:'GBP', cad:'USDT', aud:'USDT' };
  const quote = mapFiat[fiat]||'USDT';
  const p = (sym.toUpperCase()+quote).toUpperCase();
  const d = await fetchJSON(`https://api.binance.com/api/v3/ticker/price?symbol=${p}`);
  return { source:'binance', price: Number(d?.price), timestamp: new Date().toISOString() };
}

async function fromKraken(sym, fiat){
  const map = { btc:'XBT', eth:'ETH', ltc:'LTC', dogec:'DOGEC' };
  const base = map[sym]||sym.toUpperCase();
  const quote = fiat.toUpperCase()==='USD'?'USD': (fiat.toUpperCase());
  const d = await fetchJSON(`https://api.kraken.com/0/public/Ticker?pair=${base}${quote}`);
  const key = Object.keys(d?.result||{})[0];
  const price = Number(d?.result?.[key]?.c?.[0]);
  if(!isFinite(price)) throw new Error('pair not found');
  return { source:'kraken', price, timestamp: new Date().toISOString() };
}

export async function getMarketSnapshot(symbol, fiat='usd'){
  fiat = String(fiat||'usd').toLowerCase();
  const sym = String(symbol||'dogec').toLowerCase();
  if(!FIATS.has(fiat)) throw new Error('Unsupported fiat');
  const id = SUPPORTED[sym]; if(!id) throw new Error('Unsupported symbol');

  const results = (await Promise.all([
    fromCoinGecko(id, fiat).catch(()=>null),
    fromCMC(id, fiat).catch(()=>null),
    (sym!=='dogec'?fromBinance(sym, fiat).catch(()=>null):Promise.resolve(null)),
    (['btc','eth','ltc'].includes(sym)?fromKraken(sym, fiat).catch(()=>null):Promise.resolve(null))
  ])).filter(Boolean);

  const prices = results.map(r=>r.price).filter(x=>within(x, 1e-7, 1_000_000));
  if(prices.length<2) throw new Error('Insufficient sources');

  const med = median(prices);
  const sd = stddev(prices);
  const cleaned = results.filter(r => within(r.price, med-2*sd, med+2*sd));

  const totalW = cleaned.reduce((s,r)=>s+(WEIGHTS[r.source]||0.1),0) || 1;
  const wavg = cleaned.reduce((s,r)=> s + r.price*(WEIGHTS[r.source]||0.1), 0) / totalW;

  const cg = cleaned.find(r=>r.source==='coingecko');
  const payload = {
    symbol: sym,
    fiat,
    price: wavg,
    changePct24h: cg?.changePct24h ?? null,
    marketCap: cg?.marketCap ?? null,
    volume24h: cg?.volume24h ?? null,
    circulating: cg?.circulating ?? null,
    confidence: cleaned.length / 4,
    timestamp: new Date().toISOString(),
    sources: cleaned.map(r=>r.source)
  };
  if(!within(payload.price, 1e-7, 1_000_000)) throw new Error('Invalid final price');
  return payload;
}

export async function getVerifiedPrice(symbol, fiat='usd'){ 
  const key = __ck(symbol, fiat);
  try{
    const s = await getMarketSnapshot(symbol, fiat);
    __cache.set(key, { ...s, __t: Date.now() });
    return { symbol:s.symbol, fiat:s.fiat, price:s.price, confidence:s.confidence, timestamp:s.timestamp, sources:s.sources };
  } catch (e){
    const c = __cache.get(key);
    if (c && (Date.now() - c.__t) < 3600000){
      return { symbol:c.symbol, fiat:c.fiat, price:c.price, confidence:c.confidence, timestamp:c.timestamp, sources:c.sources, stale:true };
    }
    throw e;
  }
}
