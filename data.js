// 직업 / 아이템 데이터 (수치는 시뮬레이터용 근사치)

const GROUPS = [
  { key: 'warrior', name: '전사' },
  { key: 'mage', name: '마법사' },
  { key: 'archer', name: '궁수' },
  { key: 'thief', name: '도적' },
  { key: 'pirate', name: '해적' },
];

// 직업 무기명 → 착용 가능한 무기 분류(maplestory.io subCategory)
const WEAPON_TYPES = {"투핸드소드":["Two-Handed Sword","Two-Handed Axe","One-Handed Sword","One-Handed Axe"],
  "원핸드해머":["One-Handed Blunt Weapon","Two-Handed Blunt","One-Handed Sword","Two-Handed Sword"],
  "창":["Spear","Pole Arm"],
  "원핸드소드":["One-Handed Sword"],
  "건틀렛 리볼버":["Arm Cannon"],
  "폴암":["Pole Arm"],
  "튜너":["Bladecaster"],
  "스태프":["Staff","Wand"],
  "완드":["Wand","Staff"],
  "샤이닝 로드":["Shining Rod"],
  "매직 건틀렛":["Gauntlet"],
  "환수지팡이":["Wand","Staff"],
  "ESP 리미터":["Psy-limiter"],
  "활":["Bow"],
  "석궁":["Crossbow"],
  "에인션트 보우":["Ancient Bow"],
  "듀얼 보우건":["Dual Bowgun"],
  "브레스 슈터":["Breath Shooter"],
  "아대":["Claw"],
  "단검":["Dagger"],
  "케인":["Cane"],
  "체인":["Chain"],
  "부채":["Ritual Fan"],
  "차크람":["Chakram"],
  "너클":["Knuckle"],
  "건":["Gun"],
  "핸드캐논":["Hand Cannon"],
  "소울 슈터":["Soul Shooter"],
  // 아래 무기는 아이템 데이터에 없어서 비슷한 무기를 복사해 만듦 (WEAPON_CLONE)
  "원핸드도끼":["One-Handed Axe","One-Handed Blunt Weapon"],
  "데스페라도":["Desperado"],
  "대검":["Heavy Sword"],
  "장검":["Long Blade"],
  "에너지소드":["Energy Sword"],
  "카르타":["Karta"]};
// [새 무기 분류, 복사할 무기 분류, 한글 이름]
const WEAPON_CLONE = [['Desperado', 'Two-Handed Sword', '데스페라도'], ['Heavy Sword', 'Two-Handed Sword', '대검'],
  ['Long Blade', 'Two-Handed Sword', '장검'], ['Energy Sword', 'One-Handed Sword', '에너지소드', 'thief'], ['Karta', 'Staff', '카르타']];

