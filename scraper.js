const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const pdf = require("pdf-parse");
let count = 0;
// Rastgele bir süre beklemek için sleep fonksiyonu
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const pdfPath = "./Networks Bilişim - Fiyat Listesi - 21012025.pdf";

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0');

    const myPrices = await processPdf(pdfPath);

    const results = [];
    const anomalies = [];

    for (const product in myPrices) {
        console.log(`"${product}" için arama yapılıyor...`);


        // 1-5 saniye arasında rastgele bekle
        const delay = Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000; // 1000ms-5000ms arası
        console.log(`Bekleniyor: ${delay / 1000} saniye`);
        await sleep(delay);

        //bu aşağıdaki akakçede arama yapmamızı sağlıyo burayı link ile değiştireceğiz
        const searchQuery = product.replace(/ /g, '+');
        const url = `https://www.akakce.com/arama/?q=${searchQuery}`;
        await page.goto(url, { waitUntil: 'networkidle2' });

        const result = await page.evaluate(() => {
            const firstProduct = document.querySelector('li[data-pr]');
            const price = firstProduct?.querySelector('span.pt_v8')?.innerText.trim() || 'N/A';
            const name = firstProduct?.querySelector('a[title]')?.getAttribute('title') || 'N/A';
            return { name, price };
        });

        // Fiyatı işleyerek kuruş kısmını çıkar
        let numericPrice = result.price.replace(/\./g, '').replace(',', ''); // Nokta ve virgülleri kaldır
        const myPrice = myPrices[product]; // Bizim fiyatımız

        numericPrice = Math.floor(parseInt(numericPrice) / 100); // 100'e bölerek kuruş kısmını çıkar
        console.log("bizim fiyat:" + myPrice)
        console.log("site fiyatı:" + numericPrice)
        if (true) {
            const difference = Math.abs(myPrice - numericPrice); // Fiyat farkını hesapla
            const percentageDifference = (difference / myPrice) * 100; // Yüzde farkı hesapla


            console.log(difference)
            // %1'den büyük farkları anormallik olarak kaydet
            if (percentageDifference > 1) {
                anomalies.push({
                    name: result.name,
                    sitePrice: numericPrice,
                    myPrice: myPrice,
                    percentageDifference: percentageDifference.toFixed(2),
                });
            }
        }

        // Sonuçları kaydet
        results.push({
            name: result.name,
            price: result.price,
            numericPrice: numericPrice,
        });
        count++; // Sayaç artır
        console.log(`"${product}" için sonuç bulundu:`, result);


    }


///////file a yazdırma olayı
    const combined = results.map(item => `${item.name} - ${item.price}`).join('\n');
    fs.writeFileSync('productInfo.txt', combined, 'utf-8');
    console.log('Ürün isimleri ve fiyatları productInfo.txt dosyasına kaydedildi.');

    if (anomalies.length > 0) {
        const anomalyReport = anomalies.map(item => {
            return `Anormallik: ${item.name}\n` +
                `  Site Fiyatı: ${item.sitePrice} TL\n` +
                `  Benim Fiyatım: ${item.myPrice} TL\n` +
                `  Fark (%): ${item.percentageDifference}%\n`;
        }).join('\n');
        fs.writeFileSync('anomrmal.txt', anomalyReport, 'utf-8');
        console.log('Anormallikler anomalies.txt dosyasına kaydedildi.');
    } else {
        console.log('Anormallik tespit edilmedi.');
    }

    await browser.close();
})();
class Item {
    constructor(itemId,name,price,sitePrice,link) {
        this.id = id;
        this.link = link;
        this.sitePrice = sitePrice;
        this.name = name;
        this.price = price;
    }
}
// PDF işleme fonksiyonu
async function processPdf(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);
        const lines = pdfData.text.split("\n");

        const itemsDictionary = {};
        const colors = [
            "Kırmızı", "Mor", "Beyaz", "Siyah", "Lacivert",
            "Gümüş", "Pembe", "Açık Mavi", "Krem", "Gri", "Titanyum", "Çöl"
        ];

        lines
            .filter(line => line.includes("₺"))
            .forEach(line => {
                const priceMatch = line.match(/([\d.,]+)₺$/);
                if (priceMatch) {
                    const price = parseFloat(priceMatch[1].replace(".", "").replace(",", "."));
                    let product = line.replace(priceMatch[0], "").replace(/\s+/g, " ").trim();

                    if (product.includes(",")) {
                        const parts = product.split(",").map(p => p.trim());
                        const baseProduct = parts.shift();
                        const firstColor = colors.find(color => baseProduct.includes(color));

                        if (firstColor) {
                            const baseName = baseProduct.replace(firstColor, "").trim();
                            const allColors = [firstColor, ...parts];

                            allColors.forEach(color => {
                                itemsDictionary[`${baseName} ${color.trim()}`] = price;
                            });
                        }
                    } else {
                        itemsDictionary[product] = price;
                    }
                }
            });
        return itemsDictionary;
    } catch (error) {
        console.error("PDF işleme sırasında bir hata oluştu:", error);
        return {};
    }
}
