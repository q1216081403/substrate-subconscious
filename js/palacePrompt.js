/* ============================================================
 * palacePrompt.js — 把宫殿译成 AI 视频生成提示词与分镜
 * 目标模型：可灵 / 即梦 / Runway / Sora 等文生视频
 * ============================================================ */
import { buildScene, SCENE_META } from "./palace/archetypes.js";

const STYLE_ZH = "超现实主义短片，认知宫殿（Cognitive Palace）视觉风格，红黑金戏剧化配色，硬顶光与红色轮廓光，缓慢推轨镜头，浅景深，35mm 电影质感，高对比度，庄典而不安的氛围，物体渐变态写实渲染";
const STYLE_EN = "surrealist short film, cognitive-palace visual style, red-black-gold dramatic palette, hard top light with crimson rim light, slow dolly-in shots, shallow depth of field, 35mm cinematic texture, high contrast, solemn and unsettling atmosphere, hyper-real morphing objects";

const SCENE_ZH = {
  atm: "豪华宴会厅，身着礼服的宾客逐渐变形为巨型 ATM 取款机，每台机器胸口屏幕显示跳动的余额数字，头顶悬浮全息投资回报率百分比；有人递来名片，机器吐出钞票；有人转身离席，屏幕数字瞬间归零；红色顶光，超现实渐变变形",
  buffet: "普通办公室渐变为奢华餐厅，长桌铺白桌布，同事的轮廓变成银色餐盘与水晶罩，头顶浮现菜品标签；主角坐在长桌尽头不断推开递来的菜单，餐盘堆积成山；金色吊灯，暖红阴影",
  kingdom: "写字楼渐变为中世纪城堡，工位变成密密麻麻的臣民小屋，石柱与红色旌旗，主管披贵族长袍加冕，老板端坐在高耸入天的王座上，考勤机变成城门，绩效报表变成羊皮税册；低角度仰拍",
  antcity: "镜头从摩天楼顶端俯冲至街道，行人的面孔消失变成沿固定路线移动的黑色小点，地铁变成巨大传送带，红绿灯控制人潮方向，城市俯瞰图渐变为精密运转的蚁巢辐射纹；冷灰色调",
  chess: "城市地面变成巨大棋盘，行人变形为国际象棋棋子，朋友是马、竞争者是兵、下属是可牺牲的车；一只巨手从画外落下，数百个棋子按照手势滑动；俯拍与平摇结合",
  harvester: "办公室走廊变成巨型机械工厂，传送带运送着员工，他们的影子被抽离变成报表里的生产力数字，齿轮转动，烟囱冒出浓烟，人走进去数字出来；工业蒸汽朋克氛围",
  tribunal: "人群变成环形排列的白色无五官面具，每个人头顶悬浮评分数字，法槌如波浪般同时起落，围墙从地面升起封住所有出口，红色警示灯闪烁；环形构图，幽闭压迫",
  deity: "会议室变成神殿，立柱耸立，主角的座椅不断升高最终化为山峰般的王座，赞同他的人化为金色光环上升，异议者被吸入王座下方的黑洞；极度低角度仰拍，广角畸变",
  auction: "大厅里每个人站在展台上，额头挂着价格标签，学历外貌人脉被拆成竞拍项目，法槌落下时全场同时变成商品，最后主角发现自己也被摆上拍卖台；戏剧化顶光，聚光灯扫过",
  glasscage: "房间墙壁变成透明玻璃，摄像头从天花板生长出来，红色低语波纹在地面扩散，每扇门打开都弹出金属尖刺，最终整个房间被抬升为玻璃箱，箱外是微缩城市；冷蓝与警报红",
  void: "简朴房间迅速堆满金块、钱袋、珠宝与奢侈品，房间不断向外扩张，所有物品越变越小，一切螺旋坠入中心不断膨胀的黑色球体与金色吸积盘；从堆积特写拉远到全景",
  puppet: "城市变成巨大的木偶剧院，人群头顶连着细密红线汇聚到一只巨手，当一个人挣脱红线倒下，其余木偶开始失去秩序；红线在暗背景中格外醒目，舞台框构图",
};

