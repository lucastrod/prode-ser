import 'dotenv/config';
import db from './src/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function test() {
  try {
    console.log('Testing user registration database insert...');
    const email = `test-${Date.now()}@prodeser.com`;
    const passwordHash = await bcrypt.hash('password123', 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const userId = crypto.randomUUID();

    const user = await db.user.create({
      data: {
        id: userId,
        name: 'Test User',
        email,
        passwordHash,
        role: 'USER',
        active: false,
        emailVerified: false,
        verificationToken,
        standing: {
          create: {
            totalPoints: 0,
            exactScores: 0,
            correctOutcomes: 0,
          }
        }
      }
    });

    console.log('✅ Success! User created:', user.email);
  } catch (error) {
    console.error('❌ Error during user creation:', error);
  } finally {
    await db.$disconnect();
  }
}

test();
