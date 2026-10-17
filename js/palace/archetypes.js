/* ============================================================
 * palace/archetypes.js — 12 个心象世界
 * 每个场景：现实组(reality) → 渐变扭曲 → 心象组(dream)
 * 规则：所有材质必须用 m()/mb() 现场创建，禁止共用 MAT，
 *      否则 crossfade 会污染其他场景。
 * ============================================================ */
import * as THREE from "three";
import { makeLabel, humanFigure, atmFigure, maskFigure, flyPath, clamp, lerp, smoothstep } from "./engine.js";

const m = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...o });
const mb = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
const rng = (seed) => { let s = seed || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

function setGroupFade(g, k) {
  if (!g) return;
  g.visible = k > 0.02;
  g.scale.setScalar(0.72 + 0.28 * k);
  g.traverse(n => {
    const mm = n.material;
    if (!mm || Array.isArray(mm)) return;
    if (mm.userData.base === undefined) mm.userData.base = mm.opacity ?? 1;
    mm.transparent = k < 0.98 || mm.userData.base < 1;
    mm.opacity = mm.userData.base * k;
  });
}
function crossfade(real, dream, d) { setGroupFade(real, 1 - d); setGroupFade(dream, d); }

const money = (r) => "¥" + Math.floor(r() * 9000000 + 800000).toLocaleString("zh-CN");

/* ============================================================
 * 01 人形提款机
 * ============================================================ */
function buildATM() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  const R = rng(11);

  // —— 现实：宴会厅 ——
  const hall = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.3, 32), m(0x1c1420));
  hall.position.y = -0.15; reality.add(hall);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2;
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.08, 20), m(0x2a1a24));
    top.position.y = 0.85; table.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.85, 8), m(0x3a2a30));
    leg.position.y = 0.42; table.add(leg);
    table.position.set(Math.cos(a) * 5, 0, Math.sin(a) * 5);
    reality.add(table);
    const chand = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mb(0xffd166));
    chand.position.set(Math.cos(a) * 5, 3.4, Math.sin(a) * 5);
    reality.add(chand);
  }
  const guests = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + 0.3;
    const f = humanFigure({ color: i % 2 ? 0x1e2029 : 0x3d3542, scale: 0.95 });
    f.position.set(Math.cos(a) * 6.2, 0, Math.sin(a) * 6.2);
    f.lookAt(0, 0, 0);
    reality.add(f); guests.push(f);
  }
  const hero = humanFigure({ color: 0x8f1420, scale: 1.05 });
  hero.position.set(0, 0, 2.5); reality.add(hero);
  const heroLabel = makeLabel("他", { color: "#ffb3b8", border: "#d9232e", worldHeight: 0.42 });
  heroLabel.position.set(0, 2.1, 2.5); reality.add(heroLabel);

  // —— 心象：提款机人群 ——
  const atms = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + 0.3;
    const atm = atmFigure({ scale: 1.0 });
    atm.position.set(Math.cos(a) * 6.2, 0, Math.sin(a) * 6.2);
    atm.lookAt(0, 0, 0);
    dream.add(atm);
    const bal = makeLabel(`余额 ${money(R)}`, { color: "#7dff9a", border: "#1a9e5c", worldHeight: 0.34, size: 30 });
    bal.position.set(0, 1.95, 0); atm.add(bal);
    const roi = makeLabel(`ROI ${Math.floor(R() * 400 + 60)}%`, { color: "#ffd166", border: "#c9a227", worldHeight: 0.3, size: 26 });
    roi.position.set(0, 2.45, 0); atm.add(roi);
    atms.push({ g: atm, bal, roi, base: new THREE.Vector3().copy(atm.position) });
  }
  const heroATM = atmFigure({ scale: 1.1 });
  heroATM.position.set(0, 0, 2.5); dream.add(heroATM);
  const heroTag = makeLabel("他 · 清点资源的人", { color: "#ffb3b8", border: "#d9232e", worldHeight: 0.4 });
  heroTag.position.set(0, 2.2, 2.5); dream.add(heroTag);

  // 名片 → 钞票事件
  const cash = [];
  const cashGeo = new THREE.PlaneGeometry(0.22, 0.12);
  for (let i = 0; i < 26; i++) cash.push(new THREE.Mesh(cashGeo, mb(0xd9232e, { side: THREE.DoubleSide })));
  cash.forEach(c => dream.add(c));
  const cardGiver = atms[2], leaver = atms[5];
  const zeroTag = makeLabel("余额 ¥0", { color: "#ff7a85", border: "#8f1420", worldHeight: 0.34, size: 30 });
  zeroTag.position.set(0, 1.95, 0); zeroTag.visible = false; leaver.g.add(zeroTag);

  let cashT = -1;
  const update = (t, dt, env) => {
    const d = env.d;
    crossfade(reality, dream, d);
    const T = t * 30; // 秒
    // 标签浮动
    atms.forEach((a, i) => { a.bal.position.y = 1.95 + Math.sin(T * 1.4 + i) * 0.05; a.roi.position.y = 2.45 + Math.cos(T * 1.1 + i) * 0.05; });
    heroATM.userData.screen.material.color.setHSL(0.33, 1, 0.1 + 0.05 * Math.sin(T * 3));
    // 递名片（t>0.55）：卡片飞向主角，钞票喷出
    if (t > 0.55 && cashT < 0) cashT = 0;
    if (cashT >= 0) {
      cashT += dt;
      const k = Math.min(1, cashT * 1.6);
      cardGiver.bal.material.opacity = 1 - k * 0.9;
      cash.forEach((c, i) => {
        const ph = (cashT * 1.2 + i * 0.12) % 1;
        const from = cardGiver.base, to = new THREE.Vector3(0, 1.2, 2.5);
        c.position.lerpVectors(from, to, ph);
        c.position.y += Math.sin(ph * Math.PI) * 1.6;
        c.rotation.z = ph * 9;
        c.visible = ph < 0.92;
      });
    }
    // 离席归零（t>0.78）
    if (t > 0.78) {
      zeroTag.visible = true;
      leaver.bal.visible = false;
      const k = clamp((t - 0.78) * 3);
      leaver.g.position.x = leaver.base.x - k * 3.2;
      leaver.g.rotation.y = -k * 0.8;
    }
  };

  const camera = flyPath([
    { t: 0, pos: [0, 2.4, 15], look: [0, 1.2, 0] },
    { t: 0.45, pos: [3.4, 1.9, 6.5], look: [0, 1.3, 0] },
    { t: 1, pos: [-2.2, 1.7, 4.2], look: [0, 1.4, -0.5], fov: 48 },
  ]);

  return {
    group: new THREE.Group(), title: "01 · 人形提款机",
    update, camera,
    script: [
      { t0: 0.00, t1: 0.22, text: "在普通人眼里，这只是一场普通的宴会。" },
      { t0: 0.22, t1: 0.46, text: "在他眼里，每个人都变成了一台提款机——胸口是余额，头顶是投资回报率。" },
      { t0: 0.46, t1: 0.72, text: "有人递来名片，机器吐出钞票；有人转身离席，屏幕上的数字瞬间归零。" },
      { t0: 0.72, t1: 1.01, text: "他看到的不是人，是可以兑现的资源。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 02 行走的自助餐
 * ============================================================ */
function buildBuffet() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  const R = rng(23);
  // —— 现实：办公室 ——
  for (let i = 0; i < 6; i++) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.8), m(0x6b7280));
    desk.position.set((i % 3 - 1) * 2.4, 0.75, Math.floor(i / 3) * 2 - 1);
    reality.add(desk);
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.05), m(0x111318, { emissive: 0x223042, emissiveIntensity: .6 }));
    mon.position.set(desk.position.x, 1.15, desk.position.z - 0.35);
    reality.add(mon);
    if (i % 2 === 0) {
      const f = humanFigure({ color: 0x2b2e3b, scale: .9 });
      f.position.set(desk.position.x, 0, desk.position.z + 0.8);
      reality.add(f);
    }
  }
  // —— 心象：奢华餐厅 ——
  const table = new THREE.Mesh(new THREE.BoxGeometry(9, 0.14, 1.6), m(0xe8e2d4, { roughness: .4 }));
  table.position.set(0, 0.8, 0); dream.add(table);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.9, 1.9), m(0x8f1420, { roughness: .9 }));
  cloth.position.set(0, 0.35, 0); dream.add(cloth);
  const dishes = ["主菜：顺从", "例汤：利用价值", "甜点：崇拜", "冷盘：崇拜", "招牌：永不满足"];
  const trays = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.06, 18), m(0xd9dde3, { metalness: .7, roughness: .25 }));
    g.add(tray);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), m(0xc9ced6, { metalness: .8, roughness: .2 }));
    dome.position.y = 0.03; g.add(dome);
    const lb = makeLabel(dishes[i], { color: "#ffd9a0", border: "#c9a227", worldHeight: 0.36, size: 28 });
    lb.position.y = 0.95; g.add(lb);
    g.position.set(-3.4 + i * 1.7, 0.88, 0);
    dream.add(g); trays.push({ g, base: g.position.clone(), served: false });
  }
  const heroB = humanFigure({ color: 0x8f1420, scale: 1.1 });
  heroB.position.set(4.6, 0, 0); dream.add(heroB);
  const heroTag = makeLabel("他 · 永远嫌不够", { color: "#ffb3b8", border: "#d9232e", worldHeight: 0.4 });
  heroTag.position.set(4.6, 2.1, 0); dream.add(heroTag);
  // 菜单板
  for (let i = 0; i < 3; i++) {
    const menu = makeLabel(["人脉 ¥300万", "忠诚 买一送三", "灵魂 清仓大甩卖"][i], { color: "#fff", border: "#8f1420", worldHeight: 0.34, size: 26 });
    menu.position.set(-4 + i * 4, 2.6 + i * 0.3, -1.4);
    dream.add(menu);
  }

  const update = (t, dt, env) => {
    crossfade(reality, dream, env.d);
    const T = t * 30;
    trays.forEach((tr, i) => {
      const slide = smoothstep(0.45, 0.62, t) * 2.6;
      const push = smoothstep(0.68, 0.8, t);
      tr.g.position.x = tr.base.x + slide - push * 3.4;
      tr.g.position.y = tr.base.y + Math.sin(T + i) * 0.03;
      tr.g.rotation.y = Math.sin(T * 0.7 + i) * 0.15;
    });
  };
  const camera = flyPath([
    { t: 0, pos: [-7, 2.6, 7], look: [0, 1, 0] },
    { t: 0.5, pos: [0, 1.7, 5], look: [0, 1.1, 0] },
    { t: 1, pos: [5.5, 1.6, 3.6], look: [3, 1.2, 0], fov: 50 },
  ]);
  return {
    group: new THREE.Group(), title: "02 · 行走的自助餐", update, camera,
    script: [
      { t0: 0.00, t1: 0.24, text: "普通办公室，在他眼里渐渐变成一座奢华餐厅。" },
      { t0: 0.24, t1: 0.50, text: "同事变成餐盘与菜品：顺从是主菜，崇拜是甜点，利用价值是例汤。" },
      { t0: 0.50, t1: 0.74, text: "所有人向他递上菜单，而他永远嫌不够。" },
      { t0: 0.74, t1: 1.01, text: "把别人当食物是掠夺；把别人当只会索取的饭桶，是轻蔑。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 03 公司王国
 * ============================================================ */
function buildKingdom() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  const R = rng(37);
  // —— 现实：写字楼隔间 ——
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
    const cubicle = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), m(0x9aa3af, { transparent: true, opacity: .9 }));
    cubicle.position.set(x * 2.2, 0.6, z * 2.2);
    reality.add(cubicle);
    if (R() > 0.5) {
      const f = humanFigure({ color: 0x374151, scale: .85 });
      f.position.set(x * 2.2, 0, z * 2.2);
      reality.add(f);
    }
  }
  // —— 心象：中世纪城堡 ——
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.4, 0.3, 8), m(0x3d4152));
  floor.position.y = -0.15; dream.add(floor);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 6.5, 12), m(0x565b6e));
    pillar.position.set(Math.cos(a) * 7.5, 3.25, Math.sin(a) * 7.5);
    dream.add(pillar);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2), mb(0x8f1420, { side: THREE.DoubleSide }));
    banner.position.set(Math.cos(a) * 7.5, 4.6, Math.sin(a) * 7.5);
    banner.lookAt(0, 4.6, 0);
    dream.add(banner);
  }
  // 臣民居所（工位 → 小屋）
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
    const house = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.1), m(0x4a4f63));
    b.position.y = 0.45; house.add(b);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.6, 4), m(0x8f1420));
    roof.position.y = 1.2; roof.rotation.y = Math.PI / 4; house.add(roof);
    house.position.set(x * 2.2, 0, z * 2.2);
    dream.add(house);
    if (R() > 0.55) {
      const peasant = humanFigure({ color: 0x2f3442, scale: .8 });
      peasant.position.set(x * 2.2, 0, z * 2.2 + 0.9);
      dream.add(peasant);
    }
  }
  // 主管 → 贵族
  const noble = humanFigure({ color: 0x4a3b6b, scale: 1.15, robe: true });
  noble.position.set(0, 0, 3.4); dream.add(noble);
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 8, 14), m(0xe8b64c, { emissive: 0x6b4d10, emissiveIntensity: .8 }));
  crown.position.set(0, 5.2, 3.4); crown.rotation.x = Math.PI / 2; dream.add(crown);
  const nobleTag = makeLabel("部门主管 · 受封贵族", { color: "#d9c8ff", border: "#6d5aa8", worldHeight: 0.36 });
  nobleTag.position.set(0, 2.3, 3.4); dream.add(nobleTag);
  // 王座与老板
  const throneBase = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(3 - i * 0.4, 0.5, 3 - i * 0.4), m(0x2b2e3b));
    step.position.y = i * 0.5; throneBase.add(step);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.4), m(0x8f1420));
  seat.position.y = 3.6; throneBase.add(seat);
  const boss = humanFigure({ color: 0x1c1a2a, scale: 1.5 });
  boss.position.y = 4.7; throneBase.add(boss);
  throneBase.position.set(0, 0, -4.5);
  dream.add(throneBase);
  const bossTag = makeLabel("老板 · 王座之上", { color: "#ffd166", border: "#c9a227", worldHeight: 0.42 });
  bossTag.position.set(0, 7.6, -4.5); dream.add(bossTag);
  // 考勤机 → 城门；绩效 → 税册
  const gate = new THREE.Group();
  const arch = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.6), m(0x565b6e)); arch.position.y = 2.6; gate.add(arch);
  const col1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.6), m(0x565b6e)); col1.position.set(-1.05, 1.3, 0); gate.add(col1);
  const col2 = col1.clone(); col2.position.x = 1.05; gate.add(col2);
  const gateTag = makeLabel("考勤机 · 城门", { color: "#9fb4ff", border: "#3b5bdb", worldHeight: 0.34, size: 26 });
  gateTag.position.y = 3.2; gate.add(gateTag);
  gate.position.set(-4.5, 0, 1.5); dream.add(gate);
  const ledger = makeLabel("税册：绩效 A+ / C-", { color: "#ffd9a0", border: "#c9a227", worldHeight: 0.36 });
  ledger.position.set(3.2, 1.8, 1.8); dream.add(ledger);

  const update = (t, dt, env) => {
    crossfade(reality, dream, env.d);
    const T = t * 30;
    // 加冕：王冠落下
    const k = smoothstep(0.55, 0.72, t);
    crown.position.y = lerp(5.2, noble.position.y + 1.78, k);
    crown.rotation.z = Math.sin(T * 2) * 0.1 * (1 - k);
    // 会议如诏书：税册翻动
    ledger.material.rotation = Math.sin(T * 1.5) * 0.05;
  };
  const camera = flyPath([
    { t: 0, pos: [0, 1.2, 13], look: [0, 1, 0] },
    { t: 0.4, pos: [-5, 2.4, 8], look: [0, 1.4, 0] },
    { t: 0.75, pos: [2, 3.2, 7.5], look: [0, 4.5, -4] },
    { t: 1, pos: [0, 1.4, 7], look: [0, 5.2, -4.5], fov: 60 },
  ]);
  return {
    group: new THREE.Group(), title: "03 · 公司王国", update, camera,
    script: [
      { t0: 0.00, t1: 0.22, text: "写字楼在他眼中变成一座中世纪城堡。" },
      { t0: 0.22, t1: 0.46, text: "工位是臣民的居所，考勤机是城门，绩效报表是税册。" },
      { t0: 0.46, t1: 0.72, text: "主管披上贵族长袍接受加冕，每一次会议都像在颁布诏书。" },
      { t0: 0.72, t1: 1.01, text: "工作不再是合作，而是效忠；升职不再是发展，而是加冕。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 04 蝼蚁城市
 * ============================================================ */
function buildAntCity() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  const R = rng(53);
  // —— 现实：城市楼群 ——
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
    if (Math.abs(x) === 2 || Math.abs(z) === 2) continue; // 留出街道
    const h = 1.5 + R() * 6;
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, h, 1.5), m(0x232733));
    b.position.set(x * 2, h / 2, z * 2);
    reality.add(b);
  }
  // —— 现实：街头行人走在大街上 ——
  for (let i = 0; i < 16; i++) {
    const p = humanFigure({ color: 0x111318, scale: .55 });
    if (R() > 0.5) p.position.set((R() > .5 ? 4 : -4) + (R() - .5), 0, (R() - .5) * 16);
    else p.position.set((R() - .5) * 16, 0, (R() > .5 ? 4 : -4) + (R() - .5));
    p.userData.dir = R() > .5 ? 1 : -1;
    reality.add(p);
  }
  // 红绿灯
  const lights = [];
  for (let i = 0; i < 4; i++) {
    const tl = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), m(0x111318)); tl.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.08), mb(0xd9232e)); lamp.position.y = 1.6; tl.add(lamp);
    tl.position.set(i % 2 ? 4 : -4, 0, i < 2 ? 4 : -4);
    reality.add(tl); lights.push(lamp);
  }
  // —— 心象：蚁巢 ——
  const dots = [];
  const dotGeo = new THREE.SphereGeometry(0.09, 6, 5);
  for (let i = 0; i < 160; i++) {
    const d = new THREE.Mesh(dotGeo, mb(0x05060a));
    const lane = Math.floor(R() * 5) - 2;
    d.position.set(lane * 4 + (R() - .5), 0.12, (R() - .5) * 18);
    d.userData = { lane: d.position.x, speed: 0.6 + R() * 1.4, dir: R() > .5 ? 1 : -1, z0: d.position.z };
    dream.add(d); dots.push(d);
  }
  // 地铁 → 传送带
  const metro = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 30), m(0x1a1d26, { emissive: 0x330a10, emissiveIntensity: .5 }));
  metro.position.set(4, 0.25, 0); dream.add(metro);
  const metroDots = [];
  for (let i = 0; i < 24; i++) {
    const d = new THREE.Mesh(dotGeo, mb(0x05060a));
    d.position.set(4, 0.6, -14 + i * 1.2);
    dream.add(d); metroDots.push(d);
  }
  // 蚁巢辐射纹
  const rings = [];
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2 + i * 0.8, 0.05, 6, 40), mb(0xd9232e, { transparent: true, opacity: .5 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.06;
    dream.add(ring); rings.push(ring);
  }
  const antTag = makeLabel("蚁巢 · 个体 = 0", { color: "#ff8a94", border: "#8f1420", worldHeight: 0.5, size: 38 });
  antTag.position.set(0, 3.2, 0); dream.add(antTag);

  const update = (t, dt, env) => {
    crossfade(reality, dream, env.d);
    const T = t * 30;
    lights.forEach((l, i) => l.material.color.setHex(Math.sin(T * 0.8 + i) > 0 ? 0xd9232e : 0x1a9e5c));
    dots.forEach(d => {
      d.position.z += d.userData.dir * d.userData.speed * dt;
      if (d.position.z > 9) d.position.z = -9;
      if (d.position.z < -9) d.position.z = 9;
      d.position.x = d.userData.lane + Math.sin(T * 0.5 + d.userData.z0) * 0.1;
    });
    metroDots.forEach((d, i) => { d.position.z += dt * 1.6; if (d.position.z > 15) d.position.z = -15; });
    const pulse = 0.5 + 0.5 * Math.sin(T * 1.6);
    rings.forEach((r, i) => { r.scale.setScalar(1 + pulse * 0.15 + i * 0.02); r.material.opacity = 0.25 + pulse * 0.3; });
  };
  const camera = flyPath([
    { t: 0, pos: [0, 55, 26], look: [0, 0, 0] },
    { t: 0.4, pos: [6, 12, 14], look: [0, 1, 0] },
    { t: 0.7, pos: [-4, 3.5, 9], look: [0, 1, 0] },
    { t: 1, pos: [0, 46, 30], look: [0, 0, 0], fov: 50 },
  ]);
  return {
    group: new THREE.Group(), title: "04 · 蝼蚁城市", update, camera,
    script: [
      { t0: 0.00, t1: 0.20, text: "镜头从摩天大楼顶端俯冲而下。" },
      { t0: 0.20, t1: 0.44, text: "街道上的行人逐渐失去面孔，变成沿着既定路线移动的黑色小点。" },
      { t0: 0.44, t1: 0.68, text: "地铁是传送带，红绿灯控制人潮，城市俯瞰图是一座精密运转的蚁巢。" },
      { t0: 0.68, t1: 1.01, text: "在这种视角里，个体只剩下数量、效率，和可替换性。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 05 人形棋子
 * ============================================================ */
function buildChess() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  const R = rng(71);
  // —— 现实：广场人群 ——
  const walkers = [];
  for (let i = 0; i < 10; i++) {
    const f = humanFigure({ color: [0x2b2e3b, 0x3d3542, 0x1e2029][i % 3], scale: .95 });
    f.position.set((R() - .5) * 12, 0, (R() - .5) * 12);
    reality.add(f); walkers.push(f);
  }
  // —— 心象：棋盘城市 ——
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
    const cell = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 2), m((x + z) % 2 ? 0x14151d : 0x3a0d14));
    cell.position.set(x * 2, 0.05, z * 2);
    dream.add(cell);
  }
  const pieceDefs = [
    { name: "兵", tag: "竞争者", color: 0x2b2e3b },
    { name: "马", tag: "朋友", color: 0x3d3542 },
    { name: "车", tag: "下属", color: 0x1e2029 },
    { name: "后", tag: "伴侣", color: 0x4a3b6b },
    { name: "王", tag: "他自己", color: 0x8f1420 },
  ];
  const pieces = [];
  for (let i = 0; i < 12; i++) {
    const def = pieceDefs[i % 5];
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.16, 12), m(0xd9dde3, { roughness: .5 }));
    g.add(base);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.8, 10), m(def.color));
    body.position.y = 0.48; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), m(def.color));
    head.position.y = 1.0; g.add(head);
    const tag = makeLabel(`${def.name} · ${def.tag}`, { color: "#e8eefc", border: "#3b5bdb", worldHeight: 0.32, size: 24 });
    tag.position.y = 1.6; g.add(tag);
    const gx = (i % 4 - 1.5) * 2.4, gz = (Math.floor(i / 4) - 1) * 2.4;
    g.position.set(gx, 0, gz);
    dream.add(g);
    pieces.push({ g, from: g.position.clone(), to: new THREE.Vector3(gx + (R() - .5) * 3, 0, gz + (R() - .5) * 3) });
  }
  // 巨手
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.8), m(0xd9cfc0));
  hand.add(palm);
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.7, 3, 6), m(0xd9cfc0));
    finger.position.set(-0.55 + i * 0.37, 0.15, 1.1);
    finger.rotation.x = Math.PI / 2.4;
    hand.add(finger);
  }
  hand.position.set(-9, 4.5, 0);
  dream.add(hand);

  const update = (t, dt, env) => {
    crossfade(reality, dream, env.d);
    const T = t * 30;
    // 巨手落子
    const k = smoothstep(0.45, 0.6, t);
    hand.position.y = lerp(4.5, 2.2, k) + Math.sin(T * 0.8) * 0.15;
    hand.rotation.z = Math.sin(T * 0.6) * 0.15;
    pieces.forEach((p, i) => {
      const local = clamp((t - 0.5 - i * 0.02) * 2.2);
      p.g.position.lerpVectors(p.from, p.to, local);
      p.g.position.y = Math.abs(Math.sin(local * Math.PI)) * 0.5;
    });
  };
  const camera = flyPath([
    { t: 0, pos: [0, 6, 16], look: [0, 0.5, 0] },
    { t: 0.45, pos: [-8, 5, 10], look: [-4, 1, 0] },
    { t: 1, pos: [3, 4, 11], look: [0, 1, 0], fov: 55 },
  ]);
  return {
    group: new THREE.Group(), title: "05 · 人形棋子", update, camera,
    script: [
      { t0: 0.00, t1: 0.22, text: "他眼中的社交关系，是一盘棋。" },
      { t0: 0.22, t1: 0.48, text: "朋友是马，竞争者是兵，下属是可以牺牲的车。" },
      { t0: 0.48, t1: 0.72, text: "每次交谈都在计算落子位置，连一句关心都可能是布局。" },
      { t0: 0.72, t1: 1.01, text: "整座城市变成棋盘，数百万人按照他的手势移动。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 06 人力收割机
 * ============================================================ */
function buildHarvester() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  const R = rng(97);
  // —— 现实：办公室走廊 ——
  for (let i = 0; i < 4; i++) {
    const f = humanFigure({ color: 0x2b2e3b, scale: .95 });
    f.position.set(-3 + i * 2, 0, 0);
    reality.add(f);
  }
  const hallWall1 = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 0.3), m(0x9aa3af));
  hallWall1.position.set(0, 2, -3); reality.add(hallWall1);
  const hallWall2 = hallWall1.clone(); hallWall2.position.z = 3; reality.add(hallWall2);
  // —— 心象：巨型机械 ——
  const conveyor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 1.6), m(0x1a1d26, { metalness: .5 }));
  conveyor.position.set(0, 0.9, 0); dream.add(conveyor);
  const stripes = [];
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 1.7), mb(0xd9232e));
    s.position.set(-7.5 + i, 1.06, 0);
    dream.add(s); stripes.push(s);
  }
  // 齿轮
  const gears = [];
  for (let i = 0; i < 3; i++) {
    const gear = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.18, 8, 20), m(0x565b6e, { metalness: .6 }));
    gear.add(ring);
    for (let j = 0; j < 8; j++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.2), m(0x565b6e));
      const a = j / 8 * Math.PI * 2;
      tooth.position.set(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0);
      gear.add(tooth);
    }
    gear.position.set(-3 + i * 3, 2.4, -1.6);
    dream.add(gear); gears.push(gear);
  }
  // 工人进入 → 影子被抽走
  const workers = [];
  for (let i = 0; i < 4; i++) {
    const w = humanFigure({ color: 0x374151, scale: .95 });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.1), mb(0x05060a));
    const num = makeLabel(`产能 ${Math.floor(60 + R() * 39)}%`, { color: "#7dff9a", border: "#1a9e5c", worldHeight: 0.3, size: 24 });
    w.position.set(-7 + i * 2.4, 0.95, 0);
    shadow.position.set(-7 + i * 2.4, 0.06, 0);
    num.position.set(-7 + i * 2.4, 2.3, 0);
    dream.add(w); dream.add(shadow); dream.add(num);
    workers.push({ w, shadow, num, x0: -7 + i * 2.4 });
  }
  // 烟囱与烟
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 4, 10), m(0x2b2e3b));
  chimney.position.set(6.5, 2.8, -1.6); dream.add(chimney);
  const smoke = [];
  for (let i = 0; i < 20; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.16 + R() * 0.14, 6, 5), mb(0x3d4152, { transparent: true, opacity: .5 }));
    dream.add(p); smoke.push(p);
  }

  const update = (t, dt, env) => {
    crossfade(reality, dream, env.d);
    const T = t * 30;
    stripes.forEach((s, i) => { s.position.x = -7.5 + ((i + T * 1.2) % 16); });
    gears.forEach((g, i) => { g.rotation.z += dt * (i % 2 ? 1.4 : -1.4); });
    workers.forEach((wk, i) => {
      const k = clamp((t - 0.15 - i * 0.12) * 1.4);
      wk.w.position.x = wk.x0 + k * 4;
      wk.shadow.position.x = wk.x0 + k * 4 - smoothstep(0.3, 0.6, k) * 1.8; // 影子被抽离
      wk.num.position.x = wk.w.position.x;
      wk.num.position.y = 2.3 + Math.sin(T + i) * 0.05;
      wk.shadow.visible = k < 0.85;
      wk.num.material.opacity = smoothstep(0.35, 0.6, k);
    });
    smoke.forEach((p, i) => {
      const ph = (T * 0.4 + i * 0.35) % 1;
      p.position.set(6.5 + Math.sin(ph * 6 + i) * 0.5, 5 + ph * 3, -1.6 + Math.cos(ph * 5 + i) * 0.4);
      p.material.opacity = 0.5 * (1 - ph);
      p.scale.setScalar(1 + ph * 2);
    });
  };
  const camera = flyPath([
    { t: 0, pos: [0, 1.8, 9], look: [0, 1, 0] },
    { t: 0.45, pos: [-6, 2.6, 6], look: [-2, 1.4, 0] },
    { t: 1, pos: [5, 3.2, 7], look: [0, 2, 0], fov: 58 },
  ]);
  return {
    group: new THREE.Group(), title: "06 · 人力收割机", update, camera,
    script: [
      { t0: 0.00, t1: 0.22, text: "办公室在他眼里变成一台巨型机械。" },
      { t0: 0.22, t1: 0.48, text: "员工走上传送带，影子被抽走，变成报表里的生产力数字。" },
      { t0: 0.48, t1: 0.74, text: "齿轮不停转动，直到数字耗尽。" },
      { t0: 0.74, t1: 1.01, text: "人不是人，是一组组可替换的工时。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 07 全民审判庭
 * ============================================================ */
function buildTribunal() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  const R = rng(131);
  // —— 现实：街道人群 ——
  for (let i = 0; i < 12; i++) {
    const f = humanFigure({ color: [0x2b2e3b, 0x3d3542, 0x1e2029][i % 3], scale: .9 });
    f.position.set((R() - .5) * 14, 0, (R() - .5) * 8);
    reality.add(f);
  }
  // —— 心象：环形法庭 ——
  const rows = [];
  for (let row = 0; row < 4; row++) {
    const r = 4 + row * 2.2;
    const n = 10 + row * 4;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + row * 0.2;
      const j = maskFigure({ scale: .8 + row * 0.1 });
      j.position.set(Math.cos(a) * r, row * 0.9, Math.sin(a) * r);
      j.lookAt(0, row * 0.9, 0);
      dream.add(j);
      const score = makeLabel(`${(R() * 10).toFixed(1)} / 10`, { color: "#ff8a94", border: "#8f1420", worldHeight: 0.3, size: 24 });
      score.position.set(0, 2.1, 0);
      j.add(score);
      rows.push({ j, score, phase: R() * 6 });
    }
  }
  // 法槌
  const gavels = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const gv = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), m(0x8f1420));
    gv.add(handle);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8), m(0xd9cfc0));
    head.rotation.z = Math.PI / 2; head.position.y = 0.3; gv.add(head);
    gv.position.set(Math.cos(a) * 3.2, 2.6, Math.sin(a) * 3.2);
    dream.add(gv); gavels.push(gv);
  }
  // 围墙（没有出口）
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.5, 7, 24, 1, true), m(0x232733, { side: THREE.DoubleSide }));
  wall.position.y = 3.5; dream.add(wall);
  const tag = makeLabel("没有出口的法庭", { color: "#ffb3b8", border: "#d9232e", worldHeight: 0.44 });
  tag.position.set(0, 6.4, 0); dream.add(tag);

  const update = (t, dt, env) => {
    crossfade(reality, dream, env.d);
    const T = t * 30;
    rows.forEach(r => {
      const flick = 0.75 + 0.25 * Math.sin(T * 2 + r.phase);
      r.score.material.opacity = flick;
      r.j.rotation.y = Math.sin(T * 0.8 + r.phase) * 0.12;
    });
    gavels.forEach((g, i) => {
      const hit = Math.max(0, Math.sin(T * 2.2 - i * 0.7));
      g.rotation.x = -hit * 0.9;
    });
  };
  const camera = flyPath([
    { t: 0, pos: [0, 2.2, 14], look: [0, 1.5, 0] },
    { t: 0.5, pos: [0, 3, 9], look: [0, 1.6, 0] },
    { t: 1, pos: [0, 4.5, 6], look: [0, 2, 0], fov: 62 },
  ]);
  return {
    group: new THREE.Group(), title: "07 · 全民审判庭", update, camera,
    script: [
      { t0: 0.00, t1: 0.22, text: "他走进人群，所有人的脸变成没有五官的面具。" },
      { t0: 0.22, t1: 0.48, text: "每个人头顶悬浮着评分，每个微笑都像讥讽，每次沉默都像否定。" },
      { t0: 0.48, t1: 0.74, text: "围墙升起，整座城市变成一间没有出口的法庭。" },
      { t0: 0.74, t1: 1.01, text: "无数法官同时敲下法槌，却没有任何人真正说过他有罪。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 08 自封神明
 * ============================================================ */
function buildDeity() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  // —— 现实：会议室 ——
  const tableR = new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 1.6), m(0x6b7280));
  tableR.position.y = 0.78; reality.add(tableR);
  for (let i = 0; i < 5; i++) {
    const f = humanFigure({ color: 0x2b2e3b, scale: .9 });
    f.position.set(-2 + i, 0, i % 2 ? 1.2 : -1.2);
    reality.add(f);
  }
  // —— 心象：神殿 ——
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 7, 12), m(0x4a4f63));
    col.position.set(Math.cos(a) * 7, 3.5, Math.sin(a) * 7);
    dream.add(col);
  }
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.5, 16), m(0x2b2e3b));
  dais.position.y = 0.25; dream.add(dais);
  const throne = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 1.5), m(0xe8b64c, { emissive: 0x6b4d10, emissiveIntensity: .5 }));
  seat.position.y = 2.2; throne.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.8, 0.3), m(0xe8b64c, { emissive: 0x6b4d10, emissiveIntensity: .5 }));
  back.position.set(0, 3.4, -0.6); throne.add(back);
  const god = humanFigure({ color: 0x8f1420, scale: 1.4 });
  god.position.y = 3.0; throne.add(god);
  throne.position.set(0, 0, -2.5);
  dream.add(throne);
  const godTag = makeLabel("他 · 神", { color: "#ffd166", border: "#c9a227", worldHeight: 0.44 });
  godTag.position.set(0, 5.4, -2.5); dream.add(godTag);
  // 信徒
  const believers = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.4;
    const f = humanFigure({ color: 0x3d4152, scale: .95 });
    f.position.set(Math.cos(a) * 3.6, 0, Math.sin(a) * 3.6 + 0.8);
    f.lookAt(0, 2, -2.5);
    dream.add(f);
    const lb = makeLabel(i % 3 === 2 ? "异议…" : "赞同！", { color: i % 3 === 2 ? "#9fb4ff" : "#ffd166", border: i % 3 === 2 ? "#3b5bdb" : "#c9a227", worldHeight: 0.3, size: 24 });
    lb.position.set(0, 2.0, 0);
    f.add(lb);
    believers.push({ f, lb, dissent: i % 3 === 2, base: f.scale.x });
  }
  // 黑洞
  const hole = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), mb(0x000000));
  hole.position.set(0, 0.1, -2.5); dream.add(hole);
  const accretion = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 8, 32), mb(0xffd166));
  accretion.position.copy(hole.position); accretion.rotation.x = Math.PI / 2.3; dream.add(accretion);
  // 光环
  const halos = [];
  for (let i = 0; i < 5; i++) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 24), mb(0xffd166));
    dream.add(h); halos.push(h);
  }

  const update = (t, dt, env) => {
    crossfade(reality, dream, env.d);
    const T = t * 30;
    // 王座升高
    const rise = smoothstep(0.15, 0.55, t);
    throne.position.y = rise * 4.5;
    godTag.position.y = 5.4 + rise * 4.5;
    // 信徒变小
    believers.forEach((b, i) => {
      b.f.scale.setScalar(b.base * (1 - rise * 0.45));
      if (b.dissent) {
        // 异议被吸入黑洞（标签是 f 的子节点，用局部空间插值）
        const k = smoothstep(0.5, 0.75, t);
        const holeLocal = new THREE.Vector3(0, 0.1, -2.5).sub(b.f.position);
        b.lb.position.lerpVectors(new THREE.Vector3(0, 2.0, 0), holeLocal, k);
        b.lb.scale.setScalar(1 - k * 0.8);
      } else {
        // 赞同化为光环
        const k = smoothstep(0.35, 0.6, t);
        b.lb.material.opacity = 1 - k;
      }
    });
    halos.forEach((h, i) => {
      const ph = (T * 0.25 + i * 0.2) % 1;
      h.position.set((i - 2) * 0.9, 1.5 + ph * 3.5, -2.5);
      h.scale.setScalar(0.6 + ph);
      h.material.opacity = 0.8 * (1 - ph);
    });
    accretion.rotation.z += dt * 1.5;
    hole.scale.setScalar(1 + Math.sin(T) * 0.08);
  };
  const camera = flyPath([
    { t: 0, pos: [0, 1.6, 10], look: [0, 1.2, 0] },
    { t: 0.45, pos: [-5, 3.5, 8], look: [0, 3, 0] },
    { t: 1, pos: [0, 2.2, 11], look: [0, 7, -2.5], fov: 65 },
  ]);
  return {
    group: new THREE.Group(), title: "08 · 自封神明", update, camera,
    script: [
      { t0: 0.00, t1: 0.22, text: "普通会议室在他眼里变成一座神殿。" },
      { t0: 0.22, t1: 0.48, text: "他的座椅不断升高，别人的声音越来越小。" },
      { t0: 0.48, t1: 0.74, text: "所有赞同化为金色光环，所有异议被吸入王座下方的黑洞。" },
      { t0: 0.74, t1: 1.01, text: "王座膨胀成山峰，他却发现自己再也听不见任何人的声音。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 09 灵魂拍卖场
 * ============================================================ */
function buildAuction() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  const R = rng(163);
  // —— 现实：大堂人流 ——
  for (let i = 0; i < 9; i++) {
    const f = humanFigure({ color: [0x2b2e3b, 0x3d3542, 0x1e2029][i % 3], scale: .92 });
    f.position.set((R() - .5) * 12, 0, (R() - .5) * 8);
    reality.add(f);
  }
  // —— 心象：拍卖场 ——
  const hallFloor = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.4, 0.25, 20), m(0x241a10));
  hallFloor.position.y = -0.12; dream.add(hallFloor);
  const items = ["学历 ¥120万", "外貌 ¥88万", "人脉 ¥300万", "忠诚 买一送三", "友情 3 折"];
  const lots = [];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 0.5;
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.5, 14), m(0x3d4152));
    const f = humanFigure({ color: 0x232733, scale: .95 });
    const tag = makeLabel(items[i], { color: "#ffd166", border: "#c9a227", worldHeight: 0.34, size: 26 });
    const px = Math.cos(a) * 5.2, pz = Math.sin(a) * 5.2;
    platform.position.set(px, 0.25, pz);
    f.position.set(px, 0.5, pz);
    tag.position.set(0, 2.0, 0); f.add(tag);
    dream.add(platform); dream.add(f);
    lots.push({ f, tag, base: new THREE.Vector3(px, 0.5, pz), px, pz });
  }
  // 拍卖台
  const podium = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.8), m(0x5a4632));
  podium.position.set(0, 0.55, -6); dream.add(podium);
  const auctioneer = humanFigure({ color: 0x1c1a2a, scale: 1 });
  auctioneer.position.set(0, 0, -6); dream.add(auctioneer);
  const hammer = new THREE.Group();
  const hHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), m(0x8f1420)); hammer.add(hHandle);
  const hHead = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8), m(0xd9cfc0));
  hHead.rotation.z = Math.PI / 2; hHead.position.y = 0.32; hammer.add(hHead);
  hammer.position.set(0.6, 1.7, -6); dream.add(hammer);
  // 主角也被上架
  const heroLot = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.5, 14), m(0x3d4152));
  heroLot.position.set(0, 0.25, 5.5); dream.add(heroLot);
  const heroA = humanFigure({ color: 0x8f1420, scale: 1.05 });
  heroA.position.set(0, 0.5, 5.5); dream.add(heroA);
  const heroTag = makeLabel("他自己 · 流拍", { color: "#ffb3b8", border: "#d9232e", worldHeight: 0.36 });
  heroTag.position.set(0, 2.0, 5.5); dream.add(heroTag);
  const stageTag = makeLabel("灵魂拍卖场", { color: "#ffd166", border: "#c9a227", worldHeight: 0.46 });
  stageTag.position.set(0, 5.5, 0); dream.add(stageTag);

  const update = (t, dt, env) => {
    crossfade(reality, dream, env.d);
    const T = t * 30;
    // 法槌起落
    const fall = smoothstep(0.62, 0.68, t);
    hammer.rotation.x = -fall * 1.2 + Math.sin(T * 3) * 0.06 * (1 - fall);
    // 成交闪光
    lots.forEach((l, i) => {
      const k = smoothstep(0.68 + i * 0.02, 0.78, t);
      l.f.position.y = l.base.y + Math.abs(Math.sin(k * Math.PI)) * 0.4;
      l.tag.material.opacity = 1;
    });
    heroA.scale.setScalar(1.05 - smoothstep(0.8, 1, t) * 0.15);
  };
  const camera = flyPath([
    { t: 0, pos: [0, 2.2, 12], look: [0, 1.2, 0] },
    { t: 0.45, pos: [6, 2.6, 8], look: [0, 1.4, -1] },
    { t: 0.75, pos: [-4, 2.2, 9], look: [0, 1.3, 0] },
    { t: 1, pos: [0, 1.8, 9], look: [0, 1.4, 5], fov: 50 },
  ]);
  return {
    group: new THREE.Group(), title: "09 · 灵魂拍卖场", update, camera,
    script: [
      { t0: 0.00, t1: 0.22, text: "每个人额头都挂着价格标签。" },
      { t0: 0.22, t1: 0.48, text: "学历、外貌、人脉、收入被拆成不同的竞拍项目，连友情都出现了折扣。" },
      { t0: 0.48, t1: 0.74, text: "法槌落下，整个大厅的人同时变成商品。" },
      { t0: 0.74, t1: 1.01, text: "他以为自己是拍卖师，最后发现自己也被摆上了拍卖台。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 10 透明牢笼
 * ============================================================ */
function buildGlassCage() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  const R = rng(181);
  // —— 现实：普通房间 ——
  const room = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 8), m(0x9aa3af, { side: THREE.BackSide }));
  room.position.y = 2; reality.add(room);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.12), m(0x5a4632));
  door.position.set(0, 1.1, 4.06); reality.add(door);
  const person = humanFigure({ color: 0x2b2e3b, scale: 1 });
  person.position.set(0, 0, 0); reality.add(person);
  // —— 心象：玻璃箱 ——
  const cage = new THREE.Group();
  const glassMat = m(0x9fc4d8, { transparent: true, opacity: .18, roughness: .05 });
  const walls = [];
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.08), glassMat);
    w.position.set(0, 2, 0);
    cage.add(w); walls.push(w);
  }
  walls[0].position.z = 4; walls[1].position.z = -4;
  walls[2].rotation.y = Math.PI / 2; walls[2].position.x = 4;
  walls[3].rotation.y = Math.PI / 2; walls[3].position.x = -4;
  // 摄像头
  const cams = [];
  for (let i = 0; i < 6; i++) {
    const camG = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.4), m(0x111318));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.15, 8), mb(0xd9232e));
    lens.rotation.x = Math.PI / 2; lens.position.z = 0.25;
    camG.add(body); camG.add(lens);
    const a = i / 6 * Math.PI * 2;
    camG.position.set(Math.cos(a) * 3.2, 3.8, Math.sin(a) * 3.2);
    camG.lookAt(0, 1.5, 0);
    camG.scale.setScalar(0.01);
    cage.add(camG); cams.push(camG);
  }
  // 低语波纹
  const waves = [];
  for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 6, 40), mb(0xd9232e, { transparent: true, opacity: .6 }));
    w.rotation.x = Math.PI / 2; w.position.y = 0.08;
    cage.add(w); waves.push(w);
  }
  // 陷阱门
  const trapDoor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.12), m(0x3d4152));
  trapDoor.position.set(0, 1.1, 4.04); cage.add(trapDoor);
  const spikes = [];
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 6), m(0xd9dde3, { metalness: .8, roughness: .2 }));
    sp.position.set(-0.4 + i * 0.2, 1.5, 4.1);
    sp.scale.setScalar(0.01);
    cage.add(sp); spikes.push(sp);
  }
  const tag = makeLabel("没有证据的监视", { color: "#9fd8e8", border: "#3b7ea5", worldHeight: 0.4 });
  tag.position.set(0, 4.6, 0); cage.add(tag);
  // 城市缩影（笼中之城）
  const miniCity = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4 + R() * 1.2, 0.4), m(0x232733));
    b.position.set((R() - .5) * 7, b.geometry.parameters.height / 2, (R() - .5) * 7);
    miniCity.add(b);
  }
  miniCity.position.set(0, -6.2, 0);
  cage.add(miniCity);
  dream.add(cage);

  const update = (t, dt, env) => {
    crossfade(reality, dream, env.d);
    const T = t * 30;
    cams.forEach((c, i) => { c.scale.setScalar(clamp((t - 0.15 - i * 0.04) * 4)); c.lookAt(0, 1.5, 0); });
    waves.forEach((w, i) => {
      const ph = (T * 0.5 + i / 3) % 1;
      w.scale.setScalar(1 + ph * 5);
      w.material.opacity = 0.6 * (1 - ph);
    });
    // 门变陷阱
    const k = smoothstep(0.62, 0.75, t);
    spikes.forEach((s, i) => { s.scale.setScalar(clamp((k - i * 0.05) * 4)); s.position.y = 1.5 + Math.sin(T * 2 + i) * 0.05; });
    // 笼子抬起，露出笼中之城
    const lift = smoothstep(0.75, 0.95, t);
    cage.position.y = lift * 6;
  };
  const camera = flyPath([
    { t: 0, pos: [0, 2, 11], look: [0, 1.4, 0] },
    { t: 0.45, pos: [6, 2.8, 8], look: [0, 1.6, 0] },
    { t: 1, pos: [0, 4, 14], look: [0, 3, 0], fov: 50 },
  ]);
  return {
    group: new THREE.Group(), title: "10 · 透明牢笼", update, camera,
    script: [
      { t0: 0.00, t1: 0.24, text: "他觉得每次交谈都藏着目的。" },
      { t0: 0.24, t1: 0.50, text: "摄像头从天花板长出来，墙壁变成玻璃，窃窃私语被放大成警报。" },
      { t0: 0.50, t1: 0.76, text: "他不断寻找出口，却把每扇门都理解成陷阱。" },
      { t0: 0.76, t1: 1.01, text: "整座城市变成一只透明玻璃箱——却没有证据证明，有人真的在监视他。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 11 欲望黑洞
 * ============================================================ */
function buildVoid() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  const R = rng(211);
  // —— 现实：简朴房间 ——
  const roomR = new THREE.Mesh(new THREE.BoxGeometry(7, 3.5, 7), m(0xc9ced6, { side: THREE.BackSide }));
  roomR.position.y = 1.75; reality.add(roomR);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.2), m(0x6b7280));
  bed.position.set(-1.5, 0.25, 1); reality.add(bed);
  const plant = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), m(0x1a9e5c));
  plant.position.set(2, 0.4, -1); reality.add(plant);
  // —— 心象：堆积与黑洞 ——
  const wallsG = new THREE.Group();
  const wallMat = m(0x3d4152, { side: THREE.BackSide, transparent: true, opacity: .9 });
  const wallBox = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 14), wallMat);
  wallBox.position.y = 3.5; wallsG.add(wallBox);
  dream.add(wallsG);
  const treasures = [];
  const geos = [
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.CylinderGeometry(0.28, 0.28, 0.55, 10),
    new THREE.OctahedronGeometry(0.32),
    new THREE.SphereGeometry(0.26, 10, 8),
  ];
  const mats = [
    m(0xe8b64c, { metalness: .8, roughness: .2, emissive: 0x6b4d10, emissiveIntensity: .5 }),
    m(0xd9232e, { metalness: .5, roughness: .3 }),
    m(0x9fc4d8, { metalness: .9, roughness: .1, transparent: true, opacity: .8 }),
    m(0x8f1420, { roughness: .5 }),
  ];
  for (let i = 0; i < 46; i++) {
    const mesh = new THREE.Mesh(geos[i % 4], mats[i % 4]);
    const a = R() * Math.PI * 2, r = 1.2 + R() * 4.6;
    mesh.position.set(Math.cos(a) * r, 0.3 + R() * 2.4, Math.sin(a) * r);
    mesh.userData = { a, r, y: mesh.position.y, spin: R() * 2 - 1 };
    dream.add(mesh); treasures.push(mesh);
  }
  const hole = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 16), mb(0x000000));
  hole.position.set(0, 1.6, 0); dream.add(hole);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.12, 10, 40), mb(0xffd166));
  ring.position.copy(hole.position); ring.rotation.x = Math.PI / 2.4; dream.add(ring);
  const tag = makeLabel("他拥有了整个世界", { color: "#ffd166", border: "#c9a227", worldHeight: 0.44 });
  tag.position.set(0, 5.2, 0); dream.add(tag);

  const update = (t, dt, env) => {
    crossfade(reality, dream, env.d);
    const T = t * 30;
    // 房间扩张，物品变小，一切螺旋吸入
    const expand = smoothstep(0.2, 0.8, t);
    wallBox.scale.setScalar(0.4 + expand * 1.1);
    hole.scale.setScalar(0.3 + smoothstep(0.3, 0.95, t) * 1.6);
    ring.scale.setScalar(hole.scale.x);
    ring.rotation.z += dt * 0.8;
    treasures.forEach((tr, i) => {
      const k = smoothstep(0.25, 0.95, t) * (0.6 + (i % 5) * 0.1);
      tr.scale.setScalar(1 - k * 0.75);
      tr.userData.a += dt * tr.userData.spin * (0.4 + k * 2.4);
      tr.userData.r *= (1 - dt * 0.55 * k);
      tr.position.set(Math.cos(tr.userData.a) * tr.userData.r, lerp(tr.userData.y, hole.position.y, k), Math.sin(tr.userData.a) * tr.userData.r);
      tr.rotation.x += dt * tr.userData.spin; tr.rotation.y += dt * tr.userData.spin * 0.7;
    });
  };
  const camera = flyPath([
    { t: 0, pos: [0, 2.2, 10], look: [0, 1.2, 0] },
    { t: 0.5, pos: [4, 3, 8], look: [0, 1.6, 0] },
    { t: 1, pos: [0, 3.4, 15], look: [0, 1.8, 0], fov: 50 },
  ]);
  return {
    group: new THREE.Group(), title: "11 · 欲望黑洞", update, camera,
    script: [
      { t0: 0.00, t1: 0.22, text: "金钱、食物、名望、奢侈品不断堆积成山。" },
      { t0: 0.22, t1: 0.48, text: "他得到的越多，房间就变得越大，所有东西却越来越小。" },
      { t0: 0.48, t1: 0.76, text: "一切开始螺旋着坠入中心那只吞噬一切的黑洞。" },
      { t0: 0.76, t1: 1.01, text: "他终于拥有整个世界，却发现世界已经被掏空。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 12 提线世界
 * ============================================================ */
function buildPuppet() {
  const reality = new THREE.Group(), dream = new THREE.Group();
  const R = rng(233);
  // —— 现实：街头 ——
  for (let i = 0; i < 9; i++) {
    const f = humanFigure({ color: [0x2b2e3b, 0x3d3542, 0x1e2029][i % 3], scale: .92 });
    f.position.set((R() - .5) * 12, 0, (R() - .5) * 8);
    reality.add(f);
  }
  // —— 心象：木偶剧院 ——
  // 舞台框
  const frame = new THREE.Group();
  const curtainMat = m(0x8f1420, { roughness: .9 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 0.4), curtainMat);
  top.position.set(0, 6.4, -2.6); frame.add(top);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 0.4), curtainMat);
  sideL.position.set(-5.8, 3.4, -2.6); frame.add(sideL);
  const sideR = sideL.clone(); sideR.position.x = 5.8; frame.add(sideR);
  dream.add(frame);
  // 控制杆
  const bars = [];
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.12), m(0x565b6e));
    bar.position.set(0, 5.2 + i * 0.7, -1.2);
    dream.add(bar); bars.push(bar);
  }
  // 悬丝人偶
  const puppets = [];
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.66, 4, 8), m([0x2b2e3b, 0x3d3542, 0x4a3b6b][i % 3]));
    body.position.y = 0.78; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), m(0xd8cfc0));
    head.position.y = 1.42; g.add(head);
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 3, 6), body.material);
    armL.position.set(-0.34, 1.05, 0); armL.rotation.z = 0.5; g.add(armL);
    const armR = armL.clone(); armR.position.x = 0.34; armR.rotation.z = -0.5; g.add(armR);
    // 悬丝（挂在 dream 下，用世界坐标对齐）
    const threads = [];
    const anchorPts = [[0, 1.62, 0], [-0.34, 1.3, 0], [0.34, 1.3, 0]];
    anchorPts.forEach((p, j) => {
      const th = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4), mb(0xd9232e));
      dream.add(th); threads.push({ mesh: th, p, bar: bars[j % 3] });
    });
    const px = (i % 4 - 1.5) * 2.6, pz = Math.floor(i / 4) * 2.6 - 1;
    g.position.set(px, 0, pz);
    dream.add(g);
    puppets.push({ g, threads, px, pz, phase: R() * 6, broken: i === 3 });
  }
  // 巨手
  const bigHand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 2), m(0xd9cfc0));
  bigHand.add(palm);
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.8, 3, 6), m(0xd9cfc0));
    finger.position.set(-0.6 + i * 0.4, 0.18, 1.2);
    finger.rotation.x = Math.PI / 2.6;
    bigHand.add(finger);
  }
  bigHand.position.set(0, 6.2, 0.5);
  dream.add(bigHand);
  const tag = makeLabel("他握着线，却碰不到任何人", { color: "#ffb3b8", border: "#d9232e", worldHeight: 0.42 });
  tag.position.set(0, 7.6, -1); dream.add(tag);

  const update = (t, dt, env) => {
    crossfade(reality, dream, env.d);
    const T = t * 30;
    // 巨手操控
    bigHand.position.y = 6.2 + Math.sin(T * 0.7) * 0.35;
    bigHand.rotation.z = Math.sin(T * 0.5) * 0.12;
    puppets.forEach((p, i) => {
      const sway = p.broken ? 0 : 1;
      p.g.position.x = p.px + Math.sin(T * 0.9 + p.phase) * 0.35 * sway;
      p.g.rotation.z = Math.sin(T * 0.9 + p.phase) * 0.14 * sway;
      p.g.rotation.y = Math.sin(T * 0.6 + p.phase) * 0.3 * sway;
      if (p.broken) {
        // 挣脱：倒下，线断
        const k = smoothstep(0.55, 0.7, t);
        p.g.rotation.x = k * 1.4;
        p.g.position.y = -k * 0.15;
      }
      p.threads.forEach((th) => {
        if (p.broken) { th.mesh.visible = false; return; }
        th.mesh.visible = true;
        // 悬丝两端都在 dream 局部空间：脚端锚在木偶身上，顶端锚在控制杆
        const foot = new THREE.Vector3(...th.p).applyMatrix4(p.g.matrix);
        const bar = new THREE.Vector3(th.p[0], th.bar.position.y, th.p[2]);
        const dir = bar.clone().sub(foot);
        const len = dir.length();
        th.mesh.position.copy(foot).addScaledVector(dir, 0.5);
        th.mesh.scale.y = Math.max(0.01, len);
        th.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      });
    });
  };
  const camera = flyPath([
    { t: 0, pos: [0, 2.4, 13], look: [0, 2, 0] },
    { t: 0.45, pos: [-6, 3.4, 9], look: [0, 2.6, 0] },
    { t: 0.75, pos: [0, 5, 10], look: [0, 5, 0] },
    { t: 1, pos: [0, 3.2, 12], look: [0, 3, 0], fov: 55 },
  ]);
  return {
    group: new THREE.Group(), title: "12 · 提线世界", update, camera,
    script: [
      { t0: 0.00, t1: 0.22, text: "他相信每个人的决定，都能被自己预测和操纵。" },
      { t0: 0.22, t1: 0.48, text: "人群头顶出现细密的红线，城市像一座巨大的木偶剧院。" },
      { t0: 0.48, t1: 0.72, text: "当有一个人突然挣脱红线，整个世界开始失去秩序。" },
      { t0: 0.72, t1: 1.01, text: "他手里握着无数根线，却没有一根真正连接到别人的内心。" },
    ],
    _groups: [reality, dream],
  };
}

