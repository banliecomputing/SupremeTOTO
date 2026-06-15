const fs = require('fs');
let code = fs.readFileSync('src/script.ts', 'utf8');

function replaceImport(funcName) {
    const regex = new RegExp(`\\(window as any\\)\\.${funcName} = async \\(e: any\\) => \\{[\\s\\S]*?try \\{`);
    
    code = code.replace(regex, `(window as any).${funcName} = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;
  console.log("Membaca file:", file.name);

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {`);
}

replaceImport('importPromptsJSON');
replaceImport('importGlobalsJSON');
replaceImport('importSandinganJSON');

code = code.replace(/catch\s*\(err:\s*any\)\s*\{\s*\(window as any\)\.showToast\("Gagal restore: "\s*\+\s*err\.message,\s*true\);\s*\}/g, `catch (err: any) {
      console.error("Gagal restore:", err);
      (window as any).showToast("Gagal restore: " + (err.message || err.toString()), true);
    } finally {
      if (e.target) e.target.value = "";
    }`);

fs.writeFileSync('src/script.ts', code);
console.log('Fixed script.ts');
