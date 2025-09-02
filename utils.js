
/* utils.js — shared helpers (extracted & modularized from the enterprise build) */
export const q = (sel, root=document) => root.querySelector(sel);
export const qa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

export function escText(t){ return (t==null?'':String(t)).replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

export function safeURL(u){
  try { const uu = new URL(u, location.href); if(!/^https?:$/.test(uu.protocol)) return '#'; return uu.href; } catch { return '#'; }
}


export function constantTimeEquals(a, b){
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i=0;i<a.length;i++){ res |= a.charCodeAt(i) ^ b.charCodeAt(i); }
  return res === 0;
}
export function setStatus(id, msg, bad=false){
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('bad', !!bad);
  el.setAttribute('role', bad ? 'alert' : 'status');
}

export async function getJSON(url, { ttlMs = 60000, key = url, retries = 1, backoffMs = 800 } = {}){
  const now = Date.now();
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (cached && (now - cached.t) < ttlMs) {
      try {
        const enc = new TextEncoder().encode(JSON.stringify(cached.v));
        const d = await crypto.subtle.digest('SHA-256', enc);
        const h2 = Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,'0')).join('');
        if (constantTimeEquals(h2, cached.h || '')) return cached.v;
      } catch {}
    }
  } catch {}

  let lastErr = null;
  for (let attempt=0; attempt<=retries; attempt++){
    const ac = new AbortController();
    const to = setTimeout(()=>ac.abort(), 12000);
    try{
      const r = await fetch(url, { cache:'no-store', signal: ac.signal, mode:'cors', credentials:'omit' });
      if (!r.ok) throw new Error('HTTP '+r.status);
      const ct = (r.headers.get('content-type')||'').toLowerCase();
      if (!ct.includes('application/json')) throw new Error('Invalid content-type');
      const v = await r.json();
      try { try {
        const enc = new TextEncoder().encode(JSON.stringify(v));
        const d = await crypto.subtle.digest('SHA-256', enc);
        const h = Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,'0')).join('');
        sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v, h }));
      } catch {} } catch {}
      clearTimeout(to);
      return v;
    }catch(e){
      lastErr = e;
      await new Promise(res=>setTimeout(res, backoffMs*(attempt+1)));
    }
  }
  // last resort: return stale cache if present
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (cached) {
      try {
        const enc = new TextEncoder().encode(JSON.stringify(cached.v));
        const d = await crypto.subtle.digest('SHA-256', enc);
        const h2 = Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,'0')).join('');
        if (constantTimeEquals(h2, cached.h || '')) return cached.v;
      } catch {}
    }
  } catch {}
  throw lastErr || new Error('Request failed');
}

export function validatePriceData({ price, change }){
  const okPrice = typeof price === 'number' && isFinite(price) && price > 0 && price < 1_000_000;
  const okChange = change == null || (typeof change === 'number' && isFinite(change) && Math.abs(change) < 1000);
  if (!okPrice) throw new Error('Invalid price: '+price);
  if (!okChange) throw new Error('Invalid change: '+change);
  return true;
}

export function trustBadgeNode(score){
  const s = (score||'').toLowerCase();
  const span = document.createElement('span');
  span.className = 'trust-badge ' + (s || '');
  span.textContent = score ? s : '—';
  return span;
}

export function renderMarketRows(tbody, rows){
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  rows.forEach(r => {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.setAttribute('role','rowheader'); td1.textContent = r.ex || '—';
    const td2 = document.createElement('td'); td2.textContent = r.pair || '—';
    const td3 = document.createElement('td'); td3.textContent = (r.price!=null && Number.isFinite(Number(r.price)))?('$'+Number(r.price).toFixed(8)):'—';
    const td4 = document.createElement('td'); td4.textContent = (r.spread!=null && Number.isFinite(Number(r.spread)))?Number(r.spread).toFixed(2)+'%':'—';
    const td5 = document.createElement('td'); td5.appendChild(trustBadgeNode(r.trust));
    const td6 = document.createElement('td'); const a=document.createElement('a'); a.href=safeURL(r.url||'#'); a.target='_blank'; a.rel='noopener noreferrer'; a.referrerPolicy='no-referrer'; a.textContent='Trade'; td6.appendChild(a);
    tr.append(td1,td2,td3,td4,td5,td6);
    tbody.appendChild(tr);
  });
}

export const fmtUSD = (n, {maxFrac=4}={}) => (n==null ? '—' : new Intl.NumberFormat(undefined, { style:'currency', currency:'USD', maximumFractionDigits:maxFrac }).format(n));
export const fmtNum = (n, {maxFrac=2}={}) => (n==null ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits:maxFrac }).format(n));
