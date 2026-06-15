const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/accept="\.json,application\/json,text\/plain"/g, 'accept="*"');
html = html.replace(/accept="\.txt"/g, 'accept="*"');
html = html.replace(/accept="\.json,\.html,\.txt"/g, 'accept="*"');
fs.writeFileSync('index.html', html);
console.log('Done!');
