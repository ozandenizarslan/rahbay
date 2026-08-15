"""Sahneler — Mehmet Rahbay Mimarlık portföy görselleri."""
import math, os, sys
import numpy as np
from render import Scene, Cam, V, render

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "uploads")
os.makedirs(OUT, exist_ok=True)

W, H = 1600, 1067
WSQ, HSQ = 1400, 1050


def slab(sc, cx, cy, cz, sx, sy, sz, **kw):
    sc.add_box((cx, cy, cz), (sx, sy, sz), **kw, tint=(0.96, 0.94, 0.90))


def plaza(sc, cx, cz, sx, sz, albedo=0.70, y=0.012, tint=(1.00, 0.98, 0.94)):
    sc.add_decal([V(cx - sx / 2, y, cz + sz / 2), V(cx + sx / 2, y, cz + sz / 2),
                  V(cx + sx / 2, y, cz - sz / 2), V(cx - sx / 2, y, cz - sz / 2)], albedo, tint)


def water(sc, cx, cz, sx, sz, y=0.05):
    sc.add_face([V(cx - sx / 2, y, cz + sz / 2), V(cx + sx / 2, y, cz + sz / 2),
                 V(cx + sx / 2, y, cz - sz / 2), V(cx - sx / 2, y, cz - sz / 2)],
                0.52, V(0, 1, 0), outline=False, tint=(0.36, 0.66, 0.86))
    n = 5
    for i in range(n):
        z0 = cz - sz / 2 + sz * (i + 0.30) / n
        z1 = cz - sz / 2 + sz * (i + 0.42) / n
        sc.add_face([V(cx - sx / 2, y + .002, z1), V(cx + sx / 2, y + .002, z1),
                     V(cx + sx / 2, y + .002, z0), V(cx - sx / 2, y + .002, z0)],
                    0.62, V(0, 1, 0), outline=False, tint=(0.52, 0.80, 0.94))


def tree(sc, x, z, h=7.0, w=3.4, seed=1):
    sc.add_tree(x, z, h, w, seed)


# ----------------------------------------------------------------- 1. VILLA
def villa(view=0):
    sc = Scene(sky_top=(112, 166, 212), sky_bot=(224, 235, 240),
               light=(0.86, 0.42, 0.26), ground=0.74, haze=(25, 130), haze_amt=0.5)
    plaza(sc, 0, 6, 46, 26, 0.80)
    # alt kat
    sc.add_box((0, 1.75, 0), (19, 3.5, 9.5), albedo=0.88, tint=(1.00, 0.97, 0.92),
               windows={"+z": dict(cols=7, rows=1, mx=0.07, my=0.16, glass=0.17, jitter=0.05, seed=3)})
    # üst kat
    sc.add_box((-3.2, 5.3, -1.4), (12.5, 3.2, 7.6), albedo=0.91, tint=(1.00, 0.97, 0.92),
               windows={"+z": dict(cols=5, rows=1, mx=0.09, my=0.2, glass=0.15, seed=5),
                        "+x": dict(cols=2, rows=1, mx=0.16, my=0.24, glass=0.16, seed=9)})
    # saçak plakları
    slab(sc, 1.0, 3.62, 2.2, 24, 0.34, 5.0, albedo=0.95, shadow=True)
    slab(sc, -3.2, 7.05, -1.0, 15, 0.32, 9.4, albedo=0.96)
    # taş duvar
    sc.add_box((9.5, 1.4, -2.0), (1.0, 2.8, 12.0), albedo=0.66, tint=(0.94, 0.86, 0.74))
    # kolonlar
    for x in (-8.5, -3.5, 1.5, 6.5, 10.5):
        sc.add_box((x, 1.8, 4.4), (0.26, 3.6, 0.26), albedo=0.86, shadow=True, tint=(0.96, 0.94, 0.90))
    water(sc, 1.0, 11.5, 22, 7)
    for x in (-14, 13, 16):
        tree(sc, x, 9, 6.2, 2.4)
    sc.add_person(-6.5, 15.5, 1.74, 0.30)
    sc.add_person(-5.2, 16.2, 1.66, 0.36)
    if view == 0:
        cam = Cam((21, 5.4, 27), (-1, 3.4, 0), fov=40, w=W, h=H)
    elif view == 1:
        cam = Cam((7.5, 2.0, 15.5), (-2, 4.2, -2), fov=46, w=WSQ, h=HSQ)
    else:
        cam = Cam((-16, 3.0, 14), (2, 3.0, -1), fov=36, w=W, h=H)
    return sc, cam


