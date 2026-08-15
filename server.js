/**
 * Mehmet Rahbay Mimarlık — web sitesi ve yönetim paneli sunucusu
 * Çalıştırmak için:  npm install  &&  npm start
 */
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

/* --------------------------------------------------------------- klasörler
 * Render gibi sunucularda kalıcı disk kullanılacaksa DATA_DIR ve UPLOAD_DIR
 * ortam değişkenleriyle diskin içine yönlendirilir (örn. /var/data).
 * Ayarlanmazsa proje klasörü kullanılır — yerelde hiçbir şey değişmez.       */
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

// Kalıcı disk ilk kez bağlandığında içeriği tohumla
if (!fs.existsSync(CONTENT_FILE)) {
  const seed = path.join(SEED_DIR, 'content.json');
  if (fs.existsSync(seed)) fs.copyFileSync(seed, CONTENT_FILE);
}

/* ---------------------------------------------------------- yönetici hesabı */
const DEFAULT_USER = process.env.ADMIN_USER || 'admin';
const DEFAULT_PASS = process.env.ADMIN_PASS || 'rahbay2026';

function loadAdmin() {
  if (!fs.existsSync(ADMIN_FILE)) {
    const rec = {
      username: DEFAULT_USER,
      hash: bcrypt.hashSync(DEFAULT_PASS, 10),
      mustChange: true
    };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(rec, null, 2));
    console.log('\n  Yönetici hesabı oluşturuldu');
    console.log(`  Kullanıcı adı : ${DEFAULT_USER}`);
    console.log(`  Şifre         : ${DEFAULT_PASS}`);
    console.log('  (Panelden değiştirmeniz önerilir)\n');
  }
  return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
}
function saveAdmin(rec) {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(rec, null, 2));
}
loadAdmin();

/* --------------------------------------------------------------- middleware */
app.set('trust proxy', 1);          // Render/Nginx gibi ters vekiller için
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

function auth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' });
}

/* ------------------------------------------------------------ dosya yükleme */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const base = path
      .basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'gorsel';
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|png|webp|avif|gif)/.test(file.mimetype);
    cb(ok ? null : new Error('Yalnızca görsel dosyaları yüklenebilir.'), ok);
  }
});

/* ------------------------------------------------------------------ içerik */
function readContent() {
  return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
}
function writeContent(data) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (fs.existsSync(CONTENT_FILE)) {
    fs.copyFileSync(CONTENT_FILE, path.join(BACKUP_DIR, `content-${stamp}.json`));
    const files = fs.readdirSync(BACKUP_DIR).sort();
    while (files.length > 20) fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
  }
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(data, null, 2));
}

/* --------------------------------------------------------------------- API */
app.get('/api/content', (req, res) => {
  try {
    res.json(readContent());
  } catch (e) {
    res.status(500).json({ error: 'İçerik okunamadı.' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const admin = loadAdmin();
  if (username === admin.username && bcrypt.compareSync(String(password || ''), admin.hash)) {
    req.session.user = admin.username;
    return res.json({ ok: true, user: admin.username, mustChange: !!admin.mustChange });
  }
  res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.user) {
    const admin = loadAdmin();
    return res.json({ user: req.session.user, mustChange: !!admin.mustChange });
  }
  res.status(401).json({ error: 'Oturum yok.' });
});

app.post('/api/password', auth, (req, res) => {
  const { current, next } = req.body || {};
  const admin = loadAdmin();
  if (!bcrypt.compareSync(String(current || ''), admin.hash))
    return res.status(400).json({ error: 'Mevcut şifre hatalı.' });
  if (!next || String(next).length < 6)
    return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı.' });
  admin.hash = bcrypt.hashSync(String(next), 10);
  admin.mustChange = false;
  saveAdmin(admin);
  res.json({ ok: true });
});

app.post('/api/content', auth, (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || !req.body.site)
      return res.status(400).json({ error: 'Geçersiz içerik.' });
    writeContent(req.body);
    res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: 'İçerik kaydedilemedi.' });
  }
});

app.post('/api/upload', auth, (req, res) => {
  upload.array('files', 20)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const files = (req.files || []).map((f) => ({
      url: '/uploads/' + f.filename,
      name: f.filename,
      size: f.size
    }));
    res.json({ ok: true, files });
  });
});

app.get('/api/media', auth, (req, res) => {
  const files = fs
    .readdirSync(UPLOAD_DIR)
    .filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f))
    .map((f) => {
      const st = fs.statSync(path.join(UPLOAD_DIR, f));
      return { url: '/uploads/' + f, name: f, size: st.size, mtime: st.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  res.json({ files });
});

app.delete('/api/media/:name', auth, (req, res) => {
  const name = path.basename(req.params.name);
  const file = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Dosya bulunamadı.' });
  fs.unlinkSync(file);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ sayfalar */
// Kalıcı diske yüklenen görseller önce burada aranır, sonra pakettekiler
if (path.resolve(UPLOAD_DIR) !== path.resolve(SEED_UPLOADS)) {
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
}
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.get('/proje/:slug', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'proje.html'))
);
app.get('/yonetim', (req, res) => res.redirect('/admin/'));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Mehmet Rahbay Mimarlık`);
  console.log(`  Site          : http://localhost:${PORT}`);
  console.log(`  Yönetim paneli: http://localhost:${PORT}/admin/`);
  if (process.env.DATA_DIR) console.log(`  Veri klasörü  : ${DATA_DIR} (kalıcı)`);
  console.log('');
});
