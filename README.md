# Mehmet Rahbay Mimarlık — Web Sitesi + Yönetim Paneli

İsviçre tipografisi esinli, minimal beyaz temalı mimarlık ofisi sitesi.
Tüm metinler ve görseller yönetim panelinden değiştirilebilir.

---

## Kurulum (3 adım)

```bash
npm install     # bağımlılıkları kurar (bir kez)
npm start       # sunucuyu başlatır
```

Tarayıcıda aç:

| Adres | Açıklama |
|---|---|
| `http://localhost:3000` | Site |
| `http://localhost:3000/admin/` | Yönetim paneli |

**İlk giriş bilgileri**

```
Kullanıcı adı : admin
Şifre         : rahbay2026
```

> İlk girişten sonra panelin sağ üstündeki **Şifre değiştir** ile şifreyi mutlaka değiştirin.
> Şifre `data/admin.json` içinde şifrelenmiş (bcrypt) olarak saklanır.

---

## Yönetim paneli neler yapıyor?

| Sekme | İçerik |
|---|---|
| **Genel** | Ofis adı, alt başlık, logo harfleri, alt bilgi |
| **Ana sayfa** | Kapak görseli, büyük başlık satırları, açıklama, kayan yazı şeridi |
| **Hakkında** | Bölüm görseli, başlık, paragraflar, sayaçlar (16+, 74 …) |
| **Projeler** | Proje ekle / sil / sırala, kapak ve galeri görselleri, tüm proje bilgileri |
| **Hizmetler** | Hizmet kalemleri ekle / sil / sırala |
| **Süreç** | Dört adımlı çalışma süreci |
| **İletişim** | E-posta, telefon, adres, sosyal medya bağlantıları |
| **Medya** | Yüklenen tüm görseller; sürükle-bırak yükleme, silme |

Görsel değiştirmek için: ilgili alandaki **Görseli değiştir** → kütüphaneden seç
ya da sürükle-bırak ile yeni görsel yükle. Sonra alttaki **Değişiklikleri kaydet**.

Her kayıtta bir öncekinin yedeği `data/backups/` klasörüne alınır (son 20 kayıt).

---

## Klasör yapısı

```
├── server.js              Express sunucusu + API
├── data/
│   ├── content.json       Sitenin tüm içeriği (panelden düzenlenir)
│   ├── admin.json         Yönetici bilgisi (ilk çalıştırmada otomatik oluşur)
│   └── backups/           Otomatik içerik yedekleri
├── public/
│   ├── index.html         Ana sayfa
│   ├── proje.html         Proje detay sayfası
│   ├── 404.html
│   ├── admin/index.html   Yönetim paneli
│   ├── css/style.css
│   ├── js/main.js
│   └── uploads/           Tüm görseller
└── tools/                 Görselleri üreten Python render motoru (opsiyonel)
```

---

## Sitedeki animasyonlar

- Açılış sayaçlı yükleme perdesi
- Özel fare imleci (bağlantı üzerinde büyür)
- Başlıklarda satır satır maskeli açılma
- Kaydırdıkça görünen bölümler (kademeli gecikmeli)
- Görsellerde parallax ve yavaş yakınlaşma
- Sayfalar arası perde geçişi
- Kayan yazı şeridi, sayaç animasyonları, galeri lightbox
- `Hareketi azalt` sistem ayarı açıksa tüm animasyonlar otomatik kapanır

---

## Yayına alma

Node.js çalıştırabilen herhangi bir sunucuda (VPS, Plesk/cPanel'in Node desteği,
Railway, Render, Fly.io) çalışır:

```bash
PORT=8080 ADMIN_USER=mehmet ADMIN_PASS=guclu-bir-sifre SESSION_SECRET=rastgele-uzun-metin npm start
```

Alan adını bu porta yönlendirmek için önüne Nginx/Apache ters vekil (reverse proxy)
koymanız yeterli. HTTPS önerilir (Let's Encrypt).

---

## Görseller hakkında

Sitedeki mimari görseller `tools/` klasöründeki küçük Python render motoruyla
özel olarak üretildi; telif sorunu yoktur. Gerçek proje fotoğraflarınızı
yönetim panelinden yükleyerek hepsini değiştirebilirsiniz.

Yeniden üretmek isterseniz:

```bash
cd tools && python3 scenes.py            # hepsi
cd tools && python3 scenes.py proje-1-a  # tek görsel
```
