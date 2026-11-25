// Modern popups: alert() aur confirm() ki jagah. shanu.js isse import karta hai.
const css = `
#uiDlg{width:min(92vw,360px);padding:42px 22px 20px;text-align:center;border-radius:30px;overflow:visible;border:1px solid var(--line)}
#uiDlg::backdrop{background:rgba(4,6,26,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
#uiDlg[open]{animation:uiPop .38s cubic-bezier(.2,1.1,.3,1.2)}
@keyframes uiPop{from{opacity:0;transform:translateY(18px) scale(.9)}to{opacity:1;transform:none}}
@keyframes uiRing{0%{box-shadow:0 0 0 0 var(--uc),0 12px 30px rgba(0,0,0,.35)}100%{box-shadow:0 0 0 16px transparent,0 12px 30px rgba(0,0,0,.35)}}
.ui-ic{width:66px;height:66px;margin:-76px auto 14px;border-radius:50%;display:grid;place-items:center;color:#fff;border:4px solid var(--bg);animation:uiRing 1.6s ease-out 2}
.ui-ic svg{width:30px;height:30px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.ui-ic.err{background:linear-gradient(135deg,#FF5C8A,#FF2D55);--uc:rgba(255,45,85,.5)}
.ui-ic.warn{background:linear-gradient(135deg,#FFC145,#FF7A18);--uc:rgba(255,140,30,.5)}
.ui-ic.info{background:var(--grad);--uc:rgba(124,92,255,.5)}
.ui-ic.ok{background:linear-gradient(135deg,#2EE59D,#12B886);--uc:rgba(46,229,157,.5)}
#uiDlg h3{font-family:'Bricolage Grotesque',sans-serif;font-size:1.4rem;margin-bottom:6px}
#uiDlg .ui-main{color:var(--ink);font-weight:600;line-height:1.45;margin-bottom:8px;white-space:pre-line}
#uiDlg .ui-sub{background:var(--bub);border:1px solid var(--line);border-radius:14px;padding:9px 12px;font-size:.78rem;text-align:left;word-break:break-word;white-space:pre-line;margin-bottom:0}
.ui-btns{display:flex;gap:10px;margin-top:18px}
.uib{flex:1;padding:13px 10px;border-radius:16px;border:0;font:inherit;font-weight:800;cursor:pointer;transition:transform .15s,box-shadow .2s}
.uib:active{transform:scale(.95)}
.uib.main{background:var(--grad);color:#fff;box-shadow:var(--glow)}
.uib.danger{background:linear-gradient(135deg,#FF5C8A,#FF2D55);color:#fff;box-shadow:0 8px 24px rgba(255,45,85,.4)}
.uib.ghost{background:var(--bub);color:var(--ink);border:1px solid var(--line)}
.toast{background:var(--panel)!important;color:var(--ink)!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid var(--line);border-left:4px solid var(--acc);border-radius:18px!important;padding:12px 18px!important;max-width:min(92vw,420px);box-shadow:var(--shadow)!important;font-weight:700;animation:uiToast .45s cubic-bezier(.2,1.1,.3,1.2)!important}
@keyframes uiToast{from{opacity:0;transform:translate(-50%,-16px) scale(.92)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

const IC = {
  err: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  ok: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>'
};
let dlg = null, queue = [], busy = false;
function next(){
  if(busy || !queue.length || !document.body) return; busy = true; const o = queue.shift();
  if(!dlg){ dlg = document.createElement('dialog'); dlg.id = 'uiDlg'; document.body.appendChild(dlg); }
  dlg.innerHTML = '<div class="ui-ic ' + o.type + '">' + IC[o.type] + '</div><h3></h3><p class="ui-main"></p><p class="ui-sub" hidden></p><form method="dialog" class="ui-btns"></form>';
  dlg.querySelector('h3').textContent = o.title; dlg.querySelector('.ui-main').textContent = o.main || '';
  if(o.sub){ const s = dlg.querySelector('.ui-sub'); s.hidden = false; s.textContent = o.sub; }
  const f = dlg.querySelector('form'); const mk = (cls, val, txt) => { const b = document.createElement('button'); b.className = 'uib ' + cls; b.value = val; b.textContent = txt; f.appendChild(b); return b; };
  if(o.cancel) mk('ghost', 'no', o.cancel);
  const k = mk(o.danger ? 'danger' : 'main', 'ok', o.ok || 'Theek hai');
  dlg.returnValue = ''; dlg.onclose = () => { const r = dlg.returnValue === 'ok'; busy = false; o.res(r); next(); };
  dlg.showModal(); k.focus();
}
function show(o){ return new Promise(res => { o.res = res; queue.push(o); if(document.body) next(); else addEventListener('DOMContentLoaded', next); }); }

let lastM = '', lastT = 0;
window.alert = function(m){
  m = String(m == null ? '' : m); if(!m) return; if(m === lastM && Date.now() - lastT < 4000) return; lastM = m; lastT = Date.now();
  if(/insufficient permissions|permission[- ]denied/i.test(m)){
    show({type: 'warn', title: 'Firebase rules chahiye', main: 'Firebase ne abhi is kaam ki permission nahi di.',
      sub: 'firestore.rules file ko Firebase Console → Firestore Database → Rules mein paste karke Publish karo, phir page refresh karo.', ok: 'Samajh gaya'}); return;
  }
  const lines = m.split('\n').map(s => s.trim()).filter(Boolean), err = /nahi|fail|error|galat|bahut|oops/i.test(m);
  show({type: err ? 'err' : 'info', title: err ? 'Oops, kuch gadbad hui' : 'Dhyan do', main: lines[0], sub: lines.slice(1).join('\n'), ok: 'Theek hai'});
};
window.ask = (title, main, o) => show(Object.assign({type: (o && o.danger) ? 'err' : 'warn', title, main, ok: 'Haan', cancel: 'Nahi'}, o || {}));
window.say = o => show(Object.assign({type: 'info', title: 'Dhyan do', ok: 'Theek hai'}, o || {}));
