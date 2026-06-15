const fs = require('fs');
let code = fs.readFileSync('src/script.ts', 'utf8');

code = code.replace(/if \(!file \|\| !\(window as any\)\.cloudUserId\) return;/g, 'if (!file) return;');

fs.writeFileSync('src/script.ts', code);
console.log('Fixed script.ts');
