//const axios = require('axios');
//const cheerio = require('cheerio');
//axios
 //   .get('https://www.akakce.com', {
 //       headers: {
 //           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0'
 //       }
 //   })
 //   .then((response) => {
 //       console.log(response.data);
 //   })
 //   .catch((error) => {
 //       console.log('Error Fetching data: ', error);
 //   }); 
    //puppeteer kullanılmış hali
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: false }); // Gerekirse headless: false yapabilirsiniz.
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'tr',
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0');
    //benim user agentim yukardaki sonra düzeltebilirsin
    await page.goto('https://www.akakce.com/', { waitUntil: 'networkidle2' });
    

    console.log(await page.content()); // Sayfa HTML çıktısını görüyoruz ilerde kapayabilirsin
    await browser.close();
})();
