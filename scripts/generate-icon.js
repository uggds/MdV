const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const size = 1024;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext("2d");

// Rounded rectangle background with gradient
const radius = 200;
const gradient = ctx.createLinearGradient(0, 0, size, size);
gradient.addColorStop(0, "#3B82F6");
gradient.addColorStop(1, "#1D4ED8");

ctx.beginPath();
ctx.moveTo(radius, 0);
ctx.lineTo(size - radius, 0);
ctx.arcTo(size, 0, size, radius, radius);
ctx.lineTo(size, size - radius);
ctx.arcTo(size, size, size - radius, size, radius);
ctx.lineTo(radius, size);
ctx.arcTo(0, size, 0, size - radius, radius);
ctx.lineTo(0, radius);
ctx.arcTo(0, 0, radius, 0, radius);
ctx.closePath();
ctx.fillStyle = gradient;
ctx.fill();

// MdV text
ctx.fillStyle = "#FFFFFF";
ctx.font = "bold 340px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("MdV", size / 2, size / 2 + 20);

// Save 1024px PNG
const outDir = path.join(__dirname, "..");
const buf = canvas.toBuffer("image/png");
fs.writeFileSync(path.join(outDir, "icon_1024.png"), buf);
console.log("icon_1024.png created");

// Generate iconset sizes
const iconsetDir = path.join(outDir, "icon.iconset");
if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir);

const sizes = [16, 32, 64, 128, 256, 512];
for (const s of sizes) {
  for (const scale of [1, 2]) {
    const px = s * scale;
    const c = createCanvas(px, px);
    const cx = c.getContext("2d");
    cx.drawImage(canvas, 0, 0, px, px);
    const suffix = scale === 1 ? "" : "@2x";
    const name = `icon_${s}x${s}${suffix}.png`;
    fs.writeFileSync(path.join(iconsetDir, name), c.toBuffer("image/png"));
  }
}
console.log("iconset created");
