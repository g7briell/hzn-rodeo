const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

async function resizeImage() {
    try {
        const sourceFile = path.join(__dirname, 'assets', 'app_icon.png');
        const outputFile = path.join(__dirname, 'build', 'icon.png');
        console.log('Reading high-res image...', sourceFile);
        
        const image = await Jimp.read(sourceFile);
        
        // Resize to 512x512 for macOS compatibility
        image.resize(512, 512);
        
        // Save the output
        await image.writeAsync(outputFile);
        
        console.log('Successfully generated 512x512 icon.png at ' + outputFile);
    } catch (e) {
        console.error('Error:', e);
    }
}

resizeImage();