const SCENE_EN = {
  atm: "a grand banquet hall where formally dressed guests gradually morph into giant ATM machines, glowing balance numbers on their chests and holographic ROI percentages floating above their heads; banknotes burst out when a business card is exchanged; screens reset to zero when someone leaves",
  buffet: "an ordinary office transforming into a lavish restaurant, colleagues becoming silver serving trays with cloches and floating dish labels, the protagonist pushing away every menu at the head of a long table, plates piling into mountains",
  kingdom: "an office tower morphing into a medieval castle, cubicles into peasants' dwellings, a supervisor being crowned in noble robes, the boss on an impossibly tall throne, the time-clock as the city gate, performance reports as parchment tax ledgers",
  antcity: "a diving shot from a skyscraper to the street where pedestrians lose their faces and become black dots moving on fixed routes, the subway as a conveyor belt, traffic lights directing human tides, the city plan resolving into an anthill",
  chess: "a city ground becoming a giant chessboard, pedestrians turning into pieces, a giant hand descending and sliding hundreds of pieces with a single gesture",
  harvester: "an office corridor becoming a colossal machine, employees on a conveyor belt, their shadows extracted into productivity numbers on reports, grinding gears, smoking chimneys",
  tribunal: "a crowd turning into concentric rings of faceless white masks with floating scores above their heads, gavels rising and falling in waves, walls sealing every exit",
  deity: "a meeting room becoming a temple, the protagonist's chair rising into a mountain-like throne, agreement turning into golden halos, dissent sucked into a black hole beneath the throne",
  auction: "everyone standing on display platforms with price tags on their foreheads, credentials and relationships split into auction lots, the whole hall turning into merchandise at the hammer's fall, the protagonist finally on the block himself",
  glasscage: "room walls turning into transparent glass, cameras growing from the ceiling, red whisper ripples on the floor, every door revealing spikes, the whole room lifted as a glass tank above a miniature city",
  void: "a modest room rapidly piling up gold, cash bags and jewels, walls expanding outward, objects shrinking, everything spiraling into an ever-growing black sphere with a golden accretion ring",
  puppet: "a city becoming a giant puppet theater, crowds connected by dense red threads to a giant hand, one figure breaking free and collapsing, the rest losing order",
};

const dimTweaks = (d) => {
  const t = [];
  if (d.arousal > 0.6) t.push("节奏加快、手持微晃、剪辑偏快");
  if (d.arousal < 0.35) t.push("节奏舒缓、固定长镜头");
  if (d.valence < 0.35) t.push("冷暗色调、低饱和、阴郁光线");
  if (d.valence > 0.65) t.push("暖色调、柔和光线");
  if (d.dominance > 0.6) t.push("低角度仰拍、广角、主体占据画面中心");
  if (d.stress > 0.6) t.push("轻微畸变广角、闪烁不安的光线");
  if (d.suspicion > 0.6) t.push("窥视视角、监控画面质感、大量阴影遮挡");
  if (d.greed > 0.6) t.push("特写堆叠的奢侈品、景深极浅");
  return t.length ? t.join("，") : "标准电影运镜";
};

export function buildVideoPrompt(id, dims = {}, lang = "zh") {
  const meta = SCENE_META[id] || {};
  const tweaks = dimTweaks(dims);
  if (lang === "en") {
    return `${SCENE_EN[id] || meta.desc || ""}. ${STYLE_EN}. Camera and pacing: ${tweaks}. No text overlays, no subtitles, no watermark.`;
  }
  return `${SCENE_ZH[id] || meta.desc || ""}。${STYLE_ZH}。运镜与节奏：${tweaks}。不要文字水印，不要字幕。`;
}

export function buildShotList(id, dims = {}, duration = 30) {
  const scene = buildScene(id);
  const meta = SCENE_META[id] || {};
  const lines = [`《${scene.title}》分镜脚本 · ${duration}s · 认知扭曲可视化`, `内核：${meta.desc || ""}`, ""];
  const tweaks = dimTweaks(dims);
  lines.push(`整体风格：${STYLE_ZH}`);
  lines.push(`运镜基调：${tweaks}`);
  lines.push("");
  (scene.script || []).forEach(l => {
    const a = Math.round(l.t0 * duration), b = Math.round(l.t1 * duration);
    lines.push(`[${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")} – ${String(Math.floor(b / 60)).padStart(2, "0")}:${String(b % 60).padStart(2, "0")}]`);
    lines.push(`  画面：${l.text}`);
    lines.push("");
  });
  lines.push("提示词（中文）：" + buildVideoPrompt(id, dims, "zh"));
  lines.push("Prompt (EN): " + buildVideoPrompt(id, dims, "en"));
  return lines.join("\n");
}
