// Run once with: npx tsx scripts/seed-env-days.ts
// Requires firebase-admin and Firebase service account credentials

import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import * as fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('./service-account.json', 'utf-8')
);

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://commscalv2-default-rtdb.firebaseio.com',
});

const db = getDatabase();

const now = new Date().toLocaleString('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
}).replace(',', '');

const SYSTEM_EMAIL = 'system@seed';

const days = [
  // International
  { name: 'World Wetlands Day', month: 2, day: 2, category: 'International', description: 'Raises awareness about the value of wetlands for humanity and the planet.' },
  { name: 'World Wildlife Day', month: 3, day: 3, category: 'International', description: 'Celebrates and raises awareness of the world\'s wild fauna and flora.' },
  { name: 'International Day of Forests', month: 3, day: 21, category: 'International', description: 'Celebrates the importance of all types of forests.' },
  { name: 'World Water Day', month: 3, day: 22, category: 'International', description: 'Focuses on the importance of freshwater and sustainable management of water resources.' },
  { name: 'World Meteorological Day', month: 3, day: 23, category: 'International', description: 'Commemorates the entry into force of the WMO Convention.' },
  { name: 'Earth Day', month: 4, day: 22, category: 'International', description: 'Demonstrates support for environmental protection.' },
  { name: 'World Bee Day', month: 5, day: 20, category: 'International', description: 'Raises awareness of the importance of pollinators.' },
  { name: 'International Day for Biological Diversity', month: 5, day: 22, category: 'International', description: 'Promotes understanding of biodiversity issues.' },
  { name: 'World Environment Day', month: 6, day: 5, category: 'International', description: 'The UN\'s principal day for encouraging worldwide awareness and action for the environment.' },
  { name: 'World Oceans Day', month: 6, day: 8, category: 'International', description: 'Celebrates the ocean and raises awareness of its importance.' },
  { name: 'World Rainforest Day', month: 6, day: 22, category: 'International', description: 'Recognizes the critical role of rainforests in Earth\'s climate.' },
  { name: 'World Ozone Day', month: 9, day: 16, category: 'International', description: 'International Day for the Preservation of the Ozone Layer.' },
  { name: 'World Rivers Day', month: 9, day: 28, category: 'International', description: 'Celebrates the world\'s waterways and raises awareness of their value.' },
  { name: 'World Habitat Day', month: 10, day: 7, category: 'International', description: 'Reflects on the state of human habitats and the right to adequate shelter.' },
  { name: 'International Day of Climate Action', month: 10, day: 24, category: 'International', description: 'A global day of climate action.' },
  { name: 'World Soil Day', month: 12, day: 5, category: 'International', description: 'Focuses attention on the importance of healthy soil.' },

  // India
  { name: 'Vanamahotsav (Start)', month: 7, day: 1, category: 'India', description: 'Annual tree-planting festival in India, celebrated in the first week of July.' },
  { name: 'National Wildlife Week (Start)', month: 10, day: 2, category: 'India', description: 'Observed to preserve the fauna and animal life of India.' },
  { name: 'National Pollution Prevention Day', month: 12, day: 2, category: 'India', description: 'Observed in memory of those who lost their lives in the Bhopal gas tragedy.' },
  { name: 'National Energy Conservation Day', month: 12, day: 14, category: 'India', description: 'Highlights the significance of energy conservation.' },

  // Species / Conservation
  { name: 'World Sparrow Day', month: 3, day: 20, category: 'Species', description: 'Raises awareness of the house sparrow and other common birds.' },
  { name: 'International Day of the Seal', month: 3, day: 22, category: 'Species', description: 'Raises awareness about seals and their conservation.' },
  { name: 'World Turtle Day', month: 5, day: 23, category: 'Species', description: 'Celebrates and protects turtles and tortoises.' },
  { name: 'Global Tiger Day', month: 7, day: 29, category: 'Species', description: 'Raises awareness about tiger conservation.' },
  { name: 'World Lion Day', month: 8, day: 10, category: 'Species', description: 'Raises awareness for lion conservation.' },
  { name: 'International Elephant Day', month: 8, day: 12, category: 'Species', description: 'Draws attention to the plight of Asian and African elephants.' },
  { name: 'World Rhino Day', month: 9, day: 22, category: 'Species', description: 'Celebrates all five species of rhinoceros.' },
];

async function seed() {
  const ref = db.ref('/envDays');
  const existing = await ref.once('value');
  if (existing.exists()) {
    console.log('envDays already has entries. Aborting to avoid duplicates.');
    console.log('If you want to re-seed, delete /envDays in Firebase Console first.');
    return;
  }

  for (const d of days) {
    await ref.push({
      ...d,
      createdBy: SYSTEM_EMAIL,
      createdAt: now,
      editedBy: '',
      editedAt: '',
    });
    console.log(`Seeded: ${d.name}`);
  }
  console.log(`\nDone. Seeded ${days.length} environmental days.`);
}

seed().catch(console.error);