const CLASSES = [
  ['히어로', 'warrior', 'STR', 'DEX', '투핸드소드'],
  ['팔라딘', 'warrior', 'STR', 'DEX', '원핸드해머'],
  ['다크나이트', 'warrior', 'STR', 'DEX', '창'],
  ['소울마스터', 'warrior', 'STR', 'DEX', '원핸드소드'],
  ['미하일', 'warrior', 'STR', 'DEX', '원핸드소드'],
  ['블래스터', 'warrior', 'STR', 'DEX', '건틀렛 리볼버'],
  ['아란', 'warrior', 'STR', 'DEX', '폴암'],
  ['카이저', 'warrior', 'STR', 'DEX', '투핸드소드'],
  ['아델', 'warrior', 'STR', 'DEX', '튜너'],
  ['아크메이지(불,독)', 'mage', 'INT', 'LUK', '스태프'],
  ['아크메이지(썬,콜)', 'mage', 'INT', 'LUK', '스태프'],
  ['비숍', 'mage', 'INT', 'LUK', '완드'],
  ['플레임위자드', 'mage', 'INT', 'LUK', '완드'],
  ['에반', 'mage', 'INT', 'LUK', '완드'],
  ['루미너스', 'mage', 'INT', 'LUK', '샤이닝 로드'],
  ['배틀메이지', 'mage', 'INT', 'LUK', '스태프'],
  ['일리움', 'mage', 'INT', 'LUK', '매직 건틀렛'],
  ['라라', 'mage', 'INT', 'LUK', '환수지팡이'],
  ['키네시스', 'mage', 'INT', 'LUK', 'ESP 리미터'],
  ['보우마스터', 'archer', 'DEX', 'STR', '활'],
  ['신궁', 'archer', 'DEX', 'STR', '석궁'],
  ['패스파인더', 'archer', 'DEX', 'STR', '에인션트 보우'],
  ['윈드브레이커', 'archer', 'DEX', 'STR', '활'],
  ['메르세데스', 'archer', 'DEX', 'STR', '듀얼 보우건'],
  ['와일드헌터', 'archer', 'DEX', 'STR', '석궁'],
  ['카인', 'archer', 'DEX', 'STR', '브레스 슈터'],
  ['나이트로드', 'thief', 'LUK', 'DEX', '아대'],
  ['섀도어', 'thief', 'LUK', 'DEX', '단검'],
  ['듀얼블레이더', 'thief', 'LUK', 'DEX', '단검'],
  ['나이트워커', 'thief', 'LUK', 'DEX', '아대'],
  ['팬텀', 'thief', 'LUK', 'DEX', '케인'],
  ['카데나', 'thief', 'LUK', 'DEX', '체인'],
  ['호영', 'thief', 'LUK', 'DEX', '부채'],
  ['칼리', 'thief', 'LUK', 'DEX', '차크람'],
  ['바이퍼', 'pirate', 'STR', 'DEX', '너클'],
  ['캡틴', 'pirate', 'DEX', 'STR', '건'],
  ['캐논마스터', 'pirate', 'STR', 'DEX', '핸드캐논'],
  ['스트라이커', 'pirate', 'STR', 'DEX', '너클'],
  ['메카닉', 'pirate', 'DEX', 'STR', '건'],
  ['엔젤릭버스터', 'pirate', 'DEX', 'STR', '소울 슈터'],
  ['은월', 'pirate', 'STR', 'DEX', '너클'],
  ['아크', 'pirate', 'STR', 'DEX', '너클'],
  // 2026.10 기준 나머지 직업 (데몬어벤져 주스탯 HP·제논 STR/DEX/LUK는 근사)
  ['데몬슬레이어', 'warrior', 'STR', 'DEX', '원핸드도끼'],
  ['데몬어벤져', 'warrior', 'STR', 'DEX', '데스페라도'],
  ['제로', 'warrior', 'STR', 'DEX', '대검'],
  ['렌', 'warrior', 'STR', 'DEX', '장검'],
  ['제논', 'thief', 'LUK', 'DEX', '에너지소드'],
  ['레테', 'mage', 'INT', 'LUK', '카르타'],
].map(([name, group, main, sub, weapon]) => ({ name, group, main, sub, weapon, weapons: WEAPON_TYPES[weapon] }));

const ITEMS = [...ITEM_DATA];

// 직업별 실제 보조무기 + 데이터에 없는 직업은 공용 보조무기 (이미지 없음)
ITEMS.push(...SECONDARY_DATA);
const HAS_SECONDARY = new Set(SECONDARY_DATA.flatMap(t => t.onlyAny));
CLASSES.filter(c => !HAS_SECONDARY.has(c.name)).forEach(c => ITEMS.push({ id: `보조-${c.name}`, name: `${c.name} 보조무기`, set: '보조무기', slot: '보조', level: 100, group: 'all', only: c.name,
  s: { STR: 10, DEX: 10, INT: 10, LUK: 10 }, pad: 3, mad: 3 }));

// 광휘의 보스 세트 (2024~ 신규, 데이터 출처: 나무위키 / 이미지 없음)
[
  ['근원의 속삭임', '반지', 10, 5], ['황홀한 악몽', '반지', 10, 5], ['죽음의 맹세', '펜던트', 15, 5],
  ['불멸의 유산', '훈장', 10, 10], ['오만의 원죄', '얼굴', 15, 15], ['굶주리는 핏빛 원혼', '눈', 20, 5],
].forEach(([name, slot, stat, att]) => ITEMS.push({ id: `광휘-${name}`, name, set: '광휘', slot, level: 250, group: 'all',
  s: { STR: stat, DEX: stat, INT: stat, LUK: stat }, pad: att, mad: att }));
// 불멸의 유산 기본 보스 데미지 +10%
ITEMS.find(t => t.id === '광휘-불멸의 유산').boss = 10;

// 광휘 세트 효과 (n세트 달성 시 누적)
const RADIANCE_SET = {
  2: { all: 20, att: 20, boss: 15 }, 3: { all: 20, att: 20, ied: 15 }, 4: { all: 20, att: 20, cd: 5 },
  5: { all: 20, att: 20, boss: 15 }, 6: { all: 20, att: 20, cd: 7.5 },
};

// 미트라의 분노 (직업군별 엠블렘, 이미지 없음)
GROUPS.forEach(g => ITEMS.push({ id: `미트라-${g.key}`, name: `미트라의 분노 : ${g.name}`, set: '미트라', slot: '엠블렘', level: 200, group: g.key,
  s: { STR: 40, DEX: 40, INT: 40, LUK: 40 }, pad: 3, mad: 3, tuc: 0 }));

