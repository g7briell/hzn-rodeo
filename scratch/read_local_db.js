const fs = require('fs');
const path = require('path');
const os = require('os');

function findLocalDBs() {
    const roaming = path.join(os.homedir(), 'AppData', 'Roaming');
    
    // Search for any directory containing "rodeo" or "hzn" in AppData/Roaming
    const dirs = fs.readdirSync(roaming).filter(d => d.toLowerCase().includes('rodeo') || d.toLowerCase().includes('hzn'));
    
    console.log("Found AppData directories:", dirs);
    
    dirs.forEach(dir => {
        const dirPath = path.join(roaming, dir);
        try {
            const files = fs.readdirSync(dirPath).filter(f => f.startsWith('hzn_data') && f.endsWith('.json'));
            console.log(`\nFiles in ${dir}:`, files);
            
            files.forEach(file => {
                const filePath = path.join(dirPath, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const parsed = JSON.parse(content);
                console.log(`\n--- Content of ${file} ---`);
                parsed.eventos.forEach(ev => {
                    console.log(`Event ID: ${ev.id}`);
                    console.log(`Event Name: ${ev.name}`);
                    console.log(`Sorteios count: ${ev.sorteios ? ev.sorteios.length : 0}`);
                    if (ev.sorteios) {
                        ev.sorteios.forEach(s => {
                            console.log(`  Draw Day: ${s.day}, Date: ${s.date}, Riders count: ${s.riders.length}, Assignments type: ${Array.isArray(s.assignments) ? 'array' : typeof s.assignments}`);
                        });
                    }
                    console.log(`Notas count: ${ev.notas ? ev.notas.length : 0}`);
                });
            });
        } catch (e) {
            console.error(`Error reading ${dir}:`, e.message);
        }
    });
}

findLocalDBs();
