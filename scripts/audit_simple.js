
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27017/school-management';

console.log('Script started...');

async function run() {
    try {
        console.log('Connecting to:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        console.log('Got DB instance');

        const attendances = db.collection('attendances');
        const subjects = db.collection('subjects');

        // 1. List Subjects
        console.log('\n--- SUBJECTS ---');
        const allSubjects = await subjects.find({}).toArray();
        console.log(`Found ${allSubjects.length} subjects`);

        allSubjects.forEach(s => {
            console.log(`ID: ${s._id} | Name: ${s.name}`);
        });

        // 2. List Attendance
        console.log('\n--- ATTENDANCE ---');
        const allAttendance = await attendances.find({}).toArray();
        console.log(`Found ${allAttendance.length} attendance records`);

        if (allAttendance.length === 0) console.log('NO ATTENDANCE RECORDS FOUND.');

        allAttendance.forEach(a => {
            console.log(`Record ID: ${a._id}`);
            console.log(`  Date: ${a.date}`);
            console.log(`  SubjectId: ${a.subjectId} (Type: ${typeof a.subjectId})`);
            console.log(`  SubjectName: ${a.subjectName}`);
        });

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        if (mongoose.connection) {
            await mongoose.disconnect();
            console.log('Disconnected');
        }
    }
}

run();
