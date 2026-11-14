/* eslint-disable @typescript-eslint/no-require-imports */
// Genera los PNG del ícono a partir de public/icons/icon.svg (requiere Playwright).
const { chromium } = require("playwright");
const { readFileSync } = require("node:fs");
const path = require("node:path");

(async () => {
  const dir = path.join(__dirname, "..", "public", "icons");
  const svg = readFileSync(path.join(dir, "icon.svg"), "utf8");
  const browser = await chromium.launch();
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<html><body style="margin:0">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path: path.join(dir, `icon-${size}.png`), omitBackground: true });
    await page.close();
  }
  await browser.close();
  console.log("íconos generados");
})();
