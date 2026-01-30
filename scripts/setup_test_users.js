const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Config
const MONGODB_URI = 'mongodb://localhost:27017/school-management';
const JWT_SECRET = 'change-this-secret';

async function main() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        const passwordHash = await bcrypt.hash('password123', 12);

        const users = [
            {
                username: 'admin_test',
                email: 'admin_test@example.com',
                role: 'admin',
                displayName: 'Admin Test',
                passwordHash: passwordHash,
                firebaseUid: 'test-admin-uid'
            },
            {
                username: 'teacher_test',
                email: 'teacher_test@example.com',
                role: 'teacher',
                displayName: 'Teacher Test',
                passwordHash: passwordHash,
                isApproved: true,
                teacherRequest: { status: 'approved', fullName: 'Teacher Test' },
                firebaseUid: 'test-teacher-uid'
            },
            {
                username: 'student_test',
                email: 'student_test@example.com',
                role: 'student',
                displayName: 'Student Test',
                passwordHash: passwordHash,
                firebaseUid: 'test-student-uid'
            }
        ];

        for (const u of users) {
            const existing = await usersCollection.findOne({ username: u.username });
            let userId;
            if (existing) {
                console.log(`Updating ${u.username}...`);
                await usersCollection.updateOne({ _id: existing._id }, { $set: u });
                userId = existing._id;
            } else {
                console.log(`Creating ${u.username}...`);
                // Ensure defaults
                const defaults = {
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    enrolledSubjects: [],
                    studyTimes: [],
                    registeredCourses: []
                };
                const res = await usersCollection.insertOne({ ...defaults, ...u });
                userId = res.insertedId;
            }

            // Generate Token
            const token = jwt.sign(
                { sub: userId.toString(), email: u.email, role: u.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            console.log(`\n=== ROLE: ${u.role.toUpperCase()} ===`);
            console.log(`Username: ${u.username}`);
            console.log(`Password: password123`);
            console.log(`Token:`);
            console.log(token);
        }

        console.log('\n-----------------------------------');
        console.log('Copy the tokens above and use them to set "eq_access_token" in localStorage to bypass login.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

main();
