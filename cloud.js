// 아이디·비밀번호 로그인 + 계정 저장 + 전투력 랭킹 (Firebase, 모의주식과 같은 프로젝트·계정)
//  - 로그인하면 이 브라우저의 모든 캐릭터·아이템을 maple/{uid} 에 30초마다 저장, 다른 기기에서 로그인하면 이어서
//  - 랭킹: 각 계정의 캐릭터 중 가장 높은 전투력 순서, 30초마다 새로고침
const SYNC_MS = 30_000;
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const ID_DOMAIN = '@jh-stock.app'; // 모의주식과 같은 아이디 체계 (실제 메일은 안 감)
const cloud = { ready: false, user: null, nick: '', db: null, mode: 'login', pendingNick: '', rows: [], rankAt: 0, err: '' };
const idOf = u => (u.email || '').replace(ID_DOMAIN, '');
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function loadScript(src) {
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  });
}

// 이 브라우저에 저장된 메이플 데이터 전부 (캐릭터별 + 직접 등록 아이템)
function localData() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('maple-item')) out[k] = localStorage.getItem(k);
    }
  } catch (e) {}
  return out;
}
// 캐릭터 중 가장 높은 전투력
function bestPower(data) {
  let best = { power: -1, cls: '', level: 0 };
  for (const [k, v] of Object.entries(data)) {
    if (!k.startsWith(KEY)) continue;
    try { const d = JSON.parse(v); if ((d.power || 0) > best.power) best = { power: d.power || 0, cls: d.cls, level: d.level || 0 }; } catch (e) {}
  }
  return best;
}

async function initCloud() {
  if (!window.FIREBASE_CONFIG) return;
  if (location.protocol === 'file:') { cloud.err = '로그인은 사이트 주소(https://)로 열었을 때만 돼요.'; cloudRender(); return; }
  try {
    for (const f of ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js']) await loadScript(SDK + f);
  } catch (e) { cloud.err = '로그인 기능을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'; cloudRender(); return; }
  firebase.initializeApp(window.FIREBASE_CONFIG);
  cloud.db = firebase.firestore();
  cloud.ready = true;
  firebase.auth().onAuthStateChanged(onUser);
  setInterval(pushCloud, SYNC_MS);
  setInterval(() => { if ($('#rank')) refreshRank(); }, SYNC_MS);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pushCloud(); });
  cloudRender();
}

const userRef = () => cloud.db.collection('maple').doc(cloud.user.uid);

async function onUser(user) {
  cloud.user = user; cloud.nick = ''; cloud.err = '';
  if (user) {
    try {
      const doc = await userRef().get();
      if (doc.exists && doc.data().data) {
        // 계정에 저장된 진행 상황으로 덮어쓰기
        const d = doc.data();
        cloud.nick = d.nick;
        try {
          Object.keys(localData()).forEach(k => localStorage.removeItem(k));
          for (const [k, v] of Object.entries(d.data)) localStorage.setItem(k, v);
        } catch (e) {}
        if (window.reloadFromStorage) reloadFromStorage();
        toast(`${d.nick}님, 저장된 데이터를 불러왔어요`);
      } else {
        // 처음 로그인: 지금 이 브라우저의 데이터를 계정으로 옮김
        // 모의주식에서 쓰던 닉네임이 있으면 그대로
        let stockNick = '';
        try { const u = await cloud.db.collection('users').doc(user.uid).get(); if (u.exists) stockNick = u.data().nick || ''; } catch (e) {}
        cloud.nick = cloud.pendingNick || stockNick || idOf(user).slice(0, 12);
        cloud.pendingNick = '';
        await pushCloud();
        toast(`${cloud.nick}님, 지금 데이터를 계정에 저장했어요`);
      }
    } catch (e) { cloud.err = '계정 정보를 불러오지 못했어요: ' + e.message; }
  }
  cloudRender();
  refreshRank();
}

async function pushCloud() {
  if (!cloud.ready || !cloud.user || !cloud.nick) return false;
  if (typeof S !== 'undefined' && S) save(); // 열려 있는 캐릭터 전투력 갱신
  const data = localData(), best = bestPower(data);
  try {
    await userRef().set({
      nick: cloud.nick, power: Math.max(0, Math.round(best.power)), cls: best.cls, level: best.level,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), data,
    });
    return true;
  } catch (e) { return false; }
}

async function refreshRank() {
  if (!cloud.ready || !cloud.user) return;
  try {
    const q = await cloud.db.collection('maple').orderBy('power', 'desc').limit(50).get();
    cloud.rows = q.docs.map(d => ({ uid: d.id, ...d.data() }));
    cloud.rankAt = Date.now();
  } catch (e) { cloud.err = '랭킹을 불러오지 못했어요: ' + e.message; }
  renderRank();
}

// ---------- 화면 ----------
function cloudRender() { renderAccount(); renderRank(); }

