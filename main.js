
/* main.js — app bootstrap (modularized) */
import { q, qa, setStatus, getJSON, fmtUSD, fmtNum, validatePriceData } from './utils.js';
import { setupConverter } from './converter.js';
import { startMarketsPolling, stopMarketsPolling, loadMarkets } from './markets.js';

const VERSION = '5.5.1';
const base='https://api.coingecko.com/api/v3', id='dogecash';

function applyTheme(mode){
  const root = document.documentElement;
  root.classList.remove('light','dark');
  root.classList.add(mode);
  const cb = q('#themeToggle');
  if (cb) {
    const isLight = mode === 'light';
    cb.checked = isLight;
    cb.setAttribute('aria-checked', String(isLight));
    cb.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
  }
}

function initTheme(){
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  const savedTheme = localStorage.getItem('dogec-theme') || '';
  applyTheme(savedTheme || (prefersLight ? 'light' : 'dark'));
  q('#themeToggle')?.addEventListener('change', e => {
    const mode = e.target.checked ? 'light' : 'dark';
    localStorage.setItem('dogec-theme', mode); applyTheme(mode);
  });
}

function initTabs(){
  function setActiveTab(btn) {
    const id = btn.dataset.tab;
    const panel = q('#'+id);
    qa('#learn .tabbtn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); b.setAttribute('tabindex','-1'); });
    qa('#learn .panel').forEach(p => { p.classList.remove('active'); p.setAttribute('tabindex','-1'); p.setAttribute('aria-hidden','true'); });
    btn.classList.add('active'); btn.setAttribute('aria-selected','true'); btn.setAttribute('tabindex','0');
    if (panel) { panel.classList.add('active'); panel.setAttribute('tabindex','0'); panel.setAttribute('aria-hidden','false'); }
    const live = q('#liveTabs'); if (live) live.textContent = (btn.textContent || 'Tab').trim() + ' tab selected.';
  }
  const tabs = qa('#learn .tabbtn');
  const activeBtn = q('#learn .tabbtn.active') || tabs[0];
  if (activeBtn) setActiveTab(activeBtn);
  tabs.forEach((btn, idx) => {
    btn.addEventListener('click', () => setActiveTab(btn));
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); tabs[(idx+1)%tabs.length].click(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); tabs[(idx-1+tabs.length)%tabs.length].click(); }
      else if (e.key === 'Home') { e.preventDefault(); tabs[0].click(); }
      else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].click(); }
    });
  });
}

function initDownloadAutodetect(){
  const releaseTagUrl = `https://github.com/dogecash/dogecash/releases/tag/${VERSION}`;
  const releaseBase = `https://github.com/dogecash/dogecash/releases/download/${VERSION}/`;
  const assets = {
    win: `dogecash-${VERSION}-win64.zip`,
    macIntel: `dogecash-${VERSION}-osx-unsigned.dmg`,
    macArm: `dogecash-${VERSION}-osx-unsigned.dmg`,
    linux: `dogecash-${VERSION}-x86_64-linux-gnu.tar.gz`
  };
  const ua = navigator.userAgent;
  const uaData = navigator.userAgentData || null;
  let isWin = /Windows NT|Win64/i.test(ua);
  let isMac = /Macintosh|Mac OS X/i.test(ua);
  let isLinux = /Linux|X11|Ubuntu|Fedora|Debian|Arch|Manjaro/i.test(ua);
  let isArm = /\b(aarch64|arm64|Apple\s?Silicon)\b/i.test(ua);
  if (uaData && Array.isArray(uaData.brands)) {
    const pf = (uaData.platform||'').toLowerCase();
    isWin = pf.includes('win');
    isMac = pf.includes('mac');
    isLinux = pf.includes('linux') || pf.includes('chrome os');
  }
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  let href = releaseTagUrl, label = 'Download for Your OS';
  if (!isMobile) {
    if (isWin) { href = releaseBase + assets.win; label = 'Download for Windows'; }
    else if (isMac) { href = releaseBase + (isArm ? assets.macArm : assets.macIntel); label = 'Download for macOS'; }
    else if (isLinux) { href = releaseBase + assets.linux; label = 'Download for Linux'; }
  } else { label = 'View All Desktop Downloads'; }
  const btn = q('#dlBtn'); if (btn) { btn.href = href; btn.textContent = label; btn.rel = 'noopener noreferrer'; btn.referrerPolicy = 'no-referrer'; }
  const all = q('#allAssetsLink'); if (all) all.href = releaseTagUrl;
}

