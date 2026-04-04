const { MongoClient } = require('mongodb');

// 1. ระบุลิงก์ต้นทาง (ฐานข้อมูลในเครื่อง)
const localUri = 'mongodb://localhost:27017';

// 2. ระบุลิงก์ปลายทาง (MongoDB Atlas) 
const atlasUri = 'mongodb+srv://eqsciencecourse_db_user:eqscience@cluster0.abfo7ot.mongodb.net/school-management?authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function migrateData() {
    let localClient, atlasClient;
    try {
        console.log("🔄 กำลังเชื่อมต่อฐานข้อมูลในเครื่อง (Local)...");
        localClient = new MongoClient(localUri);
        await localClient.connect();
        const localDb = localClient.db('school-management');

        console.log("☁️ กำลังเชื่อมต่อคลาวด์ (Atlas)...");
        atlasClient = new MongoClient(atlasUri);
        await atlasClient.connect();
        const atlasDb = atlasClient.db('school-management');

        const collections = await localDb.listCollections().toArray();
        console.log(`\n📦 พบตารางทั้งหมด ${collections.length} ตาราง กำลังเริ่มโอนย้าย...\n`);

        for (let c of collections) {
            const collectionName = c.name;
            const docs = await localDb.collection(collectionName).find({}).toArray();

            if (docs.length > 0) {
                // ลบของเก่าในคลาวด์(ถ้ามี) เพื่อกันข้อมูลซ้ำ
                await atlasDb.collection(collectionName).deleteMany({});
                // โอนเข้าคลาวด์
                await atlasDb.collection(collectionName).insertMany(docs);
                console.log(`✅ โอนย้าย [${collectionName}]: สำเร็จ ${docs.length} รายการ`);
            } else {
                console.log(`⏭️ ข้าม [${collectionName}]: ไม่มีข้อมูลในตารางนี้`);
            }
        }

        console.log("\n🥳🎉 โอนย้ายข้อมูลทั้งหมดเสร็จสมบูรณ์ 100%!");
    } catch (err) {
        console.error("\n❌ เกิดข้อผิดพลาด:", err);
    } finally {
        if (localClient) await localClient.close();
        if (atlasClient) await atlasClient.close();
    }
}

migrateData();
