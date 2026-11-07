// Generates build/icon.png (512x512) by rendering the Trawl mark in Chromium.
// Run with: node_modules/electron/dist/electron.exe scripts/icon-main.cjs
const { app, BrowserWindow } = require('electron');
const { writeFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="2" y1="0" x2="30" y2="32" gradientUnits="userSpaceOnUse">
      <stop stop-color="#a78bfa"/>
      <stop offset="0.5" stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#0e7490"/>
    </linearGradient>
    <linearGradient id="fg" x1="8" y1="8" x2="24" y2="26" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffffff"/>
      <stop offset="1" stop-color="#d8f7ff"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="32" height="32" rx="7.5" fill="url(#bg)"/>
  <rect x="0.6" y="0.6" width="30.8" height="30.8" rx="7" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="0.6"/>
  <path d="M7.6 8.6h16.8l-1.5 6.1a7.3 7.3 0 0 1-6.9 5.4h-.1a7.3 7.3 0 0 1-6.9-5.4L7.6 8.6Z"
        fill="none" stroke="url(#fg)" stroke-width="2" stroke-linejoin="round"/>
  <path d="M16 11.4v7.9m0 0-2.7-2.7m2.7 2.7 2.7-2.7"
        fill="none" stroke="#e6fbff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true },
  });

  const html = `<!doctype html><html><body style="margin:0;background:transparent;overflow:hidden">${SVG}</body></html>`;
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 600));

  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  mkdirSync(resolve('build'), { recursive: true });
  writeFileSync(resolve('build/icon.png'), image.toPNG());
  console.log('icon written:', image.getSize());
  app.quit();
});
