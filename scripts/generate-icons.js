const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateIcons() {
    const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
    const svgBuffer = await fs.readFile(path.join(__dirname, '../build/icon.svg'));
    
    // Ensure the build directory exists
    await fs.mkdir(path.join(__dirname, '../build'), { recursive: true });
    
    // Generate PNG files
    for (const size of sizes) {
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(path.join(__dirname, `../build/icon-${size}.png`));
    }
    
    // Generate ICO file containing multiple sizes
    const inputFiles = sizes.map(size => ({
        input: path.join(__dirname, `../build/icon-${size}.png`),
        size: size
    }));
    
    // Use the largest size for favicon.ico
    await sharp(svgBuffer)
        .resize(256, 256)
        .png()
        .toFile(path.join(__dirname, '../build/icon.ico'));
}

generateIcons().catch(console.error); 