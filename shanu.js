// Dosto ka Adda add-on  |  Made by Shanu
// All / Groups / Private tabs, seen-by, typing, online status, hearts, photo, voice, search, extra settings
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, indexedDBLocalPersistence, browserLocalPersistence }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, setDoc, deleteDoc, getDocs, getDoc, endBefore, query, where, orderBy, limitToLast, onSnapshot, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import('./ui.js').catch(() => {});          // modern popups (agar ui.js maujood ho)

const $ = id => document.getElementById(id);
const app = getApp(), auth = getAuth(app), db = getFirestore(app);
const el = (t, c, x) => { const e = document.createElement(t); if(c) e.className = c; if(x != null) e.textContent = x; return e; };
const get = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const put = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const col = n => { let h = 0; for(const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return 'hsl(' + h + ',62%,46%)'; };
const clock = d => d.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'});
const toast = m => { const d = el('div', 'toast', m); document.body.appendChild(d); setTimeout(() => d.remove(), 2400); };
const ic = (n, c) => '<svg class="i' + (c ? ' ' + c : '') + '"><use href="#i-' + n + '"/></svg>';
const ask = (t, m, o) => window.ask ? window.ask(t, m, o) : Promise.resolve(confirm(t + (m ? '\n' + m : '')));
const RULES_HINT = '\n\n(Firebase Console > Firestore > Rules mein firestore.rules Publish karo.)';
const ms = t => (t && t.toMillis ? t.toMillis() : 0);
const whenStr = t => { const d = new Date(t), n = new Date(), y = new Date(Date.now() - 864e5);
  return d.toDateString() === n.toDateString() ? clock(d) : d.toDateString() === y.toDateString() ? 'kal ' + clock(d) : d.toLocaleDateString('en-IN', {day: 'numeric', month: 'short'}); };

setPersistence(auth, indexedDBLocalPersistence).catch(() => setPersistence(auth, browserLocalPersistence)).catch(() => {});

const SH = Object.assign({hide: true, dmSnd: true, size: 100}, (() => { try{ return JSON.parse(get('shanu-set') || '{}'); }catch(e){ return {}; } })());
const save = () => put('shanu-set', JSON.stringify(SH));
const applySize = () => { document.documentElement.style.fontSize = SH.size + '%'; };
applySize();

document.head.insertAdjacentHTML('beforeend', '<meta name="author" content="Shanu">');
console.log('%cMade by Shanu', 'font:800 16px sans-serif;color:#7c5cff');
const credit = () => { const w = el('div'); w.style.cssText = 'text-align:center;margin-top:14px'; const c = el('span', 'credit'); c.append('Made by ', el('b', null, 'Shanu')); w.appendChild(c); return w; };
$('join')?.querySelector('.card')?.appendChild(credit());
$('study')?.querySelector('.sbody')?.appendChild(credit());
$('chat')?.querySelector('h2')?.insertAdjacentHTML('beforeend', '<span class="byline">by Shanu</span>');

const st = el('style'); st.textContent = `
.credit{display:inline-flex;align-items:center;gap:5px;font-size:.75rem;font-weight:700;padding:5px 12px;border-radius:20px;background:var(--bub);border:1px solid var(--line);color:var(--mute)}
.credit b{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.byline{font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:700;color:var(--acc);margin-left:7px;vertical-align:middle;letter-spacing:.04em}
.tk{margin-left:3px;letter-spacing:-3px;font-weight:800;opacity:.75}
.tk.seen{color:#7DF9FF;opacity:1}
.seenl{align-self:flex-end;font-size:.7rem;font-weight:700;color:var(--mute);margin:1px 8px 6px;max-width:80%;text-align:right}
.typl{align-self:flex-start;font-size:.78rem;font-weight:700;color:var(--mute);padding:6px 12px;border-radius:16px;background:var(--bub);border:1px solid var(--line)}
.rxb{display:inline-flex;margin-top:3px;background:var(--bub);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:0 8px;font-size:.78rem}
.tm2{margin-left:auto;font-size:.7rem;color:var(--mute);flex:none;align-self:flex-start;padding-top:2px}
.dmi .nn{margin-left:8px}
`;
document.head.appendChild(st);

// =====================================================================
let me = null, threads = {}, groups = {}, users = [], conv = null, view = 'all';
let first = true, firstG = true, checked = false, blockedByMe = false, lastSnap = null, photos = {}, warned = false;
let uT = null, uG = null, uM = null, uB = null, uP = null, uPr = null, uS = null, uL = null, tmr = null;
let presData = null, lastTyW = 0, lastSig = '', allSeen = {}, lastAll = null, lastAllMark = 0; const seenMark = {};
const cidOf = (a, b) => [a, b].sort().join('_');
const readKey = id => 'shanu-read-' + id;
const metaOf = c => c.kind === 'dm' ? threads[c.id] : groups[c.id];
function stopAll(){ [uT, uG, uM, uB, uS, uL].forEach(u => u && u()); uT = uG = uM = uB = uS = uL = null; }

const unreadOf = (id, d) => !!me && d.lastFrom !== me.uid && ms(d.lastTime) > +(get(readKey(id)) || 0);
const anyUnread = o => Object.entries(o).some(([id, d]) => unreadOf(id, d));
const dots = () => $('ctabs').querySelectorAll('.rdot');
const allDot = v => { dots()[0].hidden = !v; };
function badge(){
  const g = !!me && anyUnread(groups), p = !!me && anyUnread(threads);
  dots()[1].hidden = !(g && view !== 'grp'); dots()[2].hidden = !(p && view !== 'dm');
}
function beep(){
  try{
    if(get('adda-sound') === 'off') return;
    const v = JSON.parse(get('adda-set') || '{}').vol; const vol = v == null ? .6 : v;
    window._shac = window._shac || new (window.AudioContext || window.webkitAudioContext)();
    const a = window._shac, o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(988, t); o.frequency.setValueAtTime(1319, t + .1);
    g.gain.setValueAtTime(.15 * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .3);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(t + .31);
  }catch(e){}
}
function incoming(kind, id, d){
  if(conv && conv.id === id && !$('cv').hidden) return;
  if(!$('study').hidden){ if(window.setCalcDot) window.setCalcDot(true); return; }
  const who = kind === 'grp' ? ((d.lastName || 'Dost') + ' · ' + (d.name || 'Group')) : ((d.names && d.names[d.lastFrom]) || 'Dost');
  if(SH.dmSnd) beep();
  toast('✉ ' + who + ': ' + (d.last || 'naya message'));
}
function firstCheck(){
  if(checked || first || firstG) return; checked = true;
  if(!$('study').hidden && (anyUnread(threads) || anyUnread(groups)) && window.setCalcDot) window.setCalcDot(true);
}
function listenList(kind){
  const isG = kind === 'grp', store = isG ? groups : threads;
  return onSnapshot(query(collection(db, isG ? 'groups' : 'dms'), where('members', 'array-contains', me.uid)), snap => {
    snap.docChanges().forEach(ch => {
      const d = ch.doc.data(), id = ch.doc.id, prev = ms(store[id] && store[id].lastTime);
      if(ch.type === 'removed') delete store[id]; else store[id] = d;
      if(isG ? !firstG : !first){
        if(ch.type !== 'removed' && d.lastFrom && d.lastFrom !== me.uid && ms(d.lastTime) > prev) incoming(kind, id, d);
      }
    });
    if(isG) firstG = false; else first = false;
    firstCheck(); badge(); redraw();
  }, err => { console.warn((isG ? 'Groups: ' : 'Private chats: ') + err.message); if(!warned && err.code === 'permission-denied'){ warned = true; alert('Missing or insufficient permissions'); } });
}
function startLists(){ stopAll(); first = firstG = true; checked = false; uT = listenList('dm'); uG = listenList('grp'); }
function redraw(){
  if(conv){ if(lastSnap) renderConv(); return; }
  if(view === 'dm') drawHome(); else if(view === 'grp') drawGroups();
}

// ---------- Avatars + list items ----------
function avatar(name){ const a = el('div', 'av', name.charAt(0).toUpperCase()); a.style.background = col(name); a.dataset.n = name; paintAv(a, name); return a; }
function groupAvatar(name){ const a = el('div', 'av gav'); a.innerHTML = ic('users'); a.style.background = col(name); return a; }
function item(av, title, sub, unread, fn, time){
  const b = el('button', 'dmi'); b.type = 'button'; const t = el('div', 'tx2'); t.append(el('b', null, title), el('small', null, sub)); b.append(av, t);
  if(time) b.appendChild(el('span', 'tm2', whenStr(time)));
  if(unread) b.appendChild(el('span', 'nn', 'new')); b.onclick = fn; return b;
}
async function loadUsers(){
  try{ users = (await getDocs(collection(db, 'users'))).docs.map(d => ({id: d.id, ...d.data()})); redraw(); if(!$('gpNew').hidden) drawPick(); }
  catch(e){ $('dmUsers').textContent = 'Dost list load nahi hui.' + RULES_HINT; }
}

// ---------- Private (1-to-1) ----------
const dmConv = (oid, name) => { const id = cidOf(me.uid, oid); return {kind: 'dm', id, path: ['dms', id], title: name, other: {id: oid, name}}; };
function drawHome(){
  if(!me) return;
  const q = $('dmSearch').value.trim().toLowerCase(), T = $('dmThreads'), U = $('dmUsers'); T.innerHTML = ''; U.innerHTML = '';
  Object.entries(threads).map(([id, d]) => ({id, d, t: ms(d.lastTime) || Date.now()})).sort((a, b) => b.t - a.t).forEach(({id, d, t}) => {
    const oid = (d.members || []).find(x => x !== me.uid); if(!oid) return; const nm = (d.names && d.names[oid]) || 'Dost';
    if(q && !nm.toLowerCase().includes(q)) return;
    T.appendChild(item(avatar(nm), nm, (d.lastFrom === me.uid ? 'Tum: ' : '') + (d.last || ''), unreadOf(id, d), () => openConv(dmConv(oid, nm)), ms(d.lastTime) ? t : 0));
  });
  if(!T.children.length) T.appendChild(el('p', 'shead', 'Abhi koi private chat nahi. Neeche se kisi dost ko chuno.'));
  users.filter(u => u.id !== me.uid && (!q || (u.name || '').toLowerCase().includes(q))).forEach(u => {
    const nm = u.name || 'Dost'; U.appendChild(item(avatar(nm), nm, u.bio || '', false, () => openConv(dmConv(u.id, nm))));
  });
}
$('dmSearch').oninput = drawHome;

// ---------- Groups ----------
const grpConv = (id, d) => ({kind: 'grp', id, path: ['groups', id], title: d.name || 'Group', members: d.members || [], names: d.names || {}});
function drawGroups(){
  if(!me) return;
  const L = $('gpList'); L.innerHTML = '';
  Object.entries(groups).map(([id, d]) => ({id, d, t: ms(d.lastTime) || Date.now()})).sort((a, b) => b.t - a.t).forEach(({id, d, t}) => {
    const sub = d.last ? ((d.lastFrom === me.uid ? 'Tum' : (d.lastName || 'Dost')) + ': ' + d.last) : (d.members || []).length + ' members';
    L.appendChild(item(groupAvatar(d.name || 'Group'), d.name || 'Group', sub, unreadOf(id, d), () => openConv(grpConv(id, d)), ms(d.lastTime) ? t : 0));
  });
  if(!L.children.length) L.appendChild(el('p', 'shead', 'Abhi koi group nahi. Upar se naya group banao.'));
}
function drawPick(){
  const P = $('gpPick'), keep = new Set([...P.querySelectorAll('input:checked')].map(c => c.value)); P.innerHTML = '';
  users.filter(u => u.id !== me.uid).forEach(u => {
    const nm = u.name || 'Dost', l = el('label', 'dmi'), c = document.createElement('input'); c.type = 'checkbox'; c.value = u.id; c.checked = keep.has(u.id);
    l.append(c, avatar(nm), el('b', null, nm)); P.appendChild(l);
  });
  if(!P.children.length) P.appendChild(el('p', 'shead', 'Dost list khali hai.'));
}
$('gpNewBtn').onclick = () => { $('gpHome').hidden = true; $('gpNew').hidden = false; $('gpName').value = ''; drawPick(); loadUsers(); $('gpName').focus(); };
$('gpCancel').onclick = () => { $('gpNew').hidden = true; $('gpHome').hidden = false; };
$('gpMake').onclick = async () => {
  if(!me) return;
  const name = $('gpName').value.trim(), ids = [...$('gpPick').querySelectorAll('input:checked')].map(c => c.value);
  if(name.length < 2){ alert('Group ka naam likho (kam se kam 2 akshar).'); return; }
  if(!ids.length){ alert('Kam se kam ek dost chuno.'); return; }
  const members = [me.uid, ...ids], names = {}; members.forEach(id => { names[id] = id === me.uid ? me.name : ((users.find(u => u.id === id) || {}).name || 'Dost'); });
  $('gpMake').disabled = true;
  try{
    const ref = doc(collection(db, 'groups'));
    await setDoc(ref, {name, members, names, createdBy: me.uid, last: 'Group ban gaya', lastFrom: me.uid, lastName: me.name, lastTime: serverTimestamp(), createdAt: serverTimestamp()});
    $('gpNew').hidden = true; $('gpHome').hidden = false; openConv(grpConv(ref.id, {name, members, names}));
  }catch(err){ alert('Group nahi bana: ' + err.message + RULES_HINT); }
  $('gpMake').disabled = false;
};

// ---------- Tabs ----------
function showView(v){
  view = v; closeConv();
  $('vAll').hidden = v !== 'all'; $('gp').hidden = v !== 'grp'; $('dm').hidden = v !== 'dm';
  $('ctabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  const s = $('shSearch'); if(s) s.hidden = v !== 'all';
  if(v === 'all'){ allDot(false); const m = $('msgs'); m.scrollTop = m.scrollHeight; markAll(); }
  if(v === 'grp'){ $('gpNew').hidden = true; $('gpHome').hidden = false; drawGroups(); loadUsers(); }
  if(v === 'dm'){ drawHome(); loadUsers(); }
  badge();
}
$('ctabs').onclick = e => { const b = e.target.closest('button'); if(b) showView(b.dataset.v); };
new MutationObserver(muts => {
  if(!$('vAll').hidden || $('chat').hidden) return;
  muts.forEach(m => m.addedNodes.forEach(n => { if(n.classList && n.classList.contains('live') && !n.classList.contains('me')) allDot(true); }));
}).observe($('msgs'), {childList: true});
new MutationObserver(() => { if($('chat').hidden){ closeConv(); showView('all'); } else markAll(); }).observe($('chat'), {attributes: true, attributeFilter: ['hidden']});

// =====================================================================
// All chat: "Seen by ..." (aakhri message tumhara ho to)
// =====================================================================
const seenEl = el('div', 'seenl'); seenEl.id = 'shSeen'; seenEl.hidden = true;
function updAllSeen(){
  const box = $('msgs');
  if(!me || !lastAll || lastAll.uid !== me.uid){ seenEl.hidden = true; return; }
  const t = ms(lastAll.time) || Date.now(), names = Object.entries(allSeen).filter(([id, x]) => id !== me.uid && (x.t || 0) >= t).map(([id, x]) => x.name || 'Dost');
  if(!names.length){ seenEl.hidden = true; return; }
  seenEl.textContent = 'Seen by ' + (names.length > 3 ? names.slice(0, 3).join(', ') + ' +' + (names.length - 3) : names.join(', ')); seenEl.hidden = false;
  if(box.lastChild !== seenEl) box.appendChild(seenEl);
}
new MutationObserver(m => { if(!seenEl.hidden && seenEl.nextSibling && m.some(x => [...x.addedNodes].some(n => n !== seenEl))) $('msgs').appendChild(seenEl); }).observe($('msgs'), {childList: true});
function markAll(){
  if(!me || $('chat').hidden || $('vAll').hidden || document.visibilityState !== 'visible' || Date.now() - lastAllMark < 3000) return;
  lastAllMark = Date.now(); setDoc(doc(db, 'seen', me.uid), {name: me.name, t: Date.now()}).catch(() => {});
}
function listenAll(){
  uS = onSnapshot(collection(db, 'seen'), s => { allSeen = {}; s.forEach(d => { allSeen[d.id] = d.data(); }); updAllSeen(); }, () => {});
  uL = onSnapshot(query(collection(db, 'messages'), orderBy('time'), limitToLast(1)), s => { lastAll = s.empty ? null : s.docs[0].data({serverTimestamps: 'estimate'}); updAllSeen(); markAll(); }, () => {});
}

// =====================================================================
// Conversation (group ya private)
// =====================================================================
function typers(){
  const meta = (conv && metaOf(conv)) || {}, ty = meta.typing || {}, nm = meta.names || (conv && conv.names) || {}, now = Date.now();
  return Object.entries(ty).filter(([id, t]) => id !== me.uid && now - t < 4000).map(([id]) => (conv.other && id === conv.other.id) ? conv.other.name : (nm[id] || 'Dost'));
}
function hdrSub(){
  if(!conv) return; const ty = typers();
  if(conv.kind === 'grp'){ const meta = metaOf(conv) || conv, nm = meta.names || conv.names || {};
    $('cvSub').textContent = ty.length ? ty.join(', ') + ' type kar raha hai…' : (meta.members || conv.members).map(id => id === me.uid ? 'Tum' : (nm[id] || 'Dost')).join(', '); return; }
  const on = presData && presData.last && Date.now() - ms(presData.last) < 150000;
  $('cvSub').textContent = ty.length ? 'typing…' : on ? '● Online' : (presData && presData.last ? 'Last seen ' + whenStr(ms(presData.last)) : '');
}
function drawMsg(d, box, others, seen){
  const m = d.data({serverTimestamps: 'estimate'}), mine = m.uid === me.uid, row = el('div', 'row' + (mine ? ' me' : '')), b = el('div', 'm');
  if(!mine && conv.kind === 'grp'){ const n = el('div', 'n', m.name || 'Dost'); n.style.color = col(m.name || 'Dost'); b.appendChild(n); }
  if(m.img){ const im = el('img', 'pimg'); im.src = m.img; im.alt = 'Photo'; im.onclick = () => window.open(m.img); b.appendChild(im); }
  if(m.aud){ const au = document.createElement('audio'); au.controls = true; au.preload = 'metadata'; au.src = m.aud; au.style.maxWidth = '230px'; b.appendChild(au); }
  if(m.text && m.text !== '📷' && m.text !== '🎤') b.appendChild(el('div', 'tx', m.text));
  const hearts = Object.values(m.reactions || {}).filter(v => v === '❤️').length;
  if(hearts) b.appendChild(el('div', 'rxb', '❤️' + (hearts > 1 ? ' ' + hearts : '')));
  const t = el('div', 't');
  if(mine){ const x = el('button', 'ab'); x.type = 'button'; x.innerHTML = ic('trash', 'sm'); x.setAttribute('aria-label', 'Delete');
    x.onclick = async () => { if(await ask('Message delete karein?', 'Ye sabke liye hat jayega aur wapas nahi aayega.', {ok: 'Delete', cancel: 'Rehne do', danger: true})) deleteDoc(d.ref).catch(e => alert(e.message)); }; t.appendChild(x); }
  const tt = ms(m.time) || Date.now(), all = mine && others.length && others.every(id => (seen[id] || 0) >= tt);
  const tm = el('span', 'tm', m.time ? clock(m.time.toDate()) : ''); if(mine) tm.appendChild(el('span', 'tk' + (all ? ' seen' : ''), all ? '✓✓' : '✓'));
  t.appendChild(tm); b.appendChild(t); row.appendChild(b); box.appendChild(row);
  // double tap = ❤️
  let lt = 0, lx = 0, ly = 0;
  b.addEventListener('pointerup', e => {
    if(e.target.closest('button,audio,img')) return; const n = Date.now();
    if(n - lt < 320 && Math.hypot(e.clientX - lx, e.clientY - ly) < 30){
      lt = 0; const has = m.reactions && m.reactions[me.uid] === '❤️';
      setDoc(d.ref, {reactions: {[me.uid]: has ? '' : '❤️'}}, {merge: true}).catch(err => alert(err.message + RULES_HINT));
      if(!has){ const h = el('div', 'heart', '❤️'); h.style.left = e.clientX + 'px'; h.style.top = e.clientY + 'px'; document.body.appendChild(h); setTimeout(() => h.remove(), 800); }
    } else { lt = n; lx = e.clientX; ly = e.clientY; }
  });
  return {row, m, mine};
}
function renderConv(){
  const box = $('cvMsgs'); if(!lastSnap || !conv) return;
  const meta = metaOf(conv) || {}, seen = meta.seen || {}, nm = meta.names || conv.names || {};
  const others = conv.kind === 'dm' ? [conv.other.id] : (meta.members || conv.members).filter(x => x !== me.uid);
  const near = conv.fresh || box.scrollHeight - box.scrollTop - box.clientHeight < 140, keep = box.scrollTop; box.innerHTML = '';
  if(lastSnap.empty) box.appendChild(el('p', 'shead', 'Yahan se baat shuru karo 👋'));
  let lastMine = null; lastSnap.forEach(d => { const r = drawMsg(d, box, others, seen); if(r.mine) lastMine = r; });
  if(lastMine){
    const t = ms(lastMine.m.time) || Date.now(), sb = others.filter(id => (seen[id] || 0) >= t); let txt = '';
    if(conv.kind === 'dm'){ if(sb.length) txt = 'Seen ' + clock(new Date(seen[others[0]])); }
    else if(sb.length) txt = sb.length === others.length ? 'Seen by everyone' : 'Seen by ' + sb.map(id => nm[id] || 'Dost').join(', ');
    if(txt) lastMine.row.after(el('div', 'seenl', txt));
  }
  const ty = typers(); if(ty.length){ const p = el('div', 'typl', ty.join(', ') + ' '), dd = el('span', 'tdots'); dd.innerHTML = '<i></i><i></i><i></i>'; p.appendChild(dd); box.appendChild(p); }
  hdrSub(); box.scrollTop = near ? box.scrollHeight : keep; conv.fresh = false;
}
function markSeen(snap){
  if(!conv || snap.empty || document.visibilityState !== 'visible') return;
  const m = snap.docs[snap.docs.length - 1].data({serverTimestamps: 'estimate'}); if(m.uid === me.uid) return;
  const t = ms(m.time) || Date.now(); if(seenMark[conv.id] === t || !metaOf(conv)) return; seenMark[conv.id] = t;
  setDoc(doc(db, ...conv.path), {seen: {[me.uid]: Date.now()}}, {merge: true}).catch(() => {});
}
function openConv(c){
  closeConv(); conv = c; c.fresh = true; lastSnap = null; presData = null; lastSig = '';
  $('vAll').hidden = $('gp').hidden = $('dm').hidden = true; $('cv').hidden = false; $('chat').classList.add('incv');
  $('cvTitle').textContent = c.title; $('cvSub').textContent = '';
  const act = $('cvAct'); act.hidden = false; act.textContent = c.kind === 'grp' ? 'Leave' : 'Block';
  $('cvMsgs').innerHTML = ''; $('cvIn').value = '';
  uM = onSnapshot(query(collection(db, ...c.path, 'messages'), orderBy('time'), limitToLast(100)), snap => {
    lastSnap = snap; renderConv();
    const meta = metaOf(c); put(readKey(c.id), Math.max(Date.now(), ms(meta && meta.lastTime)) + 1); badge(); markSeen(snap);
  }, err => { $('cvMsgs').textContent = 'Messages load nahi hue. ' + err.message + RULES_HINT; });
  if(c.kind === 'dm'){
    uB = onSnapshot(doc(db, 'blocks', me.uid, 'list', c.other.id), s => { blockedByMe = s.exists(); act.textContent = blockedByMe ? 'Unblock' : 'Block'; }, () => {});
    uPr = onSnapshot(doc(db, 'presence', c.other.id), s => { presData = s.exists() ? s.data() : null; hdrSub(); }, () => {});
  }
  hdrSub(); tmr = setInterval(() => { const sig = typers().join(','); if(sig !== lastSig){ lastSig = sig; renderConv(); } else hdrSub(); }, 1000);
  if(matchMedia('(pointer:fine)').matches) $('cvIn').focus();
}
function closeConv(){
  if(rec) try{ rec.stop(); }catch(e){}
  [uM, uB, uPr].forEach(u => u && u()); uM = uB = uPr = null; clearInterval(tmr); tmr = null; conv = null; lastSnap = null; presData = null;
  $('chat').classList.remove('incv'); $('cv').hidden = true;
}
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible'){ if(lastSnap) markSeen(lastSnap); markAll(); } });
$('cvBack').onclick = () => { showView(view); };
$('cvAct').onclick = async () => {
  if(!conv) return;
  try{
    if(conv.kind === 'dm'){
      const r = doc(db, 'blocks', me.uid, 'list', conv.other.id);
      if(blockedByMe) await deleteDoc(r);
      else if(await ask(conv.other.name + ' ko block karein?', 'Wo tumhe private message nahi bhej payega.', {ok: 'Block karo', cancel: 'Cancel', danger: true})) await setDoc(r, {t: serverTimestamp()});
    } else if(await ask('"' + conv.title + '" group chhod dein?', 'Tum is group ke messages nahi dekh paoge.', {ok: 'Leave', cancel: 'Rehne do', danger: true})){
      const d = groups[conv.id] || {}, left = (d.members || []).filter(x => x !== me.uid);
      await setDoc(doc(db, 'groups', conv.id), {members: left}, {merge: true}); toast('Group chhod diya'); showView('grp');
    }
  }catch(err){ alert(err.message + RULES_HINT); }
};
async function sendMsg(x){
  if(!conv || !me) return; const c = conv, name = (auth.currentUser && auth.currentUser.displayName) || me.name;
  const lastTxt = x.img ? '📷 Photo' : x.aud ? '🎤 Voice message' : x.text.slice(0, 60);
  try{
    const data = {text: x.text.slice(0, 500), uid: me.uid, name, time: serverTimestamp()}; if(x.img) data.img = x.img; if(x.aud) data.aud = x.aud;
    await addDoc(collection(db, ...c.path, 'messages'), data);
    const meta = {last: lastTxt, lastTime: serverTimestamp(), lastFrom: me.uid, lastName: name, typing: {[me.uid]: 0}};
    if(c.kind === 'dm') await setDoc(doc(db, ...c.path), {members: c.id.split('_'), names: {[me.uid]: name, [c.other.id]: c.other.name}, ...meta}, {merge: true});
    else await setDoc(doc(db, ...c.path), meta, {merge: true});
  }catch(err){
    if(window.say && c.kind === 'dm' && /permission/i.test(err.message)) window.say({type: 'warn', title: 'Message nahi gaya', main: 'Ya to is dost ne tumhe block kiya hai, ya Firebase rules publish nahi hue.', sub: err.message});
    else alert('Message nahi gaya.\n' + err.message + RULES_HINT);
  }
}
$('cvForm').onsubmit = e => { e.preventDefault(); const text = $('cvIn').value.trim(); if(!text) return; $('cvIn').value = ''; sendMsg({text}); };
$('cvIn').addEventListener('input', () => {
  if(!conv || !me || !metaOf(conv)) return; const n = Date.now(); if(n - lastTyW < 2500) return; lastTyW = n;
  setDoc(doc(db, ...conv.path), {typing: {[me.uid]: n}}, {merge: true}).catch(() => {});
});

// ---------- Logout: StudyDesk ke upar bhi ----------
const holder = $('scount') && $('scount').parentElement;
if(holder){
  const b = el('button', 'ic'); b.id = 'shOut'; b.type = 'button'; b.title = 'Logout'; b.setAttribute('aria-label', 'Logout');
  b.innerHTML = ic('logout'); b.onclick = () => signOut(auth); holder.insertBefore(b, $('scount'));
}
document.addEventListener('visibilitychange', () => { if(document.hidden && SH.hide && !$('chat').hidden && $('sd')) $('sd').click(); });

onAuthStateChanged(auth, u => {
  stopAll(); if(uP){ uP(); uP = null; } threads = {}; groups = {}; users = []; allSeen = {}; lastAll = null; closeConv(); showView('all');
  if(u){ me = {uid: u.uid, name: u.displayName || (u.email || 'Dost').split('@')[0]}; startLists(); listenPhotos(); listenAll(); }
  else { me = null; badge(); }
});

// ---------- Settings dialog mein extra rows ----------
function extra(){
  const L = $('setl'); if(!L) return;
  const row = (label, node) => { const r = el('div', 'srow'); r.append(el('span', null, label), node); L.appendChild(r); };
  const cb = (v, fn) => { const c = document.createElement('input'); c.type = 'checkbox'; c.checked = v; c.onchange = () => { fn(c.checked); save(); }; return c; };
  // purane Reset buttons ko modern popup wale se badlo
  const rb = lbl => [...L.querySelectorAll('.srow')].find(r => r.firstChild && r.firstChild.textContent === lbl)?.querySelector('button');
  const clearKeys = keys => { keys.forEach(k => { try{ localStorage.removeItem(k); }catch(e){} }); toast('Reset ho gaya'); setTimeout(() => location.reload(), 700); };
  const b1 = rb('Game levels'); if(b1) b1.onclick = async () => { if(await ask('Game levels reset karein?', 'Saare games phir level 1 se shuru honge.', {ok: 'Reset', cancel: 'Rehne do', danger: true})) clearKeys(['snake', 'flappy', 'memory', 'ttt', 'mole', 'math'].map(g => 'adda-lv-' + g)); };
  const b2 = rb('Study progress'); if(b2) b2.onclick = async () => { if(await ask('Study progress reset karein?', 'XP, streak, flashcards, planner aur done topics saaf ho jayenge.', {ok: 'Reset', cancel: 'Rehne do', danger: true})) clearKeys(['adda-xp', 'adda-srs', 'adda-streak', 'adda-todo', 'adda-done']); };
  row('Chat auto-hide (tab/app badalte hi)', cb(SH.hide, v => SH.hide = v));
  row('Private/Group message sound', cb(SH.dmSnd, v => SH.dmSnd = v));
  const r = document.createElement('input'); r.type = 'range'; r.min = 85; r.max = 125; r.step = 5; r.value = SH.size;
  r.oninput = () => { SH.size = +r.value; applySize(); save(); }; row('Text size', r);
  const pf = document.createElement('input'); pf.type = 'file'; pf.accept = 'image/*'; pf.hidden = true;
  const pb = el('button', 'btn', 'Badlo'); pb.type = 'button'; pb.onclick = () => pf.click();
  pf.onchange = async () => { const f = pf.files[0]; if(!f || !me) return;
    try{ await setDoc(doc(db, 'photos', me.uid), {name: me.name, data: await thumb(f, 160)}); toast('Profile photo lag gayi ✓'); }
    catch(err){ alert('Photo nahi lagi: ' + err.message + RULES_HINT); } };
  const pw = el('div'); pw.append(pf, pb); row('Profile photo', pw);
  const lo = el('button', 'btn', 'Logout'); lo.type = 'button'; lo.onclick = () => { $('setd').close(); signOut(auth); }; row('Account' + (me ? ' (' + me.name + ')' : ''), lo);
  L.appendChild(credit());
}
['setb', 'setb2'].forEach(id => { const b = $(id); if(!b) return; const o = b.onclick; b.onclick = () => { if(o) o(); extra(); }; });

// =====================================================================
// App icon (PWA), photos, voice, search, purane messages
// =====================================================================
document.head.insertAdjacentHTML('beforeend', '<link rel="manifest" href="manifest.json"><link rel="apple-touch-icon" href="icon-192.png"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="StudyDesk">');
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

const loadImg = f => new Promise((res, rej) => { const u = URL.createObjectURL(f), i = new Image(); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => rej(new Error('Photo khul nahi payi')); i.src = u; });
async function thumb(f, n){ const i = await loadImg(f), c = document.createElement('canvas'); c.width = c.height = n; const m = Math.min(i.width, i.height);
  c.getContext('2d').drawImage(i, (i.width - m) / 2, (i.height - m) / 2, m, m, 0, 0, n, n); return c.toDataURL('image/jpeg', .7); }
async function shrink(f, max, q){ const i = await loadImg(f), k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas');
  c.width = i.width * k; c.height = i.height * k; c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); }

function paintAv(a, name){ const p = photos[name]; if(!p) return; a.style.backgroundImage = 'url(' + p + ')'; a.style.backgroundSize = 'cover'; a.style.backgroundPosition = 'center'; a.style.color = 'transparent'; }
function paintAll(){ $('chat').querySelectorAll('.av:not(.gav)').forEach(a => { const r = a.closest('.row'), n = (r && r.dataset.name) || a.dataset.n; if(n) paintAv(a, n); }); }
new MutationObserver(paintAll).observe($('msgs'), {childList: true, subtree: true});
function listenPhotos(){
  uP = onSnapshot(collection(db, 'photos'), s => { s.forEach(d => { const x = d.data(); if(x.name) photos[x.name] = x.data; }); paintAll(); redraw(); }, () => {});
}

$('cvPh').onclick = () => $('cvFile').click();
$('cvFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  try{ const d = await shrink(f, 480, .6); if(d.length > 650000) alert('Photo bahut badi hai'); else sendMsg({text: '📷', img: d}); }catch(err){ alert(err.message); }
};
let rec = null, chunks = [], recT = null;
$('cvMic').onclick = async () => {
  if(rec){ rec.stop(); return; }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio: true}), mt = window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
    rec = new MediaRecorder(stream, mt ? {mimeType: mt, audioBitsPerSecond: 24000} : {audioBitsPerSecond: 24000}); chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = async () => {
      clearTimeout(recT); stream.getTracks().forEach(t => t.stop()); $('cvMic').innerHTML = ic('mic'); const r = rec; rec = null;
      if(!conv) return;
      const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(new Blob(chunks, {type: r.mimeType || 'audio/webm'})); });
      if(url.length > 650000) alert('Voice message bahut lamba hai. 30 second tak rakho.'); else sendMsg({text: '🎤', aud: url});
    };
    rec.start(); $('cvMic').innerHTML = ic('stop'); recT = setTimeout(() => rec && rec.stop(), 30000);
  }catch(err){ alert('Microphone ki permission do (voice ke liye https ya localhost chahiye). ' + err.message); }
};