// 광휘 아이콘 (스크린샷에서 잘라낸 이미지) + 업그레이드 횟수
[['근원의 속삭임', 1], ['황홀한 악몽', 2], ['죽음의 맹세', 3], ['불멸의 유산', 4]].forEach(([name, n]) => {
  ITEMS.find(t => t.id === `광휘-${name}`).icon = `icons/radiance-${n}.png`;
});
ITEMS.find(t => t.id === '광휘-죽음의 맹세').tuc = 6;
ITEMS.find(t => t.id === '광휘-불멸의 유산').tuc = 0;
ITEMS.find(t => t.id === '광휘-오만의 원죄').icon = 'icons/radiance-5.png';
ITEMS.find(t => t.id === '광휘-굶주리는 핏빛 원혼').icon = 'icons/radiance-6.png';
ITEMS.find(t => t.id === '광휘-굶주리는 핏빛 원혼').tuc = 5;
ITEMS.filter(t => t.set === '미트라').forEach(t => (t.icon = 'icons/mitra.png'));

// 펫장비: 루나 크리스탈 키 (maplestory.io KMS v389, 펫장비 주문서로 강화)
ITEMS.push({ id: '1802653', name: '루나 크리스탈 키', set: '루나 쁘띠', slot: '펫장비', level: 0, group: 'all',
  s: { STR: 0, DEX: 0, INT: 0, LUK: 0 }, pad: 10, mad: 10, tuc: 8, icon: 'icons/1802653.png' });

// 데스티니 무기 (22성 고정 → 25성까지, 15% 주문서 완료 상태)
ITEMS.push(...DESTINY_DATA);

// 아스트라 보조무기 (3단계, 스타포스 30성까지)
ITEMS.push(...ASTRA_DATA);

// 데이터에 없는 무기(데스페라도·대검·장검·에너지소드·카르타): 같은 세트의 비슷한 무기 수치를 복사 (이미지 없음)
WEAPON_CLONE.forEach(([to, from, kr, group]) => ITEMS.filter(t => t.weapon === from).forEach(t => {
  const words = t.name.split(' ');
  ITEMS.push({ ...t, id: `${t.id}-${to}`, weapon: to, icon: null, group: group || t.group, only: undefined, onlyAny: undefined,
    name: words.length > 1 ? `${words.slice(0, -1).join(' ')} ${kr}` : `${t.name} (${kr})` });
}));

// 컴플리트 언더컨트롤 (하트, Lv.200, 수치: maplestorywiki.net "Total Control")
ITEMS.push({ id: '하트-컴플리트 언더컨트롤', name: '컴플리트 언더컨트롤', set: '하트', slot: '하트', level: 200, group: 'all',
  s: { STR: 25, DEX: 25, INT: 25, LUK: 25 }, pad: 15, mad: 15, ied: 30, tuc: 10, icon: 'icons/total-control.png' });

// 칠흑의 보스 세트 (10부위, 기계 심장은 블랙 하트·컴플리트 언더컨트롤 중 하나)
const PITCH_RE = /^(루즈 컨트롤 머신 마크|마력이 깃든 안대|블랙 하트|컴플리트 언더컨트롤|몽환의 벨트|고통의 근원|창세의 뱃지|커맨더 포스 이어링|거대한 공포|저주받은 .+의 마도서|미트라의 분노)/;
ITEMS.filter(t => PITCH_RE.test(t.name)).forEach(t => (t.set = '칠흑'));
const PITCH_SET = {
  2: { all: 10, att: 10, boss: 10 }, 3: { all: 10, att: 10, ied: 10 }, 4: { all: 15, att: 15, cd: 5 },
  5: { all: 15, att: 15, boss: 10 }, 6: { all: 15, att: 15, ied: 10 }, 7: { all: 15, att: 15, cd: 5 },
  8: { all: 15, att: 15, boss: 10 }, 9: { all: 15, att: 15, cd: 5 }, 10: { all: 20, att: 20, boss: 10 },
};

