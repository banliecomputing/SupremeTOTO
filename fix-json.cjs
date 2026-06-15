const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/accept="\.json"/g, 'accept=".json,application/json,text/plain"');
fs.writeFileSync('index.html', html);
console.log('Done!');
