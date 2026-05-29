const fs = require('fs');

const fixMixedEncoding = (filePath) => {
    let text = fs.readFileSync(filePath, 'utf8');
    text = text.replace(/Ã[\x80-\xFF]/g, match => Buffer.from(match, 'latin1').toString('utf8'));
    fs.writeFileSync(filePath, text, 'utf8');
};

fixMixedEncoding('client_app/index.html');
fixMixedEncoding('client_app/renderer.js');
console.log('Fixed mixed encodings!');
