import standartsapma from './deviation.js';
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Dil tercihleri ve user-agent ayarları
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0');

    // İşlemek istediğiniz ürünlerin listesi,burası pdf üzerinden halledilecek
    const productsToSearch = [
        'iPhone 16 Pro 128 GB',
        'iPhone 15 128 GB',
        'iPhone 15 Pro Max 256 GB',
        'iPhone 13 128 GB',
    ];

    // Kendi fiyatlarımız, burası pdf üzerinden halledilecek
    const myPrices = {
        'iPhone 16 Pro 128 GB': 85000,
        'iPhone 15 128 GB': 70000,
        'iPhone 15 Pro Max 256 GB': 95000,
    };

    const results = []; // Tüm ürünlerin sonuçlarını burada saklayacağız
    const anomalies = []; // Anormallikler 

    for (const product of productsToSearch) {
        console.log(`"${product}" için arama yapılıyor...`);

        // Ürünü aramak için URL oluştur
        const searchQuery = product.replace(/ /g, '+'); // Boşlukları "+" ile değiştir
        const url = `https://www.akakce.com/arama/?q=${searchQuery}`;
        await page.goto(url, { waitUntil: 'networkidle2' });

        // İlk fiyatı çek///////////////////////////////////////////////
        const result = await page.evaluate(() => {
            const firstProduct = document.querySelector('li[data-pr]'); // İlk ürünü seç
            const price = firstProduct?.querySelector('span.pt_v8')?.innerText.trim() || 'N/A'; // Fiyatı al bu kısmı değiştirip fiyat ortalaması olarak yapacaz
            const name = firstProduct?.querySelector('a[title]')?.getAttribute('title') || 'N/A'; // Ürün adı
            return { name, price };
        });
        // Fiyatı düzgün bir şekilde sayıya çevir
        const numericPrice = parseFloat(
            result.price.replace(/\./g, '').replace(',', '.')
        );
        // Kendi fiyatımızla karşılaştırma
        const myPrice = myPrices[product]; // Kendi fiyatımız
        if (!isNaN(numericPrice) && myPrice) {
            const difference = Math.abs(myPrice - numericPrice);
            const percentageDifference = (difference / myPrice) * 100;

            // %10'dan büyük farkları anormallik 
            if (percentageDifference > 10) {
                anomalies.push({
                    name: result.name,
                    sitePrice: numericPrice,
                    myPrice: myPrice,
                    percentageDifference: percentageDifference.toFixed(2),
                });
            }
        }

        // Sonuçları kaydetme
        results.push({
            name: result.name,
            price: result.price,
            numericPrice: numericPrice,
        });

        console.log(`"${product}" için sonuç bulundu:`, result);
    }

    // Ürün isimleri ve fiyatlarını formatlayarak aynı dosyaya yaz

    const combined = results.map(item => `${item.name} - ${item.price}`).join('\n');
    fs.writeFileSync('productInfo.txt', combined, 'utf-8');
    console.log('Ürün isimleri ve fiyatları productInfo.txt dosyasına kaydedildi.');

    // Anormallikleri yazdırma
    if (anomalies.length > 0) {
        const anomalyReport = anomalies.map(item => {
            return `Anormallik: ${item.name}\n` +
                `  Site Fiyatı: ${item.sitePrice} TL\n` +
                `  Benim Fiyatım: ${item.myPrice} TL\n` +
                `  Fark (%): ${item.percentageDifference}%\n`;
        }).join('\n');
        fs.writeFileSync('anomalies.txt', anomalyReport, 'utf-8');
        console.log('Anormallikler anomalies.txt dosyasına kaydedildi.');
    } else {
        console.log('Anormallik tespit edilmedi.');
    }

    await browser.close();
})();
