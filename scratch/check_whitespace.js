const fs = require('fs');
const lines = fs.readFileSync('client_app/renderer.js', 'utf8').split('\n');
for (let i = 2640; i <= 2655; i++) {
    console.log(i + ': ' + JSON.stringify(lines[i - 1]));
}
