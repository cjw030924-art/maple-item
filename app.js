// ===== 유틸 =====
const $ = s => document.querySelector(s);
const rnd = Math.random;
const pick = a => a[Math.floor(rnd() * a.length)];
const fmt = n => Math.round(n).toLocaleString('ko-KR');
// 직접 등록한 아이템 (모든 캐릭터 공용)
const CUSTOM_KEY = 'maple-item-custom';
let CUSTOM = [];
try { CUSTOM = JSON.parse(localStorage.getItem(CUSTOM_KEY)) || []; } catch (e) {}
ITEMS.push(...CUSTOM);
const TPL = Object.fromEntries(ITEMS.map(i => [i.id, i]));
function addCustom(f) {
  const st = +f.stat || 0;
  const t = { id: 'custom-' + Date.now(), name: f.name.trim(), set: '직접 등록', slot: f.slot, level: +f.level || 0, group: 'all', custom: true,
    s: { STR: st, DEX: st, INT: st, LUK: st }, pad: +f.pad || 0, mad: +f.mad || 0, icon: f.icon.trim() || null };
  CUSTOM.push(t); ITEMS.push(t); TPL[t.id] = t;
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(CUSTOM)); } catch (e) {}
  return t;
}
function removeCustom(id) {
  CUSTOM = CUSTOM.filter(t => t.id !== id);
  const i = ITEMS.findIndex(t => t.id === id); if (i >= 0) ITEMS.splice(i, 1);
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(CUSTOM)); } catch (e) {}
}
const KEY = 'maple-item:';
const STATS4 = ['STR', 'DEX', 'INT', 'LUK'];
const GRADES = ['레어', '에픽', '유니크', '레전드리'];

function fmtMeso(n) {
  if (n >= 1e12) return `${Math.floor(n / 1e12)}조 ${Math.floor(n % 1e12 / 1e8)}억`;
  if (n >= 1e8) return `${Math.floor(n / 1e8)}억 ${Math.floor(n % 1e8 / 1e4)}만`;
  if (n >= 1e4) return `${Math.floor(n / 1e4)}만`;
  return fmt(n);
}
function wpick(w) {
  let r = rnd(), acc = 0;
  for (const [k, p] of Object.entries(w)) { acc += p; if (r < acc) return +k; }
  return +Object.keys(w).pop();
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1600);
}

// ===== 상태 =====
let S = null, cls = null, M = null;
const UI = { q: '', slot: '전체' };

function load(name) {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY + name)); } catch (e) {}
  S = d || { cls: name, inv: [], eq: {}, uid: 1, log: { meso: 0, sf: 0, boom: 0, red: 0, black: 0, add: 0, flameR: 0, flameE: 0 } };
  if (!S.level) S.level = 200;
  S.exp = S.exp || 0;
  S.sym = S.sym || {};
  delete S.pets; delete S.petEq; // 예전 펫 기능 데이터
  S.inv.forEach(i => { if (i.id === '펫장비') i.id = '1802653'; }); // 예전 펫장비 → 루나 크리스탈 키
  S.hyper = S.hyper || {};
  S.abil = S.abil || { grade: 0, lines: [abilLine(0), abilLine(0), abilLine(0)] };
  S.hexa = S.hexa || PANEL_BLANK.hexa();
  S.etc = S.etc || PANEL_BLANK.etc();
  // 아티팩트·유니온(휘장/점령)은 계정 공용
  loadAcc();
  S.art = ACC.art;
  delete S.etc.champ; delete S.etc.raid; delete S.etc.raidPts;
  UNION = null;
  cls = CLASSES.find(c => c.name === name);
  // 예전 버전 데이터에 남은 없어진 아이템 정리
  S.inv = S.inv.filter(i => TPL[i.id]);
  for (const k in S.eq) if (!findItem(S.eq[k])) delete S.eq[k];
}
function save() {
  if (!S) return;
  try { S.power = totals().power; } catch (e) {}
  const { art, ...rest } = S; // 아티팩트는 계정 공용 저장소에
  try { localStorage.setItem(KEY + S.cls, JSON.stringify(rest)); } catch (e) {}
  saveAcc();
}
// 계정 공용 (모든 캐릭터): 아티팩트, 유니온 챔피언 휘장, 공격대 점령
const ACC_KEY = 'maple-item-account';
let ACC = null;
function loadAcc() {
  if (ACC) return;
  try { ACC = JSON.parse(localStorage.getItem(ACC_KEY)); } catch (e) {}
  if (ACC) return;
  ACC = { art: PANEL_BLANK.art(), union: PANEL_BLANK.union() };
  // 예전엔 캐릭터별로 저장됐으니 가장 많이 키운 캐릭터 것을 가져옴
  const artScore = a => a.lv * 100 + a.crystals.reduce((s, c) => s + ((c && c.lv) || 0), 0);
  const uniScore = e => e.champ.reduce((s, g) => s + g, 0) + Object.values(e.raid || {}).reduce((s, n) => s + n, 0);
  let best = 0;
  CLASSES.forEach(c => {
    const d = savedCount(c.name);
    if (!d) return;
    if (d.art && artScore(d.art) > artScore(ACC.art)) ACC.art = d.art;
    if (d.etc && d.etc.champ && uniScore(d.etc) > best) {
      best = uniScore(d.etc);
      ACC.union = { champ: d.etc.champ, raid: d.etc.raid || {}, raidPts: d.etc.raidPts != null ? d.etc.raidPts : null };
    }
  });
  saveAcc();
}
function saveAcc() {
  if (ACC) try { localStorage.setItem(ACC_KEY, JSON.stringify(ACC)); } catch (e) {}
}
// 로그인 후 계정 데이터로 바뀌었을 때 다시 읽기
function reloadFromStorage() {
  try { CUSTOM = JSON.parse(localStorage.getItem(CUSTOM_KEY)) || []; } catch (e) { CUSTOM = []; }
  CUSTOM.forEach(t => { if (!TPL[t.id]) { ITEMS.push(t); TPL[t.id] = t; } });
  if (M && M.auto) clearInterval(M.auto.timer);
  ACC = null;
  M = null; renderSelect();
}
function savedCount(name) {
  try { return JSON.parse(localStorage.getItem(KEY + name)); } catch (e) { return null; }
}
const findItem = uid => S.inv.find(i => i.uid === uid);
const ATT_KEY = () => (cls.main === 'INT' ? 'MATT' : 'ATT');
const tMain = t => t.s[cls.main] || 0;
const tSub = t => t.s[cls.sub] || 0;
const tAtt = t => (cls.main === 'INT' ? t.mad : t.pad) || 0;
const iconHtml = (t, c = 'icon') => (t.icon ? `<img class="${c}" src="${t.icon}" alt="">` : `<span class="${c} noimg">${t.slot}</span>`);
const ATT_NAME = () => (cls.main === 'INT' ? '마력' : '공격력');

// ===== 부위 규칙 =====
const POT_CAT = { 무기: 'weapon', 보조: 'weapon', 엠블렘: 'weapon', 장갑: 'glove', 모자: 'hat',
  얼굴: 'acc', 눈: 'acc', 귀고리: 'acc', 반지: 'acc', 펜던트: 'acc', 하트: 'acc',
  상의: 'armor', 하의: 'armor', 한벌옷: 'armor', 신발: 'armor', 망토: 'armor', 어깨: 'armor', 벨트: 'armor' };
const SF_OK = s => !['보조', '엠블렘', '포켓', '뱃지', '훈장', '펫장비'].includes(s);
const FLAME_OK = s => ['무기', '모자', '상의', '하의', '한벌옷', '신발', '장갑', '망토', '벨트', '펜던트', '귀고리', '얼굴', '눈', '포켓'].includes(s);
const maxStar = L => (L < 95 ? 5 : L < 108 ? 8 : L < 118 ? 10 : L < 128 ? 15 : L < 138 ? 20 : 30);
const maxStarT = t => (t.destiny ? 25 : maxStar(t.level));
const lvIdx = L => (L < 140 ? 0 : L < 150 ? 1 : L < 160 ? 2 : L < 200 ? 3 : L < 250 ? 4 : 5);

const LAYOUT = [
  ['반지1', '얼굴', null, '모자', '망토'],
  ['반지2', '눈', '무기', '상의', '장갑'],
  ['반지3', '귀고리', '보조', '하의', '신발'],
  ['반지4', '펜던트1', '엠블렘', '어깨', '뱃지'],
  ['벨트', '펜던트2', null, null, '훈장'],
  ['포켓', 'ART', 'HEXA', 'ETC', '하트'],
  ['펫장비1', '펫장비2', '펫장비3', 'ABIL', 'HYPER'],
];
const SLOT_CHIPS = ['전체', '무기', '보조', '엠블렘', '모자', '상의', '하의', '신발', '장갑', '망토', '어깨', '벨트', '얼굴', '눈', '귀고리', '반지', '펜던트', '포켓', '뱃지', '훈장', '하트', '펫장비'];
function slotKeys(s) {
  if (s === '반지') return ['반지1', '반지2', '반지3', '반지4'];
  if (s === '펫장비') return ['펫장비1', '펫장비2', '펫장비3'];
  if (s === '펜던트') return ['펜던트1', '펜던트2'];
  if (s === '한벌옷') return ['상의'];
  return [s];
}
const keyToSlot = k => k.replace(/\d$/, '');

function canUse(t) {
  if (t.only && t.only !== cls.name) return false;
  if (t.onlyAny && !t.onlyAny.includes(cls.name)) return false;
  if (t.weapon && !cls.weapons.includes(t.weapon)) return false;
  return t.group === 'all' || t.group === cls.group;
}

// ===== 스타포스 =====
const SF_SUCC = [95, 90, 85, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 30, 30, 15, 15, 15, 30, 15, 15, 10, 10, 10, 7, 5, 3, 1];
const SF_BOOM = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2.1, 2.1, 6.8, 6.8, 8.5, 10.5, 12.75, 17, 18, 18, 18, 18.6, 19, 19.4, 19.8];

function sfRates(s, o) {
  const base = SF_SUCC[s] / 100;
  const su = o.catch ? Math.min(1, base * 1.05) : base;
  let bo = SF_BOOM[s] / 100;
  if (o.prevent && s >= 15 && s <= 17) bo = 0;
  bo = base < 1 ? bo / (1 - base) * (1 - su) : 0;
  return { su, bo, fa: Math.max(0, 1 - su - bo) };
}
function sfCost(L, s) {
  const l3 = L ** 3;
  let c;
  if (s < 10) c = 1000 + l3 * (s + 1) / 36;
  else {
    const d = { 10: 571, 11: 314, 12: 214, 13: 157, 14: 107, 15: 200, 16: 200, 17: 150, 18: 70, 19: 45, 20: 200, 21: 125 }[s] || 200;
    c = 1000 + l3 * Math.pow(s + 1, 2.7) / d;
  }
  return Math.round(c / 100) * 100;
}
function sfPrice(t, s, o) {
  const base = sfCost(t.level, s);
  let c = o.sunday ? base * 0.7 : base;
  if (o.prevent && s >= 15 && s <= 17) c += base * 2;
  return Math.round(c);
}
function sfBonus(t, star, baseAtt = tAtt(t)) {
  let stat = 0, att = 0, watt = baseAtt;
  const isW = t.slot === '무기', i = lvIdx(t.level);
  for (let s = 1; s <= star; s++) {
    if (s <= 15) {
      stat += s <= 5 ? 2 : 3;
      if (isW) { const a = Math.floor(watt / 50) + 1; watt += a; att += a; }
      else if (t.slot === '장갑' && [5, 7, 9, 11, 13, 14, 15].includes(s)) att += 1;
    } else {
      if (s <= 22) stat += [7, 9, 11, 13, 15, 17][i];
      const base = isW ? [6, 7, 8, 9, 13, 15][i] : [7, 8, 9, 10, 12, 14][i];
      att += base + (s - 16) + (s > 22 ? (s - 22) : 0);
    }
  }
  return { stat, att };
}
function doStar(it, o) {
  const t = TPL[it.id], s = it.star;
  if (s >= maxStarT(t)) return null;
  S.log.meso += sfPrice(t, s, o);
  S.log.sf++;
  const { su, bo } = sfRates(s, o);
  const r = rnd();
  if (r < su) { it.star++; return 'success'; }
  if (r < su + bo) { it.star = 12; S.log.boom++; return 'boom'; }
  return 'fail';
}

// ===== 잠재능력 =====
const CUBES = {
  red: { name: '레드 큐브', kind: 'pot', up: [0.06, 0.018, 0.003], prime: [1, 0.1, 0.01] },
  black: { name: '블랙 큐브', kind: 'pot', choose: true, up: [0.15, 0.035, 0.012], prime: [1, 0.2, 0.05] },
  add: { name: '에디셔널 큐브', kind: 'add', up: [0.047619, 0.019608, 0.004975], prime: [1, 0.05, 0.01] },
  white: { name: '화이트 에디셔널 큐브', kind: 'add', up: [0.047619, 0.019608, 0.004975], prime: [1, 0.05, 0.01], choose: true },
};
function potPool(cat, edi) {
  const p = [];
  const add = (k, n, v, u = '%') => p.push({ k, n, v, u });
  if (cat === 'weapon') {
    if (!edi) {
      add('ATT%', '공격력', [3, 6, 9, 12]); add('MATT%', '마력', [3, 6, 9, 12]);
      add('DMG%', '데미지', [3, 6, 9, 12]);
      add('BOSS%', '보스 몬스터 공격 시 데미지', [null, null, 30, 40]);
      add('BOSS%', '보스 몬스터 공격 시 데미지', [null, null, null, 35]);
      add('IED%', '몬스터 방어율 무시', [null, 15, 30, 40]);
      STATS4.forEach(s => add(s + '%', s, [3, 6, 9, 12]));
    } else {
      add('ATT%', '공격력', [3, 6, 9, 12]); add('MATT%', '마력', [3, 6, 9, 12]);
      add('ATT', '공격력', [6, 10, 12, 14], ''); add('MATT', '마력', [6, 10, 12, 14], '');
      add('DMG%', '데미지', [2, 4, 6, 9]);
      add('BOSS%', '보스 몬스터 공격 시 데미지', [null, null, 12, 18]);
      STATS4.forEach(s => add(s + '%', s, [2, 4, 5, 7]));
    }
    return p;
  }
  if (!edi) {
    STATS4.forEach(s => add(s + '%', s, [3, 6, 9, 12]));
    add('ALL%', '올스탯', [null, 3, 6, 9]);
    add('HP%', '최대 HP', [3, 6, 9, 12]);
    if (cat === 'glove') add('CD%', '크리티컬 데미지', [null, null, null, 8]);
    if (cat === 'hat') {
      add('CDR', '모든 스킬의 재사용 대기시간', [null, null, null, 1], '초');
      add('CDR', '모든 스킬의 재사용 대기시간', [null, null, null, 2], '초');
    }
    if (cat === 'acc') {
      add('MESO', '메소 획득량', [null, null, null, 20]);
      add('DROP', '아이템 드롭률', [null, null, null, 20]);
    }
  } else {
    STATS4.forEach(s => {
      add(s + '%', s, [2, 4, 5, 7]);
      add(s, s, [6, 10, 14, 18], '');
      add('LV' + s, '캐릭터 기준 9레벨 당 ' + s, [null, null, 1, 2], '');
    });
    add('ALL%', '올스탯', [null, 2, 4, 6]);
    add('ATT', '공격력', [3, 6, 10, 14], ''); add('MATT', '마력', [3, 6, 10, 14], '');
    add('HP%', '최대 HP', [2, 5, 7, 10]);
    if (cat === 'glove') add('CD%', '크리티컬 데미지', [null, null, null, 3]);
  }
  return p;
}
// 250제(에테르넬 등)는 %스탯/공마%/데미지%/HP% 옵션이 1%p 높음 (예: 레전 주스탯 13%, 올스탯 10%)
const LV160_BONUS = /^(STR|DEX|INT|LUK|ALL|HP|ATT|MATT|DMG)%$/;
function rollLines(cat, grade, primes, edi, level = 0) {
  const pool = potPool(cat, edi);
  return [0, 1, 2].map(i => {
    const g = rnd() < primes[i] ? grade : Math.max(0, grade - 1);
    const o = pick(pool.filter(x => x.v[g] != null));
    let val = o.v[g] + (level >= 250 && LV160_BONUS.test(o.k) ? 1 : 0);
    // 250제 에디셔널: 주스탯% 레전 9 / 유니크 7, 올스탯% 레전 7 / 유니크 6
    if (edi && level >= 250 && /^(STR|DEX|INT|LUK)%$/.test(o.k)) val = [3, 5, 7, 9][g];
    if (edi && level >= 250 && o.k === 'ALL%') val = [null, 4, 6, 7][g];
    // 250제 무기류 잠재: 레전드리 보공 35/40 → 40/45
    if (!edi && level >= 250 && o.k === 'BOSS%' && g === 3) val += 5;
    return { k: o.k, n: o.n, u: o.u, val };
  });
}
function cubeRoll(it, type) {
  const C = CUBES[type], cat = POT_CAT[TPL[it.id].slot];
  let g = it[C.kind].grade;
  if (g < 3 && rnd() < C.up[g]) g++;
  S.log[type] = (S.log[type] || 0) + 1;
  return { grade: g, lines: rollLines(cat, g, C.prime, C.kind === 'add', TPL[it.id].level) };
}
const lineText = l => (l.k === 'CDR' ? `${l.n} : -${l.val}초` : `${l.n} +${l.val}${l.u}`);

// ===== 추가옵션 =====
const FLAMES = {
  flameR: { name: '강력한 환생의 불꽃', w: { 3: 0.2, 4: 0.3, 5: 0.36, 6: 0.14 } },
  flameE: { name: '영원한 환생의 불꽃', w: { 4: 0.29, 5: 0.45, 6: 0.25, 7: 0.01 } },
  flameB: { name: '검은 환생의 불꽃', w: { 4: 0.2, 5: 0.3, 6: 0.36, 7: 0.14 } },
};
const FLAME_POOL = ['STR', 'DEX', 'INT', 'LUK', 'STR+DEX', 'STR+INT', 'STR+LUK', 'DEX+INT', 'DEX+LUK', 'INT+LUK',
  'HP', 'ATT', 'MATT', 'ALL%', 'LVR', 'SPD', 'JMP', 'DEF'];
