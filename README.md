# Sihirli Kartlar v9

## Açma

- Telefonda: `sihirli-kartlar-mobil.html` dosyasını Safari veya Chrome ile açın. Bu dosya CSS, JavaScript ve görselleri içerir; internet gerekmez. Dosya önizleyicileri JavaScript çalıştırmayabilir. Telefonda yerel HTML açma kısıtlaması varsa kaynak klasörü bir web sunucusuna yükleyip tarayıcı bağlantısından kullanın.
- Bilgisayarda: aynı klasördeki `index.html` dosyasını tarayıcıda açın.
- Web sunucusunda: `index.html`, `styles.css`, `script.js` ve `assets` klasörünü birlikte yükleyin.
- WhatsApp bağlantısına gitmek için internet gerekir. Oyunun kendisi ağ isteği yapmaz.

## Düzenleme

`index.html`: içerik ve erişilebilir sayfa yapısı.
`styles.css`: tema, kartlar, düğmeler ve mobil görünüm.
`script.js`: matematik motoru, ses ve oyun akışı.
`assets/`: orijinal logolar ve QR kodu.

Kaynakları düzenledikten sonra `python3 build.py` komutuyla tek HTML sürümünü yeniden üretin. Tek HTML dosyasını elle düzenlemek yerine kaynakları değiştirin.

## Oyun

1–20, 30, 63, 100, 500 veya 1.000 aralıkları; 2, 3, 4 veya 5 tabanı.
Her tabanda yalnızca Evet/Hayır cevaplanır. Gizli sayı için giriş veya arama alanı yoktur.
Başlangıç aralığı, kartları daha kolay okumak için 1–100'dür.
100'den büyük aralıklarda ardışık sayılar iki ucu dahil aralık olarak gösterilir.
E ve H klavye kısayolları kullanılabilir. Önceki kart ile cevap geri alınır.
Ses varsayılan olarak kapalıdır. Ses desteği eksik olsa da oyun devam eder.
Matematik açıklaması sonuç ekranında isteğe bağlıdır.

## Matematik

Taban b, basamak değeri w = b^k ve sıfırdan farklı rakam d için kart:
`floor(n / w) mod b = d` koşulunu sağlayan sayıları içerir.
Kartın katkısı `d × w` olur. Evet denilen kartların katkıları toplanır.
Aynı basamağın iki farklı rakamına Evet denmesi çelişkidir.
Sıfır veya seçilen aralığı aşan sonuçlar hata olarak gösterilir.
Boş kartlar atlanır. Kart sırası karıştırılır.

## Kontroller

`node tests/engine.test.cjs`
`node tests/ui.test.cjs`

6 aralık ve 4 tabandaki 6.852 gizli sayı için doğru sonuç ve kart üyeliği test edildi.
Çelişkili, sıfır ve eksik cevaplar test edildi.
DOM simülasyonunda başlatma, geri alma, sonuç, yeniden başlatma; ses API'sinin olmaması ve eski focus/kaydırma davranışları test edildi.
JavaScript sözdizimi kontrol edildi.

Bu ortamda gerçek tarayıcı motoru bulunmadığından Safari/Chrome üzerinde görsel ve dokunmatik cihaz testleri yapılamadı. Mobil sorunun kesin cihaz nedeni doğrulanmadı; dış dosya bağımlılığı için tek dosya sürümü, uyumluluk için korumalı API çağrıları ve anlaşılır yükleme uyarısı eklendi.
Tam WCAG uygunluk sertifikası veya tüm cihazlarda çalışma garantisi verilmez. Semantik HTML, görünür klavye odağı, 48 piksel düğmeler, etiketli kontroller ve hareket azaltma desteği uygulanmıştır.

## Başvurulan kaynaklar

- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script
- https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toString
- https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/

## v5: küçük aralıklarda canlı matematik

Yalnızca ikili tabanda 1–20 ve 1–30 için kartlar satır halinde birlikte gösterilir. Evet/Hayır cevapları değiştirilebilir. Beş ayrı kesik çizgili kutu büyükten küçüğe basamakları gösterir; 2⁰ cevabı en sağdadır. Her katkı ayrı kutuda rakam × 2 kuvveti = değer şeklindedir. Eksik cevaplar — ile gösterilir; toplam bütün cevaplar tamamlanana kadar ara toplamdır. Diğer aralıklar ve tabanlar önceki kart akışını kullanır.

## v6: sonuç animasyonu
Son cevap tamamlanınca geçerli sonuç için basamak kutuları sola yerleşir ve sağda büyük sayı görünür. Cevap değişince sayı güncellenir. Eksik veya geçersiz cevaplarda büyük sayı gösterilmez. Hareket azaltma tercihinde animasyon kapatılır. Diğer oyun akışları korunmuştur.

## v7
Basamaklar ve çarpımlı işlemler aynı blokta CSS transform ile sola kayar. Animasyon sırasında genişlik veya grid sütunları değişmez. Her cevapta DOM elemanlarını yeniden oluşturmak yerine mevcut kutular güncellenir. Gerçek cihazda animasyon akıcılığı doğrulanamadı.

## v8
1–20 ve 1–30 aralıklarında 2–5 tabanlarının tamamı satır düzenindedir. Her kart Evet/Hayır sorar. Bir basamağın tüm kartları cevaplanınca rakamı belirir; farklı rakamlara Evet verilirse çelişki gösterilir. Sayaç da matematik bloğuyla sola kayar. Büyük sonucun üstünde Tahmin ettiğin sayı başlığı görünür.

## v9
Sonuç alanı kutunun sağdaki %34 bölümünde merkezlenir; başlık ve sayı büyütüldü. Küçük aralıkların her tabanında açılabilir açıklama ve 15 örneği eklendi.