/* ============================================================
 * 注册表
 * ============================================================ */
const BUILDERS = {
  atm: buildATM, buffet: buildBuffet, kingdom: buildKingdom, antcity: buildAntCity,
  chess: buildChess, harvester: buildHarvester, tribunal: buildTribunal, deity: buildDeity,
  auction: buildAuction, glasscage: buildGlassCage, void: buildVoid, puppet: buildPuppet,
};

export function buildScene(id) {
  const b = BUILDERS[id];
  if (!b) return null;
  const scene = b();
  // 把 reality / dream 挂到主组上
  scene._groups.forEach(g => scene.group.add(g));
  return scene;
}

export const SCENE_META = {
  atm: { desc: "把人际关系等同于金钱收益：每个人都是可兑现的资源。" },
  buffet: { desc: "把他人当成满足欲望的工具：掠夺与轻蔑的一体两面。" },
  kingdom: { desc: "把组织等级视为天经地义的统治秩序：工作即效忠。" },
  antcity: { desc: "把个体价值压缩为可忽略的数字：只剩数量与效率。" },
  chess: { desc: "把社交看成棋局：每次交谈都是落子，关心也是布局。" },
  harvester: { desc: "把员工看成可替换的工时：人进去，数字出来。" },
  tribunal: { desc: "被评价焦虑主导：人群是没有出口的法庭，沉默即否定。" },
  deity: { desc: "优越感膨胀：赞同是光环，异议被黑洞吞掉。" },
  auction: { desc: "关系彻底交易化：一切皆可标价，包括他自己。" },
  glasscage: { desc: "极端猜疑：每扇门都是陷阱，没有证据的监视。" },
  void: { desc: "永不满足的贪婪：拥有世界的同时，世界被掏空。" },
  puppet: { desc: "操控幻觉：线在手，却从未连接到任何人的内心。" },
};
