// GEREKLİ MODÜLLER
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const nodemailer = require("nodemailer");
const xlsx = require('xlsx');
const axios = require('axios');
puppeteer.use(StealthPlugin());

// Item SINIFI
class Item {
    constructor(id, name, buyPrice, sitePrice, link, storageName, colorName, stockQuantity, source) {
        this.id = id;
        this.name = name;
        this.buyPrice = buyPrice;
        this.sitePrice = sitePrice;
        this.link = link;
        this.storageName = storageName;
        this.colorName = colorName;
        this.stockQuantity = stockQuantity;
        this.source = source; // "cimri" veya "akakce"
    }
}

// CİMRİ VERİ ÇEKME
async function fetchCimriProducts() {
    try {
        const response = await axios.get('https://networksadmin.netliste.com/api/getProductListWithCimriURL', {
            auth: {
                username: 'networksAPIUser',
                password: 'zbx5eW6ADbMrvg17HxWP58zKQWND7BUA'
            }
        });

        const products = response.data;
        
        if (!products || products.length === 0) {
            console.error("Cimri API'den boş veri alındı veya erişim hatası oluştu.");
            return [];
        }

        console.log("✅ Cimri ürünleri başarıyla çekildi:", products.length);

        let iphoneProducts = products.filter(product => product.productName.toLowerCase().includes("iphone"))
                                     .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let ipadProducts = products.filter(product => product.productName.toLowerCase().includes("ipad"))
                                   .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let airpodsProducts = products.filter(product => product.productName.toLowerCase().includes("airpods"))
                                      .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let allSamsungProducts = products.filter(product => product.cimriURL.toLowerCase().includes("samsung"));
        let samsungSProducts = allSamsungProducts.filter(product => product.productName.trim().toLowerCase().startsWith("s"))
                                                 .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let samsungAProducts = allSamsungProducts.filter(product => product.productName.trim().toLowerCase().startsWith("a"))
                                                 .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let samsungMProducts = allSamsungProducts.filter(product => product.productName.trim().toLowerCase().startsWith("m"))
                                                 .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let otherSamsungProducts = allSamsungProducts.filter(product =>
            !product.productName.trim().toLowerCase().startsWith("s") &&
            !product.productName.trim().toLowerCase().startsWith("a") &&
            !product.productName.trim().toLowerCase().startsWith("m")
        ).sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let redmiProducts = products.filter(product => product.productName.toLowerCase().includes("redmi"))
                                    .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let lenovoProducts = products.filter(product => product.productName.toLowerCase().includes("lenovo"))
                                     .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let otherProducts = products.filter(product =>
            !product.productName.toLowerCase().includes("iphone") &&
            !product.productName.toLowerCase().includes("ipad") &&
            !product.productName.toLowerCase().includes("airpods") &&
            !product.cimriURL.toLowerCase().includes("samsung") &&
            !product.productName.toLowerCase().includes("redmi") &&
            !product.productName.toLowerCase().includes("lenovo")
        );

        const sortedProducts = [
            ...iphoneProducts,
            ...ipadProducts,
            ...airpodsProducts,
            ...samsungSProducts,
            ...samsungAProducts,
            ...samsungMProducts,
            ...otherSamsungProducts,
            ...redmiProducts,
            ...lenovoProducts,
            ...otherProducts
        ];

        const items = sortedProducts.map(product => new Item(
            product.productID,
            product.productName,
            parseFloat(product.buyPrice),
            0,
            product.cimriURL,
            product.storageName,
            product.colorName,
            parseInt(product.stockQuantity),
            "cimri"
        ));
        

        return items;
    } catch (error) {
        console.error("Cimri verisi çekme hatası:", error.message);
        return [];
    }
}


