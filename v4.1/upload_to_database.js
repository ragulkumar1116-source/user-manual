/**
 * Database Upload & Sync Utility for Aadhav Intech Enterprise Portal
 * Usage: node upload_to_database.js [path_to_json_file] [optional_auth_token]
 */

const fs = require('fs');
const path = require('path');

const defaultPath = 'C:\\Users\\aitse\\Downloads\\aittest-9ec93-default-rtdb-export (1) - Copy.json';
const filePath = process.argv[2] || defaultPath;
const authToken = process.argv[3] || null;

console.log('='.repeat(70));
console.log('Aadhav Intech - Firebase Realtime Database Upload Utility');
console.log('='.repeat(70));

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found at ${filePath}`);
  process.exit(1);
}

let dbData;
try {
  const content = fs.readFileSync(filePath, 'utf8');
  dbData = JSON.parse(content);
} catch (e) {
  console.error(`Error parsing JSON file: ${e.message}`);
  process.exit(1);
}

console.log(`Loaded JSON: ${filePath} (${fs.statSync(filePath).size} bytes)`);
console.log('\nDataset Summary:');
console.log(`- documents:   ${dbData.documents ? Object.keys(dbData.documents).length : 0} items`);
console.log(`- instruments: ${dbData.instruments ? Object.keys(dbData.instruments).length : 0} items`);
console.log(`- registers:   ${dbData.registers ? Object.keys(dbData.registers).length : 0} instrument maps`);
console.log(`- settings:    ${dbData.settings ? dbData.settings.name || 'Present' : 'Not found'}`);
console.log(`- customers:   ${dbData.customers ? Object.keys(dbData.customers).length : 0} records`);

const dbUrl = "https://aittest-9ec93-default-rtdb.firebaseio.com";

async function uploadNode(nodeName, payload) {
  if (!payload) return;
  const url = `${dbUrl}/${nodeName}.json${authToken ? `?auth=${authToken}` : ''}`;
  console.log(`Uploading /${nodeName}...`);
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result && result.error) {
      console.warn(`Warning on /${nodeName}: ${result.error}`);
      return false;
    } else {
      console.log(`Successfully uploaded /${nodeName}`);
      return true;
    }
  } catch (err) {
    console.error(`Failed to upload /${nodeName}: ${err.message}`);
    return false;
  }
}

async function run() {
  console.log(`\nTarget Database: ${dbUrl}`);
  console.log('Attempting upload to Firebase...');

  let successCount = 0;
  const nodes = ['documents', 'instruments', 'registers', 'settings', 'customers'];
  for (const node of nodes) {
    if (dbData[node]) {
      const ok = await uploadNode(node, dbData[node]);
      if (ok) successCount++;
    }
  }

  if (successCount === 0) {
    console.log('\n[Notice] Direct REST write was blocked by Firebase security rules (Permission denied).');
    console.log('To upload this data to your database, you have two 100% reliable options:');
    console.log('\nOption 1 (Instant via Browser Portal):');
    console.log('1. Open Company Settings (settings.html) in your browser.');
    console.log('2. Click "Upload Full DB to Database" in the JSON Data Management card.');
    console.log(`3. Select "${filePath}".`);
    console.log('4. The browser portal writes the data directly using your authenticated session.');
    console.log('\nOption 2 (Directly in Firebase Console):');
    console.log('1. Go to https://console.firebase.google.com/project/aittest-9ec93/database');
    console.log('2. In Realtime Database, click the 3 vertical dots (⋮) in the top-right corner.');
    console.log('3. Click "Import JSON".');
    console.log(`4. Browse and select: "${filePath}".`);
    console.log('5. Click "Import". All documents, instruments, settings, registers, and customers will be live instantly!');
  } else {
    console.log(`\nUpload finished: ${successCount} collections updated successfully.`);
  }
}

run();
