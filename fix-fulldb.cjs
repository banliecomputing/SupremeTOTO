const fs = require('fs');
let code = fs.readFileSync('src/script.ts', 'utf8');

code = code.replace(/\(window as any\)\.importFullDatabase = \(e: any\) => \{[\s\S]*?\(window as any\)\.importPromptsJSON = /, `(window as any).importFullDatabase = (e: any) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev: any) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      (window as any).showConfirm("Anda yakin ingin MERESTORE FULL DATABASE? Ini akan menumpuk data lama.", async () => {
        try {
          const b = writeBatch(db);

          if (parsed.pools)
            parsed.pools.forEach((p: any) =>
              b.set(doc(db, "pools", p.id), p, { merge: true }),
            );
          if (parsed.mimpi)
            parsed.mimpi.forEach((m: any) =>
              b.set(doc(db, "mimpi", m.id), m, { merge: true }),
            );
          if (parsed.templates)
            parsed.templates.forEach((t: any) =>
              b.set(doc(db, "templates", t.id), t, { merge: true }),
            );
          if (parsed.extra_sources)
            parsed.extra_sources.forEach((s: any) =>
              b.set(doc(db, "extra_sources", s.id), s, { merge: true }),
            );
          if (parsed.prompts)
            parsed.prompts.forEach((p: any) =>
              b.set(doc(db, "prompts", p.id), p, { merge: true }),
            );
          if (parsed.globals)
            parsed.globals.forEach((g: any) =>
              b.set(doc(db, "globals", g.id), g, { merge: true }),
            );

          await b.commit();
          (window as any).showToast("Database berhasil direstore!");
          
          setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
          (window as any).showToast("Gagal menumpuk database: " + err.message, true);
        }
      });
    } catch (err: any) {
      (window as any).showToast("Format file tidak valid / Gagal baca " + err.message, true);
    } finally {
      if (e.target) e.target.value = "";
    }
  };
  reader.readAsText(file);
};

(window as any).importPromptsJSON = `);

fs.writeFileSync('src/script.ts', code);
console.log('Fixed full db');
