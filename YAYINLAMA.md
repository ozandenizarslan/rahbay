# Siteyi Render'da Yayınlama — Adım Adım

Sonunda şuna benzer, herkesle paylaşabileceğin bir adresin olacak:
`https://mehmet-rahbay.onrender.com`

Toplam süre: yaklaşık 15 dakika. Ücretsiz.

---

## BÖLÜM 1 — Kodu GitHub'a yükle

Render, dosyaları GitHub'dan alır. Önce oraya koymamız gerekiyor.

### 1.1 GitHub hesabı aç

**github.com** → sağ üstte **Sign up** → e-posta, şifre, kullanıcı adı. Ücretsiz.

Zaten hesabın varsa bu adımı atla.

### 1.2 GitHub Desktop kur

**desktop.github.com** → **Download for Windows** → kur.

> Bu programı kullanıyoruz çünkü klasörü tarayıcıdan sürüklersen `node_modules`
> klasöründeki on binlerce dosya da yüklenmeye çalışır ve işlem takılır.
> GitHub Desktop gereksiz dosyaları otomatik atlar.

### 1.3 Giriş yap

GitHub Desktop açılır → **Sign in to GitHub.com** → tarayıcı açılır → izin ver.
Sonra **Finish**.

### 1.4 Klasörü ekle

1. Üst menü: **File** → **Add local repository**
2. **Choose…** → `Masaüstü\rahbay` klasörünü seç → **Select Folder**
3. "This directory does not appear to be a Git repository" yazısı çıkar →
   altındaki mavi **create a repository** yazısına tıkla
4. Açılan pencerede **Create repository** butonuna bas

### 1.5 İnternete gönder

1. Ortadaki mavi **Publish repository** butonuna bas
2. Açılan pencerede **"Keep this code private"** kutusunun işaretini **KALDIR**
   (Render'ın ücretsiz planı için herkese açık olmalı)
3. **Publish repository**

Birkaç saniye sürer. Bittiğinde kodun GitHub'da demektir.

---

## BÖLÜM 2 — Render'da yayınla

### 2.1 Hesap aç

**render.com** → **Get Started** → **GitHub** ile giriş yap → izin ver.

### 2.2 Yeni servis oluştur

1. Sağ üstte **+ New** → **Web Service**
2. Listede **rahbay** deposunu bul → **Connect**

### 2.3 Ayarlar

Render çoğunu kendi doldurur. Kontrol et, eksikse yaz:

| Alan | Değer |
|---|---|
| **Name** | `mehmet-rahbay` (adresin bu olacak) |
| **Region** | `Frankfurt (EU Central)` |
| **Branch** | `main` |
| **Root Directory** | *(boş bırak)* |
| **Runtime / Language** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

### 2.4 Şifreni belirle

Aynı sayfada **Environment Variables** (veya **Advanced** → **Add Environment Variable**)
bölümünü bul ve şu ikisini ekle:

| Key | Value |
|---|---|
| `ADMIN_PASS` | *kendi belirlediğin güçlü şifre* |
| `SESSION_SECRET` | *rastgele uzun bir metin, örn. 30 karakter karışık* |

> Bu adımı atlarsan şifre `rahbay2026` olarak kalır ve site herkese açık
> olduğu için panelin güvensiz olur. Mutlaka değiştir.

### 2.5 Başlat

**Create Web Service** → 2-3 dakika kurulum yapar.

Ekranda yeşil **Live** yazısını gördüğünde hazır. Sayfanın en üstünde adresin
yazıyor olacak:

```
https://mehmet-rahbay.onrender.com
```

Yönetim paneli: `https://mehmet-rahbay.onrender.com/admin/`

---

## Ücretsiz planda bilmen gereken 2 şey

**1. Site 15 dakika ziyaretçi gelmezse uykuya geçer.**
Sonraki ziyaretçi açtığında ~1 dakika beklet, sonra normal hızda çalışır.
Birine link göndereceksen, göndermeden önce sen bir kez açıp uyandır.
Bunu yalnızca ücretli plan (Starter, $7/ay) tamamen çözer.

**2. Yönetim panelinden yaptığın değişiklikler varsayılan olarak kalıcı değil.**
Render'ın ücretsiz diski geçicidir; site uykuya geçtiğinde yüklediğin görseller
silinir, içerik GitHub'daki hâline döner.

**Çözümü hazır: Cloudflare R2.** Ücretsiz 10 GB depolama bağlarsan hem
yüklediğin görseller hem de panelden yaptığın tüm düzenlemeler kalıcı olur.
Kurulumu `CLOUDFLARE-R2.md` dosyasında adım adım anlattım — yaklaşık 10 dakika,
bir kez yapılır, kod değişikliği gerektirmez.

> R2 bilgilerini girmezsen sistem hiçbir hata vermez, sadece yerel kipte
> çalışmaya devam eder. Yani istediğin zaman ekleyebilirsin.

## Sonradan değişiklik yapmak

Bilgisayarındaki dosyalarda bir değişiklik olduğunda:

1. GitHub Desktop'ı aç
2. Sol altta değişiklik özeti yaz (örn. "renk güncellemesi")
3. **Commit to main** → sonra üstte **Push origin**

Render değişikliği otomatik görür ve siteyi 2-3 dakika içinde günceller.

---

## Kendi alan adını bağlamak (isteğe bağlı)

`mehmetrahbay.com` gibi bir adres aldıysan:

1. Render → servisin → **Settings** → **Custom Domains** → **Add Custom Domain**
2. Render sana bir CNAME kaydı verir
3. Alan adını aldığın firmanın panelinde bu kaydı gir
4. HTTPS sertifikasını Render otomatik kurar

> Custom domain ücretsiz planda da çalışır.
