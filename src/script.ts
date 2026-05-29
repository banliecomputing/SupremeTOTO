import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import backupData from './backup.json';

const CUSTOM_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBqfSNZKbLjGm-bDMwpC0cTjDhGJdOOAhU",
    authDomain: "superemetoto.firebaseapp.com",
    projectId: "superemetoto",
    storageBucket: "superemetoto.firebasestorage.app",
    messagingSenderId: "932942927654",
    appId: "1:932942927654:web:2e5bd6b7d4ad43066753e7",
    measurementId: "G-0DCG033H7D"
};

let app: any;
let auth: any;
let db: any;

try {
    app = initializeApp(CUSTOM_FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.warn("Firebase Init disabled");
}

const getDocRef = (col: string, docId: string) => doc(db, col, docId);

// --- 1. GLOBAL STATE & UI UTILITIES ---
(window as any).DEFAULT_API_KEY = "AIzaSyBAY0wQ1gAhaf39xHwaBl0-7rle679Sekw";
(window as any).appConfig = { apiKey: Object.is((window as any).DEFAULT_API_KEY, undefined) ? '' : (window as any).DEFAULT_API_KEY };
(window as any).pools = [];
(window as any).dataBukuMimpi = [];
(window as any).aiPrompts = [];
(window as any).globalRules = [];
(window as any).extraSources = [];
(window as any).sandinganConfig = {};
(window as any).currentMimpiType = '2D';
(window as any).currentTableData = []; 
(window as any).cloudUserId = null;

(window as any).lastAITextAnalysis = ""; 
(window as any).lastAITextSyair = "";    
(window as any).currentAnalyzedPoolName = "";
(window as any).currentLiveDraws = []; 

(window as any).syairVariables = ['BBFS', 'AM', 'AI', 'CB', 'CM', 'KEPALA', 'EKOR', 'SHIO', '4D', '3D', '2D', 'TWIN', 'JITU'];

(window as any).defaultSyairHTML = `<div style="width: 100%; max-width: 450px; background-color: #ebd19b; border: 4px solid #4a3319; padding: 25px 20px; box-sizing: border-box; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden; background-image: radial-gradient(rgba(0,0,0,0.05) 1px, transparent 0); background-size: 15px 15px; margin: 0 auto; color: #111; font-family: 'Inter', sans-serif;">
<div style="text-align: center; border-bottom: 2px dashed #8b0000; padding-bottom: 15px; margin-bottom: 15px;">
    <h1 style="margin: 0; font-size: 42px; color: #8B0000; font-weight: 900; text-shadow: 1px 1px 0px #fff; letter-spacing: 1px; font-family: 'Impact', sans-serif;">PREDIKSI JITU</h1>
    <h2 style="margin: 8px 0 0 0; font-size: 20px; letter-spacing: 3px; font-weight: 900; background: #8B0000; color: #fff; display: inline-block; padding: 4px 15px; border-radius: 4px;">{{PASARAN}}</h2>
    <div style="margin-top: 10px; font-size: 14px; font-weight: bold; color: #4a3319;">{{TANGGAL}}</div>
</div>

<div style="display: flex; flex-wrap: wrap; justify-content: space-between; margin-bottom: 15px; gap: 8px;">
    <div style="flex: 1 1 45%; background: rgba(255,255,255,0.5); padding: 10px; border: 1px solid #c9af7a; border-radius: 5px; text-align: center;">
        <span style="font-size: 14px; color: #8B0000; font-weight: 900; display: block; margin-bottom: 3px;">BBFS</span>
        <strong style="font-size: 20px; letter-spacing: 2px;">{{BBFS}}</strong>
    </div>
    <div style="flex: 1 1 45%; background: rgba(255,255,255,0.5); padding: 10px; border: 1px solid #c9af7a; border-radius: 5px; text-align: center;">
        <span style="font-size: 14px; color: #8B0000; font-weight: 900; display: block; margin-bottom: 3px;">ANGKA MAIN</span>
        <strong style="font-size: 20px; letter-spacing: 2px;">{{AM}}</strong>
    </div>
    <div style="flex: 1 1 45%; background: rgba(255,255,255,0.5); padding: 10px; border: 1px solid #c9af7a; border-radius: 5px; text-align: center;">
        <span style="font-size: 14px; color: #8B0000; font-weight: 900; display: block; margin-bottom: 3px;">ANGKA IKUT</span>
        <strong style="font-size: 20px; letter-spacing: 2px;">{{AI}}</strong>
    </div>
    <div style="flex: 1 1 45%; background: rgba(255,255,255,0.5); padding: 10px; border: 1px solid #c9af7a; border-radius: 5px; text-align: center;">
        <span style="font-size: 14px; color: #8B0000; font-weight: 900; display: block; margin-bottom: 3px;">COLOK BEBAS</span>
        <strong style="font-size: 20px; letter-spacing: 2px;">{{CB}}</strong>
    </div>
</div>

<div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #8b0000; border-bottom: 2px solid #8b0000; padding: 15px 0; margin-bottom: 15px;">
    <div style="text-align: center; flex: 1.2;">
        <div style="font-size: 45px; margin-bottom: 5px; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.3));">{{SHIO_ICON}}</div>
        <strong style="font-size: 18px; color: #8B0000; text-transform: uppercase;">SHIO {{SHIO}}</strong>
    </div>
    <div style="flex: 1; text-align: center; border-left: 2px dashed #c9af7a; border-right: 2px dashed #c9af7a; padding: 0 5px;">
        <span style="font-size: 15px; color: #8B0000; font-weight: 900; display: block; margin-bottom: 5px;">KEPALA</span>
        <strong style="font-size: 22px;">{{KEPALA}}</strong>
    </div>
    <div style="flex: 1; text-align: center; padding: 0 5px;">
        <span style="font-size: 15px; color: #8B0000; font-weight: 900; display: block; margin-bottom: 5px;">EKOR</span>
        <strong style="font-size: 22px;">{{EKOR}}</strong>
    </div>
</div>

<div style="display: flex; justify-content: space-between; text-align: center; margin-bottom: 15px;">
    <div style="flex: 1; background: rgba(255,255,255,0.3); padding: 10px; border-radius: 5px; margin-right: 5px;">
        <span style="font-size: 16px; color: #8B0000; font-weight: 900; display: block; border-bottom: 1px solid #c9af7a; padding-bottom: 5px; margin-bottom: 8px;">4D / 3D</span>
        <div style="font-size: 18px; font-weight: bold; line-height: 1.6; letter-spacing: 2px;">{{4D}}<br>{{3D}}</div>
    </div>
    <div style="flex: 1; background: rgba(255,255,255,0.3); padding: 10px; border-radius: 5px; margin-left: 5px;">
        <span style="font-size: 16px; color: #8B0000; font-weight: 900; display: block; border-bottom: 1px solid #c9af7a; padding-bottom: 5px; margin-bottom: 8px;">2D JITU</span>
        <div style="font-size: 18px; font-weight: bold; line-height: 1.6; letter-spacing: 3px;">{{2D}}</div>
    </div>
</div>

<div style="display: flex; justify-content: space-around; text-align: center; margin-bottom: 15px; background: rgba(139, 0, 0, 0.05); padding: 10px; border-radius: 5px; border: 1px dashed #8b0000;">
    <div>
        <span style="font-size: 14px; color: #8B0000; font-weight: 900; display: block;">COLOK MACAU</span>
        <strong style="font-size: 18px; letter-spacing: 2px;">{{CM}}</strong>
    </div>
    <div>
        <span style="font-size: 14px; color: #8B0000; font-weight: 900; display: block;">TWIN</span>
        <strong style="font-size: 18px; letter-spacing: 3px;">{{TWIN}}</strong>
    </div>
</div>

<div style="text-align: center; border-top: 2px dashed #4a3319; padding-top: 15px;">
    <p style="margin: 0; font-size: 13px; font-weight: bold; line-height: 1.5; color: #4a3319;">UTAMAKAN PREDIKSI SENDIRI<br><span style="color: #8B0000; font-size: 16px; font-weight: 900;">SALAM JP SELALU</span></p>
</div>
</div>`;

(window as any).syairTemplate = {
    bgUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop", 
    opacity: 80, mainColor: "#fbbf24", accentColor: "#b45309", glow: true, footer: "Utamakan Prediksi Sendiri",
    html: (window as any).defaultSyairHTML
};

(window as any).editingPasaranId = null;
(window as any).editingSourceId = null;

(window as any).rangeSelection = { start: null, end: null, targetInputId: null };

// FUNGSI FULLSCREEN
(window as any).toggleFullScreen = () => {
    const doc = window.document;
    const docEl = doc.documentElement;
    const icon = document.getElementById('icon-fullscreen');

    const requestFullScreen = docEl.requestFullscreen || (docEl as any).mozRequestFullScreen || (docEl as any).webkitRequestFullScreen || (docEl as any).msRequestFullscreen;
    const cancelFullScreen = doc.exitFullscreen || (doc as any).mozCancelFullScreen || (doc as any).webkitExitFullscreen || (doc as any).msExitFullscreen;

    if(!doc.fullscreenElement && !(doc as any).mozFullScreenElement && !(doc as any).webkitFullscreenElement && !(doc as any).msFullscreenElement) {
        if (requestFullScreen) {
            requestFullScreen.call(docEl).then(() => {
                if(icon) icon.className = "ph-bold ph-arrows-in text-lg";
            }).catch((err: any) => {
                (window as any).showToast("Mode Fullscreen tidak diizinkan di jendela pratinjau ini.", true);
            });
        }
    } else {
        if (cancelFullScreen) {
            cancelFullScreen.call(doc).then(() => {
                if(icon) icon.className = "ph-bold ph-arrows-out text-lg";
            });
        }
    }
};

document.addEventListener('fullscreenchange', () => {
    const icon = document.getElementById('icon-fullscreen');
    if(icon) {
        if (document.fullscreenElement) {
            icon.className = "ph-bold ph-arrows-in text-lg";
        } else {
            icon.className = "ph-bold ph-arrows-out text-lg";
        }
    }
});

(window as any).colToIndex = (colStr: string) => {
    if(!colStr) return -1;
    colStr = colStr.toUpperCase().trim();
    let idx = 0;
    for(let i=0; i<colStr.length; i++) { idx = idx * 26 + (colStr.charCodeAt(i) - 64); }
    return idx - 1;
};

(window as any).showToast = (msg: string, isError = false) => {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `p-3 md:p-4 rounded-lg shadow-xl text-sm md:text-base font-bold text-white text-center border ${isError ? 'bg-red-500/90 border-red-400' : 'bg-emerald-500/90 border-emerald-400'} toast-enter backdrop-blur-md`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
};

(window as any).showConfirm = (msg: string, callback: any) => {
    const modal = document.getElementById('custom-modal');
    const msgEl = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    if(modal && msgEl && confirmBtn) {
        msgEl.innerText = msg;
        confirmBtn.onclick = () => { callback(); (window as any).closeModal(); };
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
        document.getElementById('modal-content')!.classList.replace('scale-95', 'scale-100');
    }
};

(window as any).closeModal = () => {
    const modal = document.getElementById('custom-modal');
    if(modal) {
        modal.classList.replace('opacity-100', 'opacity-0');
        document.getElementById('modal-content')!.classList.replace('scale-100', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

(window as any).closeTablePreview = () => {
     const modal = document.getElementById('table-preview-modal');
     if(modal) {
         modal.classList.replace('opacity-100', 'opacity-0');
         document.getElementById('table-preview-content')!.classList.replace('scale-100', 'scale-95');
         setTimeout(() => modal.classList.add('hidden'), 300);
     }
};

(window as any).showAIScenario = () => {
    const modal = document.getElementById('ai-scenario-modal');
    const body = document.getElementById('ai-scenario-body');
    if(!modal || !body) return;

    const poolSel = document.getElementById('ai-pool-selector') as HTMLSelectElement;
    const poolName = poolSel && poolSel.options[poolSel.selectedIndex]?.value !== "" ? poolSel.options[poolSel.selectedIndex].text : '<span class="text-red-400">Belum dipilih (Pilih di atas)</span>';
    
    const promptInput = (document.getElementById('analisis-prompt') as HTMLTextAreaElement).value;
    const promptInfo = promptInput.trim() !== '' ? promptInput : '<span class="text-slate-500 italic">Tidak ada instruksi spesifik (AI hanya akan membaca System Prompt)</span>';

    const activeSources = (window as any).extraSources.filter((s:any) => s.active);
    let sourcesInfo = '<ul class="list-disc pl-5 text-slate-300 space-y-1 text-xs md:text-sm mt-2">';
    
    if((window as any).sandinganConfig && (window as any).sandinganConfig.globalPrompt) {
        sourcesInfo = `<div class="mb-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-amber-300 text-xs italic shadow-inner"><b>Rule Global Sandingan:</b> ${(window as any).sandinganConfig.globalPrompt}</div>` + sourcesInfo;
    }

    if(activeSources.length > 0) {
        activeSources.forEach((s:any) => {
            let promptText = s.prompt ? `<br><span class="text-amber-400 italic font-normal inline-block mt-2 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"><i class="ph-fill ph-robot text-xs"></i> ${s.prompt}</span>` : '';
            sourcesInfo += `<li class="mb-2"><span class="font-bold text-emerald-400">${s.title}</span> (Range: ${s.range || 'Semua'})${promptText}</li>`;
        });
    } else {
        sourcesInfo += '<li><span class="text-slate-500 italic">Tidak ada data sandingan tambahan yang aktif.</span></li>';
    }
    sourcesInfo += '</ul>';

    let globalRulesInfo = '<ul class="list-decimal pl-5 text-slate-300 space-y-2 text-xs md:text-sm mt-2">';
    if((window as any).globalRules.length > 0) {
        (window as any).globalRules.forEach((r:any) => globalRulesInfo += `<li class="border-b border-slate-800 pb-2">${r.text}</li>`);
    } else {
        globalRulesInfo += '<li><span class="text-slate-500 italic">Tidak ada rule global / system prompt aktif.</span></li>';
    }
    globalRulesInfo += '</ul>';

    body.innerHTML = `
        <div class="bg-slate-950 p-4 md:p-6 rounded-xl border border-slate-800 relative shadow-inner">
            <h4 class="text-xs md:text-sm uppercase font-bold text-emerald-400 tracking-wider mb-2 flex items-center gap-2"><i class="ph-fill ph-target"></i> Pasaran Target Analisis</h4>
            <p class="font-bold text-white text-base md:text-lg">${poolName}</p>
        </div>
        
        <div class="bg-slate-950 p-4 md:p-6 rounded-xl border border-slate-800 relative shadow-inner">
            <h4 class="text-xs md:text-sm uppercase font-bold text-purple-400 tracking-wider mb-2 flex items-center gap-2"><i class="ph-fill ph-robot"></i> Instruksi Pola Spesifik</h4>
            <div class="bg-slate-900 p-3 md:p-4 rounded-lg text-sm leading-relaxed border border-slate-700/50 shadow-sm whitespace-pre-wrap">${promptInfo}</div>
        </div>

        <div class="bg-slate-950 p-4 md:p-6 rounded-xl border border-slate-800 relative shadow-inner">
            <h4 class="text-xs md:text-sm uppercase font-bold text-amber-400 tracking-wider flex items-center gap-2 mb-2"><i class="ph-fill ph-cpu"></i> System Prompt (Aturan Mutlak)</h4>
            ${globalRulesInfo}
        </div>

        <div class="bg-slate-950 p-4 md:p-6 rounded-xl border border-slate-800 relative shadow-inner">
            <h4 class="text-xs md:text-sm uppercase font-bold text-blue-400 tracking-wider flex items-center gap-2 mb-2"><i class="ph-fill ph-database"></i> Data Sandingan (Multi-Sheet)</h4>
            ${sourcesInfo}
        </div>
    `;

    modal.classList.remove('hidden');
    setTimeout(() => { 
        modal.classList.replace('opacity-0', 'opacity-100'); 
        document.getElementById('ai-scenario-content')!.classList.replace('scale-95', 'scale-100'); 
    }, 10);
};

(window as any).closeAIScenario = () => {
    const modal = document.getElementById('ai-scenario-modal');
    if(modal) {
        modal.classList.replace('opacity-100', 'opacity-0');
        document.getElementById('ai-scenario-content')!.classList.replace('scale-100', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

(window as any).toggleAIControls = (forceHide = false) => {
    const body = document.getElementById('ai-controls-body');
    const icon = document.getElementById('ai-controls-icon');
    if(!body || !icon) return;
    
    if (forceHide === true || !body.classList.contains('hidden')) {
        body.classList.add('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        body.classList.remove('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
};

(window as any).toggleAITablePreview = () => {
    const wrapper = document.getElementById('ai-data-container-wrapper');
    if(wrapper) {
        if(wrapper.classList.contains('hidden')) wrapper.classList.remove('hidden');
        else wrapper.classList.add('hidden');
    }
};

(window as any).toggleMainNav = () => {
    const d = document.getElementById('main-nav-drawer');
    const o = document.getElementById('main-nav-overlay');
    if(!d || !o) return;

    if(d.classList.contains('-translate-x-full')) {
        d.classList.replace('-translate-x-full', 'translate-x-0');
        o.classList.remove('hidden'); setTimeout(() => o.classList.replace('opacity-0', 'opacity-100'), 10);
    } else {
        d.classList.replace('translate-x-0', '-translate-x-full');
        o.classList.replace('opacity-100', 'opacity-0'); setTimeout(() => o.classList.add('hidden'), 300);
    }
};

(window as any).switchTab = (tabName: string) => {
    document.querySelectorAll('.page-transition').forEach(p => p.classList.replace('page-active', 'page-hidden'));
    document.querySelectorAll('.nav-btn-drawer').forEach(b => b.classList.remove('bg-emerald-500/10', 'text-emerald-400'));
    
    const page = document.getElementById(`page-${tabName}`);
    if (page) page.classList.replace('page-hidden', 'page-active');
    
    const btn = document.getElementById(`nav-btn-${tabName}`);
    if (btn) btn.classList.add('bg-emerald-500/10', 'text-emerald-400');
    
    const titles: any = { 'live': 'LIVE RESULT', 'tabel': 'DATA TABEL', 'ai': 'AI ANALISIS POLA', 'bukumimpi': 'BUKU MIMPI', 'admin': 'ADMIN PANEL' };
    const titleEl = document.getElementById('header-title');
    if(titleEl) titleEl.innerText = titles[tabName] || 'PRO DATA';
    
    if(tabName === 'live') (window as any).fetchAllLiveResults();
    if(tabName === 'bukumimpi') (window as any).renderBukuMimpi();
    
    const d = document.getElementById('main-nav-drawer');
    if(d && d.classList.contains('translate-x-0')) (window as any).toggleMainNav();
};

(window as any).openSubAdmin = (menuId: string) => {
    const main = document.getElementById('admin-main-menu');
    const sub = document.getElementById(menuId);
    const titleEl = document.getElementById('admin-header-title');

    if(main) main.classList.add('hidden');
    if(sub) sub.classList.remove('hidden');

    if (menuId === 'sub-admin-spreadsheet') {
        setTimeout(() => {
            const importSection = document.getElementById('section-import-massal');
            if (importSection) importSection.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }
    
    const titleMap: any = {
        'sub-admin-pasaran': 'KELOLA PASARAN', 'sub-admin-mimpi': 'BUKU MIMPI', 
        'sub-admin-prompt': 'DATABASE POLA', 'sub-admin-global': 'SYSTEM PROMPT',
        'sub-admin-settings': 'PENGATURAN SISTEM', 'sub-admin-spreadsheet': 'PUSAT DATA & IMPOR',
        'sub-admin-syair-design': 'CUSTOM DESAIN SYAIR'
    };
    if(titleEl) titleEl.innerText = titleMap[menuId] || 'PENGATURAN';
};

(window as any).closeSubAdmin = () => {
    document.querySelectorAll('[id^="sub-admin-"]').forEach(el => el.classList.add('hidden'));
    const main = document.getElementById('admin-main-menu');
    const titleEl = document.getElementById('admin-header-title');

    if(main) main.classList.remove('hidden');
    if(titleEl) titleEl.innerText = "DASHBOARD";
    
    if(typeof (window as any).cancelEditPasaran === 'function') (window as any).cancelEditPasaran();
    if(typeof (window as any).cancelSandingan === 'function') (window as any).cancelSandingan();
};

(window as any).checkPin = () => {
    const pinInp = document.getElementById('pin-input') as HTMLInputElement;
    if(pinInp && pinInp.value === "1234") {
        document.getElementById('pin-screen')!.classList.add('hidden');
        document.getElementById('admin-dashboard')!.classList.remove('hidden');
        (window as any).showToast("Autentikasi Berhasil!");
    } else {
        (window as any).showToast("Kode PIN Salah!", true);
    }
};

(window as any).toggleImportMapping = () => {
    const val = (document.getElementById('imp-type') as HTMLSelectElement).value;
    const mapMimpi = document.getElementById('mapping-mimpi');
    const mapPrompt = document.getElementById('mapping-prompt');
    const mapGlobal = document.getElementById('mapping-global');
    
    if(mapMimpi) mapMimpi.classList.toggle('hidden', val !== 'mimpi');
    if(mapPrompt) mapPrompt.classList.toggle('hidden', val !== 'prompt');
    if(mapGlobal) mapGlobal.classList.toggle('hidden', val !== 'global');
};

(window as any).loadTabsForURLValue = async (url: string, nameId: string) => {
    if(!url) return (window as any).showToast("Silakan isi URL Spreadsheet terlebih dahulu!", true);
    (window as any).showToast("Mencari daftar tab / sheet...");
    try {
        const sheetId = getSpreadsheetId(url);
        if(!sheetId) throw new Error("ID Spreadsheet tidak ditemukan dari URL");
        
        const res = await (window as any).robustFetch(`https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`);
        let names: string[] = [];
        
        const regexes = [ /\{"gid":"\d+","name":"([^"]+)"/g, /\["([^"]+)",\d+\]/g ];
        for (let r of regexes) {
            let match;
            while((match = r.exec(res)) !== null) {
                const name = match[1];
                if(!names.includes(name) && name.length < 50 && !name.includes('{') && !name.includes('}')) { names.push(name); }
            }
        }
        
        if(names.length === 0) {
             const parser = new DOMParser();
             const doc = parser.parseFromString(res, 'text/html');
             const items = doc.querySelectorAll('#sheet-menu > li > a');
             items.forEach(a => { const n = (a as HTMLElement).innerText.trim(); if(n) names.push(n); });
        }
        
        names = [...new Set(names)];
        
        if(names.length > 0) {
            (window as any).showToast(`Ditemukan ${names.length} Tab Sheet!`);
            (window as any).showTabSelector(nameId, names);
        } else {
            (window as any).showToast("Nama Tab gagal dilacak! Pastikan URL Publik.", true);
        }
    } catch (e: any) {
        (window as any).showToast("Gagal memindai: " + e.message, true);
    }
};

(window as any).loadTabsForInput = (urlId: string, nameId: string) => {
    const url = (document.getElementById(urlId) as HTMLInputElement).value;
    (window as any).loadTabsForURLValue(url, nameId);
};

(window as any).showTabSelector = (inputId: string, tabs: string[]) => {
    const inp = document.getElementById(inputId) as HTMLInputElement;
    if(!inp) return;
    
    let oldList = document.getElementById(`tab-list-${inputId}`);
    if(oldList) oldList.remove();

    const list = document.createElement('div');
    list.id = `tab-list-${inputId}`;
    list.className = "absolute z-50 bg-slate-800 border border-emerald-500 rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.8)] max-h-48 overflow-y-auto w-full mt-1 top-full left-0";

    tabs.forEach(t => {
        const item = document.createElement('div');
        item.className = "p-3 text-xs md:text-sm text-white hover:bg-emerald-600 cursor-pointer border-b border-slate-700/50 last:border-0 font-bold flex items-center gap-2";
        item.innerHTML = `<i class="ph-bold ph-table text-emerald-400"></i> ${t}`;
        item.onclick = (e) => {
            e.stopPropagation(); inp.value = t;
            if ("createEvent" in document) { var evt = document.createEvent("HTMLEvents"); evt.initEvent("change", false, true); inp.dispatchEvent(evt);
            } else { (inp as any).fireEvent("onchange"); }
            list.remove();
        };
        list.appendChild(item);
    });

    if(inp.parentElement!.style.position !== 'relative') { inp.parentElement!.style.position = 'relative'; }
    inp.parentElement!.appendChild(list);

    setTimeout(() => {
        const closeHandler = (e: any) => {
            if(list && !list.contains(e.target)) { list.remove(); document.removeEventListener('click', closeHandler); }
        };
        document.addEventListener('click', closeHandler);
    }, 100);
};

(window as any).indexToA1 = (r: number, c: number) => {
    let colStr = ''; let tempC = c;
    while (tempC >= 0) { colStr = String.fromCharCode((tempC % 26) + 65) + colStr; tempC = Math.floor(tempC / 26) - 1; }
    return `${colStr}${r + 1}`;
};

const getSpreadsheetId = (url: string) => {
    const match = url.match(/\/d\/(.*?)\//);
    return match ? match[1] : null;
};

const fetchSpreadsheetTab = async (sheetId: string, sheetName: string, query = "", range = "") => {
    let queryUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    if(query) queryUrl += `&tq=${encodeURIComponent(query)}`;
    if(range) queryUrl += `&range=${encodeURIComponent(range)}`;
    
    try {
        const res = await fetch(queryUrl);
        if (!res.ok) throw new Error("Akses ditolak server Google.");
        const csvText = await res.text();
        if(csvText.trim().toLowerCase().startsWith('<!doctype html>') || csvText.trim().toLowerCase().startsWith('<html')) {
            throw new Error("Data terkunci atau Sheet Name salah.");
        }
        return csvText;
    } catch(error) {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(queryUrl)}`;
        const resProx = await fetch(proxyUrl);
        if (!resProx.ok) throw new Error("Gagal total (Proxy terblokir).");
        const csvProx = await resProx.text();
        if(csvProx.trim().toLowerCase().startsWith('<!doctype html>') || csvProx.trim().toLowerCase().startsWith('<html')) {
            throw new Error("File Spreadsheet TIDAK PUBLIK atau Sheet salah.");
        }
        return csvProx;
    }
};

(window as any).openVisualSelector = async (urlId: string, sheetNameId: string, targetRangeId: string) => {
    const url = (document.getElementById(urlId) as HTMLInputElement).value;
    const sheetName = (document.getElementById(sheetNameId) as HTMLInputElement).value;
    const sheetId = getSpreadsheetId(url);

    if(!sheetId || !sheetName) return (window as any).showToast("Harap isi URL & Nama Sheet dulu untuk memuat tabel Visual!", true);

    (window as any).rangeSelection = { start: null, end: null, targetInputId: targetRangeId };
    document.getElementById('range-picker-result')!.innerText = '...';
    
    const modal = document.getElementById('range-picker-modal');
    const body = document.getElementById('range-picker-body');
    
    modal!.classList.remove('hidden');
    setTimeout(() => { 
        modal!.classList.replace('opacity-0', 'opacity-100'); 
        document.getElementById('range-picker-content')!.classList.replace('scale-95', 'scale-100'); 
    }, 10);
    
    body!.innerHTML = `<div class="flex flex-col items-center justify-center h-full mt-10"><i class="ph-fill ph-spinner-gap animate-spin text-5xl text-emerald-500 mb-3"></i><p class="text-slate-400 text-sm">Membuka Spreadsheet...</p></div>`;

    try {
        const csvData = await fetchSpreadsheetTab(sheetId, sheetName);
        const rows = csvData.split('\n');
        const maxRows = Math.min(rows.length, 50); 
        
        let maxCols = 5;
        const matrix: string[][] = [];
        for(let i=0; i<maxRows; i++) {
            const parts = rows[i].trim().split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
            if(parts.length > maxCols) maxCols = parts.length;
            matrix.push(parts);
        }

        let tableHtml = '<table class="w-full text-left border-collapse text-[10px] md:text-sm whitespace-nowrap bg-slate-900" id="visual-selector-table">';
        tableHtml += '<thead class="bg-slate-800 text-slate-300 sticky top-0 z-20 shadow-md"><tr><th class="p-2 md:p-3 border border-slate-700 bg-slate-950 sticky left-0 z-30 w-8 md:w-12 text-center">#</th>';
        for(let c=0; c<maxCols; c++) { tableHtml += `<th class="p-2 md:p-3 border border-slate-700 text-center min-w-[80px] md:min-w-[120px]">${(window as any).indexToA1(0, c).replace(/[0-9]/g, '')}</th>`; }
        tableHtml += '</tr></thead><tbody>';

        for(let r=0; r<maxRows; r++) {
            tableHtml += `<tr><td class="p-2 md:p-3 border border-slate-700 bg-slate-950 text-slate-500 text-center sticky left-0 z-10 font-bold">${r+1}</td>`;
            for(let c=0; c<maxCols; c++) {
                const cellVal = (matrix[r] && matrix[r][c]) ? matrix[r][c] : '';
                tableHtml += `<td class="p-2 md:p-3 border border-slate-800/50 text-slate-400 range-cell truncate max-w-[150px] md:max-w-[200px]" data-r="${r}" data-c="${c}" onclick="handleCellClick(${r}, ${c})">${cellVal}</td>`;
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
        body!.innerHTML = tableHtml;
    } catch (error: any) {
        body!.innerHTML = `<div class="text-center mt-10 p-4 text-red-400"><i class="ph-fill ph-warning-octagon text-5xl mb-2"></i><p class="font-bold text-lg">Gagal Membuka Tabel</p><p class="text-sm text-slate-500 mt-1">${error.message}</p></div>`;
    }
};

(window as any).handleCellClick = (r: number, c: number) => {
    const sel = (window as any).rangeSelection;
    if (!sel.start || (sel.start && sel.end)) { sel.start = {r, c}; sel.end = null; } 
    else { sel.end = {r, c}; }
    (window as any).updateVisualHighlight();
};

(window as any).updateVisualHighlight = () => {
    const sel = (window as any).rangeSelection;
    let resultText = "Belum dipilih";
    
    document.querySelectorAll('.range-cell').forEach(td => { td.classList.remove('range-cell-selected', 'range-cell-in-range'); });

    if (sel.start) {
        const startCellId = (window as any).indexToA1(sel.start.r, sel.start.c);
        resultText = startCellId;
        
        const startTd = document.querySelector(`.range-cell[data-r="${sel.start.r}"][data-c="${sel.start.c}"]`);
        if(startTd) startTd.classList.add('range-cell-selected');

        if (sel.end) {
            const endCellId = (window as any).indexToA1(sel.end.r, sel.end.c);
            resultText = `${startCellId}:${endCellId}`;

            const minR = Math.min(sel.start.r, sel.end.r); const maxR = Math.max(sel.start.r, sel.end.r);
            const minC = Math.min(sel.start.c, sel.end.c); const maxC = Math.max(sel.start.c, sel.end.c);

            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const td = document.querySelector(`.range-cell[data-r="${r}"][data-c="${c}"]`);
                    if(td) {
                        if((r === sel.start.r && c === sel.start.c) || (r === sel.end.r && c === sel.end.c)) { td.classList.add('range-cell-selected'); } 
                        else { td.classList.add('range-cell-in-range'); }
                    }
                }
            }
        }
    }
    document.getElementById('range-picker-result')!.innerText = resultText;
};

(window as any).resetVisualSelection = () => { (window as any).rangeSelection.start = null; (window as any).rangeSelection.end = null; (window as any).updateVisualHighlight(); };

(window as any).confirmVisualSelection = () => {
    const sel = (window as any).rangeSelection; 
    const resEl = document.getElementById('range-picker-result'); 
    const target = document.getElementById(sel.targetInputId) as HTMLInputElement;
    
    if(sel.start && target && resEl) {
        target.value = resEl.innerText; (window as any).closeVisualSelector(); (window as any).showToast("Rentang berhasil dipilih!");
        if ("createEvent" in document) { var evt = document.createEvent("HTMLEvents"); evt.initEvent("change", false, true); target.dispatchEvent(evt); } 
        else (target as any).fireEvent("onchange");
    } else { (window as any).showToast("Klik minimal 1 sel di tabel!", true); }
};

(window as any).closeVisualSelector = () => {
    const modal = document.getElementById('range-picker-modal');
    if(modal) {
        modal.classList.replace('opacity-100', 'opacity-0');
        document.getElementById('range-picker-content')!.classList.replace('scale-100', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

(window as any).renderLiveDrawsEditor = () => {
    const container = document.getElementById('live-draws-wrapper');
    if(!container) return;
    container.innerHTML = '';
    
    if((window as any).currentLiveDraws.length === 0) {
         container.innerHTML = '<p class="text-[10px] text-slate-500 text-center py-4 bg-slate-950 rounded-lg border border-slate-800 border-dashed">Belum ada putaran. Klik + Tambah Putaran.</p>';
         return;
    }
    
    (window as any).currentLiveDraws.forEach((draw: any, idx: number) => {
        container.innerHTML += `
        <div class="bg-slate-950 p-3 md:p-4 rounded-lg border border-slate-700/80 relative group shadow-sm transition-all hover:border-emerald-500/50">
            <button type="button" onclick="removeLiveDraw(${idx})" class="absolute top-2 right-2 text-red-500 hover:bg-red-500/20 p-2 rounded z-10 transition-colors" title="Hapus Putaran"><i class="ph-bold ph-trash"></i></button>
            <div class="space-y-3 pr-8">
                <div>
                    <input value="${draw.name || ''}" onchange="updateLiveDraw(${idx}, 'name', this.value)" placeholder="Nama (Cth: Putaran 1 - 13:00)" class="w-full p-2.5 rounded bg-slate-800 border border-slate-600 text-xs md:text-sm outline-none focus:border-emerald-500 text-white shadow-inner font-bold placeholder-slate-500">
                </div>

                <div>
                    <input id="live-url-${idx}" value="${draw.urlLive || ''}" onchange="updateLiveDraw(${idx}, 'urlLive', this.value)" placeholder="URL Web / URL Spreadsheet (Live)" class="w-full p-2.5 rounded bg-slate-800 border border-slate-600 text-[10px] md:text-xs outline-none focus:border-emerald-500 text-white shadow-inner font-mono placeholder-slate-500">
                </div>

                <div class="flex gap-3">
                    <div class="flex-1 relative">
                        <div class="relative">
                            <input id="live-sheet-${idx}" value="${draw.sheetNameLive || ''}" onchange="updateLiveDraw(${idx}, 'sheetNameLive', this.value)" placeholder="Nama Sheet (Jika ada)" class="w-full p-2.5 rounded bg-slate-800 border border-slate-600 text-[10px] md:text-xs outline-none focus:border-emerald-500 text-white shadow-inner pr-8 placeholder-slate-500">
                            <button type="button" onclick="loadTabsForURLValue(window.currentLiveDraws[${idx}].urlLive, 'live-sheet-${idx}')" class="absolute right-1.5 top-1.5 text-blue-400 bg-blue-500/20 p-1.5 rounded hover:bg-blue-500 hover:text-white transition-colors" title="Cari Sheet Otomatis"><i class="ph-bold ph-list-magnifying-glass"></i></button>
                        </div>
                    </div>
                    <div class="w-1/3 relative">
                        <div class="relative">
                            <input id="live-range-${idx}" value="${draw.rangeLive || ''}" onchange="updateLiveDraw(${idx}, 'rangeLive', this.value)" placeholder="Sel (Cth: B2)" class="w-full p-2.5 rounded bg-slate-800 border border-slate-600 text-[10px] md:text-xs outline-none focus:border-emerald-500 text-white shadow-inner font-mono pr-8 placeholder-slate-500">
                            <button type="button" onclick="openVisualSelector('live-url-${idx}', 'live-sheet-${idx}', 'live-range-${idx}')" class="absolute right-1.5 top-1.5 text-emerald-400 bg-emerald-500/20 p-1.5 rounded hover:bg-emerald-500 hover:text-white transition-colors" title="Pilih Sel Visual"><i class="ph-bold ph-selection-plus"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
};

(window as any).addLiveDrawField = () => { (window as any).currentLiveDraws.push({ name: `Putaran ${(window as any).currentLiveDraws.length + 1}`, urlLive: '', sheetNameLive: '', rangeLive: '' }); (window as any).renderLiveDrawsEditor(); };
(window as any).removeLiveDraw = (idx: number) => { (window as any).currentLiveDraws.splice(idx, 1); (window as any).renderLiveDrawsEditor(); };
(window as any).updateLiveDraw = (idx: number, field: string, value: any) => { (window as any).currentLiveDraws[idx][field] = value; };

(window as any).renderDropdowns = () => {
    const els = [document.getElementById('pool-selector'), document.getElementById('ai-pool-selector')];
    els.forEach(el => {
        if(!el) return;
        const val = (el as HTMLSelectElement).value;
        el.innerHTML = '<option value="">-- Pilih Pasaran Utama --</option>';
        (window as any).pools.forEach((p: any) => {
            const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.name; el.appendChild(opt);
        });
        if((window as any).pools.find((p: any) => p.id == val)) (el as HTMLSelectElement).value = val;
    });
};

(window as any).renderAdminLists = () => {
    const pList = document.getElementById('links-list');
    if(pList) {
        pList.innerHTML = (window as any).pools.length === 0 ? '<p class="text-sm text-slate-500 text-center py-4 md:col-span-2">Belum ada pasaran</p>' : '';
        (window as any).pools.forEach((p: any) => {
            let mappingTxt = (p.mapCols) ? `<br><span class="text-amber-500">Map: Kolom(${p.mapCols}) ${p.autoFill ? '[Auto-Fill Aktif]' : ''}</span>` : '';
            let drawsCount = p.liveDraws ? p.liveDraws.length : 1;
            
            let livePreviewBtns = '';
            if(p.liveDraws && p.liveDraws.length > 0) {
                p.liveDraws.forEach((d: any, idx: number) => {
                    livePreviewBtns += `<button onclick="previewLiveScrape('${p.id}', ${idx})" class="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-[10px] md:text-xs font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded transition-colors" title="Cek Raw Data: ${d.name}">${idx+1}</button>`;
                });
            } else {
                livePreviewBtns = `<button onclick="previewLiveScrape('${p.id}', 0)" class="p-2 md:p-3 text-emerald-400 hover:bg-emerald-500/20 rounded-lg" title="Cek Live Data Utama"><i class="ph-bold ph-broadcast"></i></button>`;
            }
            
            pList.innerHTML += `
                <div class="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center shadow-sm flex-col md:flex-row gap-3">
                    <div class="truncate w-full md:flex-1">
                        <p class="text-sm md:text-base font-bold text-white flex items-center gap-2">${p.name} ${!p.visible ? '<i class="ph-fill ph-eye-slash text-slate-500"></i>' : ''}</p>
                        <p class="text-[9px] md:text-xs text-emerald-400 font-bold mt-1 inline-block bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">${drawsCount} Putaran Live</p>
                        <p class="text-[9px] md:text-xs text-emerald-500 truncate mt-1">Histori: ${p.urlHistory}${mappingTxt}</p>
                    </div>
                    <div class="flex gap-2 shrink-0 flex-wrap justify-start md:justify-end w-full md:w-auto bg-slate-950 p-2 md:p-3 rounded-lg border border-slate-800 md:border-0">
                        <div class="flex gap-1 items-center bg-slate-900 px-2 py-1.5 rounded border border-slate-700/50" title="Pratinjau Live Result">
                            <i class="ph-bold ph-broadcast text-emerald-500/50 text-sm ml-1 mr-1"></i>
                            ${livePreviewBtns}
                        </div>
                        <div class="flex gap-1 bg-slate-900 px-1 py-1 rounded border border-slate-700/50">
                            <button onclick="movePasaranUp('${p.id}')" class="p-1 md:p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors" title="Geser ke Atas"><i class="ph-bold ph-arrow-up"></i></button>
                            <button onclick="movePasaranDown('${p.id}')" class="p-1 md:p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors" title="Geser ke Bawah"><i class="ph-bold ph-arrow-down"></i></button>
                        </div>
                        <button onclick="previewTableScrape('${p.id}')" class="p-2 md:p-3 text-amber-400 hover:bg-amber-500/20 rounded-lg border border-transparent hover:border-amber-500/30 transition-colors" title="Cek Mapping Tabel Histori"><i class="ph-bold ph-table text-lg"></i></button>
                        <button onclick="editPasaran('${p.id}')" class="p-2 md:p-3 text-blue-400 hover:bg-blue-500/20 rounded-lg border border-transparent hover:border-blue-500/30 transition-colors" title="Edit"><i class="ph-bold ph-pencil text-lg"></i></button>
                        <button onclick="duplicatePasaran('${p.id}')" class="p-2 md:p-3 text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-transparent hover:border-emerald-500/30 transition-colors" title="Duplikat"><i class="ph-bold ph-copy text-lg"></i></button>
                        <button onclick="deletePasaran('${p.id}')" class="p-2 md:p-3 text-red-400 hover:bg-red-500/20 rounded-lg border border-transparent hover:border-red-500/30 transition-colors" title="Hapus"><i class="ph-bold ph-trash text-lg"></i></button>
                    </div>
                </div>`;
        });
    }
    
    const eList = document.getElementById('admin-extra-sources-list');
    if(eList) {
        eList.innerHTML = (window as any).extraSources.length === 0 ? '<p class="text-xs md:text-sm text-slate-500 p-4 bg-slate-900 rounded border border-slate-800 border-dashed text-center">Belum ada Data Sandingan.</p>' : '';
        (window as any).extraSources.forEach((src: any) => {
            const toggleClass = src.active ? 'text-blue-400' : 'text-slate-500';
            eList.innerHTML += `
                <div class="bg-slate-800 p-3 md:p-4 rounded-lg border border-slate-700 flex justify-between items-center shadow-sm gap-2">
                    <div class="flex-1 truncate pr-3 cursor-pointer" onclick="toggleExtraSource('${src.id}', ${!src.active})">
                        <div class="flex items-center gap-3">
                            <i class="ph-fill ${src.active ? 'ph-toggle-right' : 'ph-toggle-left'} text-2xl ${toggleClass} transition-colors"></i>
                            <p class="text-xs md:text-sm font-bold ${src.active ? 'text-white' : 'text-slate-400'} truncate transition-colors">${src.title}</p>
                        </div>
                    </div>
                    <div class="flex gap-1 shrink-0">
                        <button onclick="previewFormSheet('sandingan', '${src.id}')" class="p-2 md:p-3 text-emerald-400 hover:bg-emerald-500/20 rounded-lg shrink-0 transition-colors" title="Pratinjau Tabel"><i class="ph-bold ph-eye text-lg"></i></button>
                        <button onclick="editExtraSource('${src.id}')" class="p-2 md:p-3 text-blue-400 hover:bg-blue-500/20 rounded-lg shrink-0 transition-colors" title="Edit"><i class="ph-bold ph-pencil text-lg"></i></button>
                        <button onclick="duplicateExtraSource('${src.id}')" class="p-2 md:p-3 text-emerald-400 hover:bg-emerald-500/20 rounded-lg shrink-0 transition-colors" title="Duplikat"><i class="ph-bold ph-copy text-lg"></i></button>
                        <button onclick="deleteExtraSource('${src.id}')" class="p-2 md:p-3 text-red-400 hover:bg-red-500/20 rounded-lg shrink-0 transition-colors" title="Hapus"><i class="ph-bold ph-trash text-lg"></i></button>
                    </div>
                </div>`;
        });
    }

    const mList = document.getElementById('admin-mimpi-list');
    if(mList) {
        mList.innerHTML = (window as any).dataBukuMimpi.length === 0 ? '<p class="text-sm text-slate-500 text-center py-4 md:col-span-2">Belum ada tafsir</p>' : '';
        (window as any).dataBukuMimpi.slice().reverse().slice(0,12).forEach((m: any) => {
            mList.innerHTML += `<div class="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center"><div class="truncate pr-4"><p class="text-sm md:text-base font-bold text-white">${m.type} - ${m.no}</p><p class="text-[10px] md:text-xs text-slate-500 truncate mt-1">${m.desc}</p></div><div class="flex gap-1 shrink-0"><button onclick="duplicateMimpi('${m.id}')" class="p-2 md:p-3 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors" title="Duplikat"><i class="ph-bold ph-copy text-lg"></i></button><button onclick="deleteMimpi('${m.id}')" class="p-2 md:p-3 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors" title="Hapus"><i class="ph-bold ph-trash text-lg"></i></button></div></div>`;
        });
    }
    
    const prList = document.getElementById('admin-prompt-list');
    const aiSel = document.getElementById('ai-prompt-selector');
    if(prList) prList.innerHTML = (window as any).aiPrompts.length === 0 ? '<p class="text-sm text-slate-500 text-center py-4">Belum ada pola prompt</p>' : '';
    if(aiSel) aiSel.innerHTML = '<option value="">-- Tulis Instruksi Manual Bebas (Baca System Prompt) --</option>';
    
    (window as any).aiPrompts.forEach((pr: any) => {
        if(prList) prList.innerHTML += `
            <div class="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center shadow-inner gap-4">
                <div class="pr-2 flex-1 overflow-hidden">
                    <p class="text-sm md:text-base font-bold text-purple-400 mb-1 truncate">${pr.title}</p>
                    <p class="text-[10px] md:text-xs text-slate-400 line-clamp-2 md:line-clamp-3 leading-relaxed">${pr.text}</p>
                </div>
                <div class="flex gap-1 shrink-0 flex-wrap justify-end w-20 md:w-auto">
                    <button onclick="editPrompt('${pr.id}')" class="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors" title="Edit"><i class="ph-bold ph-pencil text-lg"></i></button>
                    <button onclick="duplicatePrompt('${pr.id}')" class="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors" title="Duplikat"><i class="ph-bold ph-copy text-lg"></i></button>
                    <button onclick="deletePrompt('${pr.id}')" class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors" title="Hapus"><i class="ph-bold ph-trash text-lg"></i></button>
                </div>
            </div>`;
        if(aiSel) aiSel.innerHTML += `<option value="${pr.text}">${pr.title}</option>`;
    });
    
    const gList = document.getElementById('admin-global-list');
    if(gList) {
        gList.innerHTML = (window as any).globalRules.length === 0 ? '<p class="text-sm text-slate-500 text-center py-6 bg-slate-900 rounded-lg">Otak AI Kosong. Harap Reset atau Injeksi Aturan.</p>' : '';
        (window as any).globalRules.forEach((g: any) => {
            gList.innerHTML += `<div class="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center shadow-inner gap-4"><div class="pr-2 flex-1"><p class="text-xs md:text-sm text-slate-300 leading-relaxed">${g.text}</p></div><div class="flex gap-1 shrink-0"><button onclick="duplicateGlobalRule('${g.id}')" class="p-2 md:p-3 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors" title="Duplikat"><i class="ph-bold ph-copy text-lg"></i></button><button onclick="deleteGlobalRule('${g.id}')" class="p-2 md:p-3 text-red-400 hover:bg-red-500/20 rounded-lg shrink-0 transition-colors" title="Hapus"><i class="ph-bold ph-trash text-lg"></i></button></div></div>`;
        });
    }
};

(window as any).updateAIInfoPanel = () => {
    const infoDiv = document.getElementById('ai-extra-sources-info');
    const listSpan = document.getElementById('ai-extra-sources-list');
    if(!infoDiv || !listSpan) return;

    const activeSources = (window as any).extraSources.filter((s:any) => s.active);
    if(activeSources.length > 0) {
        infoDiv.classList.remove('hidden');
        listSpan.innerText = activeSources.map((s:any) => s.title).join(', ');
    } else {
        infoDiv.classList.add('hidden');
    }
};

(window as any).renderBukuMimpi = () => {
    const searchEl = document.getElementById('search-mimpi') as HTMLInputElement;
    const list = document.getElementById('buku-mimpi-list');
    if(!searchEl || !list) return;

    const query = searchEl.value.toLowerCase();
    list.innerHTML = '';
    const filtered = (window as any).dataBukuMimpi.filter((i:any) => i.type === (window as any).currentMimpiType && (i.no.includes(query) || i.desc.toLowerCase().includes(query)));
    if(filtered.length === 0) return list.innerHTML = `<div class="text-center py-10 md:py-20 text-slate-500 text-base md:col-span-2 lg:col-span-3"><i class="ph ph-magnifying-glass text-5xl md:text-6xl mb-3 opacity-50"></i><p>Tidak ditemukan</p></div>`;
    filtered.sort((a:any,b:any) => a.no.localeCompare(b.no)).forEach((i:any) => {
        list.innerHTML += `<div class="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 flex gap-4 items-center shadow-sm hover:border-emerald-500/50 transition-colors"><div class="bg-slate-900 text-emerald-400 font-bold text-xl md:text-2xl px-4 py-2 md:py-3 rounded-lg border border-slate-700/50 min-w-[5rem] md:min-w-[6rem] text-center">${i.no}</div><div class="text-sm md:text-base text-slate-300 leading-relaxed">${i.desc}</div></div>`;
    });
};

(window as any).switchMimpiType = (type: string) => {
    (window as any).currentMimpiType = type;
    document.querySelectorAll('[id^="tab-mimpi-"]').forEach(b => { b.classList.replace('bg-emerald-500', 'bg-slate-900'); b.classList.replace('text-slate-900', 'text-slate-400'); });
    const btn = document.getElementById(`tab-mimpi-${type}`);
    if(btn) { btn.classList.replace('bg-slate-900', 'bg-emerald-500'); btn.classList.replace('text-slate-400', 'text-slate-900'); }
    (window as any).renderBukuMimpi();
};

(window as any).togglePoolDraws = (id: string) => {
    const el = document.getElementById(`draws-container-${id}`);
    const icon = document.getElementById(`draws-icon-${id}`);
    if(el && icon) {
        if(el.classList.contains('hidden')) {
            el.classList.remove('hidden');
            icon.style.transform = 'rotate(180deg)';
        } else {
            el.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
        }
    }
};

(window as any).fetchAllLiveResults = async () => {
    const c = document.getElementById('live-cards-container');
    if(!c) return;
    const active = (window as any).pools.filter((p:any) => p.visible);
    c.innerHTML = active.length === 0 ? '<p class="text-center text-slate-500 py-10 md:py-20 md:text-lg md:col-span-2 lg:col-span-3">Belum ada pasaran.</p>' : '';
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    for (let p of active) {
        let draws: any[] = [];
        if (p.liveDraws && p.liveDraws.length > 0) {
            draws = p.liveDraws;
        } else {
            draws = [{ name: "Live Result", urlLive: p.urlLive, sheetNameLive: p.sheetNameLive, rangeLive: p.rangeLive }];
        }

        const card = document.createElement('div');
        card.className = "relative rounded-xl border border-slate-700 shadow-xl overflow-hidden bg-slate-800 transition-all";
        
        const bgStyle = p.imageUrl ? `background-image: url('${p.imageUrl}')` : '';
        const bgLayer = p.imageUrl ? `<div class="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay pointer-events-none" style="${bgStyle}"></div><div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/90 to-slate-900/40 pointer-events-none"></div>` : '';
        
        let innerHtml = `
            ${bgLayer}
            <div class="relative z-10 p-5 md:p-6 h-full flex flex-col">
                <div class="flex justify-between items-center mb-1 border-b border-slate-700/50 pb-3 md:pb-4 cursor-pointer group" onclick="togglePoolDraws('${p.id}')">
                    <div class="flex flex-col">
                        <h3 class="text-sm md:text-base font-black text-slate-200 uppercase tracking-widest drop-shadow-md flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
                            <i class="ph-fill ph-broadcast text-emerald-400 animate-pulse"></i> ${p.name}
                        </h3>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-[9px] md:text-[10px] text-slate-400 font-bold bg-slate-900/50 px-2 py-1 rounded border border-slate-700"><i class="ph-bold ph-calendar-blank"></i> ${dateStr}</span>
                            ${draws.length > 1 ? `<span class="text-[8px] md:text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold shadow-inner border border-emerald-500/30">${draws.length} Putaran</span>` : ''}
                        </div>
                    </div>
                    <div class="p-2 md:p-2.5 bg-slate-900/50 rounded-full border border-slate-700 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all">
                        <i class="ph-bold ph-caret-down text-slate-400 group-hover:text-emerald-400 transition-transform duration-300 text-lg" id="draws-icon-${p.id}" style="transform: rotate(180deg);"></i>
                    </div>
                </div>
                <div class="flex-1 grid grid-cols-1 ${draws.length > 1 ? 'md:grid-cols-2' : ''} gap-3 md:gap-4 mt-4 md:mt-5 transition-all duration-300 origin-top content-start" id="draws-container-${p.id}">
        `;

        draws.forEach((d:any, idx:number) => {
            const singleModeClass = draws.length === 1 ? 'text-center py-6 md:py-8' : 'p-3 md:p-4';
            const numSizeClass = draws.length === 1 ? 'text-5xl md:text-6xl' : 'text-2xl md:text-3xl';
            
            innerHtml += `
                <div class="bg-slate-900/60 rounded-xl border border-slate-700/50 backdrop-blur-sm relative group ${singleModeClass}">
                    <button onclick="previewLiveScrape('${p.id}', ${idx})" class="absolute top-2 right-2 z-20 text-slate-400 hover:text-emerald-400 opacity-50 group-hover:opacity-100 bg-slate-800/80 p-1.5 md:p-2 rounded-lg border border-slate-700 transition-opacity" title="Lihat Raw Data Putaran Ini"><i class="ph-bold ph-eye text-base"></i></button>
                    <p class="text-[9px] md:text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">${d.name}</p>
                    <div class="${numSizeClass} font-black text-emerald-400/30 animate-pulse tracking-widest drop-shadow-sm mt-1 md:mt-2" id="draw-res-${p.id}-${idx}">....</div>
                </div>
            `;
        });

        innerHtml += `</div></div>`;
        card.innerHTML = innerHtml;
        c.appendChild(card);

        draws.forEach(async (d:any, idx:number) => {
            const resEl = document.getElementById(`draw-res-${p.id}-${idx}`);
            if(!resEl) return;
            
            try {
                let cleanRes = "0000";
                const sId = getSpreadsheetId(d.urlLive);

                if (sId && d.sheetNameLive) {
                    const csvData = await fetchSpreadsheetTab(sId, d.sheetNameLive, "", d.rangeLive);
                    const matches = csvData.match(/\d{4,5}/g);
                    if (matches && matches.length > 0) cleanRes = matches[matches.length - 1]; 
                    else throw new Error("Angka 4 digit tidak ditemukan");
                } else if (d.urlLive && d.urlLive.trim() !== '') {
                    const html = await (window as any).robustFetch(d.urlLive);
                    const docParser = new DOMParser().parseFromString(html, 'text/html');
                    const td = docParser.querySelector('td');
                    let resText = td ? td.innerText.trim() : html;
                    const match = resText.match(/\d{4}/);
                    cleanRes = match ? match[0] : resText.slice(-4);
                } else {
                    cleanRes = "---"; 
                }

                resEl.classList.remove('text-emerald-400/30', 'animate-pulse');
                resEl.classList.add('text-emerald-400', 'drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]');
                resEl.innerText = cleanRes;
            } catch(e) {
                resEl.classList.remove('text-emerald-400/30', 'animate-pulse', 'text-2xl', 'text-3xl', 'text-5xl', 'text-6xl');
                resEl.classList.add('text-red-400', 'text-sm', 'md:text-base');
                resEl.innerHTML = `<i class="ph-fill ph-warning-circle"></i> Offline`;
            }
        });
    }
};

(window as any).fetchTableData = async (isAI = false, isSilentPreview = false) => {
    const selId = isAI ? 'ai-pool-selector' : 'pool-selector';
    const poolSelector = document.getElementById(selId) as HTMLSelectElement;
    const silentPoolSelector = document.getElementById('pool-selector') as HTMLSelectElement;
    const poolId = isSilentPreview && silentPoolSelector ? silentPoolSelector.value : (poolSelector ? poolSelector.value : null);
    const container = isSilentPreview ? null : document.getElementById(isAI ? 'ai-data-container' : 'data-container');
    
    if (!poolId && container) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-600"><i class="ph ph-table text-5xl mb-2 opacity-20"></i><p class="text-sm">Pilih pasaran</p></div>`;
        return;
    }

    const targetPool = (window as any).pools.find((p:any) => p.id == poolId);
    if(!targetPool) return;
    if(isAI) (window as any).currentAnalyzedPoolName = targetPool.name;
    if(container) container.innerHTML = `<div class="flex flex-col items-center justify-center h-full"><i class="ph ph-spinner-gap animate-spin text-4xl text-emerald-500 mb-3"></i><p class="text-sm font-bold text-emerald-400">Merakit Data...</p></div>`;

    try {
        (window as any).currentTableData = [];
        let rawMatrix: string[][] = [];
        const sheetId = getSpreadsheetId(targetPool.urlHistory);
        
        if (sheetId && targetPool.sheetName) {
            const csvData = await fetchSpreadsheetTab(sheetId, targetPool.sheetName, "", targetPool.rangeHistory);
            const rows = csvData.split('\n');
            rows.forEach(row => {
                const cleanRow = row.trim();
                if(cleanRow) {
                    const cells = cleanRow.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
                    if(cells.some(cell => cell !== '')) rawMatrix.push(cells);
                }
            });
        } else {
            const htmlContent = await (window as any).robustFetch(targetPool.urlHistory);
            const docParser = new DOMParser().parseFromString(htmlContent, 'text/html');
            const tables = docParser.querySelectorAll('table');
            if (tables.length > 0) {
                Array.from(tables[0].rows).forEach(row => {
                    const cells = Array.from(row.cells).map(c => (c as HTMLElement).innerText.trim().replace(/\n/g, ' '));
                    if(cells.join('').trim() !== '') rawMatrix.push(cells);
                });
            } else throw new Error('Gagal menemukan tabel HTML.');
        }

        if(rawMatrix.length > 0) {
            if (targetPool.mapCols) {
                let startColIdx = 0;
                if (targetPool.rangeHistory) {
                    const match = targetPool.rangeHistory.trim().match(/^[A-Za-z]+/);
                    if (match) startColIdx = (window as any).colToIndex(match[0]);
                }

                const globalIndices = targetPool.mapCols.split(',').map((s:string) => (window as any).colToIndex(s)).filter((i:number) => i >= 0);
                const headers = (targetPool.mapHeaders || '').split(',').map((s:string) => s.trim());
                
                const newHeaders: string[] = [];
                globalIndices.forEach((globalIdx: number, i: number) => newHeaders.push(headers[i] || `KOLOM ${String.fromCharCode(65+globalIdx)}`));
                if(newHeaders.length > 0) (window as any).currentTableData.push(newHeaders);

                let previousRowData: string[] = [];

                rawMatrix.forEach((row, rowIndex) => {
                    const newRow: string[] = [];
                    globalIndices.forEach((globalIdx: number, colIndex: number) => {
                        const relIdx = globalIdx - startColIdx;
                        let cellValue = '-';
                        
                        if (relIdx >= 0 && relIdx < row.length) {
                            cellValue = row[relIdx] || '-';
                        }

                        if (targetPool.autoFill && (cellValue === '-' || cellValue.trim() === '')) {
                            cellValue = previousRowData[colIndex] || '-';
                        }
                        newRow.push(cellValue);
                    });

                    previousRowData = [...newRow];
                    if(newRow.some(v => v !== '-' && v.trim() !== '')) {
                        (window as any).currentTableData.push(newRow);
                    }
                });
            } else {
                (window as any).currentTableData = rawMatrix;
            }
        }

        if(!isSilentPreview && container) {
            if((window as any).currentTableData.length > 0) {
                container.innerHTML = '';
                const wrapper = document.createElement('div'); wrapper.className = "w-full overflow-x-auto rounded-xl border border-slate-700/50 shadow-xl bg-slate-900 h-full custom-scrollbar";
                const tbl = document.createElement('table'); tbl.className = "min-w-full text-sm md:text-base text-slate-300 border-collapse whitespace-nowrap";
                
                (window as any).currentTableData.forEach((rowArray: any, index: number) => {
                    const tr = document.createElement('tr');
                    rowArray.forEach((cellData: any) => {
                        const td = document.createElement(index === 0 ? 'th' : 'td');
                        td.innerText = cellData;
                        td.className = index === 0 
                            ? "px-4 md:px-6 py-3 md:py-4 bg-emerald-600/20 text-emerald-400 font-bold border-b-2 border-emerald-500/30 uppercase text-xs md:text-sm text-center sticky top-0 z-10" 
                            : "px-4 md:px-6 py-2 md:py-3 border-b border-slate-700/50 text-center font-medium hover:bg-slate-800/50 transition-colors";
                        tr.appendChild(td);
                    });
                    tbl.appendChild(tr);
                });
                wrapper.appendChild(tbl);
                container.appendChild(wrapper);
            } else {
                throw new Error("Tabel kosong setelah dirender.");
            }
        }
    } catch (error: any) {
        if(container) container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-red-400 p-4 text-center"><i class="ph-fill ph-warning-octagon text-6xl mb-3 opacity-80"></i><p class="text-base font-bold uppercase tracking-wider">Gagal</p><p class="text-xs text-slate-500 mt-2 bg-slate-800 p-3 rounded-lg border border-slate-700 max-w-sm">${error.message}</p></div>`;
        if(isSilentPreview) throw error;
    }
};

(window as any).addPasaran = async (e: any) => {
    e.preventDefault();
    if(!(window as any).cloudUserId) return (window as any).showToast("Cloud DB belum siap", true);
    
    const btn = document.getElementById('btn-submit-pasaran') as HTMLButtonElement;
    if(btn) {
        btn.innerHTML = `<i class="ph ph-spinner-gap animate-spin"></i> MENYIMPAN...`;
        btn.disabled = true;
    }

    const name = (document.getElementById('input-name') as HTMLInputElement).value;
    const imageUrl = (document.getElementById('input-image-url') as HTMLInputElement).value;
    const urlHistory = (document.getElementById('input-url-history') as HTMLInputElement).value;
    const sheetName = (document.getElementById('input-pasaran-sheetname') as HTMLInputElement).value;
    const rangeHistory = (document.getElementById('input-pasaran-rangehistory') as HTMLInputElement).value;
    const mapCols = (document.getElementById('input-pasaran-map-cols') as HTMLInputElement).value;
    const mapHeaders = (document.getElementById('input-pasaran-map-headers') as HTMLInputElement).value;
    const autoFill = (document.getElementById('input-pasaran-autofill') as HTMLInputElement).checked;
    const visible = (document.getElementById('input-visible') as HTMLInputElement).checked;
    
    // Validate live draws
    const validLiveDraws = (window as any).currentLiveDraws.filter((d: any) => d.name && d.urlLive);

    const id = (window as any).editingPasaranId || Date.now().toString();
    
    const docData: any = {
        id, name, imageUrl, urlHistory, sheetName, rangeHistory, 
        mapCols, mapHeaders, autoFill, visible,
        liveDraws: validLiveDraws
    };
    
    await setDoc(doc(db, 'pools', id), docData, {merge: true});
    
    (window as any).showToast((window as any).editingPasaranId ? "Pasaran Diperbarui!" : "Pasaran Baru ditambahkan!");
    (window as any).cancelEditPasaran();
    
    if(btn) {
        btn.innerHTML = `SIMPAN KE CLOUD`;
        btn.disabled = false;
    }
};

(window as any).editPasaran = (id: string) => {
    const p = (window as any).pools.find((x:any) => x.id === id);
    if(!p) return;
    
    (window as any).editingPasaranId = id;
    (document.getElementById('input-name') as HTMLInputElement).value = p.name || '';
    (document.getElementById('input-image-url') as HTMLInputElement).value = p.imageUrl || '';
    (document.getElementById('input-url-history') as HTMLInputElement).value = p.urlHistory || '';
    (document.getElementById('input-pasaran-sheetname') as HTMLInputElement).value = p.sheetName || '';
    (document.getElementById('input-pasaran-rangehistory') as HTMLInputElement).value = p.rangeHistory || '';
    (document.getElementById('input-pasaran-map-cols') as HTMLInputElement).value = p.mapCols || '';
    (document.getElementById('input-pasaran-map-headers') as HTMLInputElement).value = p.mapHeaders || '';
    (document.getElementById('input-pasaran-autofill') as HTMLInputElement).checked = !!p.autoFill;
    (document.getElementById('input-visible') as HTMLInputElement).checked = p.visible !== false;
    
    (window as any).currentLiveDraws = p.liveDraws ? JSON.parse(JSON.stringify(p.liveDraws)) : [];
    (window as any).renderLiveDrawsEditor();
    
    document.getElementById('btn-cancel-pasaran')?.classList.remove('hidden');
    (document.getElementById('btn-submit-pasaran') as HTMLButtonElement).innerText = 'UPDATE PASARAN CLOUD';
    
    document.getElementById('sub-admin-pasaran')?.scrollIntoView({ behavior: 'smooth' });
};

(window as any).cancelEditPasaran = () => {
    (window as any).editingPasaranId = null;
    ['input-name', 'input-image-url', 'input-url-history', 'input-pasaran-sheetname', 'input-pasaran-rangehistory', 'input-pasaran-map-cols', 'input-pasaran-map-headers'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if(el) el.value = '';
    });
    (document.getElementById('input-pasaran-autofill') as HTMLInputElement).checked = false;
    (document.getElementById('input-visible') as HTMLInputElement).checked = true;
    (window as any).currentLiveDraws = [];
    (window as any).renderLiveDrawsEditor();
    
    document.getElementById('btn-cancel-pasaran')?.classList.add('hidden');
    (document.getElementById('btn-submit-pasaran') as HTMLButtonElement).innerText = 'SIMPAN KE CLOUD';
};

(window as any).duplicatePasaran = async (id: string) => {
    const p = (window as any).pools.find((x:any) => x.id === id);
    if(!p) return;
    
    const newId = Date.now().toString();
    const newP = { ...p, id: newId, name: p.name + " (Copy)" };
    
    await setDoc(doc(db, 'pools', newId), newP);
    (window as any).showToast("Pasaran diduplikasi!");
};

(window as any).deletePasaran = (id: string) => {
    (window as any).showConfirm("Yakin hapus pasaran ini secara permanen?", async () => {
        if(!(window as any).cloudUserId) return;
        await deleteDoc(doc(db, 'pools', id));
        (window as any).showToast("Pasaran dihapus!", true);
    });
};

(window as any).movePasaranUp = async (id: string) => {
    const pools = (window as any).pools;
    const idx = pools.findIndex((p:any) => p.id === id);
    if(idx <= 0) return;
    // Swap with above
    const current = pools[idx];
    const above = pools[idx - 1];
    
    // Assign order property to fix sorting persistently
    // We rewrite all order sequentially
    const batch = writeBatch(db);
    pools.forEach((p:any, i:number) => { p.order = i; });
    
    // Swap order
    current.order = idx - 1;
    above.order = idx;
    
    // Sort locally first
    pools.sort((a:any, b:any) => (a.order || 0) - (b.order || 0));
    
    pools.forEach((p:any) => {
        batch.set(doc(db, 'pools', p.id), p);
    });
    await batch.commit();
    (window as any).renderAdminLists();
};

(window as any).movePasaranDown = async (id: string) => {
    const pools = (window as any).pools;
    const idx = pools.findIndex((p:any) => p.id === id);
    if(idx === -1 || idx === pools.length - 1) return;
    const current = pools[idx];
    const below = pools[idx + 1];
    
    const batch = writeBatch(db);
    pools.forEach((p:any, i:number) => { p.order = i; });
    
    // Swap order
    current.order = idx + 1;
    below.order = idx;
    
    // Sort locally first
    pools.sort((a:any, b:any) => (a.order || 0) - (b.order || 0));
    
    pools.forEach((p:any) => {
        batch.set(doc(db, 'pools', p.id), p);
    });
    await batch.commit();
    (window as any).renderAdminLists();
};

(window as any).openFormSandingan = () => {
    const form = document.getElementById('form-sandingan') as HTMLFormElement;
    if(form) {
        form.classList.remove('hidden');
        document.getElementById('title-form-sandingan')!.innerHTML = `<i class="ph-bold ph-plus-circle"></i> Tambah Koneksi Baru`;
        form.reset();
        (window as any).editingSourceId = null;
    }
};

(window as any).cancelSandingan = () => {
    const form = document.getElementById('form-sandingan') as HTMLFormElement;
    if(form) { form.classList.add('hidden'); form.reset(); }
    (document.getElementById('sand-prompt') as HTMLTextAreaElement).value = '';
    (window as any).editingSourceId = null;
};

(window as any).saveGlobalSandinganPrompt = async (val: string) => {
    if(!(window as any).cloudUserId) return;
    await setDoc(getDocRef('settings', 'sandingan_config'), { globalPrompt: val }, { merge: true });
};

(window as any).saveSandingan = async (e: any) => {
    e.preventDefault();
    if(!(window as any).cloudUserId) return (window as any).showToast("Cloud DB belum siap", true);
    
    const btn = document.getElementById('btn-sand-submit') as HTMLButtonElement;
    let oldHTML = btn.innerHTML;
    btn.innerHTML = `<i class="ph ph-spinner-gap animate-spin text-lg"></i> MENYIMPAN...`;
    btn.disabled = true;

    const title = (document.getElementById('sand-title') as HTMLInputElement).value;
    const url = (document.getElementById('sand-url') as HTMLInputElement).value;
    const sheetName = (document.getElementById('sand-sheet') as HTMLInputElement).value;
    const range = (document.getElementById('sand-range') as HTMLInputElement).value;
    const query = (document.getElementById('sand-query') as HTMLInputElement).value;
    const prompt = (document.getElementById('sand-prompt') as HTMLInputElement).value;
    const sheetId = getSpreadsheetId(url);

    if (!sheetId) {
        (window as any).showToast("URL Google Sheets tidak valid. Harus mengandung /d/.../", true);
        btn.innerHTML = `<i class="ph-bold ph-floppy-disk text-lg"></i> SIMPAN`;
        btn.disabled = false;
        return;
    }

    const id = (window as any).editingSourceId || Date.now().toString();
    await setDoc(getDocRef('extra_sources', id), { 
        id, title, url, sheetId, sheetName, range, query, prompt, active: true 
    }, {merge: true}); 
    
    (window as any).showToast((window as any).editingSourceId ? "Data Sandingan Diperbarui!" : "Data Sandingan Baru ditambahkan!");
    (window as any).cancelSandingan();
    
    btn.innerHTML = `<i class="ph-bold ph-floppy-disk text-lg"></i> SIMPAN`;
    btn.disabled = false;
};

(window as any).editExtraSource = (id: string) => {
    const s = (window as any).extraSources.find((x:any) => x.id === id);
    if(!s) return;
    (window as any).editingSourceId = id;
    
    document.getElementById('form-sandingan')!.classList.remove('hidden');
    document.getElementById('title-form-sandingan')!.innerHTML = `<i class="ph-bold ph-pencil"></i> Edit Koneksi Sandingan`;
    
    (document.getElementById('sand-title') as HTMLInputElement).value = s.title || '';
    (document.getElementById('sand-url') as HTMLInputElement).value = s.url || '';
    (document.getElementById('sand-sheet') as HTMLInputElement).value = s.sheetName || '';
    (document.getElementById('sand-range') as HTMLInputElement).value = s.range || '';
    (document.getElementById('sand-query') as HTMLInputElement).value = s.query || '';
    (document.getElementById('sand-prompt') as HTMLInputElement).value = s.prompt || '';
    
    document.getElementById('sub-admin-spreadsheet')!.scrollIntoView({behavior: "smooth"});
};

(window as any).toggleExtraSource = async (id: string, newActiveStatus: boolean) => {
    if(!(window as any).cloudUserId) return;
    await setDoc(getDocRef('extra_sources', id), { active: newActiveStatus }, { merge: true });
};
(window as any).deleteExtraSource = (id: string) => { (window as any).showConfirm("Hapus Sumber Data ini?", async () => { if(!(window as any).cloudUserId) return; await deleteDoc(getDocRef('extra_sources', id)); (window as any).showToast("Dihapus!", true); }); };

(window as any).executeImportPermanen = async (e: any) => {
    e.preventDefault();
    if(!(window as any).cloudUserId) return (window as any).showToast("Cloud DB belum siap", true);
    
    const targetType = (document.getElementById('imp-type') as HTMLSelectElement).value;
    const url = (document.getElementById('imp-url') as HTMLInputElement).value;
    const sheetName = (document.getElementById('imp-sheet') as HTMLInputElement).value;
    const range = (document.getElementById('imp-range') as HTMLInputElement).value;
    const btn = document.getElementById('btn-imp-submit') as HTMLButtonElement;

    const sheetId = getSpreadsheetId(url);
    if (!sheetId) return (window as any).showToast("URL Google Sheets tidak valid. Harus mengandung /d/.../", true);

    btn.disabled = true;
    btn.innerHTML = `<i class="ph ph-spinner-gap animate-spin"></i> MENYEDOT...`;
    (window as any).showToast("Menyortir & Menyedot dari Spreadsheet...");

    try {
        const csvData = await fetchSpreadsheetTab(sheetId, sheetName, "", range);
        const rows = csvData.split('\n');
        let count = 0;
        const batch = writeBatch(db);

        let startColIdx = 0;
        if (range) {
            const match = range.trim().match(/^[A-Za-z]+/);
            if (match) startColIdx = (window as any).colToIndex(match[0]);
        }

        for (let i = 0; i < rows.length; i++) {
            let row = rows[i].trim();
            if (!row) continue;
            const parts = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

            const getPart = (colLetter: string, defaultIdx: number) => {
                if (!colLetter) return parts[defaultIdx];
                const globalIdx = (window as any).colToIndex(colLetter);
                const relIdx = globalIdx - startColIdx;
                return relIdx >= 0 && relIdx < parts.length ? parts[relIdx] : undefined;
            };

            if (targetType === 'prompt') {
                const title = getPart((document.getElementById('map-prompt-title') as HTMLInputElement).value, 0);
                const text = getPart((document.getElementById('map-prompt-text') as HTMLInputElement).value, 1);
                if (title && text && title.toLowerCase() !== 'judul' && title.toLowerCase() !== 'title') {
                    const id = Date.now().toString() + count;
                    batch.set(getDocRef('prompts', id), { id, title, text });
                    count++;
                }
            } else if (targetType === 'global') {
                const text = getPart((document.getElementById('map-global-text') as HTMLInputElement).value, 0);
                if (text && text.toLowerCase() !== 'aturan' && text.toLowerCase() !== 'rule') {
                    const id = Date.now().toString() + count;
                    batch.set(getDocRef('globals', id), { id, text });
                    count++;
                }
            } else if (targetType === 'mimpi') {
                const type = getPart((document.getElementById('map-mimpi-type') as HTMLInputElement).value, 0);
                const no = getPart((document.getElementById('map-mimpi-no') as HTMLInputElement).value, 1);
                const desc = getPart((document.getElementById('map-mimpi-desc') as HTMLInputElement).value, 2);
                
                const finalType = type ? type.toUpperCase() : '';
                if (['2D', '3D', '4D'].includes(finalType) && no) {
                    const id = Date.now().toString() + count;
                    batch.set(getDocRef('mimpi', id), { id, type: finalType, no, desc });
                    count++;
                }
            }
        }

        if (count > 0) {
            await batch.commit();
            (window as any).showToast(`SEMPURNA! ${count} data berhasil dimasukkan secara permanen ke Database.`);
            e.target.reset();
        } else {
            (window as any).showToast(`Gagal: Data kosong atau pemetaan kolom salah.`, true);
        }
    } catch (error) {
        (window as any).showToast("Gagal menyedot. Pastikan URL benar & Sheet Publik.", true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `EKSEKUSI IMPORT`;
    }
};

(window as any).previewFormSheet = async (mode: string, explicitId = null) => {
    let url, sheetName, range, query = "";
    let sheetId = null;

    if (explicitId) {
        const s = (window as any).extraSources.find((x:any) => x.id === explicitId);
        if(!s) return;
        url = s.url; sheetName = s.sheetName; range = s.range; query = s.query;
    } else {
        if (mode === 'sandingan') {
            url = (document.getElementById('sand-url') as HTMLInputElement).value;
            sheetName = (document.getElementById('sand-sheet') as HTMLInputElement).value;
            range = (document.getElementById('sand-range') as HTMLInputElement).value;
            query = (document.getElementById('sand-query') as HTMLInputElement).value;
        } else {
            url = (document.getElementById('imp-url') as HTMLInputElement).value;
            sheetName = (document.getElementById('imp-sheet') as HTMLInputElement).value;
            range = (document.getElementById('imp-range') as HTMLInputElement).value;
        }
    }
    
    sheetId = getSpreadsheetId(url);

    if(!sheetId || !sheetName) return (window as any).showToast("Harap isi URL Spreadsheet dan Nama Sheet terlebih dahulu!", true);

    const modal = document.getElementById('table-preview-modal');
    const body = document.getElementById('table-preview-body');
    const title = document.getElementById('table-preview-title');
    if(!modal || !body || !title) return;
    
    title.innerHTML = `<i class="ph-fill ph-table"></i> Pratinjau Hub: ${sheetName}`;
    body.innerHTML = `<div class="flex flex-col items-center justify-center h-full mt-10 md:mt-20"><i class="ph-fill ph-spinner-gap animate-spin text-5xl md:text-6xl text-emerald-500 mb-3 md:mb-4"></i><p class="text-slate-400 text-sm md:text-base">Menyedot data...</p></div>`;
    
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.replace('opacity-0', 'opacity-100'); document.getElementById('table-preview-content')!.classList.replace('scale-95', 'scale-100'); }, 10);

    try {
        const csvData = await fetchSpreadsheetTab(sheetId, sheetName, query, range);
        const rows = csvData.split('\n');
        let tableHtml = '<div class="w-full overflow-x-auto custom-scrollbar"><table class="w-full text-left border-collapse min-w-max"><thead class="bg-slate-800 text-emerald-400 sticky top-0 shadow-sm"><tr>';
        
        if (rows.length > 0 && rows[0].trim()) {
            const maxRows = Math.min(rows.length, 100);
            for(let i=0; i<maxRows; i++) {
                let row = rows[i].trim();
                if(!row) continue;
                const parts = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
                
                if(i === 0) {
                    parts.forEach((p, idx) => tableHtml += `<th class="p-3 md:p-4 border-b-2 border-emerald-500/30 whitespace-nowrap"><span class="text-[9px] md:text-xs text-slate-500 block">Kolom ${String.fromCharCode(65+idx)}</span>${p}</th>`);
                    tableHtml += '</tr></thead><tbody class="divide-y divide-slate-800/50">';
                } else {
                    tableHtml += '<tr class="hover:bg-slate-800/50 transition-colors">';
                    parts.forEach(p => tableHtml += `<td class="p-3 md:p-4 border-r border-slate-800/30 whitespace-nowrap text-slate-300 font-medium text-sm md:text-base">${p}</td>`);
                    tableHtml += '</tr>';
                }
            }
            tableHtml += '</tbody></table></div>';
            if(rows.length > 100) tableHtml += `<p class="text-center text-amber-500 mt-6 font-bold bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 max-w-sm mx-auto">⚠️ Menampilkan 100 baris pertama.</p>`;
            body.innerHTML = tableHtml;
        } else {
            body.innerHTML = '<div class="text-center mt-10 md:mt-20 text-slate-500"><i class="ph-fill ph-empty text-5xl md:text-6xl mb-3 opacity-50"></i><p class="text-base">Data kosong.</p></div>';
        }
    } catch(e: any) {
        body.innerHTML = `<div class="text-center mt-10 md:mt-20 text-red-400 bg-red-500/10 p-6 rounded-xl border border-red-500/30 max-w-md mx-auto"><i class="ph-fill ph-warning-octagon text-6xl mb-4"></i><br><p class="font-bold text-lg">GAGAL MEMBACA DATA</p><p class="text-xs md:text-sm text-slate-400 mt-2">${e.message}</p></div>`;
    }
};

(window as any).previewTableScrape = async (poolId: string) => {
    const p = (window as any).pools.find((x:any) => x.id === poolId);
    if(!p) return;
    
    document.getElementById('pool-selector')!.value = poolId;
    const modal = document.getElementById('table-preview-modal');
    const body = document.getElementById('table-preview-body');
    const title = document.getElementById('table-preview-title');
    if(!modal || !body || !title) return;
    
    title.innerHTML = `<i class="ph-fill ph-table"></i> Cek Mapping: ${p.name}`;
    body.innerHTML = `<div class="flex flex-col items-center justify-center h-full mt-20"><i class="ph-fill ph-spinner-gap animate-spin text-6xl text-emerald-500 mb-4"></i><p class="text-slate-400">Merakit Mapping...</p></div>`;
    
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.replace('opacity-0', 'opacity-100'); document.getElementById('table-preview-content')!.classList.replace('scale-95', 'scale-100'); }, 10);

    try {
        await (window as any).fetchTableData(false, true); 
        
        if((window as any).currentTableData && (window as any).currentTableData.length > 0) {
            let tableHtml = '<div class="w-full overflow-x-auto custom-scrollbar"><table class="w-full text-left border-collapse min-w-max"><thead class="bg-slate-800 text-emerald-400 sticky top-0 shadow-sm"><tr>';
            
            (window as any).currentTableData.forEach((rowArray: any, index: number) => {
                if(index === 0) {
                    rowArray.forEach((cellData: any) => tableHtml += `<th class="p-4 border-b-2 border-emerald-500/30 whitespace-nowrap">${cellData}</th>`);
                    tableHtml += '</tr></thead><tbody class="divide-y divide-slate-800/50">';
                } else {
                    tableHtml += '<tr class="hover:bg-slate-800/50 transition-colors">';
                    rowArray.forEach((cellData: any) => tableHtml += `<td class="p-4 border-r border-slate-800/30 whitespace-nowrap text-slate-300 font-medium">${cellData}</td>`);
                    tableHtml += '</tr>';
                }
            });
            tableHtml += '</tbody></table></div>';
            body.innerHTML = tableHtml;
        } else {
            body.innerHTML = '<div class="text-center mt-20 text-slate-500"><i class="ph-fill ph-empty text-6xl mb-3 opacity-50"></i><p>Tabel kosong atau mapping salah.</p></div>';
        }
    } catch(e: any) {
        body.innerHTML = `<div class="text-center mt-20 text-red-400 bg-red-500/10 p-6 rounded-xl border border-red-500/30 max-w-md mx-auto"><i class="ph-fill ph-warning-octagon text-6xl mb-4"></i><br><p class="font-bold text-lg">GAGAL</p><p class="text-sm text-slate-400 mt-2">${e.message}</p></div>`;
    }
};

(window as any).previewLiveScrape = async (poolId: string, drawIdx: number = 0) => {
    const p = (window as any).pools.find((x:any) => x.id === poolId);
    if(!p) return;
    
    let drawObj = { name: "Live", urlLive: p.urlLive, sheetNameLive: p.sheetNameLive, rangeLive: p.rangeLive };
    if (p.liveDraws && p.liveDraws.length > drawIdx) drawObj = p.liveDraws[drawIdx];

    const modal = document.getElementById('table-preview-modal');
    const body = document.getElementById('table-preview-body');
    const title = document.getElementById('table-preview-title');
    if(!modal || !body || !title) return;
    
    title.innerHTML = `<i class="ph-fill ph-broadcast"></i> Raw Data Live: ${p.name} - ${drawObj.name}`;
    body.innerHTML = `<div class="flex flex-col items-center justify-center h-full mt-20"><i class="ph-fill ph-spinner-gap animate-spin text-6xl text-emerald-500 mb-4"></i><p class="text-slate-400">Menarik data live...</p></div>`;
    
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.replace('opacity-0', 'opacity-100'); document.getElementById('table-preview-content')!.classList.replace('scale-95', 'scale-100'); }, 10);

    try {
        let rawContent = "";
        const sId = getSpreadsheetId(drawObj.urlLive);
        if (sId && drawObj.sheetNameLive) {
            rawContent = await fetchSpreadsheetTab(sId, drawObj.sheetNameLive, "", drawObj.rangeLive);
        } else if (drawObj.urlLive && drawObj.urlLive.trim() !== '') {
            rawContent = await (window as any).robustFetch(drawObj.urlLive);
        } else {
            throw new Error("URL Live tidak dikonfigurasi.");
        }

        const safeHtml = rawContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        body.innerHTML = `
            <div class="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg mb-4 text-amber-400 text-sm font-bold flex gap-3">
                <i class="ph-fill ph-info text-2xl"></i>
                <p>Ini adalah RAW DATA yang ditarik AI dari sumber. Sistem akan otomatis mencari angka 4 digit terakhir dari teks ini.</p>
            </div>
            <pre class="bg-slate-950 p-4 rounded-lg border border-slate-800 text-slate-400 text-xs shadow-inner overflow-auto max-h-[60vh] whitespace-pre-wrap word-break tracking-wide font-mono">${safeHtml}</pre>
        `;
    } catch(e: any) {
         body.innerHTML = `<div class="text-center mt-20 text-red-400 bg-red-500/10 p-6 rounded-xl border border-red-500/30 max-w-md mx-auto"><i class="ph-fill ph-warning-octagon text-6xl mb-4"></i><br><p class="font-bold text-lg">GAGAL TARIK LIVE</p><p class="text-sm text-slate-400 mt-2">${e.message}</p></div>`;
    }
};

(window as any).generateAI = async () => {
    const sel = document.getElementById('ai-pool-selector') as HTMLSelectElement;
    const aiRes = document.getElementById('ai-result');
    const aiRawBtn = document.getElementById('btn-raw-tafsir');
    if(!sel.value || !aiRes) return (window as any).showToast("Pilih pasaran dulu!", true);

    const apiKey = ((window as any).appConfig && (window as any).appConfig.apiKey && (window as any).appConfig.apiKey.trim() !== "") ? (window as any).appConfig.apiKey : (window as any).DEFAULT_API_KEY;
    
    if(!apiKey || apiKey.trim() === "") {
         return (window as any).showToast("Kunci API Master Belum Diatur! Masukkan API Key Gemini di Panel Admin.", true);
    }
    
    const pPrompt = (document.getElementById('ai-prompt-selector') as HTMLSelectElement).value;
    const manualPrompt = (document.getElementById('ai-manual-prompt') as HTMLTextAreaElement).value;

    const btn = document.getElementById('btn-generate-ai') as HTMLButtonElement;
    if(btn) { btn.innerHTML = `<i class="ph-fill ph-spinner-gap animate-spin text-lg md:text-xl"></i> ANALISIS...`; btn.disabled = true; }
    
    let basePrompt = "Kamu adalah Engine SupremeTOTO Master yang bertugas menganalisis histori angka dan meracik angka paten.\n";
    if((window as any).globalRules && (window as any).globalRules.length > 0) {
        basePrompt += "\n[ATURAN SYSTEM INTI]:\n";
        (window as any).globalRules.forEach((g:any) => basePrompt += `- ${g.text}\n`);
    }

    let dynamicVarInstruction = `\n[FORMAT OUTPUT WAJIB]:\nKeluarkan hasil akhir HANYA dalam format variabel berikut, sesuai key ini persis:\n`;
    (window as any).syairVariables.forEach((v:any) => {
        dynamicVarInstruction += `{{${v}}}: ...\n`;
    });
    basePrompt += dynamicVarInstruction;

    const useSandingan = (document.getElementById('toggle-sandingan') as HTMLInputElement).checked;
    let sandinganDataText = "";
    if (useSandingan) {
        const activeSources = (window as any).extraSources.filter((s:any) => s.active);
        if (activeSources.length === 0) {
            (window as any).showToast("Tombol Hub: Data Sandingan aktif, tapi Anda belum membuat sumber Sandingan aktif di setting.", true);
        } else {
             (window as any).showToast(`Menarik ${activeSources.length} sumber data sandingan tambahan...`);
             try {
                for (let s of activeSources) {
                    if (s.sheetId && s.sheetName) {
                        const csvData = await fetchSpreadsheetTab(s.sheetId, s.sheetName, s.query, s.range);
                        sandinganDataText += `\n[DATA SANDINGAN: ${s.title}]\nInstruksi Sandingan Ini: ${s.prompt}\nData:\n${csvData}\n`;
                    }
                }
             } catch(e) {
                 console.error("Error tarik sandingan:", e);
                 (window as any).showToast("Peringatan: Gagal menarik beberapa data sandingan.", true);
             }
        }
    }

    basePrompt += `\n[DATA HISTORI (Hanya untuk referensi)]:\n${JSON.stringify((window as any).currentTableData.slice(0, 50))}`;
    if (sandinganDataText) basePrompt += sandinganDataText;
    
    if((window as any).sandinganConfig && (window as any).sandinganConfig.globalPrompt) {
        basePrompt += `\n[INSTRUKSI GLOBAL DATA SANDINGAN]:\n${(window as any).sandinganConfig.globalPrompt}\n`;
    }

    if(pPrompt) basePrompt += `\n[INSTRUKSI/POLA UTAMA]:\n${pPrompt}`;
    if(manualPrompt) basePrompt += `\n[TAMBAHAN MANUAL PENGGUNA]:\n${manualPrompt}`;

    const infoEl = document.getElementById('ai-model-info');
    if(infoEl) {
        infoEl.innerHTML = `
            <div class="flex items-center justify-center gap-3 w-full max-w-sm mx-auto">
                <div class="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin"></div>
                <div class="text-left">
                    <p class="text-xs text-emerald-500 font-bold tracking-widest uppercase mb-0.5">Gemini 3.0 Flash</p>
                    <p class="text-[10px] text-slate-400 font-mono" id="ai-loading-text">Menyinkronkan Vektor...</p>
                </div>
            </div>`;
    }

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
        const data = await fetchGeminiWithRetry(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: basePrompt }] }] })
        }, 3); 

        const resTxt = data.candidates[0].content.parts[0].text;
        (window as any).lastAITextSyair = resTxt;

        if (infoEl) infoEl.innerHTML = `<span class="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold border border-purple-400">GEMINI 3.0</span> <span class="text-xs text-slate-400 ml-2">Analisis Selesai</span>`;
        if (aiRawBtn) aiRawBtn.classList.remove('hidden');

        (window as any).openSyairEditor();

    } catch (error: any) {
        aiRes.innerHTML = `<div class="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-500 flex items-center gap-3"><i class="ph-fill ph-warning-octagon text-3xl"></i><div><p class="font-bold text-sm">Gagal Sinkronisasi AI</p><p class="text-xs opacity-80">${error.message}</p></div></div>`;
        if (infoEl) infoEl.innerHTML = `<span class="text-red-400 text-xs"><i class="ph-fill ph-warning-circle"></i> Koneksi AI Terputus</span>`;
    } finally {
        if(btn) { btn.innerHTML = `<i class="ph-fill ph-brain text-lg md:text-xl"></i> Mulai Analisis AI`; btn.disabled = false; }
    }
};