const FLAME_LABEL = { HP: '최대 HP', ATT: '공격력', MATT: '마력', 'ALL%': '올스탯', LVR: '착용 레벨 감소', SPD: '이동속도',
  JMP: '점프력', DEF: '방어력', 'BOSS%': '보스 몬스터 공격 시 데미지', 'DMG%': '데미지' };

function flameVal(k, tier, t) {
  const L = t.level;
  if (STATS4.includes(k)) return (Math.floor(L / 20) + 1) * tier;
  if (k.includes('+')) return (Math.floor(L / 40) + 1) * tier;
  if (k === 'HP') return Math.max(1, Math.floor(L / 10)) * 30 * tier;
  if (k === 'ATT' || k === 'MATT') return t.slot === '무기' ? Math.ceil(tAtt(t) * tier * (L >= 200 ? 0.055 : L >= 160 ? 0.044 : 0.033)) : tier;
  if (k === 'BOSS%') return 2 * tier;
  if (k === 'LVR') return 5 * tier;
  if (k === 'DEF') return (Math.floor(L / 20) + 1) * tier;
  return tier;
}
function rollFlame(it, type) {
  const t = TPL[it.id];
  const pool = t.slot === '무기' ? [...FLAME_POOL, 'BOSS%', 'DMG%'] : FLAME_POOL;
  S.log[type] = (S.log[type] || 0) + 1;
  return shuffle([...pool]).slice(0, 4).map(k => {
    const tier = wpick(FLAMES[type].w);
    return { k, tier, val: flameVal(k, tier, t) };
  });
}
function flameText(f) {
  const unit = ['ALL%', 'BOSS%', 'DMG%'].includes(f.k) ? '%' : '';
  const name = FLAME_LABEL[f.k] || f.k.replace('+', ' · ');
  return `${name} : ${f.k === 'LVR' ? '-' : '+'}${f.val}${unit}`;
}
function flameNum(it, lines = it.flame) {
  const t = TPL[it.id], A = ATT_KEY();
  if (!lines) return 0;
  if (t.slot === '무기') { const a = lines.find(f => f.k === A); return a ? 8 - a.tier : 99; } // N추 (작을수록 좋음)
  let sc = 0;
  lines.forEach(f => {
    if (f.k === cls.main || (f.k.includes('+') && f.k.split('+').includes(cls.main))) sc += f.val;
    else if (f.k === A) sc += f.val * 4;
    else if (f.k === 'ALL%') sc += f.val * 10;
  });
  return sc;
}
const flameBetter = (it, a, b) => (TPL[it.id].slot === '무기' ? flameNum(it, a) < flameNum(it, b) : flameNum(it, a) > flameNum(it, b));
// 추옵 스탯 직접 고르기: 고를 수 있는 항목
const FCOND = [['STR', 'STR'], ['DEX', 'DEX'], ['INT', 'INT'], ['LUK', 'LUK'], ['HP', '최대 HP'], ['ALL%', '올스탯%'],
  ['ATT', '공격력'], ['MATT', '마력'], ['BOSS%', '보스 데미지%'], ['DMG%', '데미지%'], ['LVR', '착용 레벨 감소']];
// 그 스탯의 합 (STR 등은 STR이 들어간 이중 스탯 줄도 포함)
function flameStatSum(lines, k) {
  return lines.reduce((a, f) => a + (f.k === k || (STATS4.includes(k) && f.k.includes('+') && f.k.split('+').includes(k)) ? f.val : 0), 0);
}
function flameGoalMet(it, lines) {
  const g = M.fgoal, n = flameNum(it, lines);
  if (g.mode === 'custom') return g.conds.length > 0 && g.conds.every(c => flameStatSum(lines, c.k) >= c.min);
  if (TPL[it.id].slot === '무기') {
    const boss = lines.filter(f => f.k === 'BOSS%').reduce((a, f) => a + f.val, 0);
    return n <= g.wtier && boss >= g.boss;
  }
  return n >= g.score;
}
function flameScore(it) {
  if (!it.flame || !it.flame.length) return '';
  const t = TPL[it.id], A = ATT_KEY();
  if (t.slot === '무기') {
    const a = it.flame.find(f => f.k === A);
    return a ? `${ATT_NAME()} ${8 - a.tier}추` : `${ATT_NAME()} 없음`;
  }
  let sc = 0;
  it.flame.forEach(f => {
    if (f.k === cls.main) sc += f.val;
    else if (f.k.includes('+') && f.k.split('+').includes(cls.main)) sc += f.val;
    else if (f.k === A) sc += f.val * 4;
    else if (f.k === 'ALL%') sc += f.val * 10;
  });
  return `${sc}급`;
}

// ===== 스탯 계산 =====
function itemParts(it) {
  const t = TPL[it.id], A = ATT_KEY();
  const sf = sfBonus(t, it.star);
  const fl = { main: 0, sub: 0, att: 0, all: 0, boss: 0, dmg: 0 };
  (it.flame || []).forEach(f => {
    const ks = f.k.split('+');
    if (STATS4.includes(ks[0])) {
      if (ks.includes(cls.main)) fl.main += f.val;
      if (ks.includes(cls.sub)) fl.sub += f.val;
    } else if (f.k === A) fl.att += f.val;
    else if (f.k === 'ALL%') fl.all += f.val;
    else if (f.k === 'BOSS%') fl.boss += f.val;
    else if (f.k === 'DMG%') fl.dmg += f.val;
  });
  return { t, sf, fl };
}
function itemStats(it) {
  const { t, sf, fl } = itemParts(it), A = ATT_KEY();
  const sc = scOf(it);
  const ex = exStat(t, exOf(it));
  const r = { main: tMain(t) + sf.stat + fl.main + sc.s[cls.main] + ex.stat, sub: tSub(t) + sf.stat + fl.sub + sc.s[cls.sub] + ex.stat,
    att: tAtt(t) + sf.att + fl.att + (cls.main === 'INT' ? sc.mad : sc.pad) + ex.att,
    mainPct: fl.all, attPct: 0, boss: fl.boss + (t.boss || 0), dmg: fl.dmg, cd: 0, ied: [] };
  if (t.ied) r.ied.push(t.ied);
  [it.pot, it.add].forEach(p => p && p.lines.forEach(l => {
    if (l.k === cls.main + '%' || l.k === 'ALL%') r.mainPct += l.val;
    else if (l.k === A + '%') r.attPct += l.val;
    else if (l.k === A) r.att += l.val;
    else if (l.k === cls.main) r.main += l.val;
    else if (l.k === 'LV' + cls.main) r.main += l.val * Math.floor(S.level / 9);
    else if (l.k === 'BOSS%') r.boss += l.val;
    else if (l.k === 'DMG%') r.dmg += l.val;
    else if (l.k === 'IED%') r.ied.push(l.val);
    else if (l.k === 'CD%') r.cd += l.val;
  }));
  const so = it.soul;
  if (so) {
    const [, v] = SOUL_OPTS[so.opt];
    r.att += SOUL_ATT;
    if (so.opt === A + '%') r.attPct += v;
    else if (so.opt === 'BOSS%') r.boss += v;
    else if (so.opt === 'IED%') r.ied.push(v);
    if (so.pot && so.amp) so.pot.lines.forEach(l => {
      if (l.k === cls.main + '%') r.mainPct += soulVal(so, l);
      else if (l.k === A + '%') r.attPct += soulVal(so, l);
    });
  }
  return r;
}
const getIt = v => (typeof v === 'object' ? v : findItem(v));
function totals(eq = S.eq) {
  const r = { main: 0, sub: 0, att: 0, mainPct: 0, attPct: 0, boss: 0, dmg: 0, cd: 0, ied: 0 };
  let keep = 1;
  new Set(Object.values(eq)).forEach(v => {
    const it = getIt(v); if (!it) return;
    const s = itemStats(it);
    ['main', 'sub', 'att', 'mainPct', 'attPct', 'boss', 'dmg', 'cd'].forEach(k => (r[k] += s[k]));
    s.ied.forEach(v => (keep *= 1 - v / 100));
  });
  // 광휘 세트 효과
  const rad = new Set([...new Set(Object.values(eq))].map(v => getIt(v)).filter(it => it && TPL[it.id].set === '광휘').map(it => it.id)).size;
  r.radiance = rad;
  // 에테르넬 세트 (무기 제외 부위 수)
  const ete = new Set([...new Set(Object.values(eq))].map(v => getIt(v)).filter(it => it && TPL[it.id].set === '에테르넬').map(it => TPL[it.id].slot)).size;
  r.eternal = ete;
  for (let n = 2; n <= Math.min(8, ete); n++) {
    const e = ETERNAL_SET[n];
    r.main += e.all || 0; r.sub += e.all || 0; r.att += e.att; r.boss += e.boss || 0;
    if (e.ied) keep *= 1 - e.ied / 100;
  }
  for (let n = 2; n <= rad; n++) {
    const e = RADIANCE_SET[n];
    r.main += e.all; r.sub += e.all; r.att += e.att; r.boss += e.boss || 0; r.cd += e.cd || 0;
    if (e.ied) keep *= 1 - e.ied / 100;
  }
  const U = getUnion();
  r.att += U.att; r.boss += U.boss;
  const H = hyperStat(), AB = abilStat();
  r.main += AB.main; r.att += H.att + AB.att; r.boss += H.boss + AB.boss; r.dmg += H.dmg; r.cd += H.cd;
  if (H.ied) keep *= 1 - H.ied / 100;
  // 아티팩트 / 헥사 스탯 / 기타(유챔 휘장·공격대 점령·직접 입력)
  const X = [artStat(), hexaStat(), etcStat()];
  r.fd = 0; r.mainFlat = 0;
  X.forEach(x => {
    r.main += x.all || 0; r.sub += x.all || 0; r.mainFlat += x.flat || 0; r.mainPct += x.mainPct || 0;
    r.att += x.att || 0; r.attPct += x.attPct || 0; r.dmg += x.dmg || 0; r.boss += x.boss || 0;
    r.cd += x.cd || 0; r.fd += x.fd || 0;
    (x.ied || []).forEach(v => (keep *= 1 - v / 100));
  });
  r.ied = (1 - keep) * 100;
  r.sym = symStat();
  // % 미적용 주스탯: 심볼 · 유니온 · 하이퍼 스탯 · 헥사 스탯 · 공격대 점령 등
  r.mainFlat += r.sym + U.main + H.main;
  const BASE_MAIN = 18 + 5 * (S.level - 1), BASE_SUB = 4;
  r.mainTot = Math.floor((BASE_MAIN + r.main) * (1 + r.mainPct / 100) + r.mainFlat);
  const statScore = (4 * r.mainTot + BASE_SUB + r.sub) / 100;
  // 게임 전투력: 스탯 × 공/마 × 데미지(데미지%+보공%) × 최종 데미지 × 크리티컬(135% + 크뎀%), 방무는 미반영
  r.power = Math.floor(statScore * r.att * (1 + r.attPct / 100) * (1 + (r.dmg + r.boss) / 100) * (1 + r.fd / 100) * (1 + (35 + r.cd) / 100));
  return r;
}

// ===== 전투력 비교 =====
// 아이템을 장착했을 때의 장비 배치(가상). val 은 실제 장착이면 uid, 비교용이면 아이템 객체
function simEquip(eq, it, val) {
  const e = { ...eq }, t = TPL[it.id];
  const keys = slotKeys(t.slot);
  const k = keys.find(k => !e[k]) || keys[0];
  const replaced = e[k] ? getIt(e[k]) : null;
  e[k] = val;
  if (t.slot === '한벌옷') delete e['하의'];
  if (t.slot === '하의') {
    const top = e['상의'] && getIt(e['상의']);
    if (top && TPL[top.id].slot === '한벌옷') delete e['상의'];
  }
  return { e, replaced };
}
// 장착중이면 이 템이 주는 전투력, 아니면 장착 시 변화량
function powerDiff(it) {
  const now = totals().power;
  const k = it.uid && equippedKey(it.uid);
  if (k) { const e = { ...S.eq }; delete e[k]; return { diff: now - totals(e).power, equipped: true }; }
  const { e, replaced } = simEquip(S.eq, it, it);
  return { diff: totals(e).power - now, replaced };
}
const diffHtml = d => (d > 0 ? `<span class="up">▲ ${fmt(d)}</span>` : d < 0 ? `<span class="down">▼ ${fmt(-d)}</span>` : '<span class="muted">변화 없음</span>');
function fmtPower(n) {
  const eok = Math.floor(n / 1e8), man = Math.floor(n % 1e8 / 1e4), rest = n % 1e4;
  return [eok && `${eok}억`, (eok || man) && `${man}만`, `${rest}`].filter(Boolean).join(' ');
}

// ===== 레벨 / 유니온 / 심볼 =====
const expNeed = lv => Math.round(3 * Math.pow(1.04, lv - 200));
let UNION = null;
const getUnion = () => (UNION = UNION || unionInfo());
function unionInfo() {
  const chars = [];
  CLASSES.forEach(c => {
    let lv = 0;
    if (S && c.name === S.cls) lv = S.level;
    else try { const d = JSON.parse(localStorage.getItem(KEY + c.name)); lv = (d && d.level) || 0; } catch (e) {}
    if (lv) chars.push({ name: c.name, lv });
  });
  chars.sort((a, b) => b.lv - a.lv);
  const level = chars.reduce((a, c) => a + c.lv, 0);
  const grade = level < 1500 ? '노비스' : level < 2500 ? '베테랑' : level < 4000 ? '마스터' : level < 6000 ? '그랜드 마스터' : '슈프림';
  return { chars, level, grade, main: Math.floor(level / 4), att: Math.min(40, Math.floor(level / 250)), boss: Math.min(40, Math.floor(level / 250)) };
}
const SYM = {
  arc: { label: '아케인', max: 20, daily: 20, need: l => l * l + 11, meso: l => 2370000 + 7130000 * l, stat: l => 100 * (l + 2) },
  aut: { label: '어센틱', max: 11, daily: 10, need: l => 9 * l * l + 20 * l, meso: l => 96900000 + 88500000 * l, stat: l => 200 * (2 * l + 3) },
};
const SYMBOLS = [
  ['1712001', '소멸의 여로', 'arc', 200], ['1712002', '츄츄 아일랜드', 'arc', 210], ['1712003', '레헬른', 'arc', 220],
  ['1712004', '아르카나', 'arc', 225], ['1712005', '모라스', 'arc', 230], ['1712006', '에스페라', 'arc', 235],
  ['1713000', '세르니움', 'aut', 260], ['1713001', '아르크스', 'aut', 265], ['1713002', '오디움', 'aut', 270],
  ['1713003', '도원경', 'aut', 275], ['1713004', '아르테리아', 'aut', 280], ['1713005', '카르시온', 'aut', 285],
].map(([id, name, type, req]) => ({ id, name, type, req }));
const symOf = id => S.sym[id] || { lv: 0, cnt: 0 };
function symStat() {
  return SYMBOLS.reduce((a, s) => { const st = symOf(s.id); return a + (st.lv ? SYM[s.type].stat(st.lv) : 0); }, 0);
}
function symDaily(s) {
  if (S.level < s.req) return false;
  const st = symOf(s.id), T = SYM[s.type];
  if (!st.lv) { S.sym[s.id] = { lv: 1, cnt: 0 }; return true; }
  if (st.lv >= T.max) return false;
  st.cnt += T.daily; S.sym[s.id] = st; return true;
}
function symUp(s) {
  const st = symOf(s.id), T = SYM[s.type];
  if (!st.lv || st.lv >= T.max || st.cnt < T.need(st.lv)) return false;
  S.log.meso += T.meso(st.lv); st.cnt -= T.need(st.lv); st.lv++; S.sym[s.id] = st; return true;
}

// ===== 아이템 생성 / 장착 =====
function createItem(id) {
  const t = TPL[id];
  const it = { uid: S.uid++, id, star: 0 };
  if (t.destiny) {
    // 22성 + 15% 주문의 흔적 8장 완료 상태로 지급
    it.star = 22;
    const sc = scOf(it); sc.up = 8; sc.s[cls.main] += 32; sc[cls.main === 'INT' ? 'mad' : 'pad'] += 72;
  }
  const cat = POT_CAT[t.slot];
  if (cat) {
    it.pot = { grade: 0, lines: rollLines(cat, 0, [1, 0.1, 0.01], false, t.level) };
    it.add = { grade: 0, lines: rollLines(cat, 0, [1, 0.05, 0.01], true, t.level) };
  }
  if ((t.flameOk || FLAME_OK(t.slot))) { it.flame = rollFlame(it, 'flameR'); S.log.flameR--; }
  S.inv.push(it);
  return it;
}
function equippedKey(uid) { return Object.keys(S.eq).find(k => S.eq[k] === uid); }
function equip(uid) {
  const it = findItem(uid), t = TPL[it.id];
  const cur = equippedKey(uid);
  if (cur) { delete S.eq[cur]; return; }
  const keys = slotKeys(t.slot);
  const k = keys.find(k => !S.eq[k]) || keys[0];
  S.eq[k] = uid;
  if (t.slot === '한벌옷') delete S.eq['하의'];
  if (t.slot === '하의') {
    const top = S.eq['상의'] && findItem(S.eq['상의']);
    if (top && TPL[top.id].slot === '한벌옷') delete S.eq['상의'];
  }
}
function autoEquip(it) {
  const keys = slotKeys(TPL[it.id].slot);
  if (keys.some(k => !S.eq[k])) equip(it.uid);
}

