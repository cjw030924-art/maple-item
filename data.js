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
  "소울 슈터":["Soul Shooter"]};

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

// 데스티니 무기 (22성 고정 → 25성까지, 15% 주문서 완료 상태)
ITEMS.push(...DESTINY_DATA);