# ----------------------------------------------------------------- 2. KULE
def tower(view=0):
    sc = Scene(sky_top=(112, 166, 212), sky_bot=(224, 235, 240),
               light=(0.86, 0.42, 0.26), ground=0.74, haze=(30, 220), haze_amt=0.62)
    plaza(sc, 0, 20, 90, 90, 0.80)
    # ana kule
    for i in range(9):
        y0 = i * 7.4
        w_ = 17 - i * 0.55
        sc.add_box((0, y0 + 3.5, 0), (w_, 7.0, w_ * 0.72), ry=0.06 * i, albedo=0.80,
                   windows={"+z": dict(cols=8, rows=2, mx=0.08, my=0.26, glass=0.19, jitter=0.09, seed=i + 1),
                            "+x": dict(cols=6, rows=2, mx=0.08, my=0.26, glass=0.16, jitter=0.09, seed=i + 40),
                            "-x": dict(cols=6, rows=2, mx=0.08, my=0.26, glass=0.15, jitter=0.09, seed=i + 70)},
                   shadow=(i == 0))
        sc.add_box((0, y0 + 7.15, 0), (w_ + 1.1, 0.45, w_ * 0.72 + 1.1), ry=0.06 * i,
                   albedo=0.93, shadow=False)
    # ikinci blok
    sc.add_box((-19, 14, -9), (11, 28, 11), albedo=0.72,
               windows={"+z": dict(cols=5, rows=9, mx=0.14, my=0.2, glass=0.2, jitter=0.08, seed=13),
                        "+x": dict(cols=5, rows=9, mx=0.14, my=0.2, glass=0.17, jitter=0.08, seed=17)})
    # podyum
    sc.add_box((-6, 3.0, 12), (44, 6.0, 14), albedo=0.86,
               windows={"+z": dict(cols=14, rows=1, mx=0.05, my=0.22, glass=0.17, seed=21)})
    slab(sc, -6, 6.3, 12.5, 46, 0.4, 15.5, albedo=0.95)
    for x in (-24, -18, 20, 26):
        tree(sc, x, 24, 7, 3)
    for p in [(-8, 26), (-5.5, 27.5), (4, 25), (12, 29), (-14, 30)]:
        sc.add_person(p[0], p[1], 1.72, 0.30)
    if view == 0:
        cam = Cam((26, 2.2, 46), (-3, 26, 0), fov=48, w=WSQ, h=HSQ)
    elif view == 1:
        cam = Cam((17, 3.0, 31), (0, 23, 0), fov=52, w=WSQ, h=HSQ)
    else:
        cam = Cam((44, 16, 62), (-4, 24, 0), fov=34, w=W, h=H)
    return sc, cam


