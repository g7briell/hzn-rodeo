const fs = require('fs');
let content = fs.readFileSync('client_app/renderer.js', 'utf8');

// Normalize CRLF to LF
content = content.replace(/\r\n/g, '\n');

const target = `        if (sport === 'transmissao') {
            if (sportSelectScreen) sportSelectScreen.classList.add('hidden');
            if (transmissaoScreen) transmissaoScreen.classList.remove('hidden');
        }`;

const replacement = `        if (sport === 'transmissao') {
            if (sportSelectScreen) sportSelectScreen.classList.add('hidden');
            if (transmissaoScreen) {
                transmissaoScreen.classList.remove('hidden');
                transmissaoScreen.querySelectorAll('.reveal-item').forEach(item => item.classList.add('animate-reveal'));
            }
        }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('client_app/renderer.js', content, 'utf8');
    console.log("Success! Updated selectSport to reveal items in transmissaoScreen.");
} else {
    console.error("Target block in selectSport not found!");
}
