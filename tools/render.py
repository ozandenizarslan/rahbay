"""Minik mimari render motoru — Mehmet Rahbay Mimarlık için özgün görseller üretir."""
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def V(*a):
    return np.array(a, dtype=float)

def norm(v):
    n = np.linalg.norm(v)
    return v / n if n else v


class Cam:
    def __init__(self, eye, target, fov=42.0, w=1600, h=1000, up=(0, 1, 0), roll=0.0):
        self.eye = V(*eye)
        self.w, self.h = w, h
        f = norm(V(*target) - self.eye)
        r = norm(np.cross(f, V(*up)))
        u = np.cross(r, f)
        if roll:
            c, s = math.cos(roll), math.sin(roll)
            r, u = r * c + u * s, u * c - r * s
        self.f, self.r, self.u = f, r, u
        self.fl = (h / 2.0) / math.tan(math.radians(fov) / 2.0)

    def project(self, p):
        d = np.asarray(p, dtype=float) - self.eye
        z = max(float(d @ self.f), 1e-4)
        return (self.w / 2 + self.fl * (d @ self.r) / z,
                self.h / 2 - self.fl * (d @ self.u) / z, z)

    def clip(self, verts, near=0.35):
        vs = [np.asarray(v, float) for v in verts]
        ds = [float((v - self.eye) @ self.f) - near for v in vs]
        out = []
        n = len(vs)
        for i in range(n):
            j = (i + 1) % n
            if ds[i] >= 0:
                out.append(vs[i])
            if (ds[i] >= 0) != (ds[j] >= 0):
                t = ds[i] / (ds[i] - ds[j])
                out.append(vs[i] + (vs[j] - vs[i]) * t)
        return out

    def poly(self, verts):
        vs = self.clip(verts)
        if len(vs) < 3:
            return [], 0.0, 0.0
        pts, zs = [], []
        lim_x, lim_y = self.w * 8.0, self.h * 8.0
        for p in vs:
            sx, sy, z = self.project(p)
            pts.append((min(max(sx, -lim_x), lim_x), min(max(sy, -lim_y), lim_y)))
            zs.append(z)
        return pts, float(np.mean(zs)), float(min(zs))


