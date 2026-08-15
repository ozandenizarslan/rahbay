# Cloudflare R2 Kurulumu — Görseller Kalıcı Olsun

## Neden gerekli?

Render'ın ücretsiz planında sunucunun diski geçicidir. Yönetim panelinden
yüklediğiniz görseller ve yaptığınız metin değişiklikleri, site uykuya geçtiğinde
veya yeniden kurulduğunda silinir.

R2 bağlandığında bunların hepsi Cloudflare'de saklanır ve **kalıcı** olur.
Ücretsiz sınır 10 GB — bu site için pratikte sınırsız.

Toplam süre: yaklaşık 10 dakika, bir kez yapılır.

---

## ADIM 1 — Kova (bucket) oluştur

1. **dash.cloudflare.com** → giriş yap
2. Sol menüden **R2 Object Storage** → **Overview**
3. **Create bucket** butonuna bas
4. **Bucket name:** `rahbay-medya` yaz
   *(başka bir isim verirsen ADIM 4'te onu yazacaksın)*
5. **Location:** `Automatic` bırak
6. **Create bucket**

---

## ADIM 2 — Kovayı herkese açık yap

Görsellerin sitede görünebilmesi için kovanın okunabilir olması gerekiyor.

1. Yeni oluşan kovaya tıkla
2. Üstteki sekmelerden **Settings**
3. Aşağı in, **Public access** bölümünü bul
4. **R2.dev subdomain** satırında **Enable** / **Allow Access** butonuna bas
5. Onay için kutuya `allow` yazmanı isteyebilir, yaz ve onayla
6. Ekranda şuna benzer bir adres çıkacak:

```
https://pub-1a2b3c4d5e6f7890.r2.dev
```

**Bu adresi kopyala ve bir kenara not al.** (`R2_PUBLIC_URL` olacak)

---

## ADIM 3 — API anahtarı üret

1. Sol menüden **R2 Object Storage** → **API** → **Manage API Tokens**
   *(bazı arayüzlerde: R2 ana sayfasında sağda **Manage R2 API Tokens**)*
2. **Create API Token**
3. **Token name:** `rahbay-site`
4. **Permissions:** **Object Read & Write** seç
5. **Specify bucket(s):** sadece `rahbay-medya` kovasını seç
   *(Apply to specific buckets only)*
6. **TTL / Expiration:** `Forever` (süresiz) bırak
7. **Create API Token**

Sonraki ekranda üç bilgi çıkar. **Bu ekranı kapatma, gizli anahtar bir daha
gösterilmez:**

| Ekranda yazan | Not al |
|---|---|
| **Access Key ID** | `R2_ACCESS_KEY_ID` |
| **Secret Access Key** | `R2_SECRET_ACCESS_KEY` |
| **Endpoint** (`https://XXXX.r2.cloudflarestorage.com`) | Buradaki `XXXX` kısmı `R2_ACCOUNT_ID` |

> `R2_ACCOUNT_ID`, endpoint adresindeki uzun karakter dizisidir.
> Örnek: `https://8f3d2c1b9a7e6d5c4b3a2918.r2.cloudflarestorage.com`
> → hesap kimliği `8f3d2c1b9a7e6d5c4b3a2918`

---

## ADIM 4 — Render'a gir

1. **dashboard.render.com** → `mehmet-rahbay` servisine tıkla
2. Sol menüden **Environment**
3. **Add Environment Variable** ile beş satırı tek tek ekle:

| Key | Value |
|---|---|
| `R2_ACCOUNT_ID` | endpoint'teki uzun kod |
| `R2_ACCESS_KEY_ID` | Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key |
| `R2_BUCKET` | `rahbay-medya` |
| `R2_PUBLIC_URL` | `https://pub-....r2.dev` |

> Adresin sonuna `/` koyma. Yazarken baş/son boşluk kalmasın.

4. **Save Changes**

Render servisi otomatik yeniden başlatır (1-2 dakika).

---

## ADIM 5 — Çalıştığını doğrula

1. Render'da servisin **Logs** sekmesini aç
2. Şu satırı görmelisin:

```
Depolama      : Cloudflare R2 (kalıcı)
```

`yerel klasör` yazıyorsa beş değişkenden biri eksik veya hatalı demektir.

3. Siteye git → `/admin/` → giriş yap → **Medya** sekmesi
4. Bir görsel yükle. Yüklenen görselin adresi `pub-....r2.dev` ile başlamalı.
5. Render'da **Manual Deploy** → **Deploy latest commit** ile siteyi yeniden
   kur. Görsel hâlâ duruyorsa kurulum başarılı.

---

## Bilinmesi gerekenler

**Pakette gelen görseller.** Medya kütüphanesinde "pakette gelen" etiketli
görseller sitenin kodu içinde geldiği için silinemez. Sorun değil — üzerlerine
kendi görsellerinizi yükleyip projelerde onları seçersiniz.

**Şifre de kalıcı olur.** R2 bağlandıktan sonra panelden değiştirdiğiniz şifre
de R2'de saklanır. Şifreyi unutursanız: Render → Environment → `ADMIN_RESET`
değişkenini `true` yapın, servis yeniden başlasın, şifre `ADMIN_PASS`
değerine döner. Sonra `ADMIN_RESET`'i silin.

**Site yine uyur.** R2 kalıcılığı çözer ama Render ücretsiz planında site 15
dakika hareketsizlikte uykuya geçer, sonraki ziyaretçi ~1 dakika bekler.
Bunu yalnızca ücretli plan (Starter, $7/ay) çözer.

**Maliyet.** 10 GB depolama ve aylık 1 milyon yazma işlemi ücretsiz. Bu site
yılda bu sınırların binde birini kullanmaz.
