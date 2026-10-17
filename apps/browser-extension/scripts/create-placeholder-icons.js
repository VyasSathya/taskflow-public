/**
 * Create placeholder PNG icons for testing
 * Run with: node scripts/create-placeholder-icons.js
 */

const fs = require('fs');
const path = require('path');

// Simple 1-pixel purple PNG repeated to create icon
// This creates a valid but simple PNG for testing purposes

function createSimplePNG(size) {
  // PNG header + minimal IHDR + IDAT + IEND for a purple square
  // This is a programmatically generated PNG
  
  const png = Buffer.alloc(67 + size * size * 4);
  let offset = 0;
  
  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  signature.copy(png, offset);
  offset += 8;
  
  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // Length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(size, 8); // Width
  ihdr.writeUInt32BE(size, 12); // Height
  ihdr.writeUInt8(8, 16); // Bit depth
  ihdr.writeUInt8(6, 17); // Color type (RGBA)
  ihdr.writeUInt8(0, 18); // Compression
  ihdr.writeUInt8(0, 19); // Filter
  ihdr.writeUInt8(0, 20); // Interlace
  
  // Calculate CRC for IHDR (simplified - using placeholder)
  ihdr.writeUInt32BE(0x6C6C6C6C, 21);
  ihdr.copy(png, offset);
  offset += 25;
  
  // For simplicity, we'll create a minimal valid PNG structure
  // Real implementation would need proper zlib compression
  
  return png.slice(0, offset);
}

// Instead of complex PNG generation, let's use a known working tiny PNG
// This is a 1x1 purple pixel PNG that can be used as a placeholder
const tinyPurplePNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
  0x0D, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0x98, 0x99, 0xE5, 0xF9,
  0xFF, 0x0F, 0x00, 0x05, 0x64, 0x02, 0x34, 0x8B, 0x73, 0xE7, 0x14, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);

const iconsDir = path.join(__dirname, '..', 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// For testing, we'll copy the tiny PNG as placeholder
// In production, use proper sized icons
const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(iconPath, tinyPurplePNG);
  console.log(`Created placeholder: ${iconPath}`);
});

console.log(`
NOTE: These are 1x1 pixel placeholder icons for testing.
For production, replace with properly sized icons:
- Use the SVG at icons/icon.svg
- Convert to PNG at sizes: 16, 32, 48, 128
`);