class Scene:
    def __init__(self, sky_top=(74, 138, 198), sky_bot=(206, 226, 236),
                 light=(0.86, 0.42, 0.26), ground=0.66, haze=(30, 200),
                 haze_amt=0.62, fog_color=None, amb=0.22, kd=1.16, bounce=0.13,
                 ground_tint=(1.00, 0.96, 0.90), sun=(1.00, 0.96, 0.88)):
        self.faces = []
        self.shadow_polys = []
        self.contact_polys = []
        self.sky_top = sky_top
        self.sky_bot = sky_bot
        self.light = norm(V(*light))
        self.ground_albedo = ground
        self.haze = haze
        self.haze_amt = haze_amt
        self.fog = np.array(fog_color if fog_color else sky_bot, dtype=float)
        self.sprites = []
        self.decals = []
        self.amb = amb
        self.kd = kd
        self.bounce = bounce
        self.ground_tint = ground_tint
        self.sun = np.array(sun, dtype=float)
        self.people = []

    def add_face(self, verts, albedo, normal=None, tag="wall", grad=None, outline=True, tint=None):
        v = [np.asarray(x, float) for x in verts]
        if normal is None:
            normal = norm(np.cross(v[1] - v[0], v[2] - v[0]))
        self.faces.append(dict(v=v, a=albedo, n=np.asarray(normal, float),
                               tag=tag, grad=grad, outline=outline, tint=tint))

    def add_box(self, center, size, ry=0.0, albedo=0.72, windows=None,
                inside=False, shadow=True, top_albedo=None, tag="wall",
                grad=(0.86, 1.05), contact=True, tint=None):
        cx, cy, cz = center
        sx, sy, sz = [s / 2.0 for s in size]
        c, s = math.cos(ry), math.sin(ry)

        def w(x, y, z):
            return V(cx + x * c + z * s, cy + y, cz - x * s + z * c)

        corners = {
            "+x": [w(sx, -sy, sz), w(sx, -sy, -sz), w(sx, sy, -sz), w(sx, sy, sz)],
            "-x": [w(-sx, -sy, -sz), w(-sx, -sy, sz), w(-sx, sy, sz), w(-sx, sy, -sz)],
            "+z": [w(-sx, -sy, sz), w(sx, -sy, sz), w(sx, sy, sz), w(-sx, sy, sz)],
            "-z": [w(sx, -sy, -sz), w(-sx, -sy, -sz), w(-sx, sy, -sz), w(sx, sy, -sz)],
            "+y": [w(-sx, sy, sz), w(sx, sy, sz), w(sx, sy, -sz), w(-sx, sy, -sz)],
            "-y": [w(-sx, -sy, -sz), w(sx, -sy, -sz), w(sx, -sy, sz), w(-sx, -sy, sz)],
        }
        normals = {"+x": V(c, 0, -s), "-x": V(-c, 0, s), "+z": V(s, 0, c),
                   "-z": V(-s, 0, -c), "+y": V(0, 1, 0), "-y": V(0, -1, 0)}
        for name, verts in corners.items():
            n = normals[name]
            a = top_albedo if (name == "+y" and top_albedo is not None) else albedo
            g = grad if name in ("+x", "-x", "+z", "-z") else None
            if inside:
                verts = verts[::-1]
                n = -n
                g = None
            self.add_face(verts, a, n, tag=tag, grad=g, tint=tint)
            if windows and name in windows:
                self.add_windows(verts, n, **windows[name])
        if shadow and not inside:
            self.add_shadow([p for vs in corners.values() for p in vs])
            if contact and cy - sy < 0.6:
                self.contact_polys.append([V(p[0], 0.003, p[2]) for p in corners["-y"]])
        return corners

    def add_windows(self, verts, normal, cols=6, rows=4, mx=0.16, my=0.2,
                    glass=0.20, jitter=0.0, seed=1, band=False, sky=1.15,
                    tint=(0.66, 0.80, 0.94)):
        rnd = random.Random(seed)
        bl, br, tr, tl = [np.asarray(v, float) for v in verts]
        u, v = br - bl, tl - bl
        off = np.asarray(normal, float) * 0.014
        cw, ch = 1.0 / cols, 1.0 / rows
        for i in range(cols):
            for j in range(rows):
                a0, a1 = (i + mx / 2) * cw, (i + 1 - mx / 2) * cw
                if band:
                    a0, a1 = (mx / 2) * cw, 1 - (mx / 2) * cw
                b0, b1 = (j + my / 2) * ch, (j + 1 - my / 2) * ch
                bm = b0 + (b1 - b0) * 0.62
                g = max(0.03, glass + (rnd.random() - 0.5) * jitter)
                # alt: koyu iç mekan
                self.add_face([bl + u * a0 + v * b0, bl + u * a1 + v * b0,
                               bl + u * a1 + v * bm, bl + u * a0 + v * bm],
                              g, normal, tag="glass", grad=(1.25, 0.82), outline=False, tint=tint)
                # üst: gökyüzü yansıması
                self.add_face([bl + u * a0 + v * bm, bl + u * a1 + v * bm,
                               bl + u * a1 + v * b1, bl + u * a0 + v * b1],
                              g * (1 + sky * 2.4), normal, tag="glass",
                              grad=(0.9, 1.45), outline=False, tint=tint)
                # çerçeve
                self.add_face([bl + u * a0 + v * b0, bl + u * a1 + v * b0,
                               bl + u * a1 + v * b1, bl + u * a0 + v * b1],
                              g, normal, tag="frame", grad=None, outline="only", tint=tint)
                if band:
                    break

    def add_shadow(self, pts):
        L = self.light
        if L[1] <= 0.05:
            return
        proj = []
        for p in pts:
            t = p[1] / L[1]
            proj.append((p[0] - L[0] * t, p[2] - L[2] * t))
        hull = convex_hull(proj)
        if len(hull) >= 3:
            self.shadow_polys.append([V(x, 0.004, z) for x, z in hull])

    def add_decal(self, verts, albedo, tint=None):
        self.decals.append(([np.asarray(v, float) for v in verts], albedo, tint))

    def add_person(self, x, z, h=1.72, dark=0.30):
        self.people.append((x, z, h, dark))

    def add_tree(self, x, z, h=7.0, w=3.4, seed=1):
        self.sprites.append((x, z, h, w, seed))
        r = w * 0.42
        self.contact_polys.append([V(x - r, .003, z - r), V(x + r, .003, z - r),
                                   V(x + r, .003, z + r), V(x - r, .003, z + r)])
        L = self.light
        if L[1] > 0.05:
            t = (h * 0.75) / L[1]
            ox, oz = x - L[0] * t, z - L[2] * t
            self.shadow_polys.append([V(ox - r, .004, oz - r), V(ox + r, .004, oz - r),
                                      V(ox + r, .004, oz + r), V(ox - r, .004, oz + r)])


