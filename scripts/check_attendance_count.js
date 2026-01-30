const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://localhost:27017/school-management';

const AttendanceSchema = new mongoose.Schema({
    students: Array
}, { strict: false });
const Attendance = mongoose.model('Attendance', AttendanceSchema);

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const count = await Attendance.countDocuments();
        console.log(`Total Attendance Docs: ${count}`);

        // Check for any docs with students
        const sample = await Attendance.findOne({ 'students.0': { $exists: true } });
        if (sample) console.log('Sample found with students:', sample.students.length);
        else console.log('No attendance record with students found');

    } catch (e) { console.error(e); }
    finally { await mongoose.disconnect(); }
}
check();