// AKAKCE VERİ ÇEKME
async function fetchAkakceProducts() {
    try {
        const response = await axios.get('https://networksadmin.netliste.com/api/getProductListWithAkakceURL', {
            auth: {
                username: 'networksAPIUser',
                password: 'zbx5eW6ADbMrvg17HxWP58zKQWND7BUA'
            }
        });

        const products = response.data;
    

        if (!products || products.length === 0) {
            console.error("API'den boş veri alındı veya erişim hatası oluştu.");
            return [];
        }

        console.log("Akakçe ürünler başarıyla çekildi:", products.length);

        let iphoneProducts = products.filter(product => product.productName.toLowerCase().includes("iphone"))
                                     .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let ipadProducts = products.filter(product => product.productName.toLowerCase().includes("ipad"))
                                   .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let airpodsProducts = products.filter(product => product.productName.toLowerCase().includes("airpods"))
                                      .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let allSamsungProducts = products.filter(product => product.akakceURL.toLowerCase().includes("samsung"));
        let samsungSProducts = allSamsungProducts.filter(product => product.productName.trim().toLowerCase().startsWith("s"))
                                                 .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let samsungAProducts = allSamsungProducts.filter(product => product.productName.trim().toLowerCase().startsWith("a"))
                                                 .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let samsungMProducts = allSamsungProducts.filter(product => product.productName.trim().toLowerCase().startsWith("m"))
                                                 .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let otherSamsungProducts = allSamsungProducts.filter(product =>
            !product.productName.trim().toLowerCase().startsWith("s") &&
            !product.productName.trim().toLowerCase().startsWith("a") &&
            !product.productName.trim().toLowerCase().startsWith("m")
        ).sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let redmiProducts = products.filter(product => product.productName.toLowerCase().includes("redmi"))
                                    .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let lenovoProducts = products.filter(product => product.productName.toLowerCase().includes("lenovo"))
                                     .sort((a, b) => parseFloat(b.buyPrice) - parseFloat(a.buyPrice));

        let otherProducts = products.filter(product =>
            !product.productName.toLowerCase().includes("iphone") &&
            !product.productName.toLowerCase().includes("ipad") &&
            !product.productName.toLowerCase().includes("airpods") &&
            !product.akakceURL.toLowerCase().includes("samsung") &&
            !product.productName.toLowerCase().includes("redmi") &&
            !product.productName.toLowerCase().includes("lenovo")
        );

        const sortedProducts = [
            ...iphoneProducts,
            ...ipadProducts,
            ...airpodsProducts,
            ...samsungSProducts,
            ...samsungAProducts,
            ...samsungMProducts,
            ...otherSamsungProducts,
            ...redmiProducts,
            ...lenovoProducts,
            ...otherProducts
        ];

        const items = sortedProducts.map(product => new Item(
            product.productID,
            product.productName,
            parseFloat(product.buyPrice),
            0,
            product.akakceURL,
            product.storageName,
            product.colorName,
            parseInt(product.stockQuantity),
            "akakce"
        ));
        

        return items;
    } catch (error) {
        console.error('Veri çekme hatası:', error.message);
        return [];
    }
}

// FİYAT SCRAPE ETME (kaynağa göre ayır)
async function scrapePrices(items) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    let count = 0;
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');

    for (const item of items) {
        console.log(`Fiyat çekiliyor: ${item.name} (${item.source})`);
         
        try {
            await page.goto(item.link, { waitUntil: "domcontentloaded", timeout: 60000 });

            const result = await page.evaluate((source) => {
                function extractPrice(text) {
                    return parseFloat(text.replace(/\./g, '').replace(',', '.')) || 0;
                }

                if (source === "akakce") {
                    const sellerElements = document.querySelectorAll('.pn_v8');
                    const sellerData = Array.from(sellerElements).map(seller => ({
                        sellerName: seller.innerText.trim(),
                        priceElement: seller.closest('li')?.querySelector('span.pb_v8')
                    }));

                    const salesData = sellerData.map(data => ({
                        sellerName: data.sellerName,
                        price: data.priceElement ? extractPrice(data.priceElement.innerText.trim()) : 0
                    }));

                    const validSales = salesData.filter(data => !data.sellerName.includes('İthalatçı'));
                    const prices = validSales.map(data => data.price).filter(p => p > 0).sort((a, b) => a - b);
                    const top5 = prices.slice(0, 5);
                    const avg = top5.length ? top5.reduce((a, b) => a + b, 0) / top5.length : 0;
                    return { sitePrice: avg };

                } else if (source === "cimri") {
                    const priceElements = document.querySelectorAll('div[class^="OfferCard_price__"], div[class*="offerCard_price"]');
                    let prices = Array.from(priceElements)
                        .map(el => extractPrice(el.innerText))
                        .filter(p => p > 0)
                        .sort((a, b) => a - b);
                    const top5 = prices.slice(0, 5);
                    const avg = top5.length ? top5.reduce((a, b) => a + b, 0) / top5.length : 0;
                    return { sitePrice: avg };
                } else {
                    return { sitePrice: 0 };
                }
            }, item.source);


            item.sitePrice = result.sitePrice;
            console.log(item.buyPrice)
            console.log(`✅ ${item.name} - Ortalama Site Fiyatı: ${item.sitePrice} TL`);
        } catch (e) {
            console.log(`❌ ${item.name} için fiyat alınamadı:`, e.message);
        }

        count++
        await new Promise(r => setTimeout(r, 3000));
    }

    await browser.close();
    return items;
}

