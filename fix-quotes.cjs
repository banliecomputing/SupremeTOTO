const fs = require('fs');
let code = fs.readFileSync('src/script.ts', 'utf8');

code = code.replace(/console\.error\("Gagal membaca:', err\);/g, 'console.error("Gagal membaca:", err);');

fs.writeFileSync('src/script.ts', code);
console.log('Fixed quotes!');
