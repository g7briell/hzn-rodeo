const fs = require('fs');
const file = '../client_app/renderer.js';

if (!fs.existsSync(file)) {
  console.log('Renderer.js not found at ', file);
  process.exit(1);
}

const content = fs.readFileSync(file, 'utf8');
const searchWord = 'openCloudBoiadas';
const lines = content.split('\n');

console.log('Searching for:', searchWord);
lines.forEach((line, idx) => {
  if (line.includes(searchWord) || line.includes('cloud-boiadas-list')) {
    console.log(`Line ${idx + 1}: ${line.trim().substring(0, 150)}`);
  }
});

console.log('\nSearching for supabase calls or table names like boiadas:');
const keywords = ['from(\'', 'from("'];
lines.forEach((line, idx) => {
  keywords.forEach(kw => {
    if (line.includes(kw)) {
      console.log(`Line ${idx + 1}: ${line.trim().substring(0, 150)}`);
    }
  });
});
