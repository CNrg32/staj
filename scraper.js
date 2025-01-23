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
    constructor(itemId,name,ourprice,sitePrice,link,visited,color) {
        this.link = link;
        this.sitePrice = sitePrice;
        this.name = name;
        this.ourprice = ourprice;
        this.itemId=itemId;
        this.visited = visited;
        this.color = color;
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
        console.log(itemsDictionary);
        return itemsDictionary;
    } catch (error) {
        console.error("PDF işleme sırasında bir hata oluştu:", error);
        return {};
    }
}
//bu kısmı elle yaptım çünkü eşitleme yapamıyoruz
//iphonelerin hepsi bitti ama site prizeleri ve linkleri düzenlemek gerekiyor
var arr = [];
let item1 = new Item(1, "iphone 16 Pro Max 256GB", 95500, 2000, "https://www.akakce.com/arama/?q=iphone+12",0,"Siyah");
let item2 = new Item(2, "iphone 16 Pro 128GB", 82000, 2000, "https://www.akakce.com/arama/?q=iphone+11",0,"Çöl Titanyum");
let item3 = new Item(3, "iphone 16 128GB", 58500, 2000, "https://www.akakce.com/arama/?q=iphone+10",0,"Lacivert");
let item4 = new Item(4, "iphone 15 128GB", 51600, 2000, "https://www.akakce.com/arama/?q=iphone+9",0,"Siyah");
let item5 = new Item(5, "iphone 14 128GB", 42800, 2000, "https://www.akakce.com/arama/?q=iphone+8",0,"Siyah");
arr.push(item1);
arr.push(item2);
arr.push(item3);
arr.push(item4);
arr.push(item5);
let item6 = new Item(6, "iphone 13 128GB", 34800, 2000, "https://www.akakce.com/arama/?q=iphone+7",0,"Siyah");
arr.push(item6);
let item7 = new Item(7, "iphone 12 256GB", 33400, 2000, "https://www.akakce.com/arama/?q=iphone+6", 0,"Kırmızı");
arr.push(item7);
let item8 = new Item(8, "iphone 12 128GB", 33000, 2000, "https://www.akakce.com/arama/?q=iphone+5",0,"Mor");
arr.push(item8);
let item9 = new Item(9, "iphone 12 64GB", 29300, 2000, "https://www.akakce.com/arama/?q=iphone+4", 0,"Kırmızı");
arr.push(item9);
let item10 = new Item(10, "iphone 12 64GB", 29300, 2000, "https://www.akakce.com/arama/?q=iphone+3",0,"Mor");
arr.push(item10);
let item11 = new Item(11, "iphone 12 64GB", 29300, 2000, "https://www.akakce.com/arama/?q=iphone+2", 0,"Beyaz");
arr.push(item11);
let item12 = new Item(12, "iphone 12 64GB", 29300, 2000, "https://www.akakce.com/arama/?q=iphone+2", 0, "Siyah");
arr.push(item11);
let item13 = new Item(13, "iphone 11 128GB", 28500, 2000, "https://www.akakce.com/arama/?q=iphone+1",0,"Siyah");
arr.push(item13);
let item14 = new Item(14, "iphone 11 64GB", 25000, 2000, "https://www.akakce.com/arama/?q=iphone+1",0,"Siyah");
arr.push(item14);
let item15 = new Item(15, "iPad Mini 6.Nesil+Cellular (Sim Kartlı) 256GB", 27000, 2000, "https://www.akakce.com/arama/?q=iphone+1", 0,"Beyaz");
arr.push(item15);
let item16 = new Item(16, "iPad Mini 8.3'(6.Nesil) 64GB", 19500, 2000, "https://www.akakce.com/arama/?q=iphone+1", 0,"Beyaz");
arr.push(item16);
//'Airpods Pro 2 (Type-C)Beyaz': 9800, 'Airpods 4 (ANC)Beyaz': 8800,'Airpods 4Beyaz': 6700,'Airpods 3 (MagSafe)Beyaz': 6700,'Airpods 2Beyaz': 5200,
let item17 = new Item(17, "Airpods Pro 2 (Type-C)", 9800, 2000, "https://www.akakce.com/arama/?q=iphone+1", 0,"Beyaz");
arr.push(item17);
let item18 = new Item(18, "Airpods 4 (ANC)", 8800, 2000, "https://www.akakce.com/arama/?q=iphone+1", 0,"Beyaz");
arr.push(item18);
let item19 = new Item(19, "Airpods 4", 6700, 2000, "https://www.akakce.com/arama/?q=iphone+1", 0,"Beyaz");
arr.push(item19);
let item20 = new Item(20, "Airpods 3 (MagSafe)", 6700, 2000, "https://www.akakce.com/arama/?q=iphone+1", 0,"Beyaz");
arr.push(item20);
let item21 = new Item(21, "Airpods 2", 5200, 2000, "https://www.akakce.com/arama/?q=iphone+1", 0,"Beyaz");
arr.push(item21);

