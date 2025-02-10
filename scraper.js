const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require("fs");
puppeteer.use(StealthPlugin());
const nodemailer = require("nodemailer");
const readline = require('readline');
const pdf = require('pdf-parse');
const { downloadLatestPdf } = require('./downloadPdfFromGmail'); // Gmail'den PDF alma fonksiyonunu içe aktar


const axios = require('axios');
const { storage } = require('googleapis/build/src/apis/storage');


class Item {
    constructor(id, name, buyPrice, sitePrice, link, storageName, colorName, upgradedPrice, stockQuantity) {
        this.id = id;
        this.name = name;
        this.buyPrice = buyPrice;
        this.sitePrice = sitePrice;
        this.link = link;
        this.storageName = storageName;
        this.colorName = colorName;
        this.upgradedPrice = upgradedPrice;  // Bu satırda upgradedPrice doğru şekilde atanmalı
        this.stockQuantity = stockQuantity;  // Bu satırda stockQuantity doğru şekilde atanmalı
    }
}

// API'den ürün verilerini çekme
async function fetchProductData() {
    try {
        const response = await axios.get('https://networksadmin.netliste.com/api/getProductListWithAkakceURL');
        const products = response.data;

        // Her ürün için Item objesi oluştur
        const items = products.map((product, index) => {
            return new Item(
                product.productID,                // id
                product.productName,              // name
                parseFloat(product.buyPrice),     // buyPrice
                0,                                // sitePrice
                product.akakceURL,                // link
                product.storageName,              // storage
                product.colorName,                // color
                0,                                // upgradedPrice (başlangıçta 0, daha sonra güncellenebilir)
                product.stockQuantity             // stockQuantity
            );
        });

        console.log(items); // Item objelerini konsola yazdır
        return items;
    } catch (error) {
        console.error('Veri çekme hatası:', error.message);
    }
}

// API'den veri çek ve Item objeleri oluştur


let count = 0;
// Rastgele bir süre beklemek için sleep fonksiyonu
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


(async () => {
    
    // Tarayıcı başlatma
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0');

    const items = await fetchProductData(); // Tüm ürün objelerini saklamak için array
    const anomalies = []; // Anormallik bulunan ürünler
    let id = 1; // ID sırası
    let index = 0; // MyPrices sözlüğü için bir sayaç


    // Anormallik kontrol ve e-posta bildirimi
    for (const item of items) {
        const link = item.link;
        console.log(`"${link}" için bilgi alınıyor...`);


        
        await page.goto(link, { waitUntil: "networkidle2" });

        // Akakçe sitesinden fiyat çekme
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

            return {
                name,
                sitePrice: averagePrice // Ortalama fiyatı döndür
            };
        });

        item.sitePrice = result.sitePrice; // averagePrice


        
        let myPrice = item.buyPrice || 0; // buyPrice'ı kullanıyoruz, item objesindeki buyPrice

        let upgradedPrice = myPrice;

        if (myPrice > 70000) {
            upgradedPrice = myPrice - (myPrice * 0.01);
        } else if (myPrice > 50000) {
            upgradedPrice = myPrice - (myPrice * 0.02);

        } else if (myPrice > 30000) {
            upgradedPrice = myPrice - (myPrice * 0.03);
        } else if (myPrice > 10000) {
            upgradedPrice = myPrice - (myPrice * 0.05);
        } else {
            upgradedPrice = myPrice - (myPrice * 0.10);
        }
        
        
        if (myPrice > 0 && item.sitePrice > 0) {
            // 70 den fazlaysa yüzde 1 50 den fazlaysa yüzde 2 30 dan fazlaysa yüzde 3 10 dan fazlaysa yüzde 5 farkı takip et
            //çıkaracak şekilde yaptım çünkü kontrolü çıkarılmış üstünden yapıcaz
            if(myPrice>70000){
                upgradedPrice = myPrice - (myPrice * 0.01);
            }else if(myPrice>50000){
                upgradedPrice = myPrice - (myPrice * 0.02);

            }else if(myPrice>30000){
                upgradedPrice = myPrice - (myPrice * 0.03);
            }else if(myPrice>10000){
                upgradedPrice = myPrice - (myPrice * 0.05);
            }else{
                upgradedPrice = myPrice - (myPrice * 0.10);
            }

            const difference = Math.abs(myPrice - item.sitePrice);
            const percentageDifference = (difference / upgradedPrice) * 100;


anomalies.push({
    name: item.name,
    myPrice: myPrice,
    sitePrice: item.sitePrice,
    upgradedPrice: upgradedPrice,
    percentageDifference: percentageDifference.toFixed(2),
    link: item.link,
    storageName: item.storageName,
    colorName: item.colorName,
    stockQuantity: item.stockQuantity
});

            /*
           // Fiyat farkına göre anormallik kontrolleri
if (myPrice > 0 && item.sitePrice > 0) {
    // 70.000 TL'yi aşan ürünler için %2 fark
    if (percentageDifference > 2 && upgradedPrice > 70000) {
        anomalies.push({
            name: item.name,
            myPrice: myPrice,
            sitePrice: item.sitePrice,
            upgradedPrice: upgradedPrice,
            percentageDifference: percentageDifference.toFixed(2),
            link: item.link,
            storageName: item.storageName,
            colorName: item.colorName,
            stockQuantity: item.stockQuantity
        });
    } 
    // 50.000 TL'yi aşan ürünler için %5 fark
    else if (percentageDifference > 5 && upgradedPrice > 50000) {
        anomalies.push({
            name: item.name,
            myPrice: myPrice,
            sitePrice: item.sitePrice,
            upgradedPrice : item.upgradedPrice,
            percentageDifference: percentageDifference.toFixed(2),
            link: item.link,
            storageName: item.storageName,
            colorName: item.colorName,
            stockQuantity: item.stockQuantity
        });
    } 
    // 30.000 TL'yi aşan ürünler için %7 fark
    else if (percentageDifference > 7 && upgradedPrice > 30000) {
        anomalies.push({
            name: item.name,
            myPrice: myPrice,
            sitePrice: item.sitePrice,
            upgradedPrice: upgradedPrice,
            percentageDifference: percentageDifference.toFixed(2),
            link: item.link,
            storageName: item.storageName,
            colorName: item.colorName,
            stockQuantity: item.stockQuantity
        });
    }
    // 10.000 TL'yi aşan ürünler için %10 fark
    else if (percentageDifference > 10 && upgradedPrice > 10000) {
        anomalies.push({
            name: item.name,
            myPrice: myPrice,
            sitePrice: item.sitePrice,
            upgradedPrice: upgradedPrice,
            percentageDifference: percentageDifference.toFixed(2),
            link: item.link,
            storageName: item.storageName,
            colorName: item.colorName,
            stockQuantity: item.stockQuantity
        });
    }
        
}
*/
        }

        index++;
        id++;
        count++;
        await sleep(Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000);
    }

    console.log('Ürünler oluşturuldu:', items);