# ----------------------------------------------------- 3. KÜLTÜR MERKEZİ
def culture(view=0):
    sc = Scene(sky_top=(112, 166, 212), sky_bot=(224, 235, 240),
               light=(0.86, 0.42, 0.26), ground=0.74, haze=(30, 150), haze_amt=0.5)
    plaza(sc, 0, 16, 80, 46, 0.80)
    # ana kütle
    sc.add_box((0, 6.0, 0), (40, 12, 18), albedo=0.84,
               windows={"+z": dict(cols=9, rows=3, mx=0.07, my=0.22, glass=0.17, jitter=0.06, seed=2)})
    slab(sc, 0, 12.5, 1.0, 46, 1.0, 24, albedo=0.95)
    # kolonad
    for i in range(13):
        x = -22.5 + i * 3.75
        sc.add_box((x, 6.0, 10.5), (0.85, 12.0, 0.85), albedo=0.90, tint=(0.96, 0.94, 0.90))
    # yan kanat
    sc.add_box((-27, 4.0, -4), (13, 8, 13), albedo=0.76,
               windows={"+x": dict(cols=4, rows=3, mx=0.2, my=0.26, glass=0.18, seed=31),
                        "+z": dict(cols=4, rows=3, mx=0.2, my=0.26, glass=0.2, seed=33)})
    sc.add_box((26, 3.0, -2), (10, 6, 16), albedo=0.70,
               windows={"+x": dict(cols=5, rows=2, mx=0.14, my=0.26, glass=0.18, seed=41)})
    # merdiven
    for i in range(6):
        sc.add_box((0, 0.16 + i * 0.32, 13.8 + i * 1.0), (44 - i, 0.32, 1.0),
                   albedo=0.79, shadow=False)
    water(sc, 0, 26, 34, 9)
    for x in (-32, -37, 33, 38):
        tree(sc, x, 20, 8, 3.4)
    for p in [(-9, 22), (-7.6, 22.9), (5, 20), (13, 24), (-2, 27), (18, 28), (-16, 25)]:
        sc.add_person(p[0], p[1], 1.72, 0.30)
    if view == 0:
        cam = Cam((30, 6.5, 44), (-2, 7, 0), fov=40, w=W, h=H)
    elif view == 1:
        cam = Cam((19, 3.2, 31), (-4, 8, 0), fov=46, w=WSQ, h=HSQ)
    else:
        cam = Cam((-34, 4.0, 34), (4, 6, 0), fov=38, w=W, h=H)
    return sc, cam


# ------------------------------------------------------- 4. KONUT / TERAS
def terrace(view=0):
    sc = Scene(sky_top=(112, 166, 212), sky_bot=(224, 235, 240),
               light=(0.86, 0.42, 0.26), ground=0.74, haze=(25, 140), haze_amt=0.5)
    plaza(sc, 0, 18, 70, 34, 0.80)
    for b, ox in enumerate((-24, 0, 24)):
        for i in range(6):
            depth = 12 - i * 1.5
            sc.add_box((ox, 1.7 + i * 3.4, -i * 1.5 / 2), (18, 3.4, depth),
                       albedo=0.86 - 0.012 * i,
                       windows={"+z": dict(cols=5, rows=1, mx=0.09, my=0.2,
                                           glass=0.18, jitter=0.07, seed=b * 10 + i)},
                       shadow=(i == 0))
            # teras korkuluğu
            sc.add_box((ox, 3.55 + i * 3.4, -i * 1.5 / 2 + depth / 2 + 0.6),
                       (18, 0.16, 1.2), albedo=0.94, shadow=False)
            for k in range(7):
                sc.add_box((ox - 8 + k * 2.7, 3.0 + i * 3.4, -i * 1.5 / 2 + depth / 2 + 1.15),
                           (0.09, 1.0, 0.09), albedo=0.55, shadow=False)
        # düşey sirkülasyon
        sc.add_box((ox + 10.4, 10.5, -3), (2.6, 21, 5.5), albedo=0.64, tint=(0.96, 0.94, 0.90))
    for x in (-13, -11, 12, 14, 36, -36):
        tree(sc, x, 16, 6.5, 2.8)
    for p in [(-6, 20), (-4.6, 21), (7, 19), (18, 23)]:
        sc.add_person(p[0], p[1], 1.72, 0.31)
    if view == 0:
        cam = Cam((32, 8.0, 42), (-4, 9, 0), fov=42, w=W, h=H)
    elif view == 1:
        cam = Cam((17, 4.2, 31), (-2, 10, 0), fov=44, w=WSQ, h=HSQ)
    else:
        cam = Cam((-30, 5.0, 30), (6, 8, 0), fov=36, w=W, h=H)
    return sc, cam


