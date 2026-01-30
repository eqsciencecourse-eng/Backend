import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env file');
    process.exit(1);
}

const userSchema = new mongoose.Schema({
    email: String,
    role: String,
});

const User = mongoose.model('User', userSchema);

async function setAdmin(email: string) {
    try {
        await mongoose.connect(MONGODB_URI as string);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email });
        if (!user) {
            console.error(`User with email ${email} not found`);
            process.exit(1);
        }

        user.role = 'admin';
        await user.save();
        console.log(`Successfully set ${email} as admin`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Please provide an email address as an argument');
    console.log('Usage: npx ts-node scripts/set-admin.ts <email>');
    process.exit(1);
}

setAdmin(email);