def convex_hull(points):
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts

    def cr(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lo = []
    for p in pts:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    up = []
    for p in reversed(pts):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def tone(scene, normal, albedo, z, tint=None):
    n = norm(normal)
    diff = max(0.0, float(n @ scene.light))
    sky = 0.5 + 0.5 * float(n[1])
    bounce = scene.bounce * max(0.0, -float(n[1]))
    val = albedo * (scene.amb * sky + scene.kd * diff + bounce + 0.045)
    val = min(1.0, max(0.0, val)) ** 0.94
    base = np.array(tint, dtype=float) if tint is not None else np.array([1.0, 0.985, 0.955])
    warm = 1.0 + 0.10 * diff
    c = val * 255.0 * base * (scene.sun ** warm)
    z0, z1 = scene.haze
    if z1 > z0:
        t = min(1.0, max(0.0, (z - z0) / (z1 - z0))) * scene.haze_amt
        c = c * (1 - t) + scene.fog * t
    return np.clip(c, 0, 255)


def rgb(c):
    return tuple(int(round(x)) for x in c)


def strips(verts, n=9):
    bl, br, tr, tl = verts
    out = []
    for i in range(n):
        t0, t1 = i / n, (i + 1) / n
        out.append(([bl + (tl - bl) * t0, br + (tr - br) * t0,
                     br + (tr - br) * t1, bl + (tl - bl) * t1], (t0 + t1) / 2))
    return out


def render(scene, cam, ss=2, grain=3.4, vignette=0.24, contrast=1.09,
           lift=0.014, seed=7):
    W, H = cam.w * ss, cam.h * ss
    big = Cam(cam.eye, cam.eye + cam.f, fov=1, w=W, h=H)
    big.f, big.r, big.u = cam.f, cam.r, cam.u
    big.fl = cam.fl * ss

    # ---- gökyüzü: dikey gradyan + güneş parlaması
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    t = (yy / H)[..., None]
    sky = np.array(scene.sky_top, np.float32)[None, None, :] * (1 - t) + \
          np.array(scene.sky_bot, np.float32)[None, None, :] * t
    sxp, syp, sz = big.project(cam.eye + scene.light * 900)
    if sz > 0:
        r = np.sqrt((xx - sxp) ** 2 + (yy - syp) ** 2) / (W * 0.85)
        glow = np.clip(1 - r, 0, 1) ** 2.4
        sky = sky + glow[..., None] * np.array([26, 25, 22], np.float32)
    img = Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8), "RGB")
    d = ImageDraw.Draw(img)

    # ---- zemin
    far = 600.0
    for i in range(26):   # ufka doğru puslaşan şeritler
        z0 = far * (1 - i / 26) ** 2.2
        z1 = far * (1 - (i + 1) / 26) ** 2.2
        q = [V(-far, 0, cam.eye[2] - z0), V(far, 0, cam.eye[2] - z0),
             V(far, 0, cam.eye[2] - z1), V(-far, 0, cam.eye[2] - z1)]
        pts, zz, mz = big.poly(q)
        if len(pts) < 3:
            continue
        d.polygon(pts, fill=rgb(tone(scene, V(0, 1, 0), scene.ground_albedo, max(zz, 1), scene.ground_tint)))

    for verts, alb, dt in scene.decals:
        pts, zz, mz = big.poly(verts)
        if len(pts) < 3:
            continue
        d.polygon(pts, fill=rgb(tone(scene, V(0, 1, 0), alb, max(zz, 1), dt)))

    # ---- gölgeler
    sh = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(sh)
    for poly in scene.shadow_polys:
        p, _, mz = big.poly(poly)
        if len(p) >= 3:
            sd.polygon(p, fill=210)
    sh = sh.filter(ImageFilter.GaussianBlur(7 * ss))
    ct = Image.new("L", (W, H), 0)
    cd = ImageDraw.Draw(ct)
    for poly in scene.contact_polys:
        p, _, mz = big.poly(poly)
        if len(p) >= 3:
            cd.polygon(p, fill=190)
    ct = ct.filter(ImageFilter.GaussianBlur(15 * ss))
    sh = Image.fromarray(np.maximum(np.asarray(sh), np.asarray(ct)))
    dark = Image.new("RGB", (W, H), (30, 32, 36))
    img = Image.composite(Image.blend(img, dark, 0.52), img, sh)
    d = ImageDraw.Draw(img)

    # ---- yüzeyler (ressam algoritması)
    items = []
    for f in scene.faces:
        c = np.mean(f["v"], axis=0)
        if float((c - cam.eye) @ f["n"]) > 0:
            continue
        pts, z, mz = big.poly(f["v"])
        if len(pts) < 3:
            continue
        items.append((z, f, pts))
    for (tx, tz, th, tw, tseed) in scene.sprites:
        _, _, tzz = big.project(V(tx, th * 0.6, tz))
        if tzz > 0.4:
            items.append((tzz, ("tree", tx, tz, th, tw, tseed), None))
    items.sort(key=lambda t: -t[0])

    lw = max(1, int(ss * 0.85))
    for z, f, pts in items:
        if isinstance(f, tuple):
            _, tx, tz, th, tw, tseed = f
            rnd = random.Random(tseed * 31 + 7)
            b = big.project(V(tx, 0, tz))
            tp = big.project(V(tx, th, tz))
            ph = b[1] - tp[1]
            if ph < 8 or ph > H * 3 or b[2] < 1.0:
                continue
            rx = ph * (tw / th) * 0.55
            ry = rx * 0.86
            cy_ = b[1] - ph * 0.72
            pad = int(min(rx * 1.5, H * 1.2)) + 8
            tile = Image.new("RGBA", (pad * 2, pad * 2), (0, 0, 0, 0))
            td = ImageDraw.Draw(tile)
            trunk = rgb(tone(scene, V(-0.4, 0.2, 1), 0.30, z, (0.62, 0.50, 0.38)))
            tw_px = max(1.5, ph * 0.020)
            td.polygon([(pad - tw_px, pad + (b[1] - cy_)), (pad + tw_px, pad + (b[1] - cy_)),
                        (pad + tw_px * .55, pad - ry * .1), (pad - tw_px * .55, pad - ry * .1)],
                       fill=trunk + (255,))
            for k in range(110):
                aa = rnd.uniform(0, 6.283)
                rr = rnd.random() ** 0.42
                ex = pad + math.cos(aa) * rx * rr
                ey = pad + math.sin(aa) * ry * rr
                sr = rx * rnd.uniform(0.19, 0.30) * (1.02 - 0.22 * rr)
                lit = 0.30 + 0.10 * max(0.0, math.cos(aa) * 0.7 - math.sin(aa) * 0.4) * rr \
                      + 0.05 * rnd.random()
                col = rgb(tone(scene, V(math.cos(aa) * .4, 0.75, 0.5), lit * 1.25, z,
                               (0.44, 0.66, 0.34)))
                td.ellipse([ex - sr, ey - sr * .9, ex + sr, ey + sr * .9], fill=col + (255,))
            tile = tile.filter(ImageFilter.GaussianBlur(max(0.8, rx * 0.022)))
            img.paste(tile, (int(b[0] - pad), int(cy_ - pad)), tile)
            continue
        base = tone(scene, f["n"], f["a"], z, f["tint"])
        if f["outline"] != "only":
            if f["grad"]:
                g0, g1 = f["grad"]
                for sv, t in strips(f["v"], 9):
                    sp, sz2, _ = big.poly(sv)
                    if len(sp) < 3:
                        continue
                    m = g0 + (g1 - g0) * t
                    d.polygon(sp, fill=rgb(tone(scene, f["n"], f["a"] * m, z, f["tint"])))
            else:
                d.polygon(pts, fill=rgb(base))
        if f["outline"]:
            d.line(pts + [pts[0]], fill=rgb(base * 0.80), width=lw, joint="curve")

    # ---- insanlar
    for (x, zz, h, dk) in scene.people:
        base = V(x, 0, zz)
        bx, by, bz = big.project(base)
        tx, ty, tz = big.project(base + V(0, h, 0))
        ph = by - ty
        if ph < 4 or bz < 1.0 or ph > H * 3:
            continue
        wpx = ph * 0.20
        col = rgb(tone(scene, V(0, 0.25, 1), dk, bz, (0.86, 0.80, 0.78)))
        d.ellipse([bx - wpx * 1.5, by - wpx * 0.26, bx + wpx * 1.5, by + wpx * 0.26],
                  fill=rgb(tone(scene, V(0, 1, 0), scene.ground_albedo * 0.55, bz, scene.ground_tint)))
        d.rounded_rectangle([bx - wpx / 2, ty + ph * 0.20, bx + wpx / 2, by],
                            radius=wpx * 0.45, fill=col)
        hr = ph * 0.082
        d.ellipse([bx - hr, ty, bx + hr, ty + 2 * hr], fill=col)

    # ---- post
    img = img.resize((cam.w, cam.h), Image.LANCZOS)
    a = np.asarray(img, dtype=np.float32) / 255.0
    a = np.clip((a - 0.5) * contrast + 0.5, 0, 1)
    a = a * (1 - lift) + lift
    g = a.mean(axis=2, keepdims=True)
    a = np.clip(g + (a - g) * 1.10, 0, 1)      # doygunluk
    yy, xx = np.mgrid[0:cam.h, 0:cam.w]
    cxp, cyp = cam.w / 2, cam.h / 2
    rr = np.sqrt(((xx - cxp) / cxp) ** 2 + ((yy - cyp) / cyp) ** 2) / 1.414
    a *= (1 - vignette * (rr ** 2.1))[..., None]
    rng = np.random.default_rng(seed)
    a += rng.normal(0, grain / 255.0, a.shape)
    out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), "RGB")
    return out.filter(ImageFilter.UnsharpMask(radius=1.5, percent=48, threshold=3))
