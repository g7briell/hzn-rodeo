const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

async function resizeImage() {
    try {
        // Read the heavy icon they provided
        const sourceFile = path.join(__dirname, 'build', 'icon.png');
        console.log('Reading image...', sourceFile);
        
        const image = await Jimp.read(sourceFile);
        
        // Resize to 256x256 max
        image.scaleToFit(256, 256);
        
        // Overwrite the file with the compressed version
        await image.writeAsync(sourceFile);
        
        console.log('Successfully compressed icon.png!');
    } catch (e) {
        console.error('Error:', e);
    }
}

resizeImage();
