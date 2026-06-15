const fs = require('fs');
let code = fs.readFileSync('src/script.ts', 'utf8');

function fixConfirm(funcName, itemName) {
    // We want to replace the synchronous block with an asynchronous or callback based approach
    // We already have generic catch/finally so we should extract the logic inside try block nicely.
    
    // Easier: Just replace the entire function again.
}

code = code.replace(/\(window as any\)\.importPromptsJSON[\s\S]*?\(window as any\)\.importGlobalsJSON/, `(window as any).importPromptsJSON = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;
  console.log("Membaca file:", file.name);

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const parsed = JSON.parse(event.target?.result as string);
      if (!Array.isArray(parsed))
        throw new Error("Format JSON harus berupa array");

      (window as any).showConfirm(\`Restore \${parsed.length} Pola AI?\`, async () => {
        try {
          const b = writeBatch(db);
          parsed.forEach((p: any) => {
            if (p.id) b.set(doc(db, "prompts", p.id), p, { merge: true });
          });
          await b.commit();
          (window as any).showToast("Restore Pola AI berhasil!");
          setTimeout(() => window.location.reload(), 1500);
        } catch(err: any) {
          console.error("Gagal restore:", err);
          (window as any).showToast("Gagal restore: " + (err.message || err.toString()), true);
        }
      });
    } catch (err: any) {
      console.error("Gagal membaca:', err);
      (window as any).showToast("Gagal baca: " + (err.message || err.toString()), true);
    } finally {
      if (e.target) e.target.value = "";
    }
  };
  reader.readAsText(file);
};

(window as any).importGlobalsJSON`);

code = code.replace(/\(window as any\)\.importGlobalsJSON[\s\S]*?\(window as any\)\.downloadSandingan/, `(window as any).importGlobalsJSON = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;
  console.log("Membaca file:", file.name);

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const parsed = JSON.parse(event.target?.result as string);
      if (!Array.isArray(parsed))
        throw new Error("Format JSON harus berupa array");

      (window as any).showConfirm(\`Restore \${parsed.length} Aturan Global?\`, async () => {
        try {
          const b = writeBatch(db);
          parsed.forEach((p: any) => {
            if (p.id) b.set(doc(db, "globals", p.id), p, { merge: true });
          });
          await b.commit();
          (window as any).showToast("Restore Aturan Global berhasil!");
          setTimeout(() => window.location.reload(), 1500);
        } catch(err: any) {
          console.error("Gagal restore:", err);
          (window as any).showToast("Gagal restore: " + (err.message || err.toString()), true);
        }
      });
    } catch (err: any) {
      console.error("Gagal membaca:', err);
      (window as any).showToast("Gagal baca: " + (err.message || err.toString()), true);
    } finally {
      if (e.target) e.target.value = "";
    }
  };
  reader.readAsText(file);
};

(window as any).downloadSandingan`);

code = code.replace(/\(window as any\)\.importSandinganJSON[\s\S]*?\(window as any\)\.autoSeedDatabase/, `(window as any).importSandinganJSON = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;
  console.log("Membaca file:", file.name);

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const parsed = JSON.parse(event.target?.result as string);
      if (!Array.isArray(parsed))
        throw new Error("Format JSON harus berupa array");

      (window as any).showConfirm(\`Restore \${parsed.length} Data Sandingan?\`, async () => {
        try {
          const b = writeBatch(db);
          parsed.forEach((p: any) => {
            if (p.id) b.set(doc(db, "extra_sources", p.id), p, { merge: true });
          });
          await b.commit();
          (window as any).showToast("Restore Sandingan berhasil!");
          setTimeout(() => window.location.reload(), 1500);
        } catch(err: any) {
          console.error("Gagal restore:", err);
          (window as any).showToast("Gagal restore: " + (err.message || err.toString()), true);
        }
      });
    } catch (err: any) {
      console.error("Gagal membaca:', err);
      (window as any).showToast("Gagal baca: " + (err.message || err.toString()), true);
    } finally {
      if (e.target) e.target.value = "";
    }
  };
  reader.readAsText(file);
};

(window as any).autoSeedDatabase`);

fs.writeFileSync('src/script.ts', code);
console.log('Fixed script!');
