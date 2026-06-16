import { importFixtures } from './src/lib/sync-matches';

async function run() {
  try {
    const res = await importFixtures();
    console.log("Import Result:", res);
  } catch (err) {
    console.error("Import failed:", err);
  }
}

run();
