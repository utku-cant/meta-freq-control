
# Meta Ads Frequency Monitor (Google Apps Script)

Bu script, birden fazla Meta reklam hesabındaki reklam setlerinin frekans (frequency) verilerini kontrol eder. Eğer bir reklam setinin sıklığı belirlenen eşik değeri (varsayılan: 3)'ü aşıyorsa, bu reklam setlerini içeren bir e-posta raporu gönderir.

## Özellikler

- Birden fazla Meta Business hesabını kontrol eder (`actData` sayfasından)
- Aktif reklam setlerini baz alır
- 7 günlük ve 28 günlük frekansları kontrol eder
- Eşik değeri geçen reklam setlerini renkli HTML tablo ile e-posta olarak iletir

## Gereksinimler

- Google Sheets
- Google Apps Script
- Meta Access Token (Facebook Graph API)
- Meta Graph API v23.0 veya üzeri

## Kurulum

1. [Google Sheets](https://sheets.new) üzerinde yeni bir dosya oluştur.
2. Yeni bir sayfa oluşturup adını `actData` yap.
3. İlk satıra şu sütunları ekle:

   ```
   actName | actID
   ```

4. `Extensions > Apps Script` üzerinden Apps Script editörünü aç.
5. `freqcontrol.gs` dosyasının içeriğini yapıştır.
6. Script'i kaydet.

## 🛠️ Yapılandırma

- `accessToken` satırını kendi Meta Access Token’ınızla değiştirin:

  ```javascript
  const accessToken = 'BURAYA_TOKEN';
  ```

- E-mail gönderim adresini güncelleyin:

  ```javascript
  to: "mail_adresinizi_buraya_girin@gmail.com"
  ```

- Gerekirse frekans eşik değerini ayarlayın:

  ```javascript
  const threshold = 3;
  ```

## Çıktı Örneği

Script, aşağıdaki gibi bir HTML tabloyu e-posta olarak gönderir:

| Hesap      | Kampanya         | Reklam Seti     | Sıklık (7 Gün) | Sıklık (28 Gün) |
|------------|------------------|------------------|----------------|------------------|
| xxxxxx     | Marka Kampanyası | Video Seti 1     | **3.45**       | 5.22             |
| yyyyyyyyyy | Satış Odaklı     | Carousel Seti    | 2.88           | **4.91**         |

> 🔴 Renkler frekans değerine göre tonlanır: Açık turuncudan kırmızıya.

## Test ve Kullanım

1. `checkAdSetFrequencies_MultiAccount()` fonksiyonunu Apps Script editöründe elle çalıştır.
2. 1 dakika kadar bekleyin (API rate limit için delay vardır).
3. Tanımlı e-mail adresine HTML tablo içeren bir rapor gelir.

## Uyarılar

- Meta Access Token süresi dolarsa, rapor çekilemez. Gerekirse [token debug aracı](https://developers.facebook.com/tools/accesstoken/) ile kontrol edin.
- Çok fazla hesap varsa `chunkSize` değerini 10–15 arasında tutun.
- Google Apps Script’in e-posta gönderim limiti vardır (örneğin, günlük 100 e-posta sınırı).

.
