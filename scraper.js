const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require("fs");
puppeteer.use(StealthPlugin());
const nodemailer = require("nodemailer");


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

    // Anormallik kontrol ve e-posta bildirimi
for (const link of links) {
    console.log(`"${link}" için bilgi alınıyor...`);


    if(count >= 10) break;
    await page.goto(link, { waitUntil: "networkidle2" });

const result = await page.evaluate(() => {
    function extractPrice(text) {
        return parseFloat(text.replace(/\./g, '').replace(',', '.')) || 0;
    }

    // Ürün adı çekme
    const name = document.querySelector('h1')?.innerText.trim() || 'Ürün adı bulunamadı';

    // Satış isimlerini çek
    const sellerElements = document.querySelectorAll('.pn_v8'); // Satış isimlerinin olduğu alan
    const sellerData = Array.from(sellerElements).map(seller => ({
        sellerName: seller.innerText.trim(), // Satış ismini çek
        priceElement: seller.closest('li')?.querySelector('span.pb_v8') // İlgili fiyat alanını bul
    }));

    // Fiyat ve satış ismi eşleştirme
    const salesData = sellerData.map(data => ({
        sellerName: data.sellerName,
        price: data.priceElement ? extractPrice(data.priceElement.innerText.trim()) : 0
    }));

    // "İthalatçı" içerenleri çıkar
    const validSales = salesData.filter(data => !data.sellerName.includes('İthalatçı'));

    if (validSales.length === 0) {
        return { name, sitePrice: 0 }; // Geçerli satış ismi ve fiyat yoksa
    }

    // Geçerli fiyatları al
    const validPrices = validSales.map(data => data.price).filter(price => price > 0);
    if (validPrices.length === 0) {
        return { name, sitePrice: 0 }; // Geçerli fiyat yoksa sitePrice = 0
    }

    // İlk 5 fiyatı al
    const firstFivePrices = validPrices.slice(0, 5);

    // İlk 5 fiyatın ortalamasını al
    const averagePrice = firstFivePrices.reduce((sum, price) => sum + price, 0) / firstFivePrices.length;

  /*  // Ortalama ve standart sapma hesaplama
    const mean = validPrices.reduce((sum, val) => sum + val, 0) / validPrices.length;
    const variance = validPrices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validPrices.length;
    const stdDev = Math.sqrt(variance);

    // Güvenilir fiyat aralığını belirle (ortalama ± 1 standart sapma)
    const minThreshold = mean - stdDev;
    const maxThreshold = mean + stdDev;

    // Uç değerleri çıkar ve yeni ortalama al
    const filteredPrices = validPrices.filter(price => price >= minThreshold && price <= maxThreshold);
    const finalPrice = filteredPrices.length > 0
        ? filteredPrices.reduce((sum, val) => sum + val, 0) / filteredPrices.length
        : mean;
*/
return { 
    name, 
    sitePrice: averagePrice // Ortalama fiyatı döndür
};

});

    const myPriceKeys = Object.keys(myPrices);
    const currentKey = myPriceKeys[index];
    const myPrice = myPrices[currentKey] || 0;

    console.log(`MyPrices Key: ${currentKey}, Fiyat: ${myPrice}`);

    const item = new Item(id, result.name, myPrice, result.sitePrice, link);
    items.push(item);

    if (myPrice > 0 && result.sitePrice > 0) {
        const difference = Math.abs(myPrice - result.sitePrice);
        const percentageDifference = (difference / myPrice) * 100;

        // %10'dan büyük farkları kontrol et
        if (percentageDifference > 0) {
            anomalies.push({
                name: result.name,
                myPrice: myPrice,
                sitePrice: result.sitePrice,
                percentageDifference: percentageDifference.toFixed(2),
                link: link // Doğru şekilde link'i atıyoruz
            });

            // E-posta gönderimi
            const subject = `Anormallik Tespiti: ${result.name}`;
            const message = `
Ürün: ${result.name}
Bizim Fiyatımız: ${myPrice} TL
Site Fiyatı: ${result.sitePrice} TL
Fark (%): ${percentageDifference.toFixed(2)}%
Link: ${link}
            `;
           
        }


    }

    index++;
    id++;
    count++;
    await sleep(Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000);
}

    console.log('Ürünler oluşturuldu:', items);

     // Anormallikleri toplu e-posta ile gönder
    if (anomalies.length > 0) {
        const anomalyReport = anomalies.map(item => {
            return `Anormallik: ${item.name}\n` +
                `  Bizim Fiyatımız: ${item.myPrice} TL\n` +
                `  Site Fiyatı: ${item.sitePrice} TL\n` +
                `  Fark (%): ${item.percentageDifference}%\n` +
                `  Link: ${item.link}\n`; // Link'i ekliyoruz
        }).join('\n');

        const subject = "Anormallik Tespit Raporu";
        const message = `Aşağıdaki ürünlerde anormallik tespit edilmiştir:\n\n${anomalyReport}`;
        await sendEmail(subject, message); // E-posta gönder
    } else {
        const subject = "Anormallik Tespit Raporu";
        const message = "Hiçbir anormallik tespit edilmemiştir.";
        await sendEmail(subject, message); // E-posta gönder
    }

    // Objeleri bir dosyaya yazdır
    fs.writeFileSync('items.json', JSON.stringify(items, null, 2), 'utf-8');
    console.log('Ürün objeleri items.json dosyasına kaydedildi.');

    // Anormallikleri anormal.txt dosyasına yazdır
    if (anomalies.length > 0) {
        const anomalyReport = anomalies.map(item => {
            return `Anormallik: ${item.name}\n` +
                `  Bizim Fiyatımız: ${item.myPrice} TL\n` +
                `  Site Fiyatı: ${item.sitePrice} TL\n` +
                `  Fark (%): ${item.percentageDifference}%\n` +
                `  Link: ${item.link}\n`; // Link'i ekliyoruz
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


// E-posta gönderme fonksiyonu
async function sendEmail(subject, message) {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // Port 465 için true
        auth: {
            user: "networksnotification@gmail.com", // E-posta adresiniz
            pass: "gwqf ifoi comc wpvc"  // Gmail şifreniz
        }
    });

    const mailOptions = {
        from: "networksnotification@gmail.com",
        to: "emirxdizdar@gmail.com",
        subject: subject,
        text: message
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("E-posta başarıyla gönderildi!");
    } catch (error) {
        console.error("E-posta gönderimi sırasında bir hata oluştu:", error);
    }
}

