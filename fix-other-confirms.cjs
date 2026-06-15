const fs = require('fs');
let code = fs.readFileSync('src/script.ts', 'utf8');

code = code.replace(/\(window as any\)\.resetSyairHTML = async \(\) => \{\n\s*if \(!\(window as any\)\.cloudUserId\) return;\n\s*if \(\n\s*confirm\("Yakin ingin mengembalikan seluruh pengaturan desain ke DEFAULT\?"\)\n\s*\) \{/, `(window as any).resetSyairHTML = async () => {
  if (!(window as any).cloudUserId) return;
  (window as any).showConfirm("Yakin ingin mengembalikan seluruh pengaturan desain ke DEFAULT?", async () => {`);

// find the closing bracket of that try catch block:
// catch (e: any) { (window as any).showToast(`Error: ${e.message}`, true); } } };
code = code.replace(/    \} catch \(e: any\) \{\n\s*\(window as any\)\.showToast\(\`Error: \$\{e\.message\}\`, true\);\n\s*\}\n\s*\}\n\};/, `    } catch (e: any) {
      (window as any).showToast(\`Error: \${e.message}\`, true);
    }
  });
};`);


code = code.replace(/\(window as any\)\.deleteSyairVar = async \(varName: string\) => \{\n\s*if \(!\(window as any\)\.cloudUserId\) return;\n\s*if \(!confirm\(\`Yakin ingin menghapus variabel \{\{\$\{varName\}\}\}\?\`\)\) return;\n\n\s*\(window as any\)\.syairVariables/, `(window as any).deleteSyairVar = async (varName: string) => {
  if (!(window as any).cloudUserId) return;
  (window as any).showConfirm(\`Yakin ingin menghapus variabel {{\${varName}}}?\`, async () => {
    (window as any).syairVariables`);

// deleteSyairVar closing 
//     await updateDoc(doc(db, "settings", "syair_template"), {
//       variables: (window as any).syairVariables,
//     });
//   } catch (e) {
//     console.error(e);
//   }
// };
code = code.replace(/      variables: \(window as any\)\.syairVariables,\n\s*\}\);\n\s*\} catch \(e\) \{\n\s*console\.error\(e\);\n\s*\}\n\};/g, `      variables: (window as any).syairVariables,
    });
  } catch (e) {
    console.error(e);
  }
  });
};`);


code = code.replace(/\(window as any\)\.clearAllPrompts = async \(\) => \{\n\s*if \(!\(window as any\)\.cloudUserId\) return;\n\s*if \(\n\s*!confirm\(\n\s*"Yakin hapus SEMUA Database Pola \/ Prompt dari sistem\? Ini tidak bisa dibatalkan\.",\n\s*\)\n\s*\)\n\s*return;\n\s*try \{/, `(window as any).clearAllPrompts = async () => {
  if (!(window as any).cloudUserId) return;
  (window as any).showConfirm("Yakin hapus SEMUA Database Pola / Prompt dari sistem? Ini tidak bisa dibatalkan.", async () => {
  try {`);

code = code.replace(/    await b\.commit\(\);\n\s*\(window as any\)\.showToast\("Semua Data Pola berhasil dihapus!"\);\n\s*\} catch \(e: any\) \{\n\s*\(window as any\)\.showToast\("Gagal menghapus: " \+ e\.message, true\);\n\s*\}\n\};/g, `    await b.commit();
    (window as any).showToast("Semua Data Pola berhasil dihapus!");
  } catch (e: any) {
    (window as any).showToast("Gagal menghapus: " + e.message, true);
  }
  });
};`);

code = code.replace(/\(window as any\)\.clearAllGlobals = async \(\) => \{\n\s*if \(!\(window as any\)\.cloudUserId\) return;\n\s*if \(!confirm\("Yakin hapus SEMUA Aturan Global dari sistem\?"\)\) return;\n\s*try \{/g, `(window as any).clearAllGlobals = async () => {
  if (!(window as any).cloudUserId) return;
  (window as any).showConfirm("Yakin hapus SEMUA Aturan Global dari sistem?", async () => {
  try {`);

code = code.replace(/    await b\.commit\(\);\n\s*\(window as any\)\.showToast\("Semua Data Global berhasil dihapus!"\);\n\s*\} catch \(e: any\) \{\n\s*\(window as any\)\.showToast\("Gagal menghapus: " \+ e\.message, true\);\n\s*\}\n\};/g, `    await b.commit();
    (window as any).showToast("Semua Data Global berhasil dihapus!");
  } catch (e: any) {
    (window as any).showToast("Gagal menghapus: " + e.message, true);
  }
  });
};`);


code = code.replace(/\(window as any\)\.deleteGeminiKey = async \(id: string\) => \{\n\s*if \(!confirm\("Hapus Kunci Gemini ini dari daftar\?"\)\) return;\n\s*try \{/g, `(window as any).deleteGeminiKey = async (id: string) => {
  (window as any).showConfirm("Hapus Kunci Gemini ini dari daftar?", async () => {
    try {`);

code = code.replace(/    \}\);\n\s*\} catch \(e\) \{\n\s*\(window as any\)\.showToast\("Gagal menghapus Kunci"\);\n\s*\}\n\};/g, `    });
  } catch (e) {
    (window as any).showToast("Gagal menghapus Kunci");
  }
  });
};`);

code = code.replace(/      if \(\n\s*!confirm\(\n\s*\`Impor \$\{parsed\.length\} Kunci Gemini\? Data baru akan digabungkan\.\`,\n\s*\)\n\s*\)\n\s*return;\n\n\s*const config/g, `      (window as any).showConfirm(\`Impor \${parsed.length} Kunci Gemini? Data baru akan digabungkan.\`, async () => {
        const config`);
        
code = code.replace(/        \};/, `        };
      }); // close confirm for keys`);

fs.writeFileSync('src/script.ts', code);
console.log('Fixed confirms part 2!');
