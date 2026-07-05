const { MongoClient } = require('mongodb');
const fs = require('fs');

if (!fs.existsSync('main-report.json')) {
  console.error("Hata: main-report.json dosyası bulunamadı!");
  process.exit(1);
}

const rawData = fs.readFileSync('main-report.json', 'utf8');

let testData;
try {
  testData = JSON.parse(rawData);
} catch (e) {
  console.error("Hata: main-report.json dosyası geçerli bir JSON değil! Dosya içeriği:");
  console.log(rawData.substring(0, 500));
  process.exit(1);
}

const uri = process.env.MONGODB_URI; 
if (!uri) {
  console.error("Hata: MONGODB_URI çevre değişkeni tanımlı değil!");
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const database = client.db('test_automation');
    const metrics = database.collection('metrics');

    // Eğer Playwright stats nesnesini oluşturamadıysa varsayılan değer atıyoruz
    const stats = testData.stats || { expected: 0, unexpected: 0, skipped: 0, duration: 0 };

    const summary = {
      timestamp: new Date(),
      total_tests: (stats.expected || 0) + (stats.unexpected || 0) + (stats.skipped || 0),
      passed: stats.expected || 0,
      failed: stats.unexpected || 0,
      duration_ms: stats.duration || 0,
      pass_rate: ((stats.expected || 0) + (stats.unexpected || 0)) > 0 
        ? ((stats.expected || 0) / ((stats.expected || 0) + (stats.unexpected || 0))) * 100 
        : 0
    };

    const result = await metrics.insertOne(summary);
    console.log(`Metrikler başarıyla MongoDB'ye yazıldı. Kayıt ID: ${result.insertedId}`);
  } catch (error) {
    console.error("Veri tabanına yazarken hata oluştu:", error);
  } finally {
    await client.close();
  }
}
run();