async function loadDashboard(){
  if (document.hidden || !navigator.onLine) return;
  try{
    setStatus('priceStatus','Fetching price…');
    const d = await getJSON(`${base}/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`, { ttlMs: 60_000, retries: 2 });
    const md = d.market_data || {};
    const price = md.current_price?.usd ?? null;
    const ch = (typeof md.price_change_percentage_24h === 'number' ? md.price_change_percentage_24h : null);
    validatePriceData({ price: Number(price), change: Number(ch) });
    const cap = md.market_cap?.usd ?? null;
    const vol = md.total_volume?.usd ?? null;
    const circ = md.circulating_supply ?? null;

    const usdEl=q('#p_usd'), chEl=q('#p_ch'), capEl=q('#p_mcap'), volEl=q('#p_vol'), circEl=q('#p_circ');
    if(usdEl) usdEl.textContent = price!=null ? (price < 0.01 ? fmtUSD(price, {maxFrac:8}) : fmtUSD(price, {maxFrac:4})) : '—';
    if(chEl) { if (ch!=null && Number.isFinite(Number(ch))) { const v=Number(ch); chEl.textContent=(v>=0?'+':'')+v.toFixed(2)+'%'; chEl.className = v>=0 ? 'good' : 'bad'; } else { chEl.textContent='—'; chEl.className=''; } }
    if(capEl) capEl.textContent = fmtUSD(cap);
    if(volEl) volEl.textContent = fmtUSD(vol);
    if(circEl) circEl.textContent = circ!=null ? (fmtNum(Number(circ))+' DOGEC') : '—';

    setStatus('priceStatus','Live price loaded.');
  } catch (e) {
    setStatus('priceStatus','Unable to fetch current prices. Please try again.', true);
    console.warn('Dashboard error:', e);
  }
}

function initCopyChecksums(){
  const cells = qa('#shaTable td:nth-child(2)');
  cells.forEach(td => {
    const text = (td.textContent || '').trim();
    td.dataset.checksum = text;
    td.style.cursor='pointer'; td.title='Click to copy checksum'; td.setAttribute('role','button'); td.setAttribute('tabindex','0');
    td.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(td.dataset.checksum || text);
        const live = q('#liveCopy'); if (live) live.textContent = 'Checksum copied ' + Date.now();
        const original = text;
        td.textContent = 'Copied!';
        td.classList.add('copied');
        setTimeout(()=>{ td.textContent = original; td.classList.remove('copied'); }, 800);
      } catch {}
    });
    td.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); td.click(); } });
  });
}

function initShare(){
  const url = location.href.split('#')[0];
  const title = document.title;
  const text = `Check out DOGECASH — ${title}`;
  const enc = encodeURIComponent;
  const links = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    twitter: `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`,
    telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
    whatsapp: `https://wa.me/?text=${enc(text + ' ' + url)}`
  };
  const setHref = (id, href) => { const a=q('#'+id); if (a) a.href=href; };
  setHref('share-facebook', links.facebook); setHref('share-twitter', links.twitter);
  setHref('share-telegram', links.telegram); setHref('share-whatsapp', links.whatsapp);
  function wireNative(id, shareData){
    const a=q('#'+id); if(!a) return;
    a.addEventListener('click', (e)=>{
      if(navigator.share){
        e.preventDefault();
        navigator.share(shareData).catch(()=>{ window.open(a.href, '_blank', 'noopener,noreferrer'); });
      }
    });
  }
  const data = { title, text, url }; ['share-facebook','share-twitter','share-telegram','share-whatsapp'].forEach(id => wireNative(id, data));
}

function initTopbarOffset(){
  function applyTopbarOffset(){
    const tb = q('.topbar'); if(!tb) return;
    const h = tb.offsetHeight || 72;
    document.documentElement.style.setProperty('--topbar-h', h + 'px');
    document.body.classList.add('has-fixed-topbar');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyTopbarOffset, {once:true});
  else applyTopbarOffset();
  window.addEventListener('resize', applyTopbarOffset, {passive:true});
  document.addEventListener('click', function(e){
    const a = e.target.closest('a[href^="#"]'); if(!a) return;
    const href = a.getAttribute('href'); if (!href || href.length < 2) return;
    const id = href.slice(1);
    const el = document.getElementById(id); if(!el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const topbarH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 72;
    const y = rect.top + window.pageYOffset - topbarH - 8;
    try { window.scrollTo({ top: y, behavior: 'smooth' }); } catch(_) { window.scrollTo(0, y); }
    try { history.pushState(null, '', '#' + id); } catch(_) {}
  }, true);
}

function initVisibilityPolling(){
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !navigator.onLine) { stopMarketsPolling(); }
    else { startMarketsPolling(); loadDashboard(); }
  });
  window.addEventListener('online', () => { setStatus('priceStatus','Back online. Refreshing…'); startMarketsPolling(); loadDashboard(); });
  window.addEventListener('offline', () => { setStatus('priceStatus','You are offline. Live data paused.', true); stopMarketsPolling(); });
}

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initDownloadAutodetect();
  initShare();
  initCopyChecksums();
  initTopbarOffset();
  setupConverter();
  loadDashboard();
  startMarketsPolling();
});