// 익셉셔널 강화 가능 부위 (칠흑 1회, 광휘 3회 / 회당 올스탯 +20 공마 +15, 몽환의 벨트 외에는 근사치)
[['공용-몽환의 벨트', 1], ['공용-루즈 컨트롤 머신 마크', 1], ['공용-마력이 깃든 안대', 1], ['공용-커맨더 포스 이어링', 1],
 ['광휘-오만의 원죄', 3], ['광휘-불멸의 유산', 3]].forEach(([id, max]) => {
  const t = ITEMS.find(x => x.id === id || x.name === id.replace(/^[^-]+-/, ''));
  if (t) Object.assign(t, { exMax: max, exStat: 20, exAtt: 15 });
});
// 광휘는 반지 빼고 전부 익셉셔널 3회
ITEMS.filter(t => t.set === '광휘' && t.slot !== '반지').forEach(t => Object.assign(t, { exMax: 3, exStat: 20, exAtt: 15 }));
// 반지·하트를 뺀 장신구(얼굴/눈/귀고리/펜던트)는 전부 익셉셔널 1회 (근사치)
ITEMS.filter(t => ['얼굴', '눈', '귀고리', '펜던트'].includes(t.slot) && !t.exMax)
  .forEach(t => Object.assign(t, { exMax: 1, exStat: 20, exAtt: 15 }));
// 불멸의 유산: 훈장이지만 추가옵션 가능
ITEMS.find(t => t.id === '광휘-불멸의 유산').flameOk = true;

// 에테르넬 장갑·신발·망토 (2024~ 추가, 이미지 없음)
// 신발은 인게임 툴팁 기준 주스탯/부스탯 55 · 공/마 12, 장갑·망토는 근사치
[['장갑', '글러브', 55, 12], ['신발', '슈즈', 55, 12], ['망토', '케이프', 50, 9]].forEach(([slot, part, stat, att]) =>
  ['나이트', '메이지', '아처', '시프', '파이렛'].forEach((p, i) => {
    const group = ['warrior', 'mage', 'archer', 'thief', 'pirate'][i];
    ITEMS.push({ id: `에테르넬-${slot}-${group}`, name: `에테르넬 ${p}${part}`, set: '에테르넬', slot, level: 250, group,
      s: Object.fromEntries(['STR', 'DEX', 'INT', 'LUK'].map(k => [k, ({ warrior: 'STR DEX', mage: 'INT LUK', archer: 'DEX STR', thief: 'LUK DEX', pirate: 'STR DEX' })[group].includes(k) ? stat : 0])), pad: att, mad: att, tuc: 7 });
  }));

// 에테르넬 장갑·신발·망토 아이콘 (인게임 캡처) + 망토는 올스탯 50
ITEMS.filter(t => t.id.startsWith('에테르넬-')).forEach(t => {
  t.icon = { 장갑: 'icons/eternal-gloves.png', 신발: 'icons/eternal-shoes.png', 망토: 'icons/eternal-cape.png' }[t.slot];
  if (t.slot === '망토') t.s = { STR: 50, DEX: 50, INT: 50, LUK: 50 };
});

// 에테르넬 세트 효과 (n세트 달성 시 누적)
const ETERNAL_SET = {
  2: { att: 40, boss: 10 }, 3: { all: 50, att: 40, boss: 10 }, 4: { att: 40, boss: 10 }, 5: { att: 40, ied: 20 },
  6: { att: 40, boss: 15 }, 7: { all: 50, att: 40, boss: 15 }, 8: { att: 40, boss: 15 },
};

// 세트 목록: by = 같은 부위는 1개로 셀지(slot) / 아이템별로 셀지(id)
const SETS = {
  에테르넬: { name: '에테르넬 세트', fx: ETERNAL_SET, max: 8, by: 'slot' },
  광휘: { name: '광휘의 보스 세트', fx: RADIANCE_SET, max: 6, by: 'id' },
  칠흑: { name: '칠흑의 보스 세트', fx: PITCH_SET, max: 10, by: 'slot' },
  // 펫장비 1칸 = 펫 1마리 (자석펫 루나 쁘띠, 서로 다른 종류 1·2·3종 → 공/마 +8 / +18 / +36 누적)
  '루나 쁘띠': { name: '루나 쁘띠 펫 세트', fx: { 1: { att: 8 }, 2: { att: 10 }, 3: { att: 18 } }, max: 3, by: 'each', noLucky: true },
  // 캐시 마스터라벨 (착용 부위 수는 직접 선택)
  마라벨: { name: '마스터 어밴든 세트', fx: { 3: { all: 5, att: 3 }, 5: { all: 10, att: 7 } }, max: 5, virtual: true, noLucky: true },
};
const LUNA_EXTRA = 15; // 루나 게더링 / 루나 익스텐션 패시브 공/마
// 럭키 아이템: 3개 이상 착용 중인 모든 세트에 1부위로 포함 (여러 개여도 1개만)
const isLucky = t => !!(t.destiny || t.set === '제네시스');