function renderAccount() {
  const box = $('#account'); if (!box) return;
  if (cloud.err && !cloud.ready) { box.innerHTML = `<p class="muted small">${esc(cloud.err)}</p>`; return; }
  if (!cloud.ready) { box.innerHTML = '<p class="muted small">로그인 기능을 불러오는 중…</p>'; return; }
  const join = cloud.mode === 'join';
  box.innerHTML = cloud.user
    ? `<div class="acc-row"><span><b class="acc-nick">${esc(cloud.nick || '…')}</b> <span class="muted small">아이디 ${esc(idOf(cloud.user))}</span></span>
        <span><button class="sm" data-act="accSave">지금 저장</button> <button class="sm" data-act="accOut">로그아웃</button></span></div>
       <p class="muted small">30초마다 모든 캐릭터가 계정에 저장되고 랭킹에 반영돼요.</p>`
    : `<p class="muted small">${join ? '회원가입하면 지금 이 브라우저의 캐릭터들이 계정으로 옮겨져요.' : '로그인하면 다른 기기에서도 이어서 하고 전투력 랭킹에 참여해요. (모의주식 아이디도 돼요)'}</p>
       <form id="accForm" class="acc-form">
         <input id="accId" placeholder="아이디 (영문·숫자 3~16자)" autocomplete="username" autocapitalize="off" spellcheck="false">
         <input id="accPw" type="password" placeholder="비밀번호 (6자 이상)" autocomplete="${join ? 'new-password' : 'current-password'}">
         ${join ? '<input id="accPw2" type="password" placeholder="비밀번호 확인" autocomplete="new-password"><input id="accNick" placeholder="닉네임 (랭킹에 보임, 2~12자)">' : ''}
         <button class="primary">${join ? '회원가입' : '로그인'}</button>
       </form>
       <p class="small">${join ? '이미 계정이 있나요?' : '처음이신가요?'} <button class="link-btn" data-act="accMode">${join ? '로그인' : '회원가입'}</button></p>
       <p id="accMsg" class="bad small">${esc(cloud.err)}</p>`;
}

function renderRank() {
  const box = $('#rank'); if (!box) return;
  if (!cloud.ready || !cloud.user) { box.innerHTML = '<h2>전투력 랭킹</h2><p class="muted small">로그인하면 랭킹을 볼 수 있어요.</p>'; return; }
  const me = cloud.user.uid;
  box.innerHTML = `<h2>전투력 랭킹 <span class="muted small">${cloud.rankAt ? new Date(cloud.rankAt).toLocaleTimeString('ko-KR') + ' 기준 · 30초마다 갱신' : ''}</span></h2>
    <div class="rank-list">${cloud.rows.length ? cloud.rows.map((r, i) => `
      <div class="rank-row ${r.uid === me ? 'me' : ''}">
        <span class="rk ${i < 3 ? 'top' + (i + 1) : ''}">${i + 1}</span>
        <span class="rk-name"><b>${esc(r.nick)}</b> <span class="muted small">${esc(r.cls || '')}${r.level ? ' Lv.' + r.level : ''}</span></span>
        <b class="rk-power">${fmtPower(r.power || 0)}</b>
      </div>`).join('') : '<p class="muted small">아직 아무도 없어요.</p>'}</div>`;
}

const AUTH_ERR = {
  'auth/email-already-in-use': '이미 있는 아이디예요.',
  'auth/invalid-credential': '아이디 또는 비밀번호가 맞지 않아요.',
  'auth/wrong-password': '아이디 또는 비밀번호가 맞지 않아요.',
  'auth/user-not-found': '아이디 또는 비밀번호가 맞지 않아요.',
  'auth/weak-password': '비밀번호는 6자 이상으로 해 주세요.',
  'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 해 주세요.',
  'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
};
async function submitAuth() {
  const join = cloud.mode === 'join';
  const id = $('#accId').value.trim().toLowerCase(), pw = $('#accPw').value, say = t => ($('#accMsg').textContent = t);
  if (!/^[a-z0-9_]{3,16}$/.test(id)) return say('아이디는 영문 소문자·숫자·_ 3~16자로 해 주세요.');
  if (pw.length < 6) return say('비밀번호는 6자 이상으로 해 주세요.');
  try {
    if (join) {
      const nick = $('#accNick').value.trim();
      if (pw !== $('#accPw2').value) return say('비밀번호 확인이 맞지 않아요.');
      if (nick.length < 2 || nick.length > 12) return say('닉네임은 2~12자로 해 주세요.');
      cloud.pendingNick = nick;
      await firebase.auth().createUserWithEmailAndPassword(id + ID_DOMAIN, pw);
    } else {
      await firebase.auth().signInWithEmailAndPassword(id + ID_DOMAIN, pw);
    }
  } catch (e) { cloud.pendingNick = ''; say(AUTH_ERR[e.code] || '실패했어요: ' + e.message); }
}

document.addEventListener('submit', e => {
  if (e.target.id !== 'accForm') return;
  e.preventDefault(); submitAuth();
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'accMode') { cloud.mode = cloud.mode === 'join' ? 'login' : 'join'; cloud.err = ''; renderAccount(); }
  if (b.dataset.act === 'accSave') { toast((await pushCloud()) ? '계정에 저장했어요' : '저장하지 못했어요'); refreshRank(); }
  if (b.dataset.act === 'accOut') { await pushCloud(); firebase.auth().signOut(); }
});

initCloud();