(window as any).renderSyairVarsAdmin = () => {
    const list = document.getElementById('syair-vars-list');
    if (!list) return;
    
    list.innerHTML = '';
    ((window as any).syairVariables || []).forEach((v: string) => {
        list.innerHTML += `<span class="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-1 rounded text-[10px] font-bold">{{${v}}}</span>`;
    });
};

(window as any).updateAdminSyairPreview = () => {
    const t = (window as any).syairTemplate;
    if (!t) return;
    
    const bgUrl = (document.getElementById('edit-syair-bg') as HTMLInputElement)?.value || t.bgUrl || '';
    const mainCol = (document.getElementById('edit-syair-color-main') as HTMLInputElement)?.value || t.mainColor || '#10b981';
    const accCol = (document.getElementById('edit-syair-color-accent') as HTMLInputElement)?.value || t.accentColor || '#3b82f6';
    const htmlVal = (document.getElementById('input-syair-html') as HTMLTextAreaElement)?.value || t.html || (window as any).defaultSyairHTML;
    const footerVal = (document.getElementById('edit-syair-footer') as HTMLInputElement)?.value || t.footer || 'SUPREME TOTO AI GENERATED';

    const previewContainer = document.getElementById('admin-syair-preview-canvas');
    if (previewContainer) {
        let compiled = htmlVal;
        
        let dummyVars: any = {
            'PASARAN': 'SYDNEY',
            'TANGGAL': 'SABTU, 01 JAN 2026',
            'BBFS': '1234567',
            'AM': '1234',
            'AI': '5678',
            'CB': '1/2',
            'CM': '12/34',
            'KEPALA': '123',
            'EKOR': '456',
            'SHIO': 'NAGA',
            '4D': '1234, 5678',
            '3D': '234, 678',
            '2D': '12, 34, 56, 78',
            'TWIN': '11, 22',
            'JITU': '1234'
        };

        (window as any).syairVariables.forEach((v: string) => {
            if(!dummyVars[v]) dummyVars[v] = `[${v}]`; 
        });

        Object.keys(dummyVars).forEach(k => {
            compiled = compiled.replace(new RegExp(`{{${k}}}`, 'g'), dummyVars[k]);
        });
        
        compiled = compiled.replace(/{{MAIN_COLOR}}/g, mainCol)
                           .replace(/{{ACCENT_COLOR}}/g, accCol)
                           .replace(/{{FOOTER_TEXT}}/g, footerVal);

        previewContainer.innerHTML = compiled;
        previewContainer.style.backgroundImage = bgUrl ? `url('${bgUrl}')` : 'none';
        previewContainer.style.backgroundSize = 'cover';
        previewContainer.style.backgroundPosition = 'center';
    }
};

