from PIL import Image, ImageDraw, ImageFont
import os

SRC = r"C:\Users\Schub\WorkBuddy\2026-10-14-21-35-55\demo\web\assets"
OUT = r"C:\Users\Schub\WorkBuddy\2026-10-14-21-35-55\demo\朋友圈九宫格.jpg"

CY = (57, 231, 255)
VI = (123, 107, 255)
BG = (6, 10, 24)
DIM = (90, 100, 128)
WHITE = (232, 238, 248)

F = "C:/Windows/Fonts/msyh.ttc"
FB = "C:/Windows/Fonts/msyhbd.ttc"

CELL = 900          # 单格边长
GAP = 14
N = 3
CANVAS = CELL * N + GAP * (N - 1)

im = Image.new("RGB", (CANVAS, CANVAS), BG)
d = ImageDraw.Draw(im)


def fit_cover(img, size):
    """裁切填满 size"""
    sw, sh = img.size
    scale = max(size / sw, size / sh)
    nw, nh = int(sw * scale + 0.5), int(sh * scale + 0.5)
    img = img.resize((nw, nh), Image.LANCZOS)
    x = (nw - size) // 2
    y = (nh - size) // 2
    return img.crop((x, y, x + size, y + size))


def cell_xy(i, j):
    return i * (CELL + GAP), j * (CELL + GAP)


def grid_bg(x0, y0, w, h):
    """网格底纹"""
    step = 45
    for gx in range(x0, x0 + w, step):
        d.line([(gx, y0), (gx, y0 + h)], fill=(14, 26, 46), width=1)
    for gy in range(y0, y0 + h, step):
        d.line([(x0, gy), (x0 + w, gy)], fill=(14, 26, 46), width=1)


def glow(cx, cy, r, color):
    """径向光晕（用叠加层近似）"""
    from PIL import ImageFilter
    global im
    layer = Image.new("RGB", im.size, BG)
    ld = ImageDraw.Draw(layer)
    ld.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.55))
    im.paste(Image.blend(im, layer, 0.0), (0, 0))
    return layer


# ============ 5 张视觉图（上两行） ============
VISUALS = [
    ("avatar_wire.png", 0, 0),
    ("world_atm.png", 1, 0),
    ("world_ant.png", 2, 0),
    ("world_particle.png", 0, 1),
    ("data_flow.png", 1, 1),
]

for fn, i, j in VISUALS:
    p = os.path.join(SRC, fn)
    if not os.path.exists(p):
        print("MISS", fn)
        continue
    x0, y0 = cell_xy(i, j)
    pic = fit_cover(Image.open(p).convert("RGB"), CELL)
    im.paste(pic, (x0, y0))
    # 轻微压暗，突出氛围
    ov = Image.new("RGB", (CELL, CELL), (4, 8, 18))
    im.paste(Image.blend(pic, ov, 0.22), (x0, y0))

# 第 6 格：标题格
x0, y0 = cell_xy(2, 1)
grid_bg(x0, y0, CELL, CELL)
# 顶部光晕
from PIL import ImageFilter
lay = Image.new("RGB", im.size, BG)
ld = ImageDraw.Draw(lay)
ld.ellipse([x0 + 250, y0 + 180, x0 + 650, y0 + 580], fill=(20, 80, 100))
lay = lay.filter(ImageFilter.GaussianBlur(90))
im.paste(Image.blend(im.crop((x0, y0, x0 + CELL, y0 + CELL)),
                     lay.crop((x0, y0, x0 + CELL, y0 + CELL)), 0.85), (x0, y0))
d = ImageDraw.Draw(im)

f_kick = ImageFont.truetype(FB, 62)
f_t1 = ImageFont.truetype(FB, 92)
f_t2 = ImageFont.truetype(FB, 92)
f_sub = ImageFont.truetype(F, 40)
f_meta = ImageFont.truetype(F, 32)

cx = x0 + CELL // 2
d.text((cx, y0 + 210), "SUBSTRATE", font=f_meta, fill=CY, anchor="mm")
# 三行完整排布，避免"潜意识"被拆开
d.text((cx, y0 + 360), "你的", font=f_t1, fill=WHITE, anchor="mm")
d.text((cx, y0 + 470), "潜意识", font=f_t1, fill=WHITE, anchor="mm")
d.text((cx, y0 + 580), "长什么样", font=f_t2, fill=CY, anchor="mm")
d.line([(x0 + 240, y0 + 660), (x0 + CELL - 240, y0 + 660)], fill=CY, width=2)
d.text((cx, y0 + 720), "21 天 · 186 小时 · 4820 样本", font=f_sub, fill=DIM, anchor="mm")
d.text((cx, y0 + 780), "概念 Demo · 画面均由 AI 生成", font=f_meta, fill=(60, 70, 90), anchor="mm")

# ============ 隐喻格（最后一行） ============
METAPHORS = [
    ("印钞机", "功利性视角 82", CY),
    ("蝼蚁", "尺度错位 68", VI),
    ("吃饭机器", "消耗式节奏 74", (255, 193, 77)),
]

f_tag = ImageFont.truetype(F, 30)
f_mw = ImageFont.truetype(FB, 108)
f_ms = ImageFont.truetype(F, 36)

for i, (word, sub, color) in enumerate(METAPHORS):
    x0, y0 = cell_xy(i, 2)
    grid_bg(x0, y0, CELL, CELL)
    cx = x0 + CELL // 2

    # 底部主色光带
    lay = Image.new("RGB", im.size, BG)
    ld = ImageDraw.Draw(lay)
    ld.rectangle([x0, y0 + CELL - 6, x0 + CELL, y0 + CELL], fill=color)
    ld.ellipse([cx - 330, y0 + CELL - 380, cx + 330, y0 + CELL + 60],
               fill=tuple(int(c * 0.16) for c in color))
    lay = lay.filter(ImageFilter.GaussianBlur(80))
    im.paste(Image.blend(im.crop((x0, y0, x0 + CELL, y0 + CELL)),
                         lay.crop((x0, y0, x0 + CELL, y0 + CELL)), 0.9), (x0, y0))
    d = ImageDraw.Draw(im)

    # 引号装饰
    d.text((cx, y0 + 168), "潜 意 识 隐 喻", font=f_tag, fill=color, anchor="mm")
    # 主字（长词自动缩放）
    size = 108
    while size > 48 and d.textlength(word, font=ImageFont.truetype(FB, size)) > CELL - 120:
        size -= 4
    d.text((cx, y0 + 380), word, font=ImageFont.truetype(FB, size),
           fill=WHITE, anchor="mm")
    d.text((cx, y0 + 560), sub, font=f_ms, fill=(150, 162, 185), anchor="mm")
    # 分隔线
    d.line([(cx - 90, y0 + 660), (cx + 90, y0 + 660)], fill=color, width=2)

# ============ 输出 ============
im.save(OUT, "JPEG", quality=90, optimize=True, progressive=True)
print("已生成:", OUT)
print("尺寸: %dx%d" % im.size)
print("大小: %.1f KB" % (os.path.getsize(OUT) / 1024))
