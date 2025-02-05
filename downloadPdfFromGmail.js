const imaps = require('imap-simple');
const fs = require('fs');
const path = require('path');
const { simpleParser } = require('mailparser');

const config = {
    imap: {
        user: 'networksnotification@gmail.com', // Kendi Gmail adresin
        password: 'gwqf ifoi comc wpvc',   // Gmail uygulama şifren
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 3000,
        tlsOptions: { rejectUnauthorized: false } //  Bu satır eklendi! 
    }
};




async function downloadLatestPdf() {
    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX'); // Gelen kutusunu aç

        const searchCriteria = ['ALL'];
        const fetchOptions = { bodies: ['HEADER.FIELDS (DATE SUBJECT)'], struct: true };

        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length === 0) {
            console.log('Hiç e-posta bulunamadı.');
            return null;
        }

        const filteredMessages = messages.filter(msg => {
            let subject = msg.parts[0]?.body?.subject || '';
            if (Array.isArray(subject)) subject = subject.join(''); // Dizi ise birleştir
            subject = String(subject).trim().toLowerCase(); // Stringe çevir ve temizle
            return subject.includes('networks'); // "Networks" kelimesini kontrol et
        });

        if (filteredMessages.length === 0) {
            console.log('"Networks" kelimesini içeren hiçbir e-posta bulunamadı.');
            return null;
        }

        const sortedMessages = filteredMessages
    .map(msg => {
        const rawDate = msg.parts[0]?.body?.date || ''; // Tarih bilgisini al
        console.log(`Orijinal Date:`, rawDate);

        // Eğer date bir array ise, ilk elemanını al
        const dateString = Array.isArray(rawDate) ? rawDate[0] : rawDate;

        // Eğer date bir string ise ve boş değilse işleme al
        const date = typeof dateString === 'string' && dateString.trim() !== '' ? new Date(dateString.trim()) : new Date(0);
        console.log(`İşlenmiş Date:`, date);

        return {
            date, // İşlenmiş tarih
            msg
        };
    })
    .sort((a, b) => b.date - a.date); // En yeni e-postayı en üste koy

const latestMessage = sortedMessages[0].msg;
console.log(`Son e-posta tarihi: ${sortedMessages[0].date}`);

        const parts = imaps.getParts(latestMessage.attributes.struct);

        for (let part of parts) {
            console.log(`Ek Bilgisi:`, part);
        
            if (part.disposition && part.disposition.type.toLowerCase() === 'attachment') {
                const fileNameEncoded = part.params?.name || null; // Dosya adı kodlanmış halde
                console.log(`Kodlanmış Dosya Adı: ${fileNameEncoded}`);
        
                let fileName = fileNameEncoded ? decodeMimeWord(fileNameEncoded) : null; // Kod çözümü
                console.log(`Çözümlenmiş Dosya Adı: ${fileName}`);
        
                if (fileName) {
                    // Dosya adını güvenli hale getirme (yasaklı karakterleri değiştir)
                    fileName = fileName.replace(/[\\/:"*?<>|]/g, '_'); // Tüm yasaklı karakterleri "_" ile değiştir
                    console.log(`Güvenli Dosya Adı: ${fileName}`);
                }
        
                if (fileName && fileName.endsWith('.pdf')) {
                    console.log(`PDF bulundu: ${fileName}`);
                    const attachment = await connection.getPartData(latestMessage, part);
                    const filePath = path.join(__dirname, fileName);
        
                    fs.writeFileSync(filePath, attachment);
                    console.log(`PDF indirildi: ${filePath}`);
                    return filePath; // PDF bulunduktan sonra işlemi sonlandır
                }
            }
        }
        
        

        console.log('Son e-postada PDF eki bulunamadı.');
        return null;
    } catch (error) {
        console.error('Hata oluştu:', error);
        return null;
    }
}


function decodeMimeWord(encodedString) {
    if (!encodedString) return null; // Eğer string boşsa null döndür

    const regex = /=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi;
    const match = regex.exec(encodedString);

    if (!match) return encodedString; // Eğer MIME kodlama yoksa olduğu gibi döndür

    const charset = match[1]; // Karakter seti (ör. UTF-8)
    const encoding = match[2]; // Kodlama türü (B: Base64, Q: Quoted-Printable)
    const encodedText = match[3]; // Kodlanmış metin

    if (encoding.toUpperCase() === 'B') {
        // Base64 kod çözme
        return Buffer.from(encodedText, 'base64').toString(charset);
    } else if (encoding.toUpperCase() === 'Q') {
        // Quoted-Printable kod çözme
        return encodedText
            .replace(/_/g, ' ') // Alt çizgileri boşluklara çevir
            .replace(/=([A-Fa-f0-9]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
    }

    return encodedString; // Eğer başka bir durumsa olduğu gibi döndür
}



module.exports = { downloadLatestPdf };