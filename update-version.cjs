const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/versi 106/ig, 'versi 107');
html = html.replace(/Versi 106/ig, 'Versi 107');
fs.writeFileSync('index.html', html);

let sw = fs.readFileSync('public/sw.js', 'utf8');
sw = sw.replace(/v30/g, 'v31');
fs.writeFileSync('public/sw.js', sw);
console.log('Version updated!');
