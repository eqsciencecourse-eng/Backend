const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Config
const MONGODB_URI = 'mongodb://localhost:27017/school-management';
const JWT_SECRET = 'change-this-secret';

async function main() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        const roles = ['admin', 'teacher', 'student'];

        for (const role of roles) {
            const user = await usersCollection.findOne({ role: role });
            if (user) {
                const token = jwt.sign(
                    { sub: user._id.toString(), email: user.email, role: user.role },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );
                console.log(`\n=== FOUND ${role.toUpperCase()} ===`);
                console.log(`Email: ${user.email}`);
                console.log(`Token:`);
                console.log(token);
            } else {
                console.log(`\n!!! NO USER FOUND WITH ROLE: ${role} !!!`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

main();