(window as any).safeEvaluateCode = (code: string, safeVars: any) => {
    try {
        const keys = Object.keys(safeVars);
        const vals = Object.values(safeVars);
        const fn = new Function(...keys, `return ${code}`);
        return fn(...vals);
    } catch { return ""; }
};

(window as any).openSyairEditor = () => {
    const aiText = (window as any).lastAITextSyair;
    if (!aiText) return (window as any).showToast("Analisis AI kosong! Buat analisis dulu.", true);

    const modal = document.getElementById('syair-editor-modal');
    if(!modal) return;
    
    const pSel = document.getElementById('ai-pool-selector') as HTMLSelectElement;
    const pName = pSel && pSel.selectedIndex >= 0 ? pSel.options[pSel.selectedIndex].text : "PASARAN";
    
    let htmlContent = (window as any).syairTemplate?.html || (window as any).defaultSyairHTML;
    
    // Extractor
    let rawVars: any = {};
    (window as any).syairVariables.forEach((v: string) => {
        const regex = new RegExp(`{{${v}}}:\\s*(.+)`, 'i');
        const match = aiText.match(regex);
        if (match && match[1]) {
            rawVars[v] = match[1].trim();
        } else {
            rawVars[v] = "-";
        }
    });

    rawVars['PASARAN'] = pName;
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    rawVars['TANGGAL'] = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    Object.keys(rawVars).forEach(k => {
        htmlContent = htmlContent.replace(new RegExp(`{{${k}}}`, 'g'), rawVars[k]);
    });

    // Special variables replacement
    htmlContent = htmlContent.replace(/{{MAIN_COLOR}}/g, (window as any).syairTemplate?.mainColor || '#10b981')
                             .replace(/{{ACCENT_COLOR}}/g, (window as any).syairTemplate?.accentColor || '#3b82f6')
                             .replace(/{{FOOTER_TEXT}}/g, (window as any).syairTemplate?.footer || 'SUPREME TOTO AI');


    const canvasObj = document.getElementById('capture-canvas');
    if (canvasObj) {
         canvasObj.innerHTML = htmlContent;
         canvasObj.style.backgroundImage = ((window as any).syairTemplate?.bgUrl) ? `url('${(window as any).syairTemplate.bgUrl}')` : '';
         canvasObj.style.backgroundSize = 'cover';
         canvasObj.style.backgroundPosition = 'center';
    }

    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.replace('opacity-0', 'opacity-100'); }, 10);
};

