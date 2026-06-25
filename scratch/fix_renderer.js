const fs = require('fs');
let content = fs.readFileSync('client_app/renderer.js', 'utf8');

// target block to remove
const target = `        previewImg.classList.add('hidden');\r\n        document.getElementById('logo-preview-container').classList.remove('hidden');\r\n        renderEvents();\r\n    }\r\n}`;

if (content.includes(target)) {
    content = content.replace(target, '');
    fs.writeFileSync('client_app/renderer.js', content, 'utf8');
    console.log('Success! Removed duplicate remnants.');
} else {
    // try with LF line endings just in case
    const targetLF = `        previewImg.classList.add('hidden');\n        document.getElementById('logo-preview-container').classList.remove('hidden');\n        renderEvents();\n    }\n}`;
    if (content.includes(targetLF)) {
        content = content.replace(targetLF, '');
        fs.writeFileSync('client_app/renderer.js', content, 'utf8');
        console.log('Success! Removed duplicate remnants (LF).');
    } else {
        console.log('Target not found!');
    }
}
