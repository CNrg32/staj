const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require("fs");
puppeteer.use(StealthPlugin());


let count = 0;
// Rastgele bir süre beklemek için sleep fonksiyonu
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Item sınıfı
class Item {
    constructor(id, name, price, sitePrice, link) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.sitePrice = sitePrice;
        this.link = link;
    }
}

// Dosyadan linkleri oku
const fileContent = fs.readFileSync('./link.txt', 'utf-8');
const links = fileContent.match(/https?:\/\/[^\s]+/g); // Tüm linkleri çıkar

const pdfPath = "./Networks Bilişim - Fiyat Listesi - 21012025.pdf";

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0');

    const myPrices = await processPdf(pdfPath);
    
    
    const dictionarySize = Object.keys(myPrices).length;
    console.log(dictionarySize)
  


    const items = []; // Tüm ürün objelerini saklamak için array
    const anomalies = []; // Anormallik bulunan ürünler
    let id = 1; // ID sırası

    let index = 0; // MyPrices sözlüğü için bir sayaç

    for (const link of links) {
        console.log(`"${link}" için bilgi alınıyor...`);
    

        //if(count >= 3) break;
        await page.goto(link, { waitUntil: 'networkidle2' });
    
        // Ürün adı ve fiyatlarını çek
        const result = await page.evaluate(() => {
            // Ürün adı
            const name = document.querySelector('h1')?.innerText.trim() || 'Ürün adı bulunamadı';
    
            // Sayfanın üst kısmındaki genel fiyat
            const priceText = document.querySelector('.pd_v8')?.innerText.trim() || '0';
    
            // Satıcı fiyatlarından en düşük fiyat
            const sellerPriceText = document.querySelector('span.pb_v8')?.innerText.trim() || '0';
    
            return {
                name,
                sitePrice: parseFloat(sellerPriceText.replace(/\./g, '').replace(',', '.')) || 0,
                pagePrice: parseFloat(priceText.replace(/\./g, '').replace(',', '.')) || 0,
            };
        });
    
        // MyPrices'deki sıradaki fiyatı al
        const myPriceKeys = Object.keys(myPrices); // MyPrices anahtarlarının sırasını al
        const currentKey = myPriceKeys[index];    // Şu anki anahtarı al
        const myPrice = myPrices[currentKey] || 0; // Sözlükteki sıradaki fiyat
    
        console.log(`MyPrices Key: ${currentKey}, Fiyat: ${myPrice}`); // Kontrol amaçlı log
    
        // Yeni bir Item objesi oluştur ve listeye ekle
        const item = new Item(id, result.name, myPrice, result.sitePrice, link);
        items.push(item);
    
        // Anormallik hesabı yap
        if (myPrice > 0 && result.sitePrice > 0) {
            const difference = Math.abs(myPrice - result.sitePrice);
            const percentageDifference = (difference / myPrice) * 100;
    
            // %1'den büyük farkları anormallik olarak kaydet
            if (percentageDifference > 1) {
                anomalies.push({
                    name: result.name,
                    myPrice: myPrice,
                    sitePrice: result.sitePrice,
                    percentageDifference: percentageDifference.toFixed(2),
                });
            }
        }
    
        index++; // Bir sonraki MyPrices anahtarına geç
        id++;    // ID'yi artır
        count++;
        // İstekler arası gecikme
        await sleep(Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000); // 1-5 saniye bekle
    }
    

    console.log('Ürünler oluşturuldu:', items);

    // Objeleri bir dosyaya yazdır
    fs.writeFileSync('items.json', JSON.stringify(items, null, 2), 'utf-8');
    console.log('Ürün objeleri items.json dosyasına kaydedildi.');

    // Anormallikleri anormal.txt dosyasına yazdır
    if (anomalies.length > 0) {
        const anomalyReport = anomalies.map(item => {
            return `Anormallik: ${item.name}\n` +
                `  Site Fiyatı: ${item.sitePrice} TL\n` +
                `  Bizim Fiyatımız: ${item.myPrice} TL\n` +
                `  Fark (%): ${item.percentageDifference}%\n`;
        }).join('\n');
        fs.writeFileSync('anormal.txt', anomalyReport, 'utf-8');
        console.log('Anormallikler anormal.txt dosyasına kaydedildi.');
    } else {
        console.log('Anormallik tespit edilmedi.');
    }

    await browser.close();
})();


const pdf = require("pdf-parse");

async function processPdf(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath); // PDF dosyasını oku
        const pdfData = await pdf(dataBuffer);       // PDF içeriğini ayıkla
        const lines = pdfData.text.split("\n");      // Metni satır bazlı böl

        const itemsDictionary = {};

        // Satırları filtrele ve işlem yap
        lines
            .filter(line => line.includes("₺")) // Fiyat bilgisi içermeyen satırları atla
            .forEach(line => {
                try {
                    // Satırdan fiyat bilgisi al
                    const priceMatch = line.match(/([\d.,]+)₺$/);
                    if (priceMatch) {
                        const price = parseFloat(priceMatch[1].replace(".", "").replace(",", ".")); // Fiyatı parse et
                        let product = line.replace(priceMatch[0], "").replace(/\s+/g, " ").trim(); // Ürün adını temizle
                        
                        // Ürünün adındaki tüm boşlukları kaldır
                        product = product.replace(/\s+/g, "");

                        // Renk kısmını kaldır (Eğer varsa, tanımlı renklerden bağımsız olarak)
                        product = product.replace(/(Kırmızı|Mor|Beyaz|Siyah|Yeşil|Lacivert|Gümüş|Pembe|AçıkMavi|Krem|Gri|Titanyum|Çöl)/gi, "");

                        // Ürünün adındaki gereksiz virgülleri kaldır
                        product = product.replace(/,+/g, ""); // Fazla virgülleri temizle

                        // Ürünü sözlüğe ekle
                        itemsDictionary[product] = price;
                    }
                } catch (lineError) {
                    console.error("Satır işleme hatası:", line, lineError);
                }
            });

        return itemsDictionary;
    } catch (error) {
        console.error("PDF işleme sırasında bir hata oluştu:", error);
        return {};
    }
}