// ===== 렌더: 캐릭터 선택 =====
function renderSelect() {
  M = null; renderModal(); S = null; UNION = null;
  const U = unionInfo();
  $('#app').innerHTML = `
  <div class="select">
    <h1>메이플 아이템 강화 시뮬레이터</h1>
    <div class="union-banner">유니온 <b>${U.grade}</b> · 유니온 레벨 <b>${fmt(U.level)}</b> · 캐릭터 ${U.chars.length}명</div>
    <div class="cloud-row"><section class="panel" id="account"></section><section class="panel" id="rank"></section></div>
    <p class="muted">캐릭터를 고르면 그 직업이 착용할 수 있는 아이템만 보여요. 진행 상황은 이 브라우저에 직업별로 저장돼요.</p>
    ${GROUPS.map(g => `
      <section class="group">
        <h2>${g.name}</h2>
        <div class="class-grid">
          ${CLASSES.filter(c => c.group === g.key).map(c => {
            const d = savedCount(c.name);
            return `<button class="class-btn ${g.key}" data-act="pick" data-name="${c.name}">
              <b>${c.name}</b><span>${c.main} · ${c.weapon}</span>${d && d.level ? `<em>Lv.${d.level} · 아이템 ${d.inv.length}개</em>` : ''}</button>`;
          }).join('')}
        </div>
      </section>`).join('')}
    <p class="muted small">확률과 수치는 실제 게임과 다를 수 있는 근사치예요.</p>
  </div>`;
  if (window.cloudRender) cloudRender();
}

// ===== 렌더: 메인 =====
function renderMain() {
  $('#app').innerHTML = `
  <header class="top">
    <div class="who">
      <b class="cname">${cls.name}</b>
      <span class="lv">Lv.<b id="lvl">${S.level}</b></span>
      <span class="muted">${GROUPS.find(g => g.key === cls.group).name} · 주스탯 ${cls.main} · ${cls.weapon}</span>
      <div class="exp"><div id="expbar" style="width:${expPct()}%"></div><span id="exptxt">EXP ${expPct().toFixed(2)}%</span></div>
    </div>
    <div class="power"><span>전투력</span><b id="power">${fmtPower(totals().power)}</b></div>
    <button data-act="change">캐릭터 변경</button>
  </header>
  <section class="summary" id="summary">${summaryHtml()}</section>
  <div class="layout">
    <section class="panel">
      <h2>장비창 <span class="muted small">부위를 눌러 강화</span></h2>
      <div class="equip">${equipHtml()}</div>
    </section>
    <section class="panel">
      <h2>아이템 추가 <span class="muted small">▲▼ 장착 시 전투력 변화</span></h2>
      <input id="q" type="search" placeholder="이름 검색 (예: 아케인, 반지, 벨트)" value="${UI.q.replace(/"/g, '&quot;')}" autocomplete="off">
      <div class="chips">${SLOT_CHIPS.map(s => `<button class="chip ${UI.slot === s ? 'on' : ''}" data-act="chip" data-slot="${s}">${s}</button>`).join('')}</div>
      <details class="custom">
        <summary>찾는 템이 없나요? 직접 등록하기</summary>
        <form id="customForm">
          <input name="name" placeholder="아이템 이름 (예: 컴플리트 언더컨트롤)" required>
          <div class="grid2">
            <label>부위 <select name="slot">${SLOT_CHIPS.slice(1).concat('한벌옷').map(s => `<option>${s}</option>`).join('')}</select></label>
            <label>착용 레벨 <input name="level" type="number" value="200"></label>
            <label>올스탯 <input name="stat" type="number" value="0"></label>
            <label>공격력 <input name="pad" type="number" value="0"></label>
            <label>마력 <input name="mad" type="number" value="0"></label>
            <label>이미지 주소(선택) <input name="icon" placeholder="https://..."></label>
          </div>
          <button class="primary" type="submit">등록</button>
        </form>
      </details>
      <div id="results" class="results">${resultsHtml()}</div>
    </section>
    <section class="panel">
      <h2>내 아이템 <span class="muted small">${S.inv.length}개</span></h2>
      <div class="inv">${invHtml()}</div>
    </section>
  </div>
  <div class="layout2">
    <section class="panel" id="sym">${symHtml()}</section>
    <section class="panel" id="union">${unionHtml()}</section>
  </div>`;
}
const expPct = () => (S.level >= 300 ? 100 : S.exp / expNeed(S.level) * 100);
function summaryHtml() {
  const r = totals(), L = S.log;
  return `
    ${box(`${cls.main} (최종)`, fmt(r.mainTot), 'big')}
    ${box(`장비 ${cls.main}`, '+' + fmt(r.main))}
    ${box(`${cls.main} %`, r.mainPct + '%')}
    ${box(ATT_NAME(), fmt(r.att))}
    ${box(ATT_NAME() + ' %', r.attPct + '%')}
    ${box('보스 데미지', r.boss + '%')}
    ${box('방어율 무시', r.ied.toFixed(1) + '%')}
    ${box('크리티컬 데미지', +r.cd.toFixed(2) + '%')}
    ${box('최종 데미지', +r.fd.toFixed(2) + '%')}
    ${box(`% 미적용 ${cls.main}`, '+' + fmt(r.mainFlat))}
    ${r.radiance ? box('광휘 세트', r.radiance + '세트 효과') : ''}
    ${r.eternal >= 2 ? box('에테르넬 세트', r.eternal + '세트 효과') : ''}    ${box('사용 메소', fmtMeso(L.meso))}
    ${box('스타포스 시도', fmt(L.sf))}
    ${box('파괴', fmt(L.boom))}
    ${box('레드/블랙 큐브', fmt(L.red) + ' / ' + fmt(L.black))}
    ${box('에디 / 화에큐', fmt(L.add) + ' / ' + fmt(L.white || 0))}
    ${box('익셉셔널 해머', fmt(L.ex || 0))}
    ${box('어빌 재설정 / 명성치', fmt(L.abil || 0) + ' / ' + fmt(L.honor || 0))}
    ${box('주문서 / 리턴', fmt(L.scroll || 0) + ' / ' + fmt(L.ret || 0))}
    ${box('강환 / 영환 / 검환', fmt(L.flameR) + ' / ' + fmt(L.flameE) + ' / ' + fmt(L.flameB || 0))}`;
}
function symHtml() {
  return `<h2>심볼 <span class="muted small">${cls.main} +${fmt(symStat())}</span>
    <button class="sm right" data-act="symAll">전체 일일 퀘스트</button></h2>
  <div class="sym-grid">${SYMBOLS.map(s => {
    const st = symOf(s.id), T = SYM[s.type], locked = S.level < s.req;
    const max = st.lv >= T.max, need = st.lv ? T.need(st.lv) : 0;
    return `<div class="sym ${locked ? 'locked' : ''}">
      <img class="icon" src="icons/${s.id}.png" alt="" onerror="this.style.visibility='hidden'">
      <div class="sym-info">
        <b>${s.name}</b>
        <div class="muted small">${locked ? `Lv.${s.req} 이상` : !st.lv ? '미획득' : max ? `Lv.${st.lv} (MAX)` : `Lv.${st.lv} · ${st.cnt}/${need}`}</div>
        ${st.lv && !max ? `<div class="bar"><i style="width:${Math.min(100, st.cnt / need * 100)}%"></i></div>` : ''}
      </div>
      <div class="btns">
        <button class="sm" data-act="symDaily" data-sym="${s.id}" ${locked || max ? 'disabled' : ''}>${st.lv ? '일퀘' : '획득'}</button>
        <button class="sm primary" data-act="symUp" data-sym="${s.id}" ${st.lv && !max && st.cnt >= need ? '' : 'disabled'} title="${st.lv && !max ? fmtMeso(T.meso(st.lv)) + ' 메소' : ''}">강화</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}
function unionHtml() {
  const U = getUnion();
  return `<h2>유니온 <span class="muted small">${U.grade}</span></h2>
  <div class="union-top"><div><span class="muted small">유니온 레벨</span><b>${fmt(U.level)}</b></div>
    <div class="muted small">효과: ${cls.main} +${fmt(U.main)} · ${ATT_NAME()} +${U.att} · 보스 데미지 +${U.boss}%</div></div>
  <div class="union-list">${U.chars.map(c => `<div class="${c.name === S.cls ? 'me' : ''}"><span>${c.name}</span><b>Lv.${c.lv}</b></div>`).join('')}</div>
  <p class="muted small">캐릭터를 열어두면 레벨이 계속 올라요. 키운 캐릭터 레벨의 합이 유니온 레벨이에요.</p>`;
}
const box = (k, v, c = '') => `<div class="stat ${c}"><span>${k}</span><b>${v}</b></div>`;
const gradeOf = it => (it.pot ? it.pot.grade : -1);

function equipHtml() {
  return LAYOUT.flat().map(k => {
    if (!k) return '<div class="slot blank"></div>';
    if (k === 'EMPTY') return '<div class="slot locked"></div>';
    if (k === 'ABIL') return `<div class="slot filled g${S.abil.grade}" data-act="panel" data-panel="abil"><span class="slot-name">어빌리티</span><span class="slot-txt gt${S.abil.grade}">${GRADES[S.abil.grade]}</span></div>`;
    if (k === 'ART') return `<div class="slot filled" data-act="panel" data-panel="art"><span class="slot-name">아티팩트</span><span class="slot-txt">Lv.${S.art.lv}</span></div>`;
    if (k === 'HEXA') return `<div class="slot filled" data-act="panel" data-panel="hexa"><span class="slot-name">헥사 스탯</span><span class="slot-txt">${S.hexa.reduce((a, c) => a + hexaLv(c), 0)} / 60</span></div>`;
    if (k === 'ETC') return `<div class="slot filled" data-act="panel" data-panel="etc"><span class="slot-name">기타 스탯</span><span class="slot-txt">${titleOf() ? '칭호 ✓<br>' : ''}유챔·공격대</span></div>`;
    if (k === 'HYPER') return `<div class="slot filled" data-act="panel" data-panel="hyper"><span class="slot-name">하이퍼 스탯</span><span class="slot-txt">${hyperUsed()} / ${hyperTotal()}</span></div>`;
    if (k === '하의') {
      const top = S.eq['상의'] && findItem(S.eq['상의']);
      if (top && TPL[top.id].slot === '한벌옷') return '<div class="slot locked"><span class="slot-name">하의</span><span class="slot-item muted">(한벌옷)</span></div>';
    }
    const it = S.eq[k] && findItem(S.eq[k]);
    if (!it) return `<div class="slot" data-act="slotEmpty" data-slot="${k}"><span class="slot-name">${k}</span><span class="plus">+</span></div>`;
    const t = TPL[it.id];
    return `<div class="slot filled g${gradeOf(it)}" data-act="open" data-uid="${it.uid}" title="${t.name}">
      <span class="slot-name">${k}</span>${iconHtml(t, 'slot-icon')}
      ${it.star ? `<span class="slot-star">★${it.star}</span>` : ''}</div>`;
  }).join('');
}
function resultsHtml() {
  const q = UI.q.trim().toLowerCase();
  const list = ITEMS.filter(t => canUse(t)
    && (UI.slot === '전체' || t.slot === UI.slot)
    && (!q || `${t.name} ${t.set} ${t.slot}`.toLowerCase().includes(q)))
    .sort((a, b) => b.level - a.level);
  if (!list.length) return '<p class="muted">검색 결과가 없어요.</p>';
  return list.map(t => `
    <div class="row-item">
      <div class="with-icon">${iconHtml(t)}<div><b>${t.name}</b>${t.custom ? ` <span class="tag">직접 등록</span> <button class="sm link" data-act="rmCustom" data-id="${t.id}">삭제</button>` : ''}<div class="muted small">${t.slot} · Lv.${t.level} · ${cls.main} +${tMain(t)} · ${ATT_NAME()} +${tAtt(t)}</div></div></div>
      <div class="btns">${diffHtml(powerDiff({ uid: 0, id: t.id, star: 0 }).diff)}<button class="primary sm" data-act="addItem" data-id="${t.id}">추가</button></div>
    </div>`).join('');
}
function invHtml() {
  if (!S.inv.length) return '<p class="muted">아직 아이템이 없어요. 왼쪽에서 검색해서 추가하세요.</p>';
  return [...S.inv].reverse().map(it => {
    const t = TPL[it.id], k = equippedKey(it.uid);
    return `<div class="row-item">
      <div class="clickable with-icon" data-act="open" data-uid="${it.uid}">${iconHtml(t)}<div>
        <b class="gt${gradeOf(it)}">${t.name}${it.star ? ` <span class="star-txt">★${it.star}</span>` : ''}</b>
        <div class="muted small">${t.slot}${it.pot ? ` · ${GRADES[it.pot.grade]}` : ''}${it.flame ? ` · 추옵 ${flameScore(it)}` : ''}${k ? ` · <span class="eqd">장착중(${k})</span>` : ''}</div>
      </div></div>
      <div class="btns">
        ${k ? '' : diffHtml(powerDiff(it).diff)}
        <button class="sm" data-act="open" data-uid="${it.uid}">강화</button>
        <button class="sm" data-act="equip" data-uid="${it.uid}">${k ? '해제' : '장착'}</button>
      </div>
    </div>`;
  }).join('');
}