# --------------------------------------------------------- 5. MÜZE / FİN
def museum(view=0):
    sc = Scene(sky_top=(112, 166, 212), sky_bot=(224, 235, 240),
               light=(0.86, 0.42, 0.26), ground=0.74, haze=(25, 130), haze_amt=0.45)
    plaza(sc, 0, 14, 64, 40, 0.80)
    # ana kutu
    sc.add_box((0, 7.5, 0), (34, 15, 20), albedo=0.74, tint=(0.96, 0.94, 0.90))
    # düşey güneş kırıcılar
    for i in range(37):
        x = -17 + i * 0.945
        sc.add_box((x, 7.6, 10.35), (0.30, 15.0, 1.5), albedo=0.90, shadow=False, tint=(0.96, 0.94, 0.90))
    # asma kütle
    sc.add_box((-3, 18.6, 3), (22, 6.4, 15), albedo=0.88, tint=(1.00, 0.97, 0.92),
               windows={"+z": dict(cols=6, rows=1, mx=0.08, my=0.22, glass=0.15, seed=4),
                        "-x": dict(cols=4, rows=1, mx=0.12, my=0.22, glass=0.17, seed=6)})
    slab(sc, -3, 22.1, 3, 24, 0.5, 17, albedo=0.96)
    # giriş boşluğu
    sc.add_box((0, 2.2, 11.2), (12, 4.4, 1.0), albedo=0.22, shadow=False, tint=(0.96, 0.94, 0.90))
    sc.add_box((0, 4.7, 11.4), (14, 0.5, 3.2), albedo=0.95, tint=(0.96, 0.94, 0.90))
    water(sc, 0, 22, 30, 8)
    for x in (-24, 24, 28):
        tree(sc, x, 18, 7.5, 3.2)
    for p in [(-5, 17), (-3.4, 17.8), (6, 16), (14, 20)]:
        sc.add_person(p[0], p[1], 1.72, 0.30)
    if view == 0:
        cam = Cam((27, 6.0, 40), (-2, 9, 0), fov=40, w=W, h=H)
    elif view == 1:
        cam = Cam((17, 4.5, 33), (-2, 11, 0), fov=44, w=WSQ, h=HSQ)
    else:
        cam = Cam((-26, 4.5, 30), (3, 10, 0), fov=36, w=W, h=H)
    return sc, cam


# ----------------------------------------------------- 6. KÜTÜPHANE/AVLU
def library(view=0):
    sc = Scene(sky_top=(112, 166, 212), sky_bot=(224, 235, 240),
               light=(0.86, 0.42, 0.26), ground=0.74, haze=(20, 110), haze_amt=0.4)
    plaza(sc, 0, 8, 60, 44, 0.80)
    # U kütle
    sc.add_box((0, 5.0, -14), (36, 10, 10), albedo=0.82,
               windows={"+z": dict(cols=12, rows=2, mx=0.1, my=0.24, glass=0.19, jitter=0.07, seed=8)})
    sc.add_box((-17, 4.2, -2), (8, 8.4, 20), albedo=0.86,
               windows={"+x": dict(cols=7, rows=2, mx=0.1, my=0.24, glass=0.18, jitter=0.06, seed=12)})
    sc.add_box((17, 4.2, -2), (8, 8.4, 20), albedo=0.80,
               windows={"-x": dict(cols=7, rows=2, mx=0.1, my=0.24, glass=0.17, jitter=0.06, seed=14)})
    slab(sc, 0, 10.4, -12, 38, 0.4, 16, albedo=0.95)
    # avlu pergolası — yere çizgili gölge düşürür
    for i in range(22):
        z = -8 + i * 0.9
        sc.add_box((0, 5.4, z), (22, 0.22, 0.30), albedo=0.88, tint=(0.96, 0.94, 0.90))
    for x in (-11, 11):
        for z in (-8.5, 0, 8.5):
            sc.add_box((x, 2.7, z), (0.4, 5.4, 0.4), albedo=0.84, tint=(0.96, 0.94, 0.90))
    water(sc, 0, 13, 16, 5)
    for x, z in ((-24, 12), (24, 12), (-28, 2)):
        tree(sc, x, z, 7, 3)
    for p in [(-4, 4), (-2.6, 5), (5, 2), (2, 16), (-9, 14)]:
        sc.add_person(p[0], p[1], 1.72, 0.31)
    if view == 0:
        cam = Cam((24, 7.0, 34), (-2, 6, -4), fov=42, w=W, h=H)
    elif view == 1:
        cam = Cam((15, 5.0, 27), (-2, 6, -6), fov=46, w=WSQ, h=HSQ)
    else:
        cam = Cam((-22, 4.0, 26), (4, 6, -6), fov=38, w=W, h=H)
    return sc, cam