(window as any).closeSyairEditor = () => {
    const modal = document.getElementById('syair-editor-modal');
    if(modal) {
        modal.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

(window as any).downloadSyairPNG = () => {
    const el = document.getElementById('capture-canvas');
    const btn = document.getElementById('btn-download-png') as HTMLButtonElement;
    if(!el || !btn) return;
    
    const oriHTML = btn.innerHTML;
    btn.innerHTML = `<i class="ph ph-spinner-gap animate-spin"></i> Rendering...`;
    btn.disabled = true;

    (window as any).html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null }).then((canvas: HTMLCanvasElement) => {
        const link = document.createElement('a');
        link.download = `syair-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        btn.innerHTML = oriHTML;
        btn.disabled = false;
        (window as any).showToast("Ekspor PNG Berhasil!");
    }).catch((err: any) => {
        console.error(err);
        btn.innerHTML = oriHTML;
        btn.disabled = false;
        (window as any).showToast("Gagal Merender Canvas. Pastikan URL gambar mendukung CORS.", true);
    });
};

(window as any).resetSyairHTML = async () => {
    if(!(window as any).cloudUserId) return;
    if(confirm("Yakin ingin mengembalikan seluruh pengaturan desain ke DEFAULT?")) {
        try {
            await setDoc(doc(db, 'settings', 'syair_template'), {
                bgUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
                opacity: "80", mainColor: "#fbbf24", accentColor: "#b45309", footer: "Utamakan Prediksi Sendiri",
                html: (window as any).defaultSyairHTML, variables: ["PASARAN", "TANGGAL", "SHIO", "BBFS", "AM", "AI", "CB", "CM", "KEPALA", "EKOR", "JITU", "3D", "4D", "2D", "TWIN"]
            });
            (window as any).showToast("Desain direst! Semua modifikasi HTML otomatis hilang.");
        } catch(e: any) {
            (window as any).showToast(`Error: ${e.message}`, true);
        }
    }
};

(window as any).saveSyairTemplate = async (e: any) => {
    e.preventDefault();
    if(!(window as any).cloudUserId) return;
    const btn = document.getElementById('btn-save-syair') as HTMLButtonElement;
    const prevHtml = btn.innerHTML;
    btn.innerHTML = `<i class="ph ph-spinner-gap animate-spin"></i> MENYIMPAN...`;
    btn.disabled = true;

    try {
        const docData = {
            bgUrl: (document.getElementById('edit-syair-bg') as HTMLInputElement).value,
            opacity: (document.getElementById('edit-syair-opacity') as HTMLInputElement).value,
            mainColor: (document.getElementById('edit-syair-color-main') as HTMLInputElement).value,
            accentColor: (document.getElementById('edit-syair-color-accent') as HTMLInputElement).value,
            footer: (document.getElementById('edit-syair-footer') as HTMLInputElement).value,
            html: ((document.getElementById('input-syair-html') as HTMLTextAreaElement).value).trim(),
            variables: (window as any).syairVariables
        };
        await setDoc(doc(db, 'settings', 'syair_template'), docData, {merge: true});
        (window as any).showToast("Desain Syair & Variabel berhsail tersimpan");
    } catch(e: any) {
        (window as any).showToast(`Gagal nyimpan: ${e.message}`, true);
    } finally {
        btn.innerHTML = prevHtml;
        btn.disabled = false;
    }
};

(window as any).exportSyairHTML = () => {
    const t = (window as any).syairTemplate;
    if (!t) return (window as any).showToast("Data template belum siap.", true);
    
    // Simpan dalam format blob JSON
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(t, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `syair-template-${Date.now()}.json`;
    a.click();
    (window as any).showToast("Berhasil export data template syair!");
};

(window as any).clearAllPrompts = async () => {
    if(!(window as any).cloudUserId) return;
    if(!confirm("Yakin hapus SEMUA Database Pola / Prompt dari sistem? Ini tidak bisa dibatalkan.")) return;
    try {
        const pIds = (window as any).aiPrompts.map((p: any) => p.id);
        const b = writeBatch(db);
        pIds.forEach((id: string) => b.delete(doc(db, 'prompts', id)));
        await b.commit();
        (window as any).showToast("Semua pola berhasil dihapus!");
    } catch(e: any) { (window as any).showToast("Gagal menghapus: " + e.message, true); }
};

(window as any).downloadPrompts = () => {
    if(!(window as any).aiPrompts || (window as any).aiPrompts.length === 0) return (window as any).showToast("Tidak ada data pola untuk dibackup.", true);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify((window as any).aiPrompts, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `backup-prompts-${Date.now()}.json`;
    a.click();
};

(window as any).clearAllGlobals = async () => {
    if(!(window as any).cloudUserId) return;
    if(!confirm("Yakin hapus SEMUA Aturan Global dari sistem?")) return;
    try {
        const gIds = (window as any).globalRules.map((g: any) => g.id);
        const b = writeBatch(db);
        gIds.forEach((id: string) => b.delete(doc(db, 'globals', id)));
        await b.commit();
        (window as any).showToast("Semua aturan global berhasil dihapus!");
    } catch(e: any) { (window as any).showToast("Gagal menghapus: " + e.message, true); }
};

(window as any).downloadGlobals = () => {
    if(!(window as any).globalRules || (window as any).globalRules.length === 0) return (window as any).showToast("Tidak ada data aturan untuk dibackup.", true);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify((window as any).globalRules, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `backup-globals-${Date.now()}.json`;
    a.click();
};

(window as any).exportFullDatabase = async () => {
    if(!(window as any).cloudUserId) return;
    try {
        const data = {
            pools: (window as any).pools || [],
            mimpi: (window as any).dataBukuMimpi || [],
            prompts: (window as any).aiPrompts || [],
            globals: (window as any).globalRules || [],
            extraSources: (window as any).extraSources || [],
            config: (window as any).appConfig || {},
            sandinganConfig: (window as any).sandinganConfig || {},
            syairTemplate: (window as any).syairTemplate || {}
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `backup-full-database-${Date.now()}.json`;
        a.click();
        (window as any).showToast("Berhasil export FULL Database!");
    } catch(e: any) {
        (window as any).showToast("Gagal export database: " + e.message, true);
    }
};

(window as any).importFullDatabase = (e: any) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (ev: any) => {
        try {
            const parsed = JSON.parse(ev.target.result);
            if(!confirm("Anda yakin ingin MERESTORE FULL DATABASE? Ini akan memakan waktu dan menumpuk data lama.")) return;
            const b = writeBatch(db);
            
            if(parsed.pools) parsed.pools.forEach((p: any) => b.set(doc(db, 'pools', p.id), p));
            if(parsed.mimpi) parsed.mimpi.forEach((m: any) => b.set(doc(db, 'mimpi', m.id), m));
            if(parsed.prompts) parsed.prompts.forEach((p: any) => b.set(doc(db, 'prompts', p.id), p));
            if(parsed.globals) parsed.globals.forEach((g: any) => b.set(doc(db, 'globals', g.id), g));
            if(parsed.extraSources) parsed.extraSources.forEach((s: any) => b.set(doc(db, 'extra_sources', s.id), s));
            
            // Handle both old nested and new flat formats for settings
            const conf = parsed.config || parsed.settings?.config;
            const sandConf = parsed.sandinganConfig || parsed.settings?.sandinganConfig;
            const syConf = parsed.syairTemplate || parsed.settings?.syairTemplate;
            
            if(conf) b.set(doc(db, 'settings', 'config'), conf);
            if(sandConf) b.set(doc(db, 'settings', 'sandingan_config'), sandConf);
            if(syConf) b.set(doc(db, 'settings', 'syair_template'), syConf);

            await b.commit();
            (window as any).showToast("Restore FULL Database Selesai!");
        } catch(err: any) {
            (window as any).showToast("Gagal parse/restore JSON: " + err.message, true);
        }
        e.target.value = '';
    };
    reader.readAsText(file);
};

(window as any).autoSeedDatabase = async () => {
    if (!db) return;
    try {
        const b = writeBatch(db);
        const parsed = (backupData as any);
        if(parsed.pools) parsed.pools.forEach((p: any) => b.set(doc(db, 'pools', p.id), p));
        if(parsed.mimpi) parsed.mimpi.forEach((m: any) => b.set(doc(db, 'mimpi', m.id), m));
        if(parsed.prompts) parsed.prompts.forEach((p: any) => b.set(doc(db, 'prompts', p.id), p));
        if(parsed.globals) parsed.globals.forEach((g: any) => b.set(doc(db, 'globals', g.id), g));
        if(parsed.extraSources) parsed.extraSources.forEach((s: any) => b.set(doc(db, 'extra_sources', s.id), s));
        
        const conf = parsed.config || parsed.settings?.config;
        const sandConf = parsed.sandinganConfig || parsed.settings?.sandinganConfig;
        const syConf = parsed.syairTemplate || parsed.settings?.syairTemplate;
        
        if(conf) b.set(doc(db, 'settings', 'config'), conf);
        if(sandConf) b.set(doc(db, 'settings', 'sandingan_config'), sandConf);
        if(syConf) b.set(doc(db, 'settings', 'syair_template'), syConf);

        await b.commit();
        console.log("Auto-seeded database from backup.json");
    } catch (e) {
        console.error("Auto-seed failed", e);
    }
};

(window as any).initApp = async () => {
    (window as any).renderAdminLists();
    (window as any).renderBukuMimpi();
    (window as any).renderDropdowns();
    (window as any).renderSyairVarsAdmin();
    
    if (auth) {
        signInAnonymously(auth).then(() => {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    (window as any).cloudUserId = user.uid;
                    const statusText = document.getElementById('cloud-status-text');
                    if(statusText) statusText.innerHTML = `<i class="ph-fill ph-cloud-check"></i> AKTIF`;
                    
                    const pid = document.getElementById('active-project-id');
                    if (pid) pid.innerText = "superemetoto";
                    const rid = document.getElementById('active-room-id');
                    if (rid) rid.innerText = "TOTO-PRO-ROOM-PERMANEN";
                    document.getElementById('status-db-pribadi')?.classList.remove('hidden');

                    const roomIdPath = 'TOTO-PRO-ROOM-PERMANEN'; // Base room doc

                    onSnapshot(collection(db, 'pools'), (snap) => {
                        (window as any).pools = snap.docs.map(d => d.data());
                        (window as any).pools.sort((a:any, b:any) => (a.order || 0) - (b.order || 0));
                        (window as any).renderAdminLists();
                        (window as any).renderDropdowns();
                        (window as any).fetchAllLiveResults();
                    });

                    // Trigger auto seed if empty after 3 seconds
                    setTimeout(() => {
                        if (!(window as any).pools || (window as any).pools.length === 0) {
                            console.log("No pools found, attempting auto seed from backupData...");
                            (window as any).autoSeedDatabase();
                        }
                    }, 3000);

                    onSnapshot(collection(db, 'mimpi'), (snap) => {
                        (window as any).dataBukuMimpi = snap.docs.map(d => d.data());
                        (window as any).renderAdminLists();
                        (window as any).renderBukuMimpi();
                    });

                    onSnapshot(collection(db, 'prompts'), (snap) => {
                        (window as any).aiPrompts = snap.docs.map(d => d.data());
                        (window as any).renderAdminLists();
                    });

                    onSnapshot(collection(db, 'globals'), (snap) => {
                        (window as any).globalRules = snap.docs.map(d => d.data());
                        (window as any).renderAdminLists();
                    });

                    onSnapshot(collection(db, 'extra_sources'), (snap) => {
                        (window as any).extraSources = snap.docs.map(d => d.data());
                        (window as any).renderAdminLists();
                        (window as any).updateAIInfoPanel();
                    });

                    onSnapshot(doc(db, 'settings', 'config'), (docSnap) => {
                        if (docSnap.exists()) {
                            (window as any).appConfig = docSnap.data();
                            const ak = (document.getElementById('input-setting-apikey') as HTMLInputElement);
                            if(ak) ak.value = (window as any).appConfig.apiKey || '';
                        }
                    });
                    
                    onSnapshot(doc(db, 'settings', 'sandingan_config'), (docSnap) => {
                        if (docSnap.exists()) {
                            (window as any).sandinganConfig = docSnap.data();
                        }
                    });

                    onSnapshot(doc(db, 'settings', 'syair_template'), (docSnap) => {
                        if (docSnap.exists()) {
                            const t = docSnap.data();
                            (window as any).syairTemplate = t;
                            (window as any).syairVariables = t.variables || ["PASARAN", "TANGGAL", "SHIO", "BBFS", "AM", "AI", "CB", "CM", "KEPALA", "EKOR", "JITU", "3D", "4D", "2D", "TWIN"];
                            
                            const btnOp = document.getElementById('edit-syair-opacity') as HTMLInputElement;
                            if(btnOp) btnOp.value = t.opacity || "30";
                            
                            const btnBg = document.getElementById('edit-syair-bg') as HTMLInputElement;
                            if(btnBg) btnBg.value = t.bgUrl || "";
                            
                            const btnM = document.getElementById('edit-syair-color-main') as HTMLInputElement;
                            if(btnM) btnM.value = t.mainColor || "#10b981";
                            
                            const btnA = document.getElementById('edit-syair-color-accent') as HTMLInputElement;
                            if(btnA) btnA.value = t.accentColor || "#3b82f6";

                            const btnF = document.getElementById('edit-syair-footer') as HTMLInputElement;
                            if(btnF) btnF.value = t.footer || "SUPREME TOTO AI GENERATED";

                            const btnH = document.getElementById('input-syair-html') as HTMLTextAreaElement;
                            if(btnH) btnH.value = t.html || (window as any).defaultSyairHTML;

                            (window as any).renderSyairVarsAdmin();
                            (window as any).updateAdminSyairPreview();
                        }
                    });
                }
            });
        }).catch((err) => {
            console.error("Auth Fail", err);
            const statusText = document.getElementById('cloud-status-text');
            if(statusText) statusText.innerHTML = `<i class="ph-fill ph-warning-circle text-red-500"></i> GAGAL`;
        });
    }
};

(window as any).tafsirMimpiAI = async () => {
    const inputEl = document.getElementById('input-cerita-mimpi') as HTMLTextAreaElement;
    const btn = document.getElementById('btn-tafsir-ai') as HTMLButtonElement;
    const resEl = document.getElementById('hasil-tafsir-ai');
    
    if(!inputEl || !btn || !resEl) return;
    const story = inputEl.value;
    if(!story || story.trim() === '') return (window as any).showToast("Mimpi masih kosong!", true);

    const apiKey = ((window as any).appConfig && (window as any).appConfig.apiKey && (window as any).appConfig.apiKey.trim() !== "") ? (window as any).appConfig.apiKey : (window as any).DEFAULT_API_KEY;
    if(!apiKey || apiKey.trim() === "") return (window as any).showToast("Kunci API Master Belum Diatur!", true);

    resEl.classList.remove('hidden');
    resEl.innerHTML = `<div class="flex items-center gap-3"><i class="ph ph-spinner-gap animate-spin text-2xl text-purple-500"></i><span class="text-slate-400">Gemini sedang menafsirkan mimpimu...</span></div>`;
    btn.disabled = true;
    
    try {
        const panggilAI = async (prompt: string, maxRetries = 3) => {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
            for (let i = 0; i < maxRetries; i++) {
                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });
                    if (!response.ok) throw new Error("Gagal");
                    return await response.json();
                } catch (e) {
                    if (i === maxRetries - 1) throw e;
                    await new Promise(r => setTimeout(r, 1000 * (Math.pow(2, i))));
                }
            }
        };

        const promptTafsir = "Bertindaklah sebagai Pakar Tafsir Mimpi Togel (Erek-erek) profesional.\n" +
            "Seorang pengguna menceritakan mimpinya:\n\n" +
            `"${story}"\n\n` +
            "Tugasmu:\n" +
            "1. Jelaskan makna firasat dari mimpi tersebut secara singkat (max 3 kalimat).\n" +
            "2. Berikan tebakan angka (2D, 3D, atau 4D) yang paling masuk akal berhubungan dengan elemen di mimpi tersebut. Kamu bisa memilih lebih dari satu angka jika mimpinya kompleks.\n\n" +
            "Format output gunakan HTML dasar (jangan gunakan markdown), contoh:\n<p>Makna: ...</p><p>Angka Jitu: <strong>2D: 12, 3D: 123</strong></p>";

        const data = await panggilAI(promptTafsir);
        const resTxt = data.candidates[0].content.parts[0].text;
        
        resEl.innerHTML = `<div class="flex items-start gap-3"><i class="ph-fill ph-magic-wand text-2xl text-purple-400 mt-1"></i><div><h4 class="font-bold text-white mb-2">Hasil Tafsir Gemini:</h4>${resTxt}</div></div>`;
        
    } catch (e: any) {
        resEl.innerHTML = `<span class="text-red-400">Gagal menafsirkan mimpi: AI Server Sibuk. Ulangi.</span>`;
    } finally {
        btn.disabled = false;
    }
};

(window as any).initApp();


