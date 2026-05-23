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
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.json') || file.endsWith('.html') || file.endsWith('.css'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found query '${query}' in: ${fullPath}`);
        // Log surrounding lines
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            console.log(`  Line ${idx+1}: ${line.trim().substring(0, 120)}`);
          }
        });
      }
    }
  }
}

const basePath = 'c:\\Users\\Admin\\OneDrive\\Área de Trabalho\\RODEOAPP\\HZN_System';
console.log('Searching for boiadas related code in client_app and admin_panel...');
searchDir(path.join(basePath, 'client_app'), 'boiada');
searchDir(path.join(basePath, 'admin_panel'), 'boiada');
searchDir(path.join(basePath, 'admin_panel'), 'from(');
