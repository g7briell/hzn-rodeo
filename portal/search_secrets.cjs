const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        searchDir(fullPath, query);
      }
    } else if (stat.isFile() && (file.endsWith('.local') || file.endsWith('.env') || file.endsWith('.json') || file.endsWith('.ts') || file.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found query '${query}' in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            console.log(`  Line ${idx+1}: ${line.trim().substring(0, 150)}`);
          }
        });
      }
    }
  }
}

const basePath = 'c:\\Users\\Admin\\OneDrive\\Área de Trabalho\\RODEOAPP\\HZN_System';
searchDir(basePath, 'postgres:');
searchDir(basePath, 'postgresql');
searchDir(basePath, 'supabase.co:5432');
searchDir(basePath, 'database_url');
