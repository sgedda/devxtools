import sharp from 'sharp';
import { join } from 'path';

const sizes = [16, 32, 192, 512];
const appleSize = 180;

async function generateFavicons() {
  const sourcePath = join(process.cwd(), 'public', 'favicon-temp.png');
  
  console.log('Generating favicon PNGs...');
  
  for (const size of sizes) {
    const outputPath = join(process.cwd(), 'public', `favicon-${size}.png`);
    await sharp(sourcePath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated ${size}x${size} favicon`);
  }
  
  const applePath = join(process.cwd(), 'public', 'apple-touch-icon.png');
  await sharp(sourcePath)
    .resize(appleSize, appleSize)
    .png()
    .toFile(applePath);
  console.log(`✓ Generated ${appleSize}x${appleSize} apple-touch-icon`);
  
  console.log('Done!');
}

generateFavicons().catch(console.error);
