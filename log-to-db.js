const { MongoClient } = require('mongodb');
const fs = require('fs');

// Playwright'ın oluşturduğu JSON raporu okuyoruz
if (!fs.existsSync('main-report.json')) {
  console.error("Hata: main-report.json dosyası bulunamadı!");
  process.exit(1);
}

const rawData = fs.readFileSync('main-report.json');
const testData = JSON.parse(rawData);

// GitHub Actions secret'tan gelecek veri tabanı linki
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

    // Grafana için anlamlı metrik formatı hazırlıyoruz
    const summary = {
      timestamp: new Date(),
      total_tests: testData.stats.expected + testData.stats.unexpected + testData.stats.skipped,
      passed: testData.stats.expected,
      failed: testData.stats.unexpected,
      duration_ms: testData.stats.duration,
      pass_rate: testData.stats.expected + testData.stats.unexpected > 0 
        ? (testData.stats.expected / (testData.stats.expected + testData.stats.unexpected)) * 100 
        : 0
    };

    const result = await metrics.insertOne(summary);
    console.log(`Metrikler başarıyla MongoDB're yazıldı. Kayıt ID: ${result.insertedId}`);
  } catch (error) {
    console.error("Veri tabanına yazarken hata oluştu:", error);
  } finally {
    await client.close();
  }
}
run();