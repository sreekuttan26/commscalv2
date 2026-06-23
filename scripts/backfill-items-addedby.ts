// Run once with: npx tsx scripts/backfill-items-addedby.ts
// Requires firebase-admin and Firebase service account credentials

import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import * as fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('./service-account.json', 'utf-8')
);

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://YOUR-PROJECT-default-rtdb.firebaseio.com', // replace with actual RTDB URL
});

const db = getDatabase();

async function backfill() {
  const snap = await db.ref('/items').once('value');
  const items = snap.val();
  if (!items) {
    console.log('No items found.');
    return;
  }

  const updates: Record<string, any> = {};
  let count = 0;
  let skipped = 0;

  for (const [key, item] of Object.entries<any>(items)) {
    if (item.addedBy !== undefined && item.addedAt !== undefined) {
      skipped++;
      continue;
    }
    if (item.addedBy === undefined) updates[`${key}/addedBy`] = "";
    if (item.addedAt === undefined) updates[`${key}/addedAt`] = null;
    count++;
    console.log(`Backfilling ${key}`);
  }

  if (count > 0) {
    await db.ref('/items').update(updates);
  }
  console.log(`\nDone. Backfilled: ${count}, Skipped (already had fields): ${skipped}`);
}

backfill().catch(console.error);