// ===== 렌더: 강화창 =====
function openModal(uid) {
  const t = TPL[findItem(uid).id];
  const tabs = modalTabs(t);
  M = { fgoal: (M && M.fgoal) || { score: 150, wtier: 2, boss: 0, speed: 15, mode: 'basic', conds: [{ k: cls.main, min: 100 }] }, chaosGoal: (M && M.chaosGoal) || { att: 6, main: 6 }, chaosSpeed: M ? M.chaosSpeed : 20, useRet: M ? M.useRet : true, goal: (M && M.goal) || {}, sfSpeed: M ? M.sfSpeed : 20, auto: null, sfAuto: null, uid, tab: tabs[0] ? tabs[0][0] : null, pending: null, msg: '', msgCls: '',
    o: (M && M.o) || { catch: true, prevent: false, sunday: false }, target: Math.min(22, maxStarT(t)) };
  renderModal();
}
function modalTabs(t) {
  const r = [];
  if (tucOf(t)) r.push(['scroll', '주문서']);
  if (t.exMax) r.push(['ex', '익셉셔널']);
  if (t.slot === '무기') r.push(['soul', '소울']);
  if ((t.astra || SF_OK(t.slot))) r.push(['sf', '스타포스']);
  if (POT_CAT[t.slot]) r.push(['pot', '잠재능력'], ['add', '에디셔널']);
  if ((t.flameOk || FLAME_OK(t.slot))) r.push(['flame', '추가옵션']);
  return r;
}
function starsHtml(it, t) {
  const max = maxStarT(t);
  let h = '';
  for (let i = 0; i < max; i++) {
    if (i && i % 5 === 0) h += '<i class="gap"></i>';
    if (i && i % 15 === 0) h += '<br>';
    h += `<span class="${i < it.star ? 'on' : ''}">★</span>`;
  }
  return h;
}
// 인게임 툴팁처럼 스탯별 (기본 +스타포스 +추옵) 분해
function tooltipRows(it) {
  const t = TPL[it.id], rows = [];
  const flame = k => (it.flame || []).reduce((a, f) => a + (f.k === k || f.k.split('+').includes(k) && f.k.includes('+') ? f.val : 0), 0);
  const sc = scOf(it);
  STATS4.forEach(st => {
    const base = t.s[st] || 0, sf = sfBonus(t, it.star).stat, fl = flame(st), scr = sc.s[st];
    if (base + sf + fl + scr) rows.push({ n: st, base, sf, fl, scr });
  });
  const all = flame('ALL%');
  if (all) rows.push({ n: '올스탯', base: 0, sf: 0, fl: all, u: '%' });
  [['공격력', 'pad', 'ATT'], ['마력', 'mad', 'MATT']].forEach(([n, key, fk]) => {
    const base = t[key] || 0;
    const sf = t.slot === '무기' ? (base ? sfBonus(t, it.star, base).att : 0) : sfBonus(t, it.star).att;
    const fl = flame(fk), scr = sc[key];
    if (base + sf + fl + scr) rows.push({ n, base, sf, fl, scr });
  });
  [['BOSS%', '보스 몬스터 공격 시 데미지', t.boss || 0], ['DMG%', '데미지', 0]].forEach(([k, n, base]) => {
    const fl = flame(k); if (fl || base) rows.push({ n, base, sf: 0, fl, u: '%' });
  });
  if (t.ied) rows.push({ n: '몬스터 방어율 무시', base: t.ied, sf: 0, fl: 0, u: '%' });
  return rows;
}
const GRADE_LETTER = ['R', 'E', 'U', 'L'];
function tooltipHtml(it) {
  const t = TPL[it.id], g = gradeOf(it);
  const rows = tooltipRows(it).map(r => {
    const u = r.u || '', scr = r.scr || 0, ex = r.ex || 0, tot = r.base + r.sf + r.fl + scr + ex, boosted = r.sf || r.fl || scr || ex;
    return `<div class="tt-row"><span class="${boosted ? 'tt-boost' : ''}">${r.n} : +${tot}${u}</span>
      ${boosted ? `<span class="tt-break">( ${r.base}${u}${r.sf ? ` <i class="sf-c">+${r.sf}</i>` : ''}${scr ? ` <i class="sc-c">+${scr}</i>` : ''}${r.fl ? ` <i class="flame-c">+${r.fl}${u}</i>` : ''}${ex ? ` <i class="ex-c">+${ex}</i>` : ''} )</span>` : ''}</div>`;
  }).join('');
  const pot = (title, p) => `<div class="tt-sec">
    <div class="tt-pot-title gt${p.grade}"><span class="badge b${p.grade}">${GRADE_LETTER[p.grade]}</span> ${title}</div>
    ${p.lines.map(l => `<div>${lineText(l)}</div>`).join('')}</div>`;
  return `<div class="tooltip">
    ${(t.astra || SF_OK(t.slot)) ? `<div class="stars">${starsHtml(it, t)}</div>` : ''}
    ${it.soul ? `<div class="tt-soul-name">위대한 ${it.soul.boss}의</div>` : ''}
    <div class="tt-name">${t.name}${it.star ? ` (+${it.star})` : ''}</div>
    ${g >= 0 ? `<div class="tt-grade">(${GRADES[g]} 아이템)</div>` : ''}
    <div class="tt-sec tt-top">
      <div class="tt-icon g${g}">${iconHtml(t, 'icon-lg')}</div>
      <div class="tt-req">REQ LEV : <b>${t.level}</b>${equippedKey(it.uid) ? `<br><span class="eqd">장착중</span>` : ''}</div>
    </div>
    <div class="tt-sec">
      <div class="tt-row">장비분류 : ${t.slot}</div>
      ${rows}
      ${tucOf(t) ? `<div class="tt-row tt-tuc">업그레이드 가능 횟수 : ${scLeft(it)} <span class="muted">(복구 가능 횟수 : ${scOf(it).fail})</span></div>` : ''}
    </div>
    ${it.pot ? pot('잠재옵션', it.pot) + pot('에디셔널 잠재옵션', it.add) : ''}
    ${it.soul ? `<div class="tt-sec">
      <div class="soul-c">위대한 ${it.soul.boss}의 소울 적용</div>
      <div>${soulOptText(it.soul)}</div>
      ${it.soul.pot && it.soul.amp ? `<div class="tt-pot-title gt${it.soul.pot.grade}" style="margin-top:4px"><span class="badge b${it.soul.pot.grade}">${GRADE_LETTER[it.soul.pot.grade]}</span> 소울 잠재옵션 (증폭 ${it.soul.amp}단계)</div>
      ${it.soul.pot.lines.map(l => `<div>${soulLineText(it.soul, l)}</div>`).join('')}` : ''}
    </div>` : ''}
    ${exOf(it) ? `<div class="tt-sec">
      <div class="tt-pot-title"><span class="ex-badge">EX</span> <span class="ex-title">익셉셔널 : ${exOf(it)}회</span></div>
      <div class="tt-ex"><span>올스탯</span>: +${t.exStat * exOf(it)}</div>
      <div class="tt-ex"><span>최대 HP / 최대 MP</span>: +${1000 * exOf(it)}</div>
      <div class="tt-ex"><span>공격력 / 마력</span>: +${t.exAtt * exOf(it)}</div>
    </div>` : ''}
    ${powerBlock(it)}
  </div>`;
}
function renderModal() {
  const el = $('#modal');
  if (!M) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  if (M.panel) return renderPanel();
  const it = findItem(M.uid);
  if (!it) { M = null; return renderModal(); }
  const t = TPL[it.id], k = equippedKey(it.uid);
  const tabs = modalTabs(t);
  el.classList.remove('hidden');
  el.innerHTML = `
  <div class="sheet wide">
    <button class="x" data-act="close">✕</button>
    ${tooltipHtml(it)}
    <div class="enhance">
      <h3>강화</h3>
      ${tabs.length ? `<div class="tabs">${tabs.map(([id, n]) => `<button class="tab ${M.tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}">${n}</button>`).join('')}</div>
      <div class="tabbody">${tabBody(it, t)}</div>` : '<p class="muted">이 부위는 강화할 수 없어요.</p>'}
      ${M.msg ? `<div class="msg ${M.msgCls}">${M.msg}</div>` : ''}
      <div class="foot">
        <button data-act="equip" data-uid="${it.uid}">${k ? '장착 해제' : '장착'}</button>
        <button class="danger" data-act="del" data-uid="${it.uid}">버리기</button>
      </div>
    </div>
  </div>`;
}
function powerBlock(it) {
  const d = powerDiff(it);
  if (d.equipped) return `<div class="pw">이 아이템의 전투력 기여 <b>${diffHtml(d.diff)}</b></div>`;
  return `<div class="pw">장착 시 전투력 <b>${diffHtml(d.diff)}</b>
    <span class="muted small">${d.replaced ? `(${TPL[d.replaced.id].name}${d.replaced.star ? ' ★' + d.replaced.star : ''} 대비)` : '(빈 슬롯)'}</span></div>`;
}
function potBlock(title, p) {
  return `<div class="pot g${p.grade}"><div class="pot-title">${title} <span class="gt${p.grade}">[${GRADES[p.grade]}]</span></div>
    ${p.lines.map(l => `<div>${lineText(l)}</div>`).join('')}</div>`;
}
// ===== 주문서 =====
const ACC_SLOTS = ['얼굴', '눈', '귀고리', '반지', '펜던트', '하트'];
// 황금 망치 삭제(2025.4): 망치를 쓸 수 있던 장비는 업그레이드 가능 횟수 +1 기본 적용 (펫장비 제외)
const tucBase = t => (t.tuc != null ? t.tuc : ['보조', '엠블렘', '훈장', '뱃지', '포켓'].includes(t.slot) ? 0 : 5);
const tucOf = t => tucBase(t) + (tucBase(t) && t.slot !== '펫장비' ? 1 : 0);
const scOf = it => (it.sc = it.sc || { up: 0, fail: 0, s: { STR: 0, DEX: 0, INT: 0, LUK: 0 }, pad: 0, mad: 0 });
const scLeft = it => tucOf(TPL[it.id]) - scOf(it).up - scOf(it).fail;
// 주문서 목록 (수치는 120제 이상 기준 근사치)
function scrollList(t) {
  const m = cls.main, ak = cls.main === 'INT' ? 'mad' : 'pad';
  const trace = (rate, stat, att) => ({ id: 'trace' + rate, name: `주문의 흔적 ${rate}% (${m})`, rate: rate / 100,
    desc: [stat && `${m} +${stat}`, att && `${ATT_NAME()} +${att}`].filter(Boolean).join(', '),
    apply: sc => { sc.s[m] += stat; sc[ak] += att; } });
  const att = (id, name, rate, lo, hi, stat = 0) => ({ id, name: `${name} ${ATT_NAME()} 주문서`, rate,
    desc: `${ATT_NAME()} +${lo}${hi > lo ? '~' + hi : ''}${stat ? `, ${m} +${stat}` : ''}`,
    apply: sc => { sc[ak] += lo + Math.floor(rnd() * (hi - lo + 1)); sc.s[m] += stat; } });
  const list = [];
  if (t.slot === '펫장비') return [att('pet100', '펫장비', 1, 2, 2), att('pet60', '펫장비', 0.6, 3, 3),
    att('petprem100', '프리미엄 펫장비', 1, 4, 5), att('petprem', '프리미엄 펫장비', 0.5, 4, 6)]
    .map(x => ({ ...x, name: `${x.name} ${Math.round(x.rate * 100)}%` }));
  // 부위별 주문서 (수치는 근사치)
  if (t.slot === '무기') list.push(trace(100, 1, 3), trace(70, 2, 5), trace(30, 3, 7), trace(15, 4, 9),
    att('magical', '매지컬', 0.5, 9, 11, 3));
  else if (t.slot === '장갑') list.push(trace(100, 0, 1), trace(70, 0, 2), trace(30, 0, 3),
    att('pglove', '프리미엄 장갑', 0.5, 3, 4));
  else if (t.slot === '하트') list.push(att('heart', '하트', 1, 3, 3), att('pheart', '프리미엄 하트', 0.5, 9, 10));
  else if (ACC_SLOTS.includes(t.slot)) list.push(trace(100, 2, 0), trace(70, 3, 0), trace(30, 5, 0),
    att('pacc', '프리미엄 악세서리', 0.5, 4, 5));
  else list.push(trace(100, 3, 0), trace(70, 4, 0), trace(30, 7, 0),
    att('parmor', '프리미엄 방어구', 0.5, 2, 3));
  const chaos = sc => {
    STATS4.forEach(k => { if (t.s[k]) sc.s[k] += chaosRoll(); });
    if (t.pad) sc.pad += chaosRoll();
    if (t.mad) sc.mad += chaosRoll();
  };
  list.push({ id: 'chaos', name: '놀라운 긍정의 혼돈 주문서 60%', rate: 0.6, chaos: true, desc: '가진 스탯·공/마 +0~6 랜덤', apply: chaos });
  list.push({ id: 'chaos100', name: '놀라운 긍정의 혼돈 주문서 100%', rate: 1, chaos: true, desc: '가진 스탯·공/마 +0~6 랜덤', apply: chaos });
  return list;
}
function useScroll(it, sid) {
  const t = TPL[it.id], sc = scOf(it), sr = scrollList(t).find(x => x.id === sid);
  if (!sr || scLeft(it) <= 0) return null;
  S.log.scroll = (S.log.scroll || 0) + 1;
  if (rnd() < sr.rate) {
    sr.apply(sc); sc.up++;
    // 방어구는 4번째 성공마다 공/마 +1 보너스
    if (!['무기', '장갑', '펫장비'].includes(t.slot) && !ACC_SLOTS.includes(t.slot) && sc.up % 4 === 0) sc[cls.main === 'INT' ? 'mad' : 'pad'] += 1;
    return 'success';
  }
  sc.fail++; return 'fail';
}
function useTool(it, tool) {
  const sc = scOf(it);
  if (tool === 'white') {
    if (!sc.fail) return '복구할 횟수가 없어요.';
    if (rnd() < 0.1) { sc.fail--; return '순백의 주문서 성공! 실패 횟수 1회 복구'; }
    return '순백의 주문서 실패';
  }
  if (tool === 'innocent') {
    if (rnd() < 0.5) { it.sc = { up: 0, fail: 0, s: { STR: 0, DEX: 0, INT: 0, LUK: 0 }, pad: 0, mad: 0 }; return '이노센트 성공! 주문서 강화가 초기화됐어요.'; }
    return '이노센트 실패';
  }
}

// 놀긍혼 상승치 분포 (0~6)
const CHAOS_W = { 0: 0.13, 1: 0.27, 2: 0.25, 3: 0.17, 4: 0.1, 5: 0.06, 6: 0.02 };
const chaosRoll = () => wpick(CHAOS_W);
const cloneSc = sc => JSON.parse(JSON.stringify(sc));
// 주문서 한 장 전후 차이 (주스탯 / 공or마)
function scDelta(before, after) {
  const ak = cls.main === 'INT' ? 'mad' : 'pad';
  const d = { main: after.s[cls.main] - before.s[cls.main], att: after[ak] - before[ak], all: {} };
  STATS4.forEach(k => (d.all[k] = after.s[k] - before.s[k]));
  d.all.공 = after.pad - before.pad; d.all.마 = after.mad - before.mad;
  return d;
}
function deltaHtml(d, r) {
  if (r === 'fail') return '<span class="bad">실패 (업그레이드 횟수 -1)</span>';
  const parts = Object.entries(d.all).filter(([, v]) => v).map(([k, v]) => `<span class="${v >= 6 ? 'gt3' : v >= 4 ? 'gt2' : ''}">${k} +${v}</span>`);
  return parts.length ? parts.join(' ') : '<span class="muted">변화 없음 (+0)</span>';
}

// ===== 리턴 + 놀긍혼 자동 =====
function startChaosAuto() {
  const it = findItem(M.uid), sr = scrollList(TPL[it.id]).find(x => x.id === M.scroll);
  if (!sr || !sr.chaos) { setMsg('놀긍혼 주문서를 먼저 골라주세요.', 'bad'); renderModal(); return; }
  if (scLeft(it) <= 0) { setMsg('남은 업그레이드 횟수가 없어요.', 'bad'); renderModal(); return; }
  const g = M.chaosGoal;
  const A = M.chaosAuto = { tries: 0, last: null, lastR: null, done: false };
  const step = () => {
    if (!M || M.chaosAuto !== A || A.done) return;
    const before = cloneSc(scOf(it));
    const r = useScroll(it, M.scroll);
    const d = scDelta(before, scOf(it));
    A.tries++; A.last = d; A.lastR = r;
    if (r === 'success' && d.att >= g.att && d.main >= g.main) {
      A.done = true; stopChaosAuto(`목표 달성! ${fmt(A.tries)}번째 놀긍혼 (리턴 ${fmt(A.tries - 1)}장)`); return;
    }
    it.sc = before; S.log.ret = (S.log.ret || 0) + 1; // 리턴 주문서로 되돌리기
    const live = $('#chaosLive'); if (live) live.innerHTML = chaosLiveHtml(A);
  };
  A.timer = setInterval(() => { if (M.chaosSpeed == 0) { for (let i = 0; i < 30; i++) step(); } else step(); }, M.chaosSpeed || 4);
  renderModal();
}
function stopChaosAuto(msg) {
  if (!M || !M.chaosAuto) return;
  clearInterval(M.chaosAuto.timer);
  const A = M.chaosAuto; M.chaosAuto = null; M.chaosLast = A;
  setMsg(msg || `${fmt(A.tries)}회에서 중지했어요.`, A.done ? 'ok' : '');
  refresh();
}
function chaosLiveHtml(A) {
  return `<div class="live-head"><b>${fmt(A.tries)}</b>회째${A.done ? ' · <span class="ok">목표 달성!</span>' : ' · 리턴으로 되돌리는 중'}</div>
    <div class="chaos-res">${A.last ? deltaHtml(A.last, A.lastR) : ''}</div>`;
}

// ===== 자동 추옵 =====
function flameLinesHtml(lines) { return lines.map(f => `<div>${flameText(f)} <span class="muted small">(${f.tier}단계)</span></div>`).join(''); }
const flameLabel = (it, lines) => { const n = flameNum(it, lines); return TPL[it.id].slot === '무기' ? (n === 99 ? `${ATT_NAME()} 없음` : `${ATT_NAME()} ${n}추`) : `${n}급`; };
function flameLiveHtml(A) {
  const it = findItem(M.uid);
  return `<div class="live-head"><b>${fmt(A.tries)}</b>회째 · ${FLAMES[A.type].name}${A.done ? ' · <span class="ok">목표 달성!</span>' : ''}</div>
    <div class="flame-c"><b>${flameLabel(it, A.last)}</b></div>${flameLinesHtml(A.last)}`;
}
function startFlameAuto(type) {
  const it = findItem(M.uid);
  M.fpend = null; M.msg = '';
  const A = M.fauto = { type, tries: 0, last: null, done: false };
  const step = () => {
    if (!M || M.fauto !== A || A.done) return;
    const res = rollFlame(it, type);
    A.tries++; A.last = res;
    // 강환·영환은 바로 적용, 검환은 더 좋을 때만 AFTER
    if (type !== 'flameB' || flameBetter(it, res, it.flame || [])) it.flame = res;
    if (flameGoalMet(it, res)) { it.flame = res; A.done = true; stopFlameAuto(`목표 달성! ${fmt(A.tries)}회 만에 ${flameLabel(it, res)}`); return; }
    if (A.tries >= 1000000) { stopFlameAuto('100만 회 동안 목표를 못 띄워서 멈췄어요.'); return; }
    const live = $('#flameLive'); if (live) live.innerHTML = flameLiveHtml(A);
    const tip = $('.tooltip'); if (tip) tip.outerHTML = tooltipHtml(it);
  };
  A.timer = setInterval(() => { if (M.fgoal.speed == 0) { for (let i = 0; i < 40; i++) step(); } else step(); }, M.fgoal.speed || 4);
  renderModal();
}
function stopFlameAuto(msg) {
  if (!M || !M.fauto) return;
  clearInterval(M.fauto.timer);
  const A = M.fauto; M.fauto = null; M.flast = A;
  setMsg(msg || `${fmt(A.tries)}회에서 중지했어요.`, A.done ? 'ok' : '');
  refresh();
}

// ===== 익셉셔널 =====
// 1단계 100% / 2단계 50% / 3단계 25% (해머 2개면 확률 2배), 비용 0 / 25억 / 50억 (해머 2개면 2배)
const EX_RATE = [1, 0.5, 0.25], EX_COST = [0, 2.5e9, 5e9];
const exOf = it => it.ex || 0;
const exStat = (t, n) => ({ stat: (t.exStat || 0) * n, att: (t.exAtt || 0) * n });
function useHammer(it, two) {
  const t = TPL[it.id], n = exOf(it);
  if (!t.exMax || n >= t.exMax) return null;
  S.log.ex = (S.log.ex || 0) + (two ? 2 : 1);
  S.log.meso += EX_COST[n] * (two ? 2 : 1);
  if (rnd() < Math.min(1, EX_RATE[n] * (two ? 2 : 1))) { it.ex = n + 1; return 'success'; }
  return 'fail';
}

// ===== 자동 스타포스 =====
const SF_RES = { success: ['성공', 'ok'], fail: ['실패(유지)', 'keep'], boom: ['💥 파괴', 'bad'] };
function sfLiveHtml(A) {
  const it = findItem(M.uid);
  return `<div class="live-head"><b>${fmt(A.tries)}</b>회째 · 목표 ${A.target}성${A.done ? ' · <span class="ok">목표 달성!</span>' : ''}</div>
    <div class="sf-now">★ ${it ? it.star : '-'}성 ${A.last ? `<span class="${SF_RES[A.last][1]}">${SF_RES[A.last][0]}</span>` : ''}</div>
    <div class="muted small">파괴 ${fmt(A.booms)}회 · 사용 메소 ${fmtMeso(S.log.meso - A.meso0)}</div>`;
}
function startSfAuto() {
  const it = findItem(M.uid), t = TPL[it.id];
  const target = Math.min(+$('#target').value || 0, maxStarT(t));
  M.target = target;
  if (it.star >= target) { setMsg('이미 목표 스타포스예요.', 'ok'); renderModal(); return; }
  M.msg = '';
  const A = M.sfAuto = { target, tries: 0, booms: 0, meso0: S.log.meso, last: null, done: false };
  const step = () => {
    if (!M || M.sfAuto !== A || A.done) return;
    A.last = doStar(it, M.o); A.tries++;
    if (A.last === 'boom') A.booms++;
    if (it.star >= target) { A.done = true; stopSfAuto(`${target}성 달성! 시도 ${fmt(A.tries)}회 · 파괴 ${fmt(A.booms)}회 · ${fmtMeso(S.log.meso - A.meso0)} 메소`); return; }
    const live = $('#sfLive'); if (live) live.innerHTML = sfLiveHtml(A);
    const tip = $('.tooltip'); if (tip) tip.outerHTML = tooltipHtml(it);
  };
  A.timer = setInterval(() => { if (M.sfSpeed == 0) { for (let i = 0; i < 30; i++) step(); } else step(); }, M.sfSpeed || 4);
  renderModal();
}
function stopSfAuto(msg) {
  if (!M || !M.sfAuto) return;
  clearInterval(M.sfAuto.timer);
  const A = M.sfAuto; M.sfAuto = null; M.sfLast = A;
  setMsg(msg || `${fmt(A.tries)}회에서 중지했어요. (파괴 ${fmt(A.booms)}회)`, A.done ? (A.booms ? 'bad' : 'ok') : '');
  refresh();
}