# ----------------------------------------------------------------- HERO
def hero():
    sc = Scene(sky_top=(112, 166, 212), sky_bot=(224, 235, 240),
               light=(0.86, 0.42, 0.26), ground=0.74, haze=(35, 190), haze_amt=0.6)
    plaza(sc, 0, 24, 120, 70, 0.80)
    sc.add_box((-4, 9, -6), (44, 18, 22), albedo=0.80, tint=(0.96, 0.94, 0.90))
    for i in range(45):
        sc.add_box((-25.5 + i * 0.98, 9.1, 5.3), (0.32, 18.0, 1.6), albedo=0.92, shadow=False, tint=(0.96, 0.94, 0.90))
    sc.add_box((-8, 22.4, -2), (28, 8, 17), albedo=0.89,
               windows={"+z": dict(cols=8, rows=1, mx=0.07, my=0.24, glass=0.15, seed=2)})
    slab(sc, -8, 26.7, -2, 31, 0.55, 19.5, albedo=0.96)
    sc.add_box((28, 16, -14), (14, 32, 14), albedo=0.72,
               windows={"+z": dict(cols=6, rows=10, mx=0.13, my=0.2, glass=0.2, jitter=0.09, seed=23),
                        "-x": dict(cols=6, rows=10, mx=0.13, my=0.2, glass=0.16, jitter=0.09, seed=27)})
    sc.add_box((-34, 6, -10), (16, 12, 16), albedo=0.68,
               windows={"+x": dict(cols=5, rows=4, mx=0.16, my=0.24, glass=0.19, seed=29),
                        "+z": dict(cols=5, rows=4, mx=0.16, my=0.24, glass=0.17, seed=35)})
    water(sc, -2, 30, 54, 12)
    for x in (-46, 44, 50, -52):
        tree(sc, x, 26, 9, 4)
    for p in [(-12, 34), (-10.4, 35), (2, 32), (14, 36), (-24, 33), (24, 38), (8, 40)]:
        sc.add_person(p[0], p[1], 1.72, 0.30)
    return sc, Cam((36, 7.5, 58), (-6, 12, 0), fov=44, w=1920, h=1080)