// Anormallikleri toplu e-posta ile gönder
if (anomalies.length > 0) {
    // Her bir anormallik içeren ürün için tüm bilgileri ekle
    const anomalyReport = anomalies.map(item => {
        return `Anormallik: ${item.name}\n` +
            `  Bizim Fiyatımız: ${item.myPrice} TL\n` +
            `  Site Fiyatı: ${item.sitePrice} TL\n` +
            `  Güncellenmiş Fiyat: ${item.upgradedPrice} TL\n` +  // upgradedPrice bilgisi
            `  Fark (%): ${item.percentageDifference}%\n` +
            `  Link: ${item.link}\n` +  // Link'i ekliyoruz
            `  Depolama: ${item.storageName}\n` +  // Storage bilgisini ekliyoruz
            `  Renk: ${item.colorName}\n` +  // Color bilgisini ekliyoruz
            `  Stok Miktarı: ${item.stockQuantity}\n` +  // StockQuantity bilgisini ekliyoruz
            `  Raporlanma Zamanı: ${new Date().toLocaleString()}\n\n`; // Raporlanma zamanını ekliyoruz
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
            `  Site Fiyatı: ${item.sitePrice} TL\n` +
            `  Bizim Fiyatımız: ${item.myPrice} TL\n` +
            `  Anormallik Hesapladığımız Fiyat: ${item.upgradedPrice} TL\n` +
            `  Fark (%): ${item.percentageDifference}%\n` +
            `  Link: ${item.link}\n` +   // Link'i de ekliyoruz
            `  Depolama: ${item.storageName}\n` + // Depolama bilgisini ekliyoruz
            `  Renk: ${item.colorName}\n` + // Renk bilgisini ekliyoruz
            `  Stok Miktarı: ${item.stockQuantity}\n` + // Stok miktarını ekliyoruz
            `  ---------------------------------------------\n`;  // Satır sonu ekliyoruz
    }).join('\n');
    
    // Anormallik raporunu anormal.txt dosyasına kaydet
    fs.writeFileSync('anormal.txt', anomalyReport, 'utf-8');
    console.log('Anormallikler anormal.txt dosyasına kaydedildi.');
} else {
    console.log('Anormallik tespit edilmedi.');
}



    await browser.close();


})();

// PDF işleme fonksiyonu
async function processPdf(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);

    const itemsDictionary = {};
    const lines = pdfData.text.split("\n");

    lines
        .filter(line => line.includes("₺")) // Fiyat bilgisi içeren satırları filtrele
        .forEach(line => {
            const priceMatch = line.match(/([\d.,]+)₺$/); // Fiyatları ayıkla
            if (priceMatch) {
                const price = parseFloat(priceMatch[1].replace(".", "").replace(",", "."));
                let product = line.replace(priceMatch[0], "").replace(/\s+/g, " ").trim();
                product = product.replace(/\s+/g, "").replace(/(Kırmızı|Mor|Beyaz|Siyah|Yeşil|Lacivert|Gümüş|Pembe|AçıkMavi|Krem|Gri|Titanyum|Çöl)/gi, "").replace(/,+/g, "");
                itemsDictionary[product] = price;
            }
        });

    return itemsDictionary;
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
        to: "networksnotification@gmail.com",
        to: "mfatihgumus@networksbilisim.com", 
        to: "ayberkozkaya@hotmail.com",
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

// Örnek çağrı
