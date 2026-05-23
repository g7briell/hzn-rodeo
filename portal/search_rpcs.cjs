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
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(query)) {
        console.log(`Found '${query}' in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(query)) {
            console.log(`  Line ${idx+1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

const basePath = 'c:\\Users\\Admin\\OneDrive\\Área de Trabalho\\RODEOAPP\\HZN_System';
searchDir(basePath, '.rpc(');
searchDir(basePath, '.rpc("');