# --------------------------------------------------------------- İÇ MEKAN
def atrium(view=0):
    sc = Scene(sky_top=(214, 228, 240), sky_bot=(246, 242, 236),
               light=(0.55, 0.78, 0.30), ground=0.60, haze=(28, 95), haze_amt=0.30,
               amb=0.80, kd=0.45, bounce=0.62, ground_tint=(1.00, 0.94, 0.86),
               sun=(1.00, 0.97, 0.92))
    # iç hacim
    sc.add_box((0, 9, -6), (26, 18, 40), albedo=0.90, inside=True, shadow=False, tint=(0.96, 0.94, 0.90))
    # tavan aydınlıkları
    for i in range(14):
        z = -22 + i * 2.6
        sc.add_box((0, 17.6, z), (26, 0.5, 1.0), albedo=0.55, shadow=False, tint=(0.96, 0.94, 0.90))
    # galeri katları
    for lvl in (1, 2, 3):
        y = 3.6 * lvl
        sc.add_box((-9.6, y, -6), (6.4, 0.42, 34), albedo=0.93, shadow=False, tint=(0.96, 0.94, 0.90))
        sc.add_box((9.6, y, -6), (6.4, 0.42, 34), albedo=0.86, shadow=False, tint=(0.96, 0.94, 0.90))
        sc.add_box((-6.5, y + 0.6, -6), (0.14, 1.2, 34), albedo=0.60, shadow=False, tint=(0.96, 0.94, 0.90))
        sc.add_box((6.5, y + 0.6, -6), (0.14, 1.2, 34), albedo=0.58, shadow=False, tint=(0.96, 0.94, 0.90))
        for k in range(17):
            zz = -22 + k * 2.1
            sc.add_box((-12.7, y + 1.8, zz), (0.5, 3.2, 0.9), albedo=0.66, shadow=False, tint=(0.96, 0.94, 0.90))
            sc.add_box((12.7, y + 1.8, zz), (0.5, 3.2, 0.9), albedo=0.60, shadow=False, tint=(0.96, 0.94, 0.90))
    # kolonlar
    for z in (-18, -11, -4, 3, 10):
        for x in (-5.4, 5.4):
            sc.add_box((x, 7.2, z), (0.55, 14.4, 0.55), albedo=0.88, shadow=False, tint=(0.96, 0.94, 0.90))
    # merdiven
    for i in range(14):
        sc.add_box((2.4 + i * 0.0, 0.22 + i * 0.26, 6.5 - i * 0.42), (5.0, 0.26, 0.44),
                   albedo=0.84, shadow=False)
    for p in [(-2.5, 2), (-1.2, 3), (3.5, -2), (-4, -9), (5, -14), (0, -18)]:
        sc.add_person(p[0], p[1], 1.72, 0.34)
    if view == 0:
        cam = Cam((4.2, 1.70, 14), (-1.0, 7.0, -14), fov=56, w=W, h=H)
    else:
        cam = Cam((-5.0, 1.65, 11), (1.5, 8.0, -14), fov=58, w=WSQ, h=HSQ)
    return sc, cam


SCENES = {
    "hero": (hero, None),
    "proje-1-a": (villa, 0), "proje-1-b": (villa, 1), "proje-1-c": (villa, 2),
    "proje-2-a": (tower, 0), "proje-2-b": (tower, 1), "proje-2-c": (tower, 2),
    "proje-3-a": (culture, 0), "proje-3-b": (culture, 1), "proje-3-c": (culture, 2),
    "proje-4-a": (terrace, 0), "proje-4-b": (terrace, 1), "proje-4-c": (terrace, 2),
    "proje-5-a": (museum, 0), "proje-5-b": (museum, 1), "proje-5-c": (museum, 2),
    "proje-6-a": (library, 0), "proje-6-b": (library, 1), "proje-6-c": (library, 2),
    "atolye": (atrium, 0), "hakkinda": (atrium, 1),
}

if __name__ == "__main__":
    only = sys.argv[1:] or list(SCENES)
    for name in only:
        fn, arg = SCENES[name]
        sc, cam = fn() if arg is None else fn(arg)
        img = render(sc, cam, ss=2, seed=abs(hash(name)) % 999)
        p = os.path.join(OUT, name + ".jpg")
        img.save(p, "JPEG", quality=86, optimize=True, progressive=True)
        print(name, img.size, f"{os.path.getsize(p)/1024:.0f}KB")
