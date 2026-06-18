const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/versi 105/g, 'versi 106');
html = html.replace(/Versi 105/g, 'Versi 106');
fs.writeFileSync('index.html', html);

let sw = fs.readFileSync('public/sw.js', 'utf8');
sw = sw.replace(/v29/g, 'v30');
fs.writeFileSync('public/sw.js', sw);
console.log('Version updated!');