$('chat').querySelector('.tools').insertAdjacentHTML('afterbegin', '<button class="ic" id="shSearch" type="button" title="Search" aria-label="Messages search">' + ic('search') + '</button>');
const sbar = el('label', 'field'); sbar.hidden = true; sbar.style.margin = '8px 12px 0'; sbar.innerHTML = '<input id="shQ" placeholder="Messages mein search karo..." aria-label="Search" autocomplete="off">';
$('msgs').insertAdjacentElement('beforebegin', sbar);
function filterMsgs(){ const q = $('shQ').value.trim().toLowerCase();
  $('msgs').querySelectorAll('.row').forEach(r => { r.style.display = !q || (r.dataset.text || '').toLowerCase().includes(q) || (r.dataset.name || '').toLowerCase().includes(q) ? '' : 'none'; }); }
$('shQ').oninput = filterMsgs;
$('shSearch').onclick = () => { sbar.hidden = !sbar.hidden; if(!sbar.hidden) $('shQ').focus(); else { $('shQ').value = ''; filterMsgs(); } };

const ob = el('button', 'link', '↑ Purane messages dikhao'); ob.type = 'button'; ob.style.cssText = 'width:100%;text-align:center;padding:8px;position:relative;z-index:1';
$('msgs').insertAdjacentElement('beforebegin', ob);
function oldRow(d){
  const m = d.data(), mine = !!me && m.uid === me.uid, nm = m.name || '?', row = el('div', 'row' + (mine ? ' me' : ''));
  row.dataset.id = d.id; row.dataset.text = m.text || ''; row.dataset.name = nm;
  if(!mine){ const a = el('div', 'av', nm.charAt(0).toUpperCase()); a.style.background = col(nm); row.appendChild(a); }
  const b = el('div', 'm'); if(!mine){ const n = el('div', 'n', nm); n.style.color = col(nm); b.appendChild(n); }
  if(m.img){ const im = el('img', 'pimg'); im.src = m.img; im.alt = 'Photo'; b.appendChild(im); }
  if(m.text && m.text !== '📷') b.appendChild(el('div', 'tx', m.text));
  const t = el('div', 't'); t.appendChild(el('span', 'tm', m.time ? m.time.toDate().toLocaleString('en-IN', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : '')); b.appendChild(t);
  row.appendChild(b); return row;
}
ob.onclick = async () => {
  const box = $('msgs'), firstRow = box.querySelector('.row[data-id]');
  if(!firstRow || !firstRow.dataset.id){ ob.textContent = 'Abhi koi message nahi'; return; }
  ob.disabled = true;
  try{
    const ref = await getDoc(doc(db, 'messages', firstRow.dataset.id));
    const s = await getDocs(query(collection(db, 'messages'), orderBy('time'), endBefore(ref), limitToLast(100)));
    if(s.empty){ ob.textContent = 'Aur purane messages nahi hain'; return; }
    const h0 = box.scrollHeight, frag = document.createDocumentFragment(); s.forEach(d => frag.appendChild(oldRow(d)));
    box.insertBefore(frag, box.firstChild); box.scrollTop += box.scrollHeight - h0;
    if(s.size < 100) ob.textContent = 'Aur purane messages nahi hain';
  }catch(err){ alert(err.message); }
  ob.disabled = false;
};

const gearSym = document.getElementById('i-gear');
if(gearSym) gearSym.innerHTML = '<circle cx="12" cy="12" r="8.6" stroke-width="3.4" stroke-dasharray="2.1 2.34" stroke-linecap="butt"/><circle cx="12" cy="12" r="6.3"/><circle cx="12" cy="12" r="2.4"/>';
const ist = document.createElement('style');
ist.textContent = `
#setb,#setb2{color:var(--acc);border-color:var(--acc);background:transparent}
#setb:hover,#setb2:hover{transform:rotate(70deg) scale(1.08);color:var(--acc)}
#thm{border:0;color:#fff;transition:transform .25s cubic-bezier(.3,1.6,.5,1),box-shadow .2s,background .3s}
[data-theme="dark"] #thm{background:linear-gradient(135deg,#FFC145,#FF7A18);box-shadow:0 6px 18px rgba(255,140,30,.45)}
[data-theme="light"] #thm{background:linear-gradient(135deg,#4B4FB8,#1B1F5E);color:#FFD84D;box-shadow:0 6px 18px rgba(40,45,140,.4)}
#thm:hover{transform:rotate(-18deg) scale(1.1);color:#fff}
[data-theme="light"] #thm:hover{color:#FFD84D}
`;
document.head.appendChild(ist);
