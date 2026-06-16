import { recalculateMatchPoints } from './src/lib/points-engine';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    console.log('Testing recalculateMatchPoints...');
    await recalculateMatchPoints(1);
    console.log('Success!');
  } catch (err: any) {
    console.error('Error:', err);
  }
}

main();
