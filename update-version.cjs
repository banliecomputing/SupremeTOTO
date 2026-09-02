const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/versi 107/ig, 'versi 108');
html = html.replace(/Versi 107/ig, 'Versi 108');
fs.writeFileSync('index.html', html);

let sw = fs.readFileSync('public/sw.js', 'utf8');
sw = sw.replace(/v31/g, 'v32');
fs.writeFileSync('public/sw.js', sw);
console.log('Version updated!');
