/**
 * Mehmet Rahbay Mimarlık — web sitesi ve yönetim paneli sunucusu
 *
 * İki depolama kipi vardır ve otomatik seçilir:
 *   1) YEREL  — hiçbir ortam değişkeni yoksa dosyalar proje klasöründe tutulur.
 *   2) R2     — Cloudflare R2 bilgileri girilmişse içerik ve görseller R2'de
 *               tutulur; böylece Render gibi geçici diskli sunucularda
 *               yüklenen görseller ve yapılan düzenlemeler silinmez.
 *
 * Çalıştırmak için:  npm install  &&  npm start
 */
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const {
  S3Client, PutObjectCommand, GetObjectCommand,
  DeleteObjectCommand, ListObjectsV2Command
} = require('@aws-sdk/client-s3');

const app = express();
const PORT = process.env.PORT || 3000;

/* ------------------------------------------------------------- klasörler */
const SEED_DIR = path.join(__dirname, 'data');
const SEED_UPLOADS = path.join(__dirname, 'public', 'uploads');

const DATA_DIR = process.env.DATA_DIR || SEED_DIR;
const UPLOAD_DIR = process.env.UPLOAD_DIR || SEED_UPLOADS;
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

for (const dir of [DATA_DIR, UPLOAD_DIR, BACKUP_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/* ------------------------------------------------------- Cloudflare R2 */
const R2 = {
  account: process.env.R2_ACCOUNT_ID,
  key: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
  publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '')
};
const USE_R2 = !!(R2.account && R2.key && R2.secret && R2.bucket && R2.publicUrl);

let s3 = null;
if (USE_R2) {
  s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || `https://${R2.account}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: { accessKeyId: R2.key, secretAccessKey: R2.secret }
  });
}

async function bodyToString(body) {
  if (body && typeof body.transformToString === 'function') return body.transformToString();
  const chunks = [];
  for await (const c of body) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString('utf8');
}

async function r2GetText(key) {
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: R2.bucket, Key: key }));
    return await bodyToString(r.Body);
  } catch (e) {
    if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}
async function r2PutText(key, text, type = 'application/json; charset=utf-8') {
  await s3.send(new PutObjectCommand({
    Bucket: R2.bucket, Key: key, Body: text, ContentType: type
  }));
}
async function r2PutBuffer(key, buf, type) {
  await s3.send(new PutObjectCommand({
    Bucket: R2.bucket, Key: key, Body: buf, ContentType: type,
    CacheControl: 'public, max-age=31536000, immutable'
  }));
}
async function r2Delete(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: R2.bucket, Key: key }));
}
async function r2List(prefix) {
  const out = [];
  let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({
      Bucket: R2.bucket, Prefix: prefix, ContinuationToken: token
    }));
    (r.Contents || []).forEach((o) => out.push(o));
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/* -------------------------------------------------------- içerik deposu */
let content = null;   // bellekte tutulur, her istekte diske/R2'ye gidilmez

/* Eskiden görseller doğrudan pub-xxx.r2.dev adresinden veriliyordu. Bazı
   internet sağlayıcıları bu adresi engellediği için görseller kimi ziyaretçide
   açılmıyordu. Artık tüm görseller sitenin kendi adresi üzerinden servis edilir;
   eski kayıtlar okunurken otomatik olarak yeni biçime çevrilir. */
function normalizeUrls(node) {
  if (typeof node === 'string') {
    if (R2.publicUrl && node.startsWith(R2.publicUrl + '/uploads/'))
      return node.slice(R2.publicUrl.length);
    return node.replace(/https?:\/\/pub-[a-z0-9]+\.r2\.dev\/uploads\//gi, '/uploads/');
  }
  if (Array.isArray(node)) return node.map(normalizeUrls);
  if (node && typeof node === 'object') {
    const out = {};
    for (const k of Object.keys(node)) out[k] = normalizeUrls(node[k]);
    return out;
  }
  return node;
}

function seedContent() {
  return JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'content.json'), 'utf8'));
}

/* Siteye yeni bir bölüm eklendiğinde, daha önce kaydedilmiş içerikte o alan
   bulunmaz. Eksik alanları paketle gelen varsayılanlardan tamamlarız; mevcut
   veriler asla ezilmez. Böylece yeni özellikler panelde kendiliğinden çıkar. */
function withDefaults(data) {
  const seed = seedContent();
  const out = Object.assign({}, seed, data);
  for (const k of Object.keys(seed)) {
    const sv = seed[k], dv = data ? data[k] : undefined;
    const plain = (x) => x && typeof x === 'object' && !Array.isArray(x);
    if (plain(sv) && plain(dv)) out[k] = Object.assign({}, sv, dv);
  }
  return out;
}

async function loadContent() {
  if (USE_R2) {
    const txt = await r2GetText('content.json');
    if (txt) return withDefaults(normalizeUrls(JSON.parse(txt)));
    const seed = seedContent();
    await r2PutText('content.json', JSON.stringify(seed, null, 2));
    console.log('  R2: content.json ilk kez oluşturuldu');
    return seed;
  }
  if (!fs.existsSync(CONTENT_FILE)) {
    const seed = path.join(SEED_DIR, 'content.json');
    if (fs.existsSync(seed)) fs.copyFileSync(seed, CONTENT_FILE);
  }
  return withDefaults(normalizeUrls(JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'))));
}

async function saveContent(data) {
  data = normalizeUrls(data);
  const text = JSON.stringify(data, null, 2);
  if (USE_R2) {
    const prev = await r2GetText('content.json');
    if (prev) await r2PutText('backups/content-onceki.json', prev);
    await r2PutText('content.json', text);
  } else {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (fs.existsSync(CONTENT_FILE)) {
      fs.copyFileSync(CONTENT_FILE, path.join(BACKUP_DIR, `content-${stamp}.json`));
      const files = fs.readdirSync(BACKUP_DIR).sort();
      while (files.length > 20) fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
    }
    fs.writeFileSync(CONTENT_FILE, text);
  }
  content = data;
}

/* -------------------------------------------------------- yönetici hesabı */
const DEFAULT_USER = process.env.ADMIN_USER || 'admin';
const DEFAULT_PASS = process.env.ADMIN_PASS || 'rahbay2026';
let admin = null;

function newAdmin() {
  return {
    username: DEFAULT_USER,
    hash: bcrypt.hashSync(DEFAULT_PASS, 10),
    mustChange: DEFAULT_PASS === 'rahbay2026'
  };
}
async function loadAdmin() {
  if (process.env.ADMIN_RESET === 'true') {
    const rec = newAdmin();
    await saveAdmin(rec);
    console.log('  ADMIN_RESET=true — yönetici şifresi ortam değişkeninden sıfırlandı');
    return rec;
  }
  if (USE_R2) {
    const txt = await r2GetText('admin.json');
    if (txt) return JSON.parse(txt);
    const rec = newAdmin();
    await r2PutText('admin.json', JSON.stringify(rec, null, 2));
    return rec;
  }
  if (fs.existsSync(ADMIN_FILE)) return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
  const rec = newAdmin();
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(rec, null, 2));
  console.log('\n  Yönetici hesabı oluşturuldu');
  console.log(`  Kullanıcı adı : ${DEFAULT_USER}`);
  console.log(`  Şifre         : ${DEFAULT_PASS}\n`);
  return rec;
}
async function saveAdmin(rec) {
  admin = rec;
  if (USE_R2) await r2PutText('admin.json', JSON.stringify(rec, null, 2));
  else fs.writeFileSync(ADMIN_FILE, JSON.stringify(rec, null, 2));
}

/* --------------------------------------------------------------- ara katman */
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'rahbay-mimarlik-gizli-anahtar',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8, sameSite: 'lax', secure: 'auto', httpOnly: true }
  })
);

// Depo yüklenmeden yönetim işlemleri yapılmasın (ilk saniyelerde)
async function ensureReady(req, res, next) {
  try { await ready; } catch (e) { /* yoksay */ }
  next();
}

function auth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' });
}

/* ------------------------------------------------------------ dosya adı */
function safeName(original) {
  const ext = (path.extname(original) || '.jpg').toLowerCase();
  const base = path
    .basename(original, path.extname(original))
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'gorsel';
  return `${base}-${Date.now()}${ext}`;
}

const imageFilter = (req, file, cb) => {
  const ok = /image\/(jpeg|png|webp|avif|gif)/.test(file.mimetype);
  cb(ok ? null : new Error('Yalnızca görsel dosyaları yüklenebilir.'), ok);
};

const uploadLocal = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, safeName(file.originalname))
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: imageFilter
});
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: imageFilter
});

/* --------------------------------------------------------------------- API */
app.get('/api/durum', (req, res) => {
  res.json({
    ok: true,
    depolama: USE_R2 ? 'r2' : 'yerel',
    r2Erisilebilir: USE_R2 ? (storeReady ? true : (r2Down ? false : null)) : null,
    icerikYuklu: !!content,
    depoHazir: storeReady,
    surum: require('./package.json').version,
    zaman: new Date().toISOString()
  });
});

app.get('/api/content', (req, res) => {
  if (!content) return res.status(503).json({ error: 'İçerik henüz yüklenmedi.' });
  res.json(content);
});

app.post('/api/login', ensureReady, (req, res) => {
  const { username, password } = req.body || {};
  if (username === admin.username && bcrypt.compareSync(String(password || ''), admin.hash)) {
    req.session.user = admin.username;
    return res.json({ ok: true, user: admin.username, mustChange: !!admin.mustChange });
  }
  res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', ensureReady, (req, res) => {
  if (req.session && req.session.user)
    return res.json({ user: req.session.user, mustChange: !!admin.mustChange, storage: USE_R2 ? 'r2' : 'yerel' });
  res.status(401).json({ error: 'Oturum yok.' });
});

app.post('/api/password', ensureReady, auth, async (req, res) => {
  try {
    const { current, next } = req.body || {};
    if (!bcrypt.compareSync(String(current || ''), admin.hash))
      return res.status(400).json({ error: 'Mevcut şifre hatalı.' });
    if (!next || String(next).length < 6)
      return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı.' });
    await saveAdmin({ ...admin, hash: bcrypt.hashSync(String(next), 10), mustChange: false });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Şifre güncellenemedi.' });
  }
});

app.post('/api/content', ensureReady, auth, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || !req.body.site)
      return res.status(400).json({ error: 'Geçersiz içerik.' });
    await saveContent(req.body);
    res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: USE_R2
        ? 'İçerik kaydedilemedi — Cloudflare R2\'ye ulaşılamıyor. Birkaç dakika sonra tekrar deneyin.'
        : 'İçerik kaydedilemedi.'
    });
  }
});

app.post('/api/upload', ensureReady, auth, (req, res) => {
  const handler = USE_R2 ? uploadMemory : uploadLocal;
  handler.array('files', 20)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const files = [];
      for (const f of req.files || []) {
        if (USE_R2) {
          const name = safeName(f.originalname);
          await r2PutBuffer(`uploads/${name}`, f.buffer, f.mimetype);
          files.push({ url: `/uploads/${name}`, name, size: f.size });
        } else {
          files.push({ url: '/uploads/' + f.filename, name: f.filename, size: f.size });
        }
      }
      res.json({ ok: true, files });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Görsel yüklenemedi: ' + e.message });
    }
  });
});

app.get('/api/media', ensureReady, auth, async (req, res) => {
  try {
    const items = [];
    // pakette gelen görseller (silinemez)
    if (fs.existsSync(SEED_UPLOADS)) {
      fs.readdirSync(SEED_UPLOADS)
        .filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f))
        .forEach((f) => {
          const st = fs.statSync(path.join(SEED_UPLOADS, f));
          items.push({ url: '/uploads/' + f, name: f, size: st.size, mtime: st.mtimeMs, source: 'paket' });
        });
    }
    if (USE_R2) {
      const objs = await r2List('uploads/');
      objs.forEach((o) => {
        const name = o.Key.replace(/^uploads\//, '');
        if (!name) return;
        items.push({
          url: `/uploads/${name}`, name,
          size: o.Size, mtime: new Date(o.LastModified).getTime(), source: 'r2'
        });
      });
    } else if (path.resolve(UPLOAD_DIR) !== path.resolve(SEED_UPLOADS)) {
      fs.readdirSync(UPLOAD_DIR)
        .filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f))
        .forEach((f) => {
          const st = fs.statSync(path.join(UPLOAD_DIR, f));
          items.push({ url: '/uploads/' + f, name: f, size: st.size, mtime: st.mtimeMs, source: 'disk' });
        });
    }
    items.sort((a, b) => b.mtime - a.mtime);
    res.json({ files: items, storage: USE_R2 ? 'r2' : 'yerel' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Medya listesi alınamadı.' });
  }
});

app.delete('/api/media/:name', ensureReady, auth, async (req, res) => {
  const name = path.basename(req.params.name);
  try {
    if (USE_R2) {
      await r2Delete(`uploads/${name}`);
      return res.json({ ok: true });
    }
    const file = path.join(UPLOAD_DIR, name);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Dosya bulunamadı.' });
    fs.unlinkSync(file);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Dosya silinemedi.' });
  }
});

/* ------------------------------------------------------------------ sayfalar */
if (path.resolve(UPLOAD_DIR) !== path.resolve(SEED_UPLOADS)) {
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
}
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

/* Pakette olmayan bir görsel istenirse Cloudflare R2'den okunup aktarılır.
   Böylece ziyaretçi yalnızca sitenin kendi adresine bağlanır. */
app.get('/uploads/:name', async (req, res) => {
  if (!USE_R2) return res.status(404).end();
  const name = path.basename(req.params.name);
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: R2.bucket, Key: `uploads/${name}` }));
    res.set('Content-Type', r.ContentType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    if (r.ETag) res.set('ETag', r.ETag);
    if (r.ContentLength) res.set('Content-Length', String(r.ContentLength));
    if (req.method === 'HEAD') return res.end();
    r.Body.on('error', () => res.destroy());
    r.Body.pipe(res);
  } catch (e) {
    res.status(404).end();
  }
});

app.get('/proje/:slug', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'proje.html'))
);
app.get('/egitim/:slug', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'egitim.html'))
);
app.get('/yonetim', (req, res) => res.redirect('/admin/'));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

/* ------------------------------------------------------------------ başlat */
let r2Down = false;
let storeReady = false;

async function bootstrap() {
  try {
    const [a, c] = await Promise.all([loadAdmin(), loadContent()]);
    admin = a;
    content = c;
    if (r2Down) console.log('  Depolama bağlantısı geri geldi, içerik yenilendi.');
    r2Down = false;
    storeReady = true;
    return true;
  } catch (e) {
    r2Down = true;
    console.error('  UYARI: depolama okunamadı —', e.message);
    return false;
  }
}

/* Önce paketle gelen içerikle anında hazır ol — böylece sunucu portu
   milisaniyeler içinde açar ve Render "canlı" olarak işaretler.
   Cloudflare'den gelen gerçek içerik hemen ardından arka planda yüklenir. */
content = seedContent();
admin = newAdmin();

const ready = bootstrap().then((ok) => {
  if (ok) return true;
  console.error('  Site paketle gelen içerikle yayında. Depolama 60 sn\'de bir denenecek.');
  const timer = setInterval(async () => {
    if (!r2Down) return clearInterval(timer);
    if (await bootstrap()) clearInterval(timer);
  }, 60000);
  if (timer.unref) timer.unref();
  return false;
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Mehmet Rahbay Mimarlık`);
  console.log(`  Site          : http://localhost:${PORT}`);
  console.log(`  Yönetim paneli: http://localhost:${PORT}/admin/`);
  console.log(`  Depolama      : ${USE_R2 ? 'Cloudflare R2 (kalıcı)' : 'yerel klasör'}`);
  console.log('');
});