// ===== 자동 큐브 =====
const GOAL_OPTS = kind => {
  const an = ATT_NAME(), m = cls.main;
  const o = [['none', '옵션 상관없음'], ['main', `${m}% (올스탯 포함)`], ['att', an + '%'], ['boss', '보스 데미지%'], ['ied', '방어율 무시%'],
    ['cd', '크리티컬 데미지%'], ['cdr', '쿨타임 감소(초)'], ['meso', '메소 획득량%'], ['drop', '아이템 드롭률%']];
  if (kind === 'add') o.push(['attFlat', an + ' +N'], ['mainFlat', m + ' +N']);
  // 무기·보조·엠블렘: 줄 조합 (보=보공, 공=공/마%, 방=방무)
  const it = M && findItem(M.uid);
  if (it && POT_CAT[TPL[it.id].slot] === 'weapon') {
    const a1 = an.slice(0, 1);
    o.splice(1, 0, ...['공공공', '보공공', '보보공', '보보보', '방공공', '방보공', '유효3'].map(p =>
      ['p:' + p, p === '유효3' ? `유효 3줄 (보공·${an}%·방무 아무거나)` : `${p.replace(/공/g, a1)} 이상`]));
  }
  return o;
};
function goalSum(p, opt) {
  const A = ATT_KEY(), m = cls.main;
  const match = {
    main: l => l.k === m + '%' || l.k === 'ALL%', att: l => l.k === A + '%', boss: l => l.k === 'BOSS%', ied: l => l.k === 'IED%',
    cd: l => l.k === 'CD%', cdr: l => l.k === 'CDR', meso: l => l.k === 'MESO', drop: l => l.k === 'DROP',
    attFlat: l => l.k === A, mainFlat: l => l.k === m,
  }[opt];
  return match ? p.lines.reduce((a, l) => a + (match(l) ? l.val : 0), 0) : 0;
}
// 줄 조합 목표: 보/공/방 줄 수가 패턴 이상인지 (공 대신 더 좋은 보공도 인정하지 않음 - 패턴 그대로)
function patternMet(p, pat) {
  const A = ATT_KEY();
  const c = { 보: 0, 공: 0, 방: 0 };
  p.lines.forEach(l => { if (l.k === 'BOSS%') c.보++; else if (l.k === A + '%') c.공++; else if (l.k === 'IED%') c.방++; });
  if (pat === '유효3') return c.보 + c.공 + c.방 >= 3;
  const need = { 보: 0, 공: 0, 방: 0 };
  [...pat].forEach(ch => need[ch]++);
  return c.보 >= need.보 && c.공 >= need.공 && c.방 >= need.방;
}
function goalMet(p, g) {
  if (g.grade >= 0 && p.grade < g.grade) return false;
  if (g.opt.startsWith('p:')) return patternMet(p, g.opt.slice(2));
  if (g.opt !== 'none' && goalSum(p, g.opt) < g.min) return false;
  return true;
}
const goalOf = kind => (M.goal[kind] = M.goal[kind] || { grade: 3, opt: 'main', min: 30, speed: 15 });
function autoCubeHtml(kind) {
  const g = goalOf(kind), A = M.auto;
  const running = A && A.kind === kind;
  const types = kind === 'pot' ? [['red', '레드'], ['black', '블랙']] : [['add', '에디셔널'], ['white', '화이트 에디']];
  const shown = running ? A : M.keepLive && M.keepLive.kind === kind ? M.keepLive : null;
  return `<div class="auto-cube">
    <div class="pot-title">자동 큐브 <span class="muted small">목표에 도달하면 멈춰요</span></div>
    <div class="goal">
      <select data-goal="grade" data-kind="${kind}">${[[-1, '등급 상관없음'], ...GRADES.map((n, i) => [i, n + ' 이상'])].map(([v, n]) => `<option value="${v}" ${g.grade == v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <select data-goal="opt" data-kind="${kind}">${GOAL_OPTS(kind).map(([v, n]) => `<option value="${v}" ${g.opt === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      ${g.opt.startsWith('p:') || g.opt === 'none' ? '' : `<span>합계 ≥ <input type="number" data-goal="min" data-kind="${kind}" value="${g.min}" min="0"></span>`}
      <select data-goal="speed" data-kind="${kind}">${[[60, '보통'], [15, '빠름'], [0, '최대 속도']].map(([v, n]) => `<option value="${v}" ${g.speed == v ? 'selected' : ''}>${n}</option>`).join('')}</select>
    </div>
    <div class="actions">${running
      ? '<button class="danger" data-act="autoStop">■ 중지</button>'
      : types.map(([t, n]) => `<button class="${t}" data-act="autoCube" data-cube="${t}" ${A ? 'disabled' : ''}>▶ ${n} 자동</button>`).join('')}</div>
    <div class="live ${running ? 'on' : ''}" id="cubeLive">${shown && shown.last ? liveHtml(shown) : '<span class="muted small">자동을 켜면 여기에 결과가 계속 나와요.</span>'}</div>
  </div>`;
}
function liveHtml(A) {
  const p = A.last;
  return `<div class="live-head"><b>${fmt(A.tries)}</b>회째 · ${CUBES[A.type].name}${A.done ? ' · <span class="ok">목표 달성!</span>' : ''}</div>
    <div class="gt${p.grade}">[${GRADES[p.grade]}]</div>${p.lines.map(l => `<div>${lineText(l)}</div>`).join('')}`;
}
function startAuto(type) {
  const it = findItem(M.uid), C = CUBES[type], kind = C.kind, g = goalOf(kind);
  if (g.grade < 0 && g.opt === 'none') { setMsg('목표를 하나 이상 정해주세요.', 'bad'); renderModal(); return; }
  M.pending = null; M.msg = '';
  const A = M.auto = { type, kind, tries: 0, last: null, done: false };
  const step = () => {
    if (!M || M.auto !== A || A.done) return;
    const res = cubeRoll(it, type);
    A.tries++; A.last = res;
    // 레드/에디는 바로 적용, 블랙은 등급이 오르거나 목표 옵션일 때만 AFTER 선택
    const met = goalMet(res, g);
    if (!CUBES[type].choose || met || res.grade > it[kind].grade) it[kind] = res;
    if (met) { A.done = true; stopAuto(`목표 달성! ${fmt(A.tries)}회 만에 성공`); return; }
    if (A.tries >= 1000000) { stopAuto(`100만 회 동안 목표를 못 띄워서 멈췄어요.`); return; }
    const live = $('#cubeLive'); if (live) live.innerHTML = liveHtml(A);
  };
  A.timer = setInterval(() => {
    if (g.speed == 0) { for (let i = 0; i < 50; i++) step(); } else step();
  }, g.speed || 4);
  renderModal();
}
function stopAuto(msg) {
  if (!M || !M.auto) return;
  clearInterval(M.auto.timer);
  const A = M.auto; M.auto = null;
  setMsg(msg || `${fmt(A.tries)}회에서 중지했어요.`, A.done ? 'ok' : '');
  M.keepLive = A;
  refresh();
}

function tabBody(it, t) {
  if (M.tab === 'soul') return soulTab(it, t);
  if (M.tab === 'ex') {
    const n = exOf(it), done = n >= t.exMax;
    return `
      <div class="sf-head">익셉셔널 강화 <b>${n} / ${t.exMax}</b></div>
      <div class="muted small">1회당 올스탯 +${t.exStat}, 공/마 +${t.exAtt}</div>
      ${done ? '<p>최대 강화 완료! 🎉</p>' : `
      <div class="rates">
        <span class="ok">해머 1개 성공 ${Math.round(EX_RATE[n] * 100)}% · ${fmtMeso(EX_COST[n])} 메소</span>
        <span class="ok">해머 2개 성공 ${Math.round(Math.min(1, EX_RATE[n] * 2) * 100)}% · ${fmtMeso(EX_COST[n] * 2)} 메소</span>
      </div>
      <div class="actions">
        <button class="primary" data-act="hammer">익셉셔널 해머 1개</button>
        <button data-act="hammer" data-two="1">익셉셔널 해머 2개</button>
      </div>`}
      <p class="muted small">실패해도 강화 단계는 그대로예요. 수치는 근사치예요.</p>`;
  }
  if (M.tab === 'scroll') {
    const left = scLeft(it), sc = scOf(it);
    if (!M.scroll) M.scroll = scrollList(t)[0].id;
    return `
      <div class="sf-head">남은 업그레이드 가능 횟수 <b>${left}</b> <span class="muted small">(성공 ${sc.up} · 실패 ${sc.fail})</span></div>
      <div class="scroll-list">${scrollList(t).map(x => `<label class="scroll ${M.scroll === x.id ? 'on' : ''}">
        <input type="radio" name="scroll" data-scroll="${x.id}" ${M.scroll === x.id ? 'checked' : ''}>
        <span><b>${x.name}</b><br><span class="muted small">성공 ${Math.round(x.rate * 100)}% · ${x.desc}</span></span></label>`).join('')}</div>
      ${(() => {
        const cur = scrollList(t).find(x => x.id === M.scroll), pend = M.ret;
        if (pend) return `<div class="ret-box">
          <div class="pot-title">리턴 주문서 <span class="muted small">결과를 유지하거나 되돌릴 수 있어요</span></div>
          <div class="chaos-res">${deltaHtml(pend.d, pend.r)}</div>
          <div class="actions"><button class="primary" data-act="retKeep">이대로 유지</button><button data-act="retBack">리턴 (되돌리기)</button></div></div>`;
        return `<div class="actions">
          <button class="primary" data-act="scroll" ${left > 0 && !M.chaosAuto ? '' : 'disabled'}>주문서 사용</button>
          <button data-act="scrollAll" ${left > 0 && !M.chaosAuto ? '' : 'disabled'}>남은 횟수 전부 사용</button>
          ${cur && cur.chaos ? `<label class="chk"><input type="checkbox" id="useRet" ${M.useRet ? 'checked' : ''}> 리턴 주문서 사용</label>` : ''}
        </div>
        ${M.lastScroll ? `<div class="chaos-res small-res">방금 결과: ${deltaHtml(M.lastScroll.d, M.lastScroll.r)}</div>` : ''}
        ${cur && cur.chaos ? `<div class="auto-cube">
          <div class="pot-title">놀긍혼 + 리턴 자동 <span class="muted small">목표가 나올 때까지 리턴으로 되돌리며 반복</span></div>
          <div class="goal">
            <span>${ATT_NAME()} ≥ <input type="number" min="0" max="6" data-cgoal="att" value="${M.chaosGoal.att}"></span>
            <span>${cls.main} ≥ <input type="number" min="0" max="6" data-cgoal="main" value="${M.chaosGoal.main}"></span>
            <select id="chaosSpeed">${[[80, '보통'], [20, '빠름'], [0, '최대 속도']].map(([v, n]) => `<option value="${v}" ${M.chaosSpeed == v ? 'selected' : ''}>${n}</option>`).join('')}</select>
            ${M.chaosAuto ? '<button class="danger" data-act="chaosStop">■ 중지</button>' : `<button class="primary" data-act="chaosAuto" ${left > 0 ? '' : 'disabled'}>▶ 자동</button>`}
          </div>
          <div class="live ${M.chaosAuto ? 'on' : ''}" id="chaosLive">${M.chaosAuto || M.chaosLast ? chaosLiveHtml(M.chaosAuto || M.chaosLast) : '<span class="muted small">예: 공 6 · 힘 6 목표로 돌리면 뜰 때까지 계속 돌려요.</span>'}</div>
        </div>` : ''}`;
      })()}
      <div class="actions">
        <button class="sm" data-act="tool" data-tool="white" ${sc.fail ? '' : 'disabled'}>순백의 주문서 (10%)</button>
        <button class="sm" data-act="tool" data-tool="innocent">이노센트 주문서 (50%)</button>
      </div>
      <p class="muted small">실패하면 업그레이드 횟수가 1 줄어요. 방어구는 4번 성공할 때마다 ${ATT_NAME()} +1 보너스. 수치는 120제 이상 기준 근사치예요.</p>`;
  }
  if (M.tab === 'sf') {
    const s = it.star, max = maxStarT(t);
    if (s >= max) return `<p>최대 스타포스(${max}성)에 도달했어요! 🎉</p>`;
    const r = sfRates(s, M.o), cost = sfPrice(t, s, M.o);
    const chk = (k, n) => `<label class="chk"><input type="checkbox" data-opt="${k}" ${M.o[k] ? 'checked' : ''}> ${n}</label>`;
    return `
      <div class="sf-head">${s}성 → <b>${s + 1}성</b></div>
      <div class="rates">
        <span class="ok">성공 ${(r.su * 100).toFixed(2)}%</span>
        <span class="keep">실패(유지) ${(r.fa * 100).toFixed(2)}%</span>
        ${r.bo ? `<span class="bad">파괴 ${(r.bo * 100).toFixed(2)}%</span>` : ''}
      </div>
      <div>필요 메소 : <b>${fmt(cost)}</b></div>
      <div class="opts">${chk('catch', '스타캐치')}${chk('prevent', '파괴방지(15~17성)')}${chk('sunday', '썬데이 30% 할인')}</div>
      <div class="actions">
        <button class="primary" data-act="sf" ${M.sfAuto ? 'disabled' : ''}>강화하기</button>
        <span class="auto">목표 <input id="target" type="number" min="${s + 1}" max="${max}" value="${Math.max(s + 1, Math.min(M.target, max))}">성
        <select id="sfSpeed">${[[80, '보통'], [20, '빠름'], [0, '최대 속도']].map(([v, n]) => `<option value="${v}" ${M.sfSpeed == v ? 'selected' : ''}>${n}</option>`).join('')}</select>
        ${M.sfAuto ? '<button class="danger" data-act="sfStop">■ 중지</button>' : '<button data-act="sfAuto">▶ 자동 강화</button>'}</span>
      </div>
      <div class="live ${M.sfAuto ? 'on' : ''}" id="sfLive">${M.sfAuto || M.sfLast ? sfLiveHtml(M.sfAuto || M.sfLast) : '<span class="muted small">자동 강화를 켜면 여기에 결과가 계속 나와요.</span>'}</div>
      <p class="muted small">파괴되면 12성으로 복구돼요.</p>`;
  }
  if (M.tab === 'pot') {
    const pend = M.pending && M.pendKind !== 'add' ? `
      <div class="compare">
        <div class="cmp"><div class="pot-title">BEFORE</div>${potBlock('현재', it.pot)}<button data-act="keepBefore">BEFORE 유지</button></div>
        <div class="cmp"><div class="pot-title">AFTER</div>${potBlock('새 옵션', M.pending)}<button class="primary" data-act="takeAfter">AFTER 선택</button></div>
      </div>` : '';
    return `<div class="actions">
      <button class="red" data-act="cube" data-cube="red">레드 큐브 사용</button>
      <button class="black" data-act="cube" data-cube="black">블랙 큐브 사용</button>
    </div>${pend}
    ${autoCubeHtml('pot')}
    <p class="muted small">등급업 확률(레드/블랙): 레어→에픽 6%/15%, 에픽→유니크 1.8%/3.5%, 유니크→레전드리 0.3%/1.2%</p>`;
  }
  if (M.tab === 'add') {
    const pend = M.pending && M.pendKind === 'add' ? `
      <div class="compare">
        <div class="cmp"><div class="pot-title">BEFORE</div>${potBlock('현재', it.add)}<button data-act="keepBefore">BEFORE 유지</button></div>
        <div class="cmp"><div class="pot-title">AFTER</div>${potBlock('새 옵션', M.pending)}<button class="primary" data-act="takeAfter">AFTER 선택</button></div>
      </div>` : '';
    return `<div class="actions"><button class="add" data-act="cube" data-cube="add">에디셔널 큐브 사용</button>
      <button class="white" data-act="cube" data-cube="white">화이트 에디셔널 큐브 사용</button></div>${pend}
    ${autoCubeHtml('add')}
    <p class="muted small">등급업 확률: 레어→에픽 4.76%, 에픽→유니크 1.96%, 유니크→레전드리 0.5%</p>`;
  }
  if (M.tab === 'flame') {
    const isW = t.slot === '무기', g = M.fgoal, A = M.fauto, shown = A || M.flast;
    const pend = M.fpend ? `<div class="compare">
        <div class="cmp"><div class="pot-title">BEFORE · ${flameLabel(it, it.flame || [])}</div><div class="flame-box">${flameLinesHtml(it.flame || [])}</div><button data-act="fKeep">BEFORE 유지</button></div>
        <div class="cmp"><div class="pot-title">AFTER · ${flameLabel(it, M.fpend)}</div><div class="flame-box">${flameLinesHtml(M.fpend)}</div><button class="primary" data-act="fTake">AFTER 선택</button></div>
      </div>` : '';
    return `<div class="flame-box">
      <div class="pot-title">추가옵션 <b class="flame-c">${flameScore(it)}</b></div>
      ${flameLinesHtml(it.flame || [])}
    </div>
    <div class="actions">
      <button data-act="flame" data-flame="flameR" ${A ? 'disabled' : ''}>강력한 환생의 불꽃</button>
      <button class="primary" data-act="flame" data-flame="flameE" ${A ? 'disabled' : ''}>영원한 환생의 불꽃</button>
      <button class="black" data-act="flame" data-flame="flameB" ${A ? 'disabled' : ''}>검은 환생의 불꽃</button>
    </div>${pend}
    <div class="auto-cube">
      <div class="pot-title">자동 추옵 <span class="muted small">목표에 도달하면 멈춰요</span></div>
      <div class="goal">
        <select data-fmode="1"><option value="basic" ${g.mode !== 'custom' ? 'selected' : ''}>${isW ? 'N추 / 보공' : '환산 급수'}</option><option value="custom" ${g.mode === 'custom' ? 'selected' : ''}>스탯 직접 고르기</option></select>
      ${g.mode === 'custom'
        ? `<div class="fconds">${g.conds.map((c, i) => `<span class="fcond">
            <select data-fcond="k" data-i="${i}">${FCOND.map(([k, n]) => `<option value="${k}" ${c.k === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
            ≥ <input type="number" min="0" data-fcond="min" data-i="${i}" value="${c.min}">
            <button class="sm link" data-act="fCondDel" data-i="${i}">✕</button></span>`).join('')}
            ${g.conds.length < 4 ? '<button class="sm" data-act="fCondAdd">+ 조건 추가</button>' : ''}
            <span class="muted small">조건을 모두 만족하면 멈춰요 (STR 등은 이중 스탯 포함)</span></div>`
        : isW
        ? `<span>${ATT_NAME()} <input type="number" min="1" max="7" data-fgoal="wtier" value="${g.wtier}">추 이상</span>
           <span>보스 데미지 ≥ <input type="number" min="0" data-fgoal="boss" value="${g.boss}">%</span>`
        : `<span>환산 ≥ <input type="number" min="0" data-fgoal="score" value="${g.score}">급</span>`}
        <select data-fgoal="speed">${[[60, '보통'], [15, '빠름'], [0, '최대 속도']].map(([v, n]) => `<option value="${v}" ${g.speed == v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      </div>
      <div class="actions">${A ? '<button class="danger" data-act="fStop">■ 중지</button>'
        : [['flameR', '강환'], ['flameE', '영환'], ['flameB', '검환']].map(([k, n]) => `<button class="${k === 'flameB' ? 'black' : ''}" data-act="fAuto" data-flame="${k}">▶ ${n} 자동</button>`).join('')}</div>
      <div class="live ${A ? 'on' : ''}" id="flameLive">${shown && shown.last ? flameLiveHtml(shown) : '<span class="muted small">자동을 켜면 여기에 결과가 계속 나와요.</span>'}</div>
    </div>
    <p class="muted small">${isW ? `무기: ${ATT_NAME()} 단계로 N추를 매겨요 (7단계 = 1추).` : `환산: ${cls.main} 1 = 1점 · 올스탯 1% = 10점 · ${ATT_NAME()} 1 = 4점 (${cls.main}이 들어간 이중 스탯 포함)`} 검환은 BEFORE/AFTER 중 고를 수 있고, 자동일 땐 더 좋을 때만 AFTER를 받아요.</p>`;
  }
  return '';
}

// ===== 소울 웨폰 =====
// 증폭·소울 잠재 확률/비용/천장: 넥슨 공식 확률 안내 + 2026.9 개편 기준
// 위대한 소울 옵션 수치, 소울 잠재 옵션 목록·수치는 근사치 (증폭 4단계 레전 공 8% / 유니크 6% 에 맞춤)
const SOUL_BOSSES = ['데미안', '루시드', '윌', '진 힐라', '더스크', '듄켈', '검은 마법사', '선택받은 세렌', '감시자 칼로스', '카링'];
const SOUL_OPTS = { 'ATT%': ['공격력', 3], 'MATT%': ['마력', 3], 'BOSS%': ['보스 몬스터 공격 시 데미지', 7], 'IED%': ['몬스터 방어율 무시', 7] };
const SOUL_ATT = 20; // 소울 적용 시 공격력/마력
const SOUL_AMP = [
  { rate: 0.05, inc: 0.01, pity: 25, meso: 5e8 }, { rate: 0.03, inc: 0.006, pity: 33, meso: 1e9 },
  { rate: 0.02, inc: 0.004, pity: 43, meso: 1.75e9 }, { rate: 0.015, inc: 0.003, pity: 50, meso: 2.75e9 },
];
const SOUL_POT_UP = [0.015, 0.005875, 0.003322], SOUL_POT_PITY = [100, 256, 451];
const SOUL_POT_COST = [2e7, 4e7, 6.5e7, 8.8e7];
const SOUL_SUB_SAME = [0.019608, 0.047619, 0.019608, 0.004975]; // 2·3번째 줄이 첫 줄과 같은 등급일 확률 (아니면 한 단계 아래)
const SOUL_PER = [0.25, 0.5, 1, 1.5, 2]; // 노멀~레전드리, 증폭 1단계당 %
const SOUL_POT_KEYS = ['STR%', 'DEX%', 'INT%', 'LUK%', 'ATT%', 'MATT%'];
const gradeName = g => (g < 0 ? '노멀' : GRADES[g]);
const soulVal = (so, l) => SOUL_PER[l.g + 1] * so.amp;
const soulOptText = so => `${SOUL_OPTS[so.opt][0]} +${SOUL_OPTS[so.opt][1]}%, ${ATT_NAME()} +${SOUL_ATT}`;
const soulLineText = (so, l) => `${l.k === 'ATT%' ? '공격력' : l.k === 'MATT%' ? '마력' : l.k.slice(0, -1)} +${soulVal(so, l)}%`;
const soulAmpRate = so => (so.ampFail >= SOUL_AMP[so.amp].pity - 1 ? 1 : Math.min(1, SOUL_AMP[so.amp].rate + SOUL_AMP[so.amp].inc * so.ampFail));
function soulLines(g) {
  return [0, 1, 2].map(i => ({ k: pick(SOUL_POT_KEYS), g: i === 0 || rnd() < SOUL_SUB_SAME[g] ? g : g - 1 }));
}
function soulAmp(it) {
  const so = it.soul;
  if (!so || so.amp >= 4 || TPL[it.id].level < 200) return null;
  S.log.meso += SOUL_AMP[so.amp].meso;
  S.log.soulAmp = (S.log.soulAmp || 0) + 1;
  if (rnd() < soulAmpRate(so)) {
    so.amp++; so.ampFail = 0;
    if (!so.pot) so.pot = { grade: 0, fail: 0, lines: soulLines(0) };
    return 'success';
  }
  so.ampFail++; return 'fail';
}
// 천장: 연속 실패가 천장 횟수에 닿으면 확정 등급 상승
function soulPotRoll(it) {
  const so = it.soul, p = so && so.pot;
  if (!p || !so.amp) return null;
  S.log.meso += SOUL_POT_COST[p.grade];
  S.log.soulPot = (S.log.soulPot || 0) + 1;
  if (p.grade < 3) {
    if (rnd() < SOUL_POT_UP[p.grade] || p.fail + 1 >= SOUL_POT_PITY[p.grade]) { p.grade++; p.fail = 0; } else p.fail++;
  }
  p.lines = soulLines(p.grade);
  return p.grade;
}
const soulAttSum = so => so.pot.lines.reduce((a, l) => a + (l.k === ATT_KEY() + '%' ? soulVal(so, l) : 0), 0);
function soulTab(it, t) {
  const so = it.soul, sel = (M.soulSel = M.soulSel || { boss: SOUL_BOSSES[0], opt: ATT_KEY() + '%' });
  let h = `<div class="pot-title">위대한 소울 ${so ? `<span class="soul-c">· 위대한 ${so.boss}의 소울 적용중</span>` : ''}</div>
    <div class="goal">
      <select data-soul="boss">${SOUL_BOSSES.map(b => `<option ${sel.boss === b ? 'selected' : ''}>${b}</option>`).join('')}</select>
      <select data-soul="opt">${Object.entries(SOUL_OPTS).map(([k, [n, v]]) => `<option value="${k}" ${sel.opt === k ? 'selected' : ''}>${n} +${v}%</option>`).join('')}</select>
      <button class="primary" data-act="soulApply">${so ? '소울 교체' : '소울 적용'}</button>
    </div>
    <p class="muted small">소울을 적용하면 선택한 옵션과 ${ATT_NAME()} +${SOUL_ATT}이 붙어요. 교체해도 증폭 단계와 소울 잠재는 유지돼요.</p>`;
  if (!so) return h;
  h += '<div class="auto-cube"><div class="pot-title">소울 증폭</div>';
  if (t.level < 200) h += '<p class="muted small">Lv.200 이상 무기만 증폭할 수 있어요.</p>';
  else if (so.amp >= 4) h += `<p>증폭 4단계 (MAX) 🎉</p>`;
  else {
    const A = SOUL_AMP[so.amp];
    h += `<div class="sf-head">${so.amp}단계 → <b>${so.amp + 1}단계</b></div>
      <div class="rates"><span class="ok">성공 ${(soulAmpRate(so) * 100).toFixed(1)}%</span><span class="keep">게이지 ${Math.round(so.ampFail / (A.pity - 1) * 100)}% (실패 ${so.ampFail} / 천장 ${A.pity}회)</span></div>
      <div>필요 메소 : <b>${fmtMeso(A.meso)}</b> + ${so.amp + 1}단계 소울 에테르</div>
      <div class="actions"><button class="primary" data-act="soulAmp">증폭</button><button data-act="soulAmpAuto">▶ 성공할 때까지</button></div>`;
  }
  h += '</div>';
  if (so.pot && so.amp) {
    const p = so.pot, g = (M.soulGoal = M.soulGoal || { grade: 3, min: 0 });
    h += `<div class="auto-cube">
      <div class="pot g${p.grade}" style="margin-top:0;border-top:none"><div class="pot-title">소울 잠재옵션 <span class="gt${p.grade}">[${GRADES[p.grade]}]</span> <span class="muted small">증폭 ${so.amp}단계</span></div>
        ${p.lines.map(l => `<div><span class="badge b${l.g < 0 ? 'n' : l.g}">${l.g < 0 ? 'N' : GRADE_LETTER[l.g]}</span> ${soulLineText(so, l)}</div>`).join('')}</div>
      <div class="actions"><button class="primary" data-act="soulPot">재설정 (${fmtMeso(SOUL_POT_COST[p.grade])} 메소)</button>
        ${p.grade < 3 ? `<span class="muted small">등급업 ${(SOUL_POT_UP[p.grade] * 100).toFixed(4).replace(/0+$/, '')}% · 천장 ${p.fail} / ${SOUL_POT_PITY[p.grade]}</span>` : ''}</div>
      <div class="goal">자동: <select data-sgoal="grade">${GRADES.map((n, i) => `<option value="${i}" ${g.grade == i ? 'selected' : ''}>${n}</option>`).join('')}</select> 이상 ·
        ${ATT_NAME()}% 합 ≥ <input type="number" min="0" step="0.5" data-sgoal="min" value="${g.min}">
        <button data-act="soulPotAuto">▶ 될 때까지</button></div>
    </div>`;
  }
  return h + `<p class="muted small">증폭 확률·비용·천장과 소울 잠재 등급업 확률·천장은 실제 게임 기준이에요. 소울 옵션과 소울 잠재 수치는 근사치예요.</p>`;
}

// ===== 하이퍼 스탯 / 어빌리티 (수치는 근사치) =====
const HYPER = [
  ['main', () => cls.main, lv => 30 * lv, ''],
  ['att', () => ATT_NAME(), lv => 3 * lv, ''],
  ['dmg', () => '데미지', lv => 3 * lv, '%'],
  ['boss', () => '보스 몬스터 공격 시 데미지', lv => (lv <= 5 ? 3 * lv : 15 + 4 * (lv - 5)), '%'],
  ['ied', () => '방어율 무시', lv => 3 * lv, '%'],
  ['cd', () => '크리티컬 데미지', lv => lv, '%'],
].map(([k, n, val, u]) => ({ k, n, val, u }));
const HYPER_COST = [1, 2, 4, 8, 10, 15, 20, 25, 30, 35, 50, 65, 80, 95, 110];
const hyperLv = k => S.hyper[k] || 0;
// Lv.140부터 레벨마다 3 + (10레벨마다 1씩 증가) 포인트
function hyperTotal() {
  let t = 0;
  for (let L = 140; L <= S.level; L++) t += 3 + Math.floor((L - 140) / 10);
  return t;
}
const hyperUsed = () => HYPER.reduce((a, h) => a + HYPER_COST.slice(0, hyperLv(h.k)).reduce((x, y) => x + y, 0), 0);
function hyperStat() {
  return Object.fromEntries(HYPER.map(h => [h.k, hyperLv(h.k) ? h.val(hyperLv(h.k)) : 0]));
}

const ABIL_POOL = [
  ['MAIN', '', [10, 20, 30, 40], ''], ['ATT', '', [3, 6, 12, 21], ''],
  ['BOSS', '보스 몬스터 공격 시 데미지', [null, null, 10, 20], '%'],
  ['CRIT', '크리티컬 확률', [5, 10, 20, 30], '%'],
  ['BUFF', '버프 스킬의 지속 시간', [null, null, 38, 50], '%'],
  ['CDSKIP', '스킬 사용 시 재사용 대기시간 미적용 확률', [null, null, 10, 20], '%'],
  ['ABN', '상태 이상에 걸린 대상 공격 시 데미지', [3, 5, 8, 10], '%'],
  ['MESO', '메소 획득량', [5, 10, 15, 20], '%'], ['DROP', '아이템 드롭률', [5, 10, 15, 20], '%'],
  ['HP', '최대 HP', [150, 300, 450, 600], ''], ['PASSIVE', '패시브 스킬 레벨', [null, null, null, 1], ''],
].map(([k, n, v, u]) => ({ k, n, v, u }));
const ABIL_UP = [0.15, 0.045, 0.01];
const ABIL_COST = [1000, 4000, 9000]; // 잠금 0/1/2줄
const abilText = l => `${l.k === 'MAIN' ? cls.main : l.k === 'ATT' ? ATT_NAME() : l.n} +${l.val}${l.u}`;
function abilLine(g) {
  const o = pick(ABIL_POOL.filter(x => x.v[g] != null));
  return { k: o.k, n: o.n, u: o.u, val: o.v[g], g };
}
// 첫 줄은 현재 등급, 2·3번째 줄은 25% 확률로 같은 등급 아니면 한 단계 아래
function rollAbil(locks) {
  const A = S.abil, n = locks.filter(Boolean).length;
  if (n >= 3) return null;
  S.log.honor = (S.log.honor || 0) + ABIL_COST[n];
  S.log.abil = (S.log.abil || 0) + 1;
  let g = A.grade;
  if (g < 3 && rnd() < ABIL_UP[g]) g++;
  A.lines = [0, 1, 2].map(i => (locks[i] ? A.lines[i] : abilLine(i === 0 || rnd() < 0.25 ? g : Math.max(0, g - 1))));
  A.grade = g;
  return g;
}
function abilStat() {
  const r = { main: 0, att: 0, boss: 0 };
  S.abil.lines.forEach(l => {
    if (l.k === 'MAIN') r.main += l.val;
    else if (l.k === 'ATT') r.att += l.val;
    else if (l.k === 'BOSS') r.boss += l.val;
  });
  return r;
}
// ===== 아티팩트 / 헥사 스탯 / 기타 스탯 =====
// 아티팩트 옵션 Lv.10 수치는 인게임·나무위키 기준, 크리스탈 AP 비용은 근사치 (Lv.60 = AP 72 = 크리스탈 9개 5단계)
const ART_OPTS = {
  all: ['올스탯', l => 15 * l, ''], att: ['공격력/마력', l => 3 * l, ''], hp: ['최대 HP/MP', l => 750 * l, ''],
  dmg: ['데미지', l => 1.5 * l, '%'], boss: ['보스 몬스터 공격 시 데미지', l => 1.5 * l, '%'],
  ied: ['몬스터 방어율 무시', l => 2 * l, '%'], buff: ['버프 지속시간', l => 2 * l, '%'],
  cdskip: ['재사용 대기시간 미적용 확률', l => 0.75 * l, '%'], meso: ['메소 획득량', l => l + (l >= 5) + (l >= 10), '%'],
  drop: ['아이템 드롭률', l => l + (l >= 5) + (l >= 10), '%'], crit: ['크리티컬 확률', l => 2 * l, '%'],
  cd: ['크리티컬 데미지', l => 0.4 * l, '%'], exp: ['추가 경험치 획득', l => l + (l >= 5) + (l >= 10), '%'],
};
const ART_CRY_AP = [1, 1, 2, 2, 2]; // 크리스탈 Lv.1~5 올릴 때 AP
const artCryMax = lv => Math.min(9, 3 + Math.floor(lv / 10));
const artApTotal = lv => lv + Math.floor(lv / 5);
const artApUsed = () => S.art.crystals.reduce((a, c) => a + ART_CRY_AP.slice(0, c.lv).reduce((x, y) => x + y, 0), 0);
const artCrystal = i => (S.art.crystals[i] = S.art.crystals[i] || { lv: 0, opts: ['all', 'att', 'hp'] });
function artLevels() {
  const L = {};
  S.art.crystals.forEach(c => c && c.lv && c.opts.forEach(k => (L[k] = Math.min(10, (L[k] || 0) + c.lv))));
  return L;
}
function artStat() {
  const L = artLevels(), v = k => (L[k] ? ART_OPTS[k][1](L[k]) : 0);
  return { all: v('all'), att: v('att'), dmg: v('dmg'), boss: v('boss'), cd: v('cd'), ied: L.ied ? [v('ied')] : [] };
}
function artCryUp(i) {
  const c = artCrystal(i);
  if (i >= artCryMax(S.art.lv) || c.lv >= 5 || artApUsed() + ART_CRY_AP[c.lv] > artApTotal(S.art.lv)) return false;
  c.lv++; return true;
}

// HEXA 스탯 코어 I·II·III: 메인 Lv.10 + 추가 2종 Lv.10씩, 코어당 총 20레벨 (수치·확률·조각 수는 근사치)
const HEXA_STATS = {
  cd: ['크리티컬 데미지', 0.35, '%'], boss: ['보스 몬스터 공격 시 데미지', 1, '%'], ied: ['몬스터 방어율 무시', 1, '%'],
  dmg: ['데미지', 0.75, '%'], att: ['', 5, ''], main: ['', 100, ''],
};
const HEXA_STEP = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4];
const HEXA_MAIN_UP = [0.35, 0.35, 0.35, 0.2, 0.2, 0.2, 0.15, 0.1, 0.05, 0.01];
const hexaCost = lv => [10, 20, 30, 40][Math.floor(lv / 5)];
const hexaLv = c => c.ml + c.al[0] + c.al[1];
const hexaName = k => (k === 'att' ? ATT_NAME() : k === 'main' ? cls.main : HEXA_STATS[k][0]);
const hexaMainVal = (k, l) => +(HEXA_STATS[k][1] * HEXA_STEP.slice(0, l).reduce((a, b) => a + b, 0)).toFixed(2);
const hexaAddVal = (k, l) => +(HEXA_STATS[k][1] * 0.5 * l).toFixed(3);
const hexaOpen = i => i === 0 || hexaLv(S.hexa[i - 1]) >= 20;
function hexaUp(i) {
  const c = S.hexa[i];
  if (!hexaOpen(i) || hexaLv(c) >= 20) return null;
  S.log.erda = (S.log.erda || 0) + hexaCost(hexaLv(c));
  if (c.ml < 10 && rnd() < HEXA_MAIN_UP[c.ml]) { c.ml++; return 'main'; }
  const j = c.al[0] >= 10 ? 1 : c.al[1] >= 10 ? 0 : rnd() < 0.5 ? 0 : 1;
  c.al[j]++; return 'add';
}
function hexaStat() {
  const r = { flat: 0, att: 0, boss: 0, dmg: 0, cd: 0, ied: [] };
  const add = (k, v) => { if (!v) return; if (k === 'main') r.flat += v; else if (k === 'ied') r.ied.push(v); else r[k] += v; };
  S.hexa.forEach(c => {
    add(c.main, hexaMainVal(c.main, c.ml));
    c.add.forEach((k, j) => add(k, hexaAddVal(k, c.al[j])));
  });
  return r;
}

// 유니온 챔피언 휘장 (등급 누적: B 올스탯 20 · A 공/마 10 · S 보공 5% · SS 크뎀 3% · SSS 방무 5%)
const CHAMP_GRADES = ['없음', 'B', 'A', 'S', 'SS', 'SSS'];
// 유니온 공격대 점령: [이름, 칸당 수치, 최대 칸, 단위]
const RAID = {
  main: ['', 5, 15, ''], att: ['', 1, 15, ''], cd: ['크리티컬 데미지', 0.5, 40, '%'], boss: ['보스 데미지', 1, 40, '%'],
  ied: ['방어율 무시', 1, 40, '%'], crit: ['크리티컬 확률', 1, 40, '%'], buff: ['버프 지속 시간', 1, 40, '%'],
};
const raidName = k => (k === 'main' ? cls.main : k === 'att' ? ATT_NAME() : RAID[k][0]);
// 공격대원 블록 크기(레벨별)로 점령 포인트 계산, 상위 40명
const raidPtsAuto = () => getUnion().chars.slice(0, 40).reduce((a, c) => a + (c.lv >= 250 ? 5 : c.lv >= 200 ? 4 : c.lv >= 140 ? 3 : c.lv >= 100 ? 2 : c.lv >= 60 ? 1 : 0), 0);
const raidPts = () => (ACC.union.raidPts != null ? ACC.union.raidPts : raidPtsAuto());
const raidUsed = () => Object.values(ACC.union.raid).reduce((a, b) => a + b, 0);
const ETC_EX = [['flat', () => `${cls.main} (% 미적용)`], ['mainPct', () => `${cls.main} %`], ['att', () => ATT_NAME()], ['attPct', () => ATT_NAME() + ' %'],
  ['dmg', () => '데미지 %'], ['boss', () => '보스 데미지 %'], ['fd', () => '최종 데미지 %'], ['cd', () => '크리티컬 데미지 %'], ['ied', () => '방어율 무시 %']];
// 칭호: [이름, 보공%, 방무%, 올스탯, 공/마, 크뎀%, 비고] (나무위키·인게임 기준)
const TITLES = [
  ['가디언즈 오브 메이플', 35, 35, 60, 30, 0, '14일 · 버그 신고 보상'],
  ['연합의 신화', 30, 30, 60, 20, 5, '30일 · 일반 몬스터 데미지 +30%'],
  ['MFF 매니아', 30, 30, 60, 20, 0, '기간 종료 · 일반 몬스터 데미지 +30%'],
  ['알록달록 메이플', 30, 30, 50, 20, 0, '14일 · 크리티컬 확률 +20%'],
  ['유니온 아레나 시즌 1 : 랭커', 30, 30, 50, 20, 0, '30일 · 랭킹 1~100위'],
  ['각성에 다다른 자', 30, 30, 50, 20, 0, '28일'],
  ['Burning Beyond', 20, 20, 30, 30, 0, '옵션 지속 60일 · 추가 경험치 20% · 아케인/어센틱포스 +100'],
  ['Infinite Flame', 20, 20, 30, 30, 0, '하이퍼버닝 240 달성'],
  ['마스테리아의 소환사', 10, 0, 20, 10, 0, '무기한'],
  ['예티X핑크빈', 10, 0, 20, 10, 0, '무기한 · 이벤트'],
  ['챌린지 월드 시즌 I 레전드리', 10, 0, 10, 10, 0, '무기한'],
  ['핑아일체 / 예아일체', 10, 0, 10, 5, 0, '무기한 · 이벤트'],
  ['메이플을 잘 아는', 0, 10, 10, 5, 0, '무기한'],
  ['킹 오브 루타비스', 5, 5, 8, 3, 0, '무기한 · 상시 획득'],
].map(([name, boss, ied, all, att, cd, note]) => ({ name, boss, ied, all, att, cd, note }));
const titleOf = () => TITLES.find(t => t.name === S.etc.title);
const titleText = t => [t.boss && `보공 ${t.boss}%`, t.ied && `방무 ${t.ied}%`, `올스탯 ${t.all}`, `${ATT_NAME()} ${t.att}`, t.cd && `크뎀 ${t.cd}%`].filter(Boolean).join(' · ');
function etcStat() {
  const U2 = ACC.union, ch = n => U2.champ.filter(g => g >= n).length, rd = k => (U2.raid[k] || 0) * RAID[k][1], x = S.etc.ex;
  const T = titleOf() || { boss: 0, ied: 0, all: 0, att: 0, cd: 0 };
  const r = { all: 20 * ch(1) + T.all, att: 10 * ch(2) + rd('att') + (x.att || 0) + T.att, boss: 5 * ch(3) + rd('boss') + (x.boss || 0) + T.boss,
    cd: 3 * ch(4) + rd('cd') + (x.cd || 0) + T.cd, flat: rd('main') + (x.flat || 0), mainPct: x.mainPct || 0, attPct: x.attPct || 0,
    dmg: x.dmg || 0, fd: x.fd || 0, ied: [] };
  [5 * ch(5), rd('ied'), x.ied || 0, T.ied].forEach(v => v && r.ied.push(v));
  return r;
}

const PANEL_BLANK = {
  abil: () => ({ grade: 0, lines: [] }), hyper: () => ({}), art: () => ({ lv: 1, crystals: [] }),
  hexa: () => [0, 1, 2].map(() => ({ main: 'boss', add: ['att', 'main'], ml: 0, al: [0, 0] })),
  etc: () => ({ ex: {} }),
  union: () => ({ champ: [0, 0, 0, 0, 0, 0], raid: {}, raidPts: null }),
};
// 이 창의 효과를 뺐을 때와의 전투력 차이
function panelContrib(kind) {
  const now = totals().power, keep = S[kind], keepU = ACC.union;
  S[kind] = PANEL_BLANK[kind]();
  if (kind === 'etc') ACC.union = PANEL_BLANK.union();
  const without = totals().power;
  S[kind] = keep; ACC.union = keepU;
  return now - without;
}
// 'acc.'로 시작하면 계정 공용 데이터
const setPath = (path, v) => {
  const ks = path.split('.');
  let o = ks[0] === 'acc' ? ACC : S;
  ks.slice(ks[0] === 'acc' ? 1 : 0, -1).forEach(k => (o = o[k]));
  o[ks[ks.length - 1]] = v;
};

function artPanel() {
  const A = S.art, L = artLevels(), used = artApUsed(), total = artApTotal(A.lv), open = artCryMax(A.lv);
  return `<h3>유니온 아티팩트 <span class="muted small">Lv.${A.lv} · AP ${used} / ${total} · 모든 캐릭터 공용</span></h3>
    <div class="actions">
      <button class="primary" data-act="artLv" data-n="1" ${A.lv >= 60 ? 'disabled' : ''}>레벨 업</button>
      <button data-act="artLv" data-n="10" ${A.lv >= 60 ? 'disabled' : ''}>+10</button>
      <button data-act="artLv" data-n="60" ${A.lv >= 60 ? 'disabled' : ''}>MAX (60)</button>
      <button data-act="artReset" ${used ? '' : 'disabled'}>AP 초기화</button>
    </div>
    <div class="art-grid">${Array.from({ length: 9 }, (_, i) => {
      const c = A.crystals[i] || { lv: 0, opts: ['all', 'att', 'hp'] }, lock = i >= open;
      if (lock) return `<div class="art-cry locked"><b>🔒</b><span class="muted small">아티팩트 Lv.${(i - 2) * 10}</span></div>`;
      const can = c.lv < 5 && used + ART_CRY_AP[c.lv] <= total;
      return `<div class="art-cry ${c.lv ? 'on' : ''}">
        <div class="art-stars">${'◆'.repeat(c.lv)}<span>${'◇'.repeat(5 - c.lv)}</span></div>
        ${c.opts.map((k, j) => `<select data-cry="${i}.${j}">${Object.entries(ART_OPTS).map(([o, [n]]) => `<option value="${o}" ${o === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`).join('')}
        <button class="sm primary" data-act="artCry" data-i="${i}" ${can ? '' : 'disabled'}>${c.lv >= 5 ? 'MAX' : `강화 (AP ${ART_CRY_AP[c.lv]})`}</button>
      </div>`;
    }).join('')}</div>
    <div class="pot-title">아티팩트 효과</div>
    <div class="art-eff">${Object.entries(L).sort((a, b) => b[1] - a[1]).map(([k, l]) => `<div>Lv.${l} ${ART_OPTS[k][0]} ${+ART_OPTS[k][1](l).toFixed(2)}${ART_OPTS[k][2]} 증가</div>`).join('') || '<span class="muted small">크리스탈을 강화하면 효과가 생겨요.</span>'}</div>
    <p class="muted small">크리스탈 레벨만큼 그 크리스탈의 옵션 3개 레벨이 올라요 (옵션별 최대 Lv.10). 아티팩트 레벨 10마다 크리스탈 칸이 열려요.</p>`;
}
function hexaPanel() {
  return `<h3>HEXA 스탯 <span class="muted small">솔 에르다 조각 ${fmt(S.log.erda || 0)}개 사용</span></h3>
    ${S.hexa.map((c, i) => {
      const open = hexaOpen(i), lv = hexaLv(c), keys = Object.keys(HEXA_STATS), fixed = lv > 0;
      const sel = (path, v, others) => `<select data-hexa="${i}.${path}" ${fixed || !open ? 'disabled' : ''}>${keys.map(k => `<option value="${k}" ${k === v ? 'selected' : ''} ${others.includes(k) ? 'disabled' : ''}>${hexaName(k)}</option>`).join('')}</select>`;
      return `<div class="auto-cube hexa-core ${open ? '' : 'locked'}">
        <div class="pot-title">HEXA 스탯 코어 ${['I', 'II', 'III'][i]} <span class="muted small">${open ? `Lv.${lv} / 20` : `코어 ${['I', 'II'][i - 1]}을 20레벨까지 올리면 열려요`}</span></div>
        <div class="hexa-row"><span class="hexa-tag">메인</span>${sel('main', c.main, c.add)}<b>Lv.${c.ml}</b><span class="hv">+${hexaMainVal(c.main, c.ml)}${HEXA_STATS[c.main][2]}</span></div>
        ${c.add.map((k, j) => `<div class="hexa-row"><span class="hexa-tag add">추가</span>${sel('add.' + j, k, [c.main, c.add[1 - j]])}<b>Lv.${c.al[j]}</b><span class="hv">+${hexaAddVal(k, c.al[j])}${HEXA_STATS[k][2]}</span></div>`).join('')}
        <div class="actions">
          <button class="primary" data-act="hexaUp" data-i="${i}" ${open && lv < 20 ? '' : 'disabled'}>강화 (조각 ${lv < 20 ? hexaCost(lv) : '-'})</button>
          <button data-act="hexaAuto" data-i="${i}" ${open && lv < 20 ? '' : 'disabled'}>▶ 20레벨까지</button>
          <button class="sm" data-act="hexaReset" data-i="${i}" ${lv ? '' : 'disabled'}>초기화 (1,000만 메소)</button>
          ${open && lv < 20 ? `<span class="muted small">메인 상승 ${Math.round(HEXA_MAIN_UP[c.ml] * 100)}%</span>` : ''}
        </div></div>`;
    }).join('')}
    <p class="muted small">강화할 때마다 메인 또는 추가 스탯 중 하나가 1레벨 올라요. 메인 스탯은 레벨이 높을수록 오르기 어려워요. 스탯 종류는 0레벨일 때만 바꿀 수 있어요. ${cls.main}은 % 미적용 스탯이에요.</p>`;
}
function etcPanel() {
  const E = S.etc, U2 = ACC.union, pts = raidPts(), used = raidUsed();
  const T = titleOf();
  return `<h3>기타 스탯</h3>
    <div class="auto-cube">
      <div class="pot-title">칭호 <span class="muted small">이 캐릭터만</span></div>
      <select class="title-sel" data-title="1">
        <option value="">칭호 없음</option>
        ${TITLES.map(t => `<option value="${t.name}" ${T && T.name === t.name ? 'selected' : ''}>${t.name} — ${titleText(t)}</option>`).join('')}
      </select>
      ${T ? `<div class="title-box"><b class="soul-c">${T.name}</b><div>${titleText(T)}</div><div class="muted small">${T.note}</div></div>` : ''}
    </div>
    <div class="auto-cube">
      <div class="pot-title">유니온 챔피언 휘장 <span class="muted small">모든 캐릭터 공용</span> <button class="sm right" data-act="etcPreset" data-p="champ">전부 SSS</button></div>
      <div class="champ-grid">${U2.champ.map((g, i) => `<label>챔피언 ${i + 1} <select data-set="acc.union.champ.${i}">${CHAMP_GRADES.map((n, v) => `<option value="${v}" ${g === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`).join('')}</div>
      <p class="muted small">등급별 누적: B 올스탯 +20 · A ${ATT_NAME()} +10 · S 보공 5% · SS 크뎀 3% · SSS 방무 5% (6명 SSS = 올스탯 120 · ${ATT_NAME()} 60 · 보공 30% · 크뎀 18% · 방무 30%)</p>
    </div>
    <div class="auto-cube">
      <div class="pot-title">유니온 공격대 점령 <span class="muted small">POINT ${used} / ${pts} · 모든 캐릭터 공용</span> <button class="sm right" data-act="etcPreset" data-p="raid">크뎀·보공·방무 40</button></div>
      <div class="raid-grid">${Object.keys(RAID).map(k => { const n = U2.raid[k] || 0, [, per, max, u] = RAID[k]; return `<div class="raid-cell">
        <span class="muted small">${n} / ${max}</span><b>${raidName(k)}</b><span class="hv">${+(n * per).toFixed(2)}${u}</span>
        <div><button class="sm" data-act="raid" data-k="${k}" data-d="-1" ${n ? '' : 'disabled'}>−</button><button class="sm primary" data-act="raid" data-k="${k}" data-d="1" ${n < max && used < pts ? '' : 'disabled'}>+</button></div></div>`; }).join('')}</div>
      <div class="goal">점령 포인트 <input type="number" min="0" data-set="acc.union.raidPts" value="${pts}"> <span class="muted small">(비워 두면 내 캐릭터 레벨로 자동 계산 · 게임 유니온 창의 POINT 값을 넣으면 정확해요)</span></div>
    </div>
    <div class="auto-cube">
      <div class="pot-title">직접 입력 <span class="muted small">이 캐릭터만 · 길드 스킬 · 링크 스킬 · 직업 패시브 · 칭호 · 도핑 등</span></div>
      <div class="ex-grid">${ETC_EX.map(([k, n]) => `<label>${n()} <input type="number" step="any" data-set="etc.ex.${k}" value="${E.ex[k] || 0}"></label>`).join('')}</div>
      <p class="muted small">게임 스탯창 수치에서 여기 사이트에 없는 부분만 더하면 실제 전투력과 가까워져요. 특히 최종 데미지는 직업 패시브에서 크게 들어와요.</p>
    </div>`;
}
function renderPanel() {
  const el = $('#modal');
  el.classList.remove('hidden');
  let body;
  if (M.panel === 'abil') {
    const A = S.abil, g = A.grade, nl = M.locks.filter(Boolean).length;
    body = `<h3>어빌리티 <span class="gt${g}">[${GRADES[g]}]</span></h3>
      <div class="abil-lines">${A.lines.map((l, i) => `<label class="abil-line ${M.locks[i] ? 'on' : ''}">
        <input type="checkbox" data-alock="${i}" ${M.locks[i] ? 'checked' : ''}>
        <span class="badge b${l.g}">${GRADE_LETTER[l.g]}</span> ${abilText(l)}</label>`).join('')}</div>
      <div class="actions"><button class="primary" data-act="abilRoll" ${nl >= 3 ? 'disabled' : ''}>재설정 (명성치 ${fmt(ABIL_COST[Math.min(nl, 2)])})</button></div>
      <p class="muted small">체크한 줄은 잠가서 유지돼요 (명성치 추가). 등급업 확률: 레어→에픽 15% · 에픽→유니크 4.5% · 유니크→레전드리 1%. 전투력에는 ${cls.main} · ${ATT_NAME()} · 보스 데미지 줄이 반영돼요.</p>`;
  } else if (M.panel === 'art') body = artPanel();
  else if (M.panel === 'hexa') body = hexaPanel();
  else if (M.panel === 'etc') body = etcPanel();
  else {
    const used = hyperUsed(), total = hyperTotal();
    body = `<h3>하이퍼 스탯 <span class="muted small">포인트 ${used} / ${total} (남은 ${total - used})</span></h3>
      <div class="hyper-list">${HYPER.map(h => {
        const lv = hyperLv(h.k), can = lv < 15 && used + HYPER_COST[lv] <= total;
        return `<div class="hyper-row">
          <span>${h.n()}</span><b>Lv.${lv}</b><span class="hv">+${lv ? h.val(lv) : 0}${h.u}</span>
          <button class="sm" data-act="hyper" data-k="${h.k}" data-d="-1" ${lv ? '' : 'disabled'}>−</button>
          <button class="sm primary" data-act="hyper" data-k="${h.k}" data-d="1" ${can ? '' : 'disabled'}>+</button>
          <span class="muted small">${lv < 15 ? `다음 ${HYPER_COST[lv]}P` : 'MAX'}</span></div>`;
      }).join('')}</div>
      <div class="actions"><button data-act="hyperReset" ${used ? '' : 'disabled'}>초기화</button></div>
      <p class="muted small">Lv.140부터 레벨업마다 포인트를 받아요 (140~149: 3P, 10레벨마다 +1P). 최대 Lv.15.</p>`;
  }
  el.innerHTML = `<div class="sheet">
    <button class="x" data-act="close">✕</button>
    ${body}
    <div class="pw">전투력 기여 <b>${diffHtml(panelContrib(M.panel))}</b></div>
    ${M.msg ? `<div class="msg ${M.msgCls}">${M.msg}</div>` : ''}
    <p class="muted small">수치는 근사치예요.</p>
  </div>`;
}

// ===== 이벤트 =====
function closeModal() { if (M && M.fauto) clearInterval(M.fauto.timer); if (M && M.chaosAuto) clearInterval(M.chaosAuto.timer); if (M && M.auto) clearInterval(M.auto.timer); if (M && M.sfAuto) clearInterval(M.sfAuto.timer); M = null; renderModal(); refresh(); }
function refresh() { save(); renderModal(); renderMain(); }
function setMsg(msg, c = '') { M.msg = msg; M.msgCls = c; }

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) {
    if (e.target.id === 'modal') closeModal();
    return;
  }
  const act = b.dataset.act, uid = +b.dataset.uid;
  const it = M && findItem(M.uid);
  switch (act) {
    case 'pick': load(b.dataset.name); save(); UI.q = ''; UI.slot = '전체'; renderMain(); break;
    case 'change': save(); renderSelect(); break;
    case 'chip': UI.slot = b.dataset.slot; renderMain(); break;
    case 'slotEmpty':
      UI.slot = keyToSlot(b.dataset.slot); UI.q = ''; renderMain(); $('#q').focus(); break;
    case 'addItem': {
      const n = createItem(b.dataset.id); autoEquip(n); save(); renderMain();
      toast(`${TPL[n.id].name} 추가!`); break;
    }
    case 'open': openModal(uid); break;
    case 'close': closeModal(); break;
    case 'autoCube': startAuto(b.dataset.cube); break;
    case 'autoStop': stopAuto(); break;
    case 'equip': equip(uid); refresh(); break;
    case 'del':
      if (!confirm('이 아이템을 버릴까요?')) return;
      { const k = equippedKey(uid); if (k) delete S.eq[k]; }
      S.inv = S.inv.filter(i => i.uid !== uid); M = null; refresh(); break;
    case 'tab': if (M.fauto) stopFlameAuto(); M.fpend = null; M.flast = null; if (M.chaosAuto) stopChaosAuto(); M.scroll = null; M.ret = null; M.lastScroll = null; M.chaosLast = null; if (M.auto) stopAuto(); if (M.sfAuto) stopSfAuto(); M.sfLast = null; M.keepLive = null; M.tab = b.dataset.tab; M.pending = null; M.msg = ''; renderModal(); break;
    case 'sf': {
      const before = it.star, r = doStar(it, M.o);
      if (r === 'success') setMsg(`성공! ${before}성 → ${it.star}성`, 'ok');
      else if (r === 'boom') setMsg(`💥 파괴! 아이템이 12성으로 복구됐어요.`, 'bad');
      else if (r === 'fail') setMsg(`실패 (${before}성 유지)`, 'keep');
      refresh(); break;
    }
    case 'scroll': {
      const before = cloneSc(scOf(it));
      const r = useScroll(it, M.scroll);
      if (r) {
        const d = scDelta(before, scOf(it));
        const sr = scrollList(TPL[it.id]).find(x => x.id === M.scroll);
        M.lastScroll = { d, r };
        if (sr.chaos && M.useRet) { M.ret = { before, d, r }; M.msg = ''; refresh(); break; }
      }
      setMsg(r === 'success' ? '주문서 성공!' : r === 'fail' ? '주문서 실패 (업그레이드 횟수 -1)' : '남은 횟수가 없어요.', r === 'success' ? 'ok' : 'bad');
      refresh(); break;
    }
    case 'scrollAll': {
      let ok = 0, ng = 0, r;
      while ((r = useScroll(it, M.scroll))) r === 'success' ? ok++ : ng++;
      setMsg(`성공 ${ok}회 · 실패 ${ng}회`, ok ? 'ok' : 'bad'); refresh(); break;
    }
    case 'retKeep': M.ret = null; setMsg('결과를 유지했어요.', 'ok'); refresh(); break;
    case 'retBack': it.sc = M.ret.before; M.ret = null; M.lastScroll = null; S.log.ret = (S.log.ret || 0) + 1; setMsg('리턴! 주문서 사용 전으로 되돌렸어요.'); refresh(); break;
    case 'chaosAuto': startChaosAuto(); break;
    case 'chaosStop': stopChaosAuto(); break;
    case 'hammer': {
      const r = useHammer(it, !!b.dataset.two);
      setMsg(r === 'success' ? `익셉셔널 강화 성공! (${exOf(it)}단계)` : r === 'fail' ? '익셉셔널 강화 실패' : '더 강화할 수 없어요.', r === 'success' ? 'ok' : 'bad');
      refresh(); break;
    }
    case 'tool': setMsg(useTool(it, b.dataset.tool)); refresh(); break;
    case 'sfAuto': startSfAuto(); break;
    case 'sfStop': stopSfAuto(); break;
    case 'cube': {
      const type = b.dataset.cube, C = CUBES[type], prev = it[C.kind].grade;
      const res = cubeRoll(it, type);
      if (C.choose) { M.pending = res; M.pendKind = C.kind; } else it[C.kind] = res;
      setMsg(res.grade > prev ? `✨ 등급 상승! ${GRADES[res.grade]}` : `${C.name} 사용`, res.grade > prev ? 'ok' : '');
      refresh(); break;
    }
    case 'symDaily': symDaily(SYMBOLS.find(x => x.id === b.dataset.sym)); refresh(); break;
    case 'symUp': {
      const sy = SYMBOLS.find(x => x.id === b.dataset.sym);
      if (symUp(sy)) toast(`${sy.name} Lv.${symOf(sy.id).lv}!`); refresh(); break;
    }
    case 'symAll': SYMBOLS.forEach(symDaily); refresh(); break;
    case 'soulApply': {
      const had = it.soul;
      it.soul = { amp: 0, ampFail: 0, pot: null, ...(it.soul || {}), boss: M.soulSel.boss, opt: M.soulSel.opt };
      S.log.soul = (S.log.soul || 0) + 1;
      setMsg(`위대한 ${it.soul.boss}의 소울 ${had ? '교체' : '적용'}!`, 'ok'); refresh(); break;
    }
    case 'soulAmp': {
      const r = soulAmp(it);
      setMsg(r === 'success' ? `✨ 증폭 성공! ${it.soul.amp}단계` : r === 'fail' ? '증폭 실패 (게이지 상승)' : '증폭할 수 없어요.', r === 'success' ? 'ok' : 'bad');
      refresh(); break;
    }
    case 'soulAmpAuto': {
      const so = it.soul, from = so.amp, m0 = S.log.meso;
      let n = 0;
      while (so.amp === from && soulAmp(it)) n++;
      setMsg(so.amp > from ? `✨ ${n}번 만에 ${so.amp}단계 성공! (${fmtMeso(S.log.meso - m0)} 메소)` : '증폭할 수 없어요.', so.amp > from ? 'ok' : 'bad');
      refresh(); break;
    }
    case 'soulPot': {
      const prev = it.soul.pot.grade, g = soulPotRoll(it);
      setMsg(g > prev ? `✨ 등급 상승! ${GRADES[g]}` : '소울 잠재 재설정', g > prev ? 'ok' : '');
      refresh(); break;
    }
    case 'soulPotAuto': {
      const so = it.soul, p = so.pot, G = M.soulGoal, m0 = S.log.meso;
      let n = 0;
      while (!(p.grade >= G.grade && soulAttSum(so) >= G.min) && n < 200000) { soulPotRoll(it); n++; }
      const ok = p.grade >= G.grade && soulAttSum(so) >= G.min;
      setMsg(ok ? `✨ ${fmt(n)}번 만에 목표 달성! (${fmtMeso(S.log.meso - m0)} 메소)` : `${fmt(n)}번 돌렸지만 목표에 못 미쳤어요.`, ok ? 'ok' : 'bad');
      refresh(); break;
    }
    case 'panel': M = { panel: b.dataset.panel, locks: [false, false, false], msg: '', msgCls: '' }; renderModal(); break;
    case 'abilRoll': {
      const prev = S.abil.grade, g = rollAbil(M.locks);
      if (g == null) return;
      setMsg(g > prev ? `✨ 등급 상승! ${GRADES[g]}` : '어빌리티 재설정', g > prev ? 'ok' : '');
      refresh(); break;
    }
    case 'hyper': {
      const k = b.dataset.k, lv = hyperLv(k);
      if (+b.dataset.d > 0 && lv < 15 && hyperUsed() + HYPER_COST[lv] <= hyperTotal()) S.hyper[k] = lv + 1;
      else if (+b.dataset.d < 0 && lv) S.hyper[k] = lv - 1;
      refresh(); break;
    }
    case 'hyperReset': S.hyper = {}; refresh(); break;
    case 'artLv': {
      const to = Math.min(60, +b.dataset.n === 60 ? 60 : S.art.lv + +b.dataset.n);
      S.log.artLv = (S.log.artLv || 0) + (to - S.art.lv); S.art.lv = to;
      setMsg(`아티팩트 Lv.${to}`, 'ok'); refresh(); break;
    }
    case 'artCry': if (artCryUp(+b.dataset.i)) setMsg(`크리스탈 ${+b.dataset.i + 1} → ${S.art.crystals[+b.dataset.i].lv}단계`, 'ok'); refresh(); break;
    case 'artReset': S.art.crystals.forEach(c => c && (c.lv = 0)); setMsg('AP를 초기화했어요.'); refresh(); break;
    case 'hexaUp': {
      const r = hexaUp(+b.dataset.i);
      setMsg(r === 'main' ? '✨ 메인 스탯 레벨 업!' : r === 'add' ? '추가 스탯 레벨 업' : '더 강화할 수 없어요.', r === 'main' ? 'ok' : ''); refresh(); break;
    }
    case 'hexaAuto': {
      const c = S.hexa[+b.dataset.i], e0 = S.log.erda || 0;
      while (hexaUp(+b.dataset.i));
      setMsg(`20레벨 완료! 메인 Lv.${c.ml} · 조각 ${fmt((S.log.erda || 0) - e0)}개`, c.ml >= 8 ? 'ok' : ''); refresh(); break;
    }
    case 'hexaReset': { const c = S.hexa[+b.dataset.i]; c.ml = 0; c.al = [0, 0]; S.log.meso += 1e7; setMsg('HEXA 스탯 코어를 초기화했어요.'); refresh(); break; }
    case 'etcPreset':
      if (b.dataset.p === 'champ') ACC.union.champ = [5, 5, 5, 5, 5, 5];
      else { const R = ACC.union.raid; ['cd', 'boss', 'ied'].forEach(k => (R[k] = 0)); ['cd', 'boss', 'ied'].forEach(k => { R[k] = Math.max(0, Math.min(40, raidPts() - raidUsed())); }); }
      refresh(); break;
    case 'raid': {
      const k = b.dataset.k, n = ACC.union.raid[k] || 0;
      if (+b.dataset.d > 0 && n < RAID[k][2] && raidUsed() < raidPts()) ACC.union.raid[k] = n + 1;
      else if (+b.dataset.d < 0 && n) ACC.union.raid[k] = n - 1;
      refresh(); break;
    }
    case 'rmCustom':
      if (!confirm('등록한 아이템을 목록에서 지울까요?')) return;
      if (S.inv.some(i => i.id === b.dataset.id)) { toast('갖고 있는 아이템이라 지울 수 없어요'); return; }
      removeCustom(b.dataset.id); renderMain(); break;
    case 'keepBefore': M.pending = null; setMsg('기존 옵션을 유지했어요.'); refresh(); break;
    case 'takeAfter': it[M.pendKind || 'pot'] = M.pending; M.pending = null; setMsg('새 옵션을 적용했어요.', 'ok'); refresh(); break;
    case 'fCondAdd': M.fgoal.conds.push({ k: 'ALL%', min: 6 }); renderModal(); break;
    case 'fCondDel': M.fgoal.conds.splice(+b.dataset.i, 1); renderModal(); break;
    case 'fAuto': startFlameAuto(b.dataset.flame); break;
    case 'fStop': stopFlameAuto(); break;
    case 'fKeep': M.fpend = null; setMsg('기존 추옵을 유지했어요.'); refresh(); break;
    case 'fTake': it.flame = M.fpend; M.fpend = null; setMsg(`새 추옵을 적용했어요 → ${flameScore(it)}`, 'ok'); refresh(); break;
    case 'flame': {
      if (b.dataset.flame === 'flameB') {
        M.fpend = rollFlame(it, 'flameB');
        setMsg(`검은 환생의 불꽃 → AFTER ${flameLabel(it, M.fpend)}`); refresh(); break;
      }
      M.fpend = null;
      it.flame = rollFlame(it, b.dataset.flame);
      setMsg(`${FLAMES[b.dataset.flame].name} 사용 → ${flameScore(it)}`);
      refresh(); break;
    }
  }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'customForm') return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (!f.name.trim()) return;
  const t = addCustom(f);
  UI.q = t.name; UI.slot = '전체'; renderMain();
  toast(`${t.name} 등록!`);
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { UI.q = e.target.value; $('#results').innerHTML = resultsHtml(); }
});
document.addEventListener('change', e => {
  if (e.target.dataset && e.target.dataset.set && S) {
    const path = e.target.dataset.set, v = e.target.value;
    setPath(path, path === 'acc.union.raidPts' && v === '' ? null : +v || 0);
    if (raidUsed() > raidPts()) ACC.union.raid = {}; // 포인트가 줄면 배분 초기화
    refresh(); return;
  }
  if (e.target.dataset && e.target.dataset.title && S) { S.etc.title = e.target.value || null; refresh(); return; }
  if (e.target.dataset && e.target.dataset.cry && S) {
    const [i, j] = e.target.dataset.cry.split('.').map(Number), c = artCrystal(i), k = e.target.value, dup = c.opts.indexOf(k);
    if (dup >= 0 && dup !== j) c.opts[dup] = c.opts[j]; // 같은 크리스탈 안 중복이면 서로 바꿈
    c.opts[j] = k; refresh(); return;
  }
  if (e.target.dataset && e.target.dataset.hexa && S) {
    const [i, ...p] = e.target.dataset.hexa.split('.'), c = S.hexa[+i];
    if (p[0] === 'main') c.main = e.target.value; else c.add[+p[1]] = e.target.value;
    refresh(); return;
  }
  if (e.target.dataset && e.target.dataset.soul && M) { M.soulSel[e.target.dataset.soul] = e.target.value; return; }
  if (e.target.dataset && e.target.dataset.sgoal && M) { M.soulGoal[e.target.dataset.sgoal] = +e.target.value; return; }
  if (e.target.dataset && e.target.dataset.alock && M) { M.locks[+e.target.dataset.alock] = e.target.checked; renderModal(); return; }
  if (e.target.dataset && e.target.dataset.scroll && M) { M.scroll = e.target.dataset.scroll; M.lastScroll = null; M.chaosLast = null; renderModal(); return; }
  if (e.target.dataset && e.target.dataset.fmode && M) { M.fgoal.mode = e.target.value; renderModal(); return; }
  if (e.target.dataset && e.target.dataset.fcond && M) {
    const c = M.fgoal.conds[+e.target.dataset.i];
    if (e.target.dataset.fcond === 'k') c.k = e.target.value; else c.min = +e.target.value;
    return;
  }
  if (e.target.dataset && e.target.dataset.fgoal && M) { M.fgoal[e.target.dataset.fgoal] = +e.target.value; return; }
  if (e.target.id === 'useRet' && M) { M.useRet = e.target.checked; return; }
  if (e.target.id === 'chaosSpeed' && M) { M.chaosSpeed = +e.target.value; return; }
  if (e.target.dataset && e.target.dataset.cgoal && M) { M.chaosGoal[e.target.dataset.cgoal] = +e.target.value; return; }
  if (e.target.id === 'sfSpeed' && M) { M.sfSpeed = +e.target.value; return; }
  const gk = e.target.dataset && e.target.dataset.goal;
  if (gk && M) { const g = goalOf(e.target.dataset.kind); g[gk] = gk === 'opt' ? e.target.value : +e.target.value; if (gk === 'opt') renderModal(); return; }
  const k = e.target.dataset && e.target.dataset.opt;
  if (k && M) { M.o[k] = e.target.checked; renderModal(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && M) closeModal();
});

// 캐릭터 화면이 열려 있는 동안 경험치 상승
setInterval(() => {
  if (!S || !$('#lvl') || S.level >= 300) return;
  S.exp++;
  const up = S.exp >= expNeed(S.level);
  if (up) { S.level++; S.exp = 0; UNION = null; toast(`🎉 레벨 업! Lv.${S.level}`); }
  save();
  $('#lvl').textContent = S.level;
  $('#expbar').style.width = expPct() + '%';
  $('#exptxt').textContent = `EXP ${expPct().toFixed(2)}%`;
  if (up) {
    $('#power').textContent = fmtPower(totals().power);
    $('#summary').innerHTML = summaryHtml();
    $('#sym').innerHTML = symHtml();
    $('#union').innerHTML = unionHtml();
    $('.equip').innerHTML = equipHtml();
  }
}, 1000);

renderSelect();
