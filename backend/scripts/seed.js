const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { connectDB, disconnectDB } = require('../config/db');
const { seedDemoData } = require('../services/seedService');

const run = async () => {
  const force = process.argv.includes('--force');

  try {
    await connectDB();
    const result = await seedDemoData({ force });

    if (result.skipped) {
      console.log(`[seed] ${result.message}`);
      console.log('[seed] Run "npm run seed -- --force" to reset and reseed demo data.');
    } else {
      console.log('[seed] Demo accounts:');
      console.log('  Patient: patient@medicare.ai / Patient@123');
      console.log('  Doctor:  dr.arjun@medicare.ai / Doctor@123');
      console.log('  Admin:   admin@medicare.ai / Admin@123');
      console.log('[seed] Seeded:', result.counts);
    }
  } catch (error) {
    console.error('[seed] Failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

run();