// ANORMALLİK KONTROLÜ
function findAnomalies(items) {
    return items.filter(item => {
        const diff = item.sitePrice > 0 ? ((item.buyPrice - item.sitePrice) / item.sitePrice) * 100 : 0;
        return item.stockQuantity > 0 && !(diff < 0 && diff > -1);
    }).map(item => ({
        name: item.name,
        myPrice: item.buyPrice,
        sitePrice: item.sitePrice,
        percentageDifference: (((item.buyPrice - item.sitePrice) / item.sitePrice) * 100).toFixed(2),
        link: item.link,
        storageName: item.storageName,
        colorName: item.colorName,
        stockQuantity: item.stockQuantity,
        source: item.source
    }));
}

// VERİLERİ BİRLEŞTİRME VE EXCEL OLUŞTURMA
function mergeProductsAndCreateExcel(items) {
    console.log("🔍 Excel için gelen ürün listesi:", items);
    const mergedData = {};

    items.forEach(item => {
        const key = `${item.name}_${item.storageName}_${item.colorName}`;
        console.log("itemfiyat:" , item.buyPrice)
        if (!mergedData[key]) {
            mergedData[key] = {
                "Ürün İsmi": item.name,
                "Depolama": item.storageName,
                "Renk": item.colorName,
                "Kaynak": item.source,
                "Bizim Fiyatımız (TL)": item.buyPrice || 0,
                "Cimri Site Fiyatı (TL)": item.source === "cimri" ? item.sitePrice : "",
                "Akakçe Site Fiyatı (TL)": item.source === "akakce" ? item.sitePrice : "",
                "Cimri Fark (%)": item.source === "cimri" && item.sitePrice > 0 ? (((item.buyPrice - item.sitePrice) / item.sitePrice) * 100).toFixed(2) : "",
                "Akakçe Fark (%)": item.source === "akakce" && item.sitePrice > 0 ? (((item.buyPrice - item.sitePrice) / item.sitePrice) * 100).toFixed(2) : "",
                "Akakçe Link": item.source === "akakce" ? item.link : "",
                "Cimri Link": item.source === "cimri" ? item.link : "",
                "Cimri Stok Miktarı": item.source === "cimri" ? item.stockQuantity : "",
                "Akakçe Stok Miktarı": item.source === "akakce" ? item.stockQuantity : ""
            };
        } else {
            mergedData[key]["Kaynak"] = mergedData[key]["Kaynak"].includes(item.source) ? mergedData[key]["Kaynak"] : "Cimri, Akakçe";
            
            if (item.source === "cimri") {
                mergedData[key]["Cimri Site Fiyatı (TL)"] = item.sitePrice;
                mergedData[key]["Cimri Fark (%)"] = item.sitePrice > 0 ? (((item.buyPrice - item.sitePrice) / item.sitePrice) * 100).toFixed(2) : "";
                mergedData[key]["Cimri Link"] = item.link;
                mergedData[key]["Cimri Stok Miktarı"] = item.stockQuantity;
            } else if (item.source === "akakce") {
                mergedData[key]["Akakçe Site Fiyatı (TL)"] = item.sitePrice;
                mergedData[key]["Akakçe Fark (%)"] = item.sitePrice > 0 ? (((item.buyPrice - item.sitePrice) / item.sitePrice) * 100).toFixed(2) : "";
                mergedData[key]["Akakçe Link"] = item.link;
                mergedData[key]["Akakçe Stok Miktarı"] = item.stockQuantity;
            }
        }
    });

    console.log("✅ Excel için işlenen veri seti:", mergedData);
    const formattedData = Object.values(mergedData);
    const worksheet = xlsx.utils.json_to_sheet(formattedData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "MergedProducts");
    const filePath = "merged_products.xlsx";
    xlsx.writeFile(workbook, filePath);
    return filePath;
}


// MAİL GÖNDER
async function sendEmail(subject, message, attachmentPath) {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: "networksnotification@gmail.com",
            pass: "gwqf ifoi comc wpvc"
        }
    });

    const mailOptions = {
        from: "networksnotification@gmail.com",
        to: "mfatihgumus@networksbilisim.com",
        subject: subject,
        text: message,
        attachments: [
            {
                filename: "anomalies_combined.xlsx",
                path: attachmentPath
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("📩 E-posta başarıyla gönderildi!");
    } catch (error) {
        console.error("E-posta gönderimi sırasında hata:", error);
    }
}

// ANA FONKSİYON
(async () => {
    const akakceItems = await fetchAkakceProducts();
    const cimriItems = await fetchCimriProducts();

    const allItems = [...cimriItems, ...akakceItems];
    
    const scrapedItems = await scrapePrices(allItems);

    const filePath = mergeProductsAndCreateExcel(scrapedItems);
    await sendEmail("Fiyat Anormallik Raporu", "Aşağıdaki ürünlerde fiyat farkı tespit edildi.", filePath);

    
})();
