const fs = require("fs");
const pdf = require("pdf-parse");

// PDF dosyasını işleyen fonksiyon
async function processPdf(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath); // PDF dosyasını oku
        const pdfData = await pdf(dataBuffer);       // PDF içeriğini al
        const lines = pdfData.text.split("\n");      // Satır bazlı böl

        const items = {};
        const colors = [
            "Kırmızı", "Mor", "Beyaz", "Siyah", "Lacivert",
            "Gümüş", "Pembe", "Açık Mavi", "Krem", "Gri", "Titanyum", "Çöl"
        ]; // Tanımlı renkler

        lines
            .filter(line => line.includes("₺")) // ₺ sembolü içermeyen satırları atla
            .forEach(line => {
                const priceMatch = line.match(/([\d.,]+)₺$/); // Fiyat ve ₺ sembolünü bul
                if (priceMatch) {
                    const price = parseFloat(priceMatch[1].replace(".", "").replace(",", ".")); // Fiyatı float yap
                    let product = line.replace(priceMatch[0], "").replace(/\s+/g, " ").trim(); // Ürün kısmını temizle

                    // Eğer virgül varsa renkleri ayır
                    if (product.includes(",")) {
                        const parts = product.split(",").map(p => p.trim()); // Virgülden ayır ve trimle
                        const baseProduct = parts.shift(); // İlk kısım (ana ürün ve ilk renk)
                        const firstColor = colors.find(color => baseProduct.includes(color)); // İlk renk bulunuyor

                        if (firstColor) {
                            const baseName = baseProduct.replace(firstColor, "").trim(); // Ana ürünü ilk renkten ayır
                            const allColors = [firstColor, ...parts]; // Tüm renkleri birleştir

                            // Tüm renkleri ayrı ayrı ekle
                            allColors.forEach(color => {
                                items[`${baseName} ${color.trim()}`] = price;
                            });
                        }
                    } else {
                        items[product] = price; // Virgül yoksa olduğu gibi ekle
                    }
                }
            });

        console.log("\nOluşturulan Sözlük:");
        console.log(items);

        return items; // Sözlüğü döndür
    } catch (error) {
        console.error("PDF işleme sırasında bir hata oluştu:", error);
    }
}

// Örnek kullanım
const pdfPath = "./Networks Bilişim - Fiyat Listesi - 21012025.pdf";
processPdf(pdfPath);

