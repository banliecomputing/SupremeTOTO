const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/versi 99/g, 'versi 100');
html = html.replace(/Versi 99/g, 'Versi 100');
fs.writeFileSync('index.html', html);

let sw = fs.readFileSync('public/sw.js', 'utf8');
sw = sw.replace(/v24/g, 'v25');
fs.writeFileSync('public/sw.js', sw);
console.log('Version updated!');
