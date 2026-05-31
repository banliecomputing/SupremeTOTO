import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initializeFirestore, collection, doc, setDoc as firebaseSetDoc, deleteDoc as firebaseDeleteDoc, onSnapshot, writeBatch as firebaseWriteBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true
    });
} catch (e) {
    console.warn("Firebase Init disabled");
}

const getDocRef = (col: string, docId: string) => doc(db, col, docId);

// --- 1. GLOBAL STATE & UI UTILITIES ---
(window as any).isLocalMode = false;

function saveToLocalStorageFallback(collectionName: string, docId: string, data: any, merge = false) {
    if (collectionName === 'settings') {
        const key = `superemetoto_settings_${docId}`;
        let existing = {};
        try {
            existing = JSON.parse(localStorage.getItem(key) || '{}');
        } catch {}
        let finalData = merge ? { ...existing, ...data } : data;
        localStorage.setItem(key, JSON.stringify(finalData));
        
        if (docId === 'config') {
            (window as any).appConfig = finalData;
            if (typeof (window as any).renderGeminiKeys === 'function') {
                (window as any).renderGeminiKeys();
            }
        } else if (docId === 'sandingan_config') {
            (window as any).sandinganConfig = finalData;
        } else if (docId === 'syair_template') {
            (window as any).syairTemplate = finalData;
        }
        return;
    }
    
    const key = `superemetoto_${collectionName}`;
    let list: any[] = [];
    try {
        list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {}
    if (!Array.isArray(list)) list = [];
    
    const idx = list.findIndex(item => item.id === docId);
    let finalItem = merge ? { ...(idx !== -1 ? list[idx] : {}), ...data, id: docId } : { ...data, id: docId };
    
    if (idx !== -1) {
        list[idx] = finalItem;
    } else {
        list.push(finalItem);
    }
    
    localStorage.setItem(key, JSON.stringify(list));
    
    if (collectionName === 'pools') {
        (window as any).pools = list;
        (window as any).pools.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        (window as any).renderAdminLists();
        (window as any).renderDropdowns();
    } else if (collectionName === 'mimpi') {
        (window as any).dataBukuMimpi = list;
        (window as any).renderAdminLists();
        (window as any).renderBukuMimpi();
    } else if (collectionName === 'prompts') {
        (window as any).aiPrompts = list;
        (window as any).renderAdminLists();
    } else if (collectionName === 'globals') {
        (window as any).globalRules = list;
        (window as any).renderAdminLists();
    } else if (collectionName === 'extra_sources') {
        (window as any).extraSources = list;
        (window as any).renderAdminLists();
        (window as any).updateAIInfoPanel();
    }
}

function deleteFromLocalStorageFallback(collectionName: string, docId: string) {
    if (collectionName === 'settings') {
        localStorage.removeItem(`superemetoto_settings_${docId}`);
        return;
    }
    
    const key = `superemetoto_${collectionName}`;
    let list: any[] = [];
    try {
        list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {}
    if (!Array.isArray(list)) list = [];
    
    list = list.filter(item => item.id !== docId);
    localStorage.setItem(key, JSON.stringify(list));
    
    if (collectionName === 'pools') {
        (window as any).pools = list;
        (window as any).pools.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        (window as any).renderAdminLists();
        (window as any).renderDropdowns();
    } else if (collectionName === 'mimpi') {
        (window as any).dataBukuMimpi = list;
        (window as any).renderAdminLists();
        (window as any).renderBukuMimpi();
    } else if (collectionName === 'prompts') {
        (window as any).aiPrompts = list;
        (window as any).renderAdminLists();
    } else if (collectionName === 'globals') {
        (window as any).globalRules = list;
        (window as any).renderAdminLists();
    } else if (collectionName === 'extra_sources') {
        (window as any).extraSources = list;
        (window as any).renderAdminLists();
        (window as any).updateAIInfoPanel();
    }
}

async function setDoc(docRef: any, data: any, options?: any) {
    const parts = docRef.path.split('/');
    const coll = parts[0];
    const docId = parts[1];
    
    saveToLocalStorageFallback(coll, docId, data, options?.merge || false);
    
    if (!(window as any).isLocalMode && db) {
        try {
            await firebaseSetDoc(docRef, data, options);
        } catch (e) {
            console.warn("Firestore setDoc failed:", e);
        }
    }
}

async function deleteDoc(docRef: any) {
    const parts = docRef.path.split('/');
    const coll = parts[0];
    const docId = parts[1];
    
    deleteFromLocalStorageFallback(coll, docId);
    
    if (!(window as any).isLocalMode && db) {
        try {
            await firebaseDeleteDoc(docRef);
        } catch (e) {
            console.warn("Firestore deleteDoc failed:", e);
        }
    }
}

class LocalWriteBatch {
    private operations: Array<{ type: 'set' | 'delete', collection: string, docId: string, data?: any, options?: any }> = [];
    private originBatch: any;
    
    constructor(originBatch?: any) {
        this.originBatch = originBatch;
    }
    
    set(docRef: any, data: any, options?: any) {
        const parts = docRef.path.split('/');
        this.operations.push({
            type: 'set',
            collection: parts[0],
            docId: parts[1],
            data,
            options
        });
        if (this.originBatch) {
            this.originBatch.set(docRef, data, options);
        }
        return this;
    }
    
    delete(docRef: any) {
        const parts = docRef.path.split('/');
        this.operations.push({
            type: 'delete',
            collection: parts[0],
            docId: parts[1]
        });
        if (this.originBatch) {
            this.originBatch.delete(docRef);
        }
        return this;
    }
    
    async commit() {
        for (const op of this.operations) {
            if (op.type === 'set') {
                saveToLocalStorageFallback(op.collection, op.docId, op.data, op.options?.merge || false);
            } else if (op.type === 'delete') {
                deleteFromLocalStorageFallback(op.collection, op.docId);
            }
        }
        if (this.originBatch && !(window as any).isLocalMode) {
            try {
                await this.originBatch.commit();
            } catch (err) {
                console.warn("Online writeBatch commit failed:", err);
            }
        }
    }
}

function writeBatch(dbInstance: any) {
    if ((window as any).isLocalMode || !dbInstance) {
        return new LocalWriteBatch();
    }
    try {
        return new LocalWriteBatch(firebaseWriteBatch(dbInstance));
    } catch {
        return new LocalWriteBatch();
    }
}
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

(window as any).updateGeminiStatusIndicator = (status: 'ready' | 'loading' | 'failed', message?: string) => {
    const textEl = document.getElementById('gemini-status-text');
    const iconEl = document.getElementById('gemini-status-icon');
    if (!textEl || !iconEl) return;
    
    if (status === 'ready') {
        textEl.className = "text-[9px] sm:text-[10px] text-emerald-400 font-extrabold tracking-wider";
        textEl.innerHTML = `AI: SIAP`;
        iconEl.className = "ph-fill ph-circle text-[7px] sm:text-[8px] text-emerald-500 shrink-0";
        textEl.parentElement?.setAttribute('title', "Gemini AI: Siap digunakan.");
    } else if (status === 'loading') {
        textEl.className = "text-[9px] sm:text-[10px] text-purple-400 font-extrabold tracking-wider animate-pulse";
        textEl.innerHTML = `AI: PROSES`;
        iconEl.className = "ph-fill ph-circle text-[7px] sm:text-[8px] text-purple-500 animate-pulse shrink-0";
        textEl.parentElement?.setAttribute('title', "Gemini AI: Sedang memproses analisis.");
    } else if (status === 'failed') {
        textEl.className = "text-[9px] sm:text-[10px] text-red-500 font-extrabold tracking-wider";
        textEl.innerHTML = `AI: GAGAL`;
        iconEl.className = "ph-fill ph-circle text-[7px] sm:text-[8px] text-red-500 shrink-0 animate-pulse";
        textEl.parentElement?.setAttribute('title', message || "Gemini AI: Gagal. Klik Mulai untuk detail.");
    }
};

(window as any).syairVariables = ['BBFS', 'AM', 'AI', 'CB', 'CM', 'KEPALA', 'EKOR', 'SHIO', '4D', '3D', '2D', 'TWIN', 'JITU'];

(window as any).robustFetch = async (url: string): Promise<string> => {
    // List of resilient CORS proxy configurations
    const proxies = [
        (u: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
        (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        (u: string) => `https://thingproxy.freeboard.io/fetch/${u}`,
        (u: string) => u
    ];

    let lastError: any = null;
    for (const getProxyUrl of proxies) {
        try {
            const finalUrl = getProxyUrl(url);
            console.log(`[robustFetch] Trying URL: ${finalUrl}`);
            const response = await fetch(finalUrl);
            if (!response.ok) {
                console.warn(`[robustFetch] Proxy failed with status ${response.status}`);
                continue;
            }
            
            if (finalUrl.includes('allorigins.win')) {
                const json = await response.json();
                if (json && json.contents) {
                    return json.contents;
                }
            } else {
                return await response.text();
            }
        } catch (e: any) {
            console.warn(`[robustFetch] Exception with proxy:`, e);
            lastError = e;
        }
    }
    throw lastError || new Error(`Gagal memuat data dari ${url}. Semua jalur CORS proxy sedang sibuk.`);
};

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
(window as any).editingPromptId = null;
(window as any).editingGlobalRuleId = null;

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

(window as any).openEditModal = (sourceElementId: string, titleText: string) => {
    const srcEl = document.getElementById(sourceElementId);
    const modalBody = document.getElementById('edit-modal-body');
    const modal = document.getElementById('edit-form-modal');
    const content = document.getElementById('edit-form-content');
    
    if (srcEl && modalBody && modal && content) {
        modalBody.innerHTML = '';
        srcEl.classList.remove('hidden');
        modalBody.appendChild(srcEl);
        
        document.getElementById('edit-modal-title')!.innerHTML = `<i class="ph-bold ph-pencil"></i> ${titleText}`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        setTimeout(() => {
            modal.classList.add('opacity-100');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 50);
    }
};

(window as any).closeEditModal = (sourceElementId: string, targetParentId: string) => {
    const srcEl = document.getElementById(sourceElementId);
    const parentEl = document.getElementById(targetParentId);
    const modal = document.getElementById('edit-form-modal');
    const content = document.getElementById('edit-form-content');
    
    if (modal && content) {
        modal.classList.remove('opacity-100');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
        
        setTimeout(() => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            
            if (srcEl && parentEl) {
                srcEl.classList.add('hidden');
                parentEl.appendChild(srcEl);
            }
        }, 300);
    }
};

(window as any).closeEditFormModal = () => {
    if ((window as any).editingPasaranId || document.getElementById('container-form-pasaran')?.parentElement?.id === 'edit-modal-body') {
        (window as any).cancelEditPasaran();
    } else if ((window as any).editingMimpiId || document.getElementById('container-form-mimpi')?.parentElement?.id === 'edit-modal-body') {
        (window as any).cancelEditMimpi();
    } else if ((window as any).editingPromptId || document.getElementById('container-form-prompt')?.parentElement?.id === 'edit-modal-body') {
        (window as any).cancelEditPrompt();
    } else if ((window as any).editingGlobalRuleId || document.getElementById('container-form-global')?.parentElement?.id === 'edit-modal-body') {
        (window as any).cancelEditGlobalRule();
    } else if ((window as any).editingSourceId || document.getElementById('form-sandingan')?.parentElement?.id === 'edit-modal-body') {
        (window as any).cancelSandingan();
    }
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
        pList.innerHTML = (window as any).pools.length === 0 ? '<p class="text-sm text-slate-500 text-center py-4">Belum ada pasaran</p>' : '';
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
            mList.innerHTML += `<div class="bg-slate-900 p-4 rounded-lg border border-slate-700/80 flex justify-between items-center shadow-md"><div class="truncate pr-4"><p class="text-sm md:text-base font-bold text-white">${m.type} - ${m.no}</p><p class="text-[10px] md:text-xs text-slate-500 truncate mt-1">${m.desc}</p></div><div class="flex gap-1 shrink-0"><button onclick="editMimpi('${m.id}')" class="p-2 md:p-3 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer" title="Edit"><i class="ph-bold ph-pencil text-lg"></i></button><button onclick="duplicateMimpi('${m.id}')" class="p-2 md:p-3 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer" title="Duplikat"><i class="ph-bold ph-copy text-lg"></i></button><button onclick="deleteMimpi('${m.id}')" class="p-2 md:p-3 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer" title="Hapus"><i class="ph-bold ph-trash text-lg"></i></button></div></div>`;
        });
    }
    
    const prList = document.getElementById('admin-prompt-list');
    const aiSel = document.getElementById('ai-prompt-selector');
    if(prList) prList.innerHTML = (window as any).aiPrompts.length === 0 ? '<p class="text-sm text-slate-500 text-center py-4">Belum ada pola prompt</p>' : '';
    if(aiSel) {
        aiSel.innerHTML = '<option value="">-- Tulis Instruksi Manual Bebas (Baca System Prompt) --</option>';
        if ((window as any).aiPrompts && (window as any).aiPrompts.length > 0) {
            const allPromptsText = (window as any).aiPrompts.map((p: any) => `[POLA: ${p.title}]\n${p.text}`).join("\n\n");
            aiSel.innerHTML += `<option value="${allPromptsText}">✨ POLA MASTER (BACA SEMUA) ✨</option>`;
        }
    }
    
    (window as any).aiPrompts.forEach((pr: any) => {
        if(prList) prList.innerHTML += `
            <div class="bg-slate-900 p-5 rounded-xl border border-slate-750 flex flex-col gap-3 shadow-md">
                <div class="flex justify-between items-start gap-4">
                    <p class="text-sm md:text-base font-bold text-purple-400 flex items-center gap-2">
                        <i class="ph-fill ph-robot text-lg"></i> ${pr.title}
                    </p>
                    <div class="flex gap-1 shrink-0 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button onclick="editPrompt('${pr.id}')" class="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors" title="Edit"><i class="ph-bold ph-pencil text-base"></i></button>
                        <button onclick="duplicatePrompt('${pr.id}')" class="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded transition-colors" title="Duplikat"><i class="ph-bold ph-copy text-base"></i></button>
                        <button onclick="deletePrompt('${pr.id}')" class="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors" title="Hapus"><i class="ph-bold ph-trash text-base"></i></button>
                    </div>
                </div>
                <div class="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-950 p-3.5 rounded-lg border border-slate-800/85 max-h-[300px] overflow-y-auto custom-scrollbar">${pr.text}</div>
            </div>`;
        if(aiSel) aiSel.innerHTML += `<option value="${pr.text}">${pr.title}</option>`;
    });
    
    const gList = document.getElementById('admin-global-list');
    if(gList) {
        gList.innerHTML = (window as any).globalRules.length === 0 ? '<p class="text-sm text-slate-500 text-center py-6 bg-slate-900 rounded-lg">Otak AI Kosong. Harap Reset atau Injeksi Aturan.</p>' : '';
        (window as any).globalRules.forEach((g: any) => {
            gList.innerHTML += `
                <div class="bg-slate-900 p-5 rounded-xl border border-slate-750 flex flex-col gap-3 shadow-md">
                    <div class="flex justify-between items-start gap-4">
                        <span class="text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 flex items-center gap-1.5">
                            <i class="ph-fill ph-cpu"></i> System Prompt (Aturan Mutlak)
                        </span>
                        <div class="flex gap-1 shrink-0 bg-slate-950 p-1 rounded-lg border border-slate-800">
                            <button onclick="editGlobalRule('${g.id}')" class="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors" title="Edit"><i class="ph-bold ph-pencil text-base"></i></button>
                            <button onclick="duplicateGlobalRule('${g.id}')" class="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded transition-colors" title="Duplikat"><i class="ph-bold ph-copy text-base"></i></button>
                            <button onclick="deleteGlobalRule('${g.id}')" class="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors" title="Hapus"><i class="ph-bold ph-trash text-base"></i></button>
                        </div>
                    </div>
                    <div class="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-950 p-3.5 rounded-lg border border-slate-800/85 max-h-[250px] overflow-y-auto custom-scrollbar">${g.text}</div>
                </div>`;
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

(window as any).toggleOtherDraws = (id: string) => {
    const el = document.getElementById(`other-draws-${id}`);
    const icon = document.getElementById(`toggle-icon-${id}`);
    const lbl = document.getElementById(`toggle-lbl-${id}`);
    if (el && icon) {
        if (el.classList.contains('hidden')) {
            el.classList.remove('hidden');
            el.classList.add('grid');
            icon.style.transform = 'rotate(180deg)';
            if (lbl) {
                const count = el.children.length;
                lbl.innerText = `SEMBUNYIKAN PUTARAN`;
            }
        } else {
            el.classList.remove('grid');
            el.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
            if (lbl) {
                const count = el.children.length;
                lbl.innerText = `TAMPILKAN ${count} PUTARAN LAIN`;
            }
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

        let mainDrawIdx = 0;
        let mainDraw = draws[0];
        
        const liveResIdx = draws.findIndex((d: any) => d.name && d.name.toLowerCase().includes("live result"));
        if (liveResIdx !== -1) {
            mainDrawIdx = liveResIdx;
            mainDraw = draws[liveResIdx];
        }

        const card = document.createElement('div');
        card.className = "relative rounded-2xl border border-slate-800 shadow-xl overflow-hidden bg-slate-900/50 backdrop-blur-md transition-all duration-300 hover:border-slate-700/60 hover:shadow-cyan-950/20 flex flex-col justify-between";
        
        const bgStyle = p.imageUrl ? `background-image: url('${p.imageUrl}')` : '';
        const bgLayer = p.imageUrl ? `<div class="absolute inset-0 bg-cover bg-center opacity-[0.08] mix-blend-overlay pointer-events-none" style="${bgStyle}"></div><div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-900/10 pointer-events-none"></div>` : '';
        
        let innerHtml = `
            ${bgLayer}
            <div class="relative z-10 p-5 md:p-6 h-full flex flex-col justify-between">
                <!-- Header Pasaran -->
                <div class="flex justify-between items-center mb-4 border-b border-slate-800/80 pb-3 cursor-pointer group" onclick="togglePoolDraws('${p.id}')">
                    <div class="flex flex-col">
                        <h3 class="text-xs md:text-sm font-black text-slate-250 uppercase tracking-widest flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors">
                            <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            ${p.name}
                        </h3>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-[9px] md:text-[10px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-850"><i class="ph-bold ph-calendar-blank text-slate-500 text-[10px]"></i> ${dateStr}</span>
                            ${draws.length > 1 ? `<span class="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-extrabold border border-purple-500/20">${draws.length} Putaran</span>` : ''}
                        </div>
                    </div>
                    <div class="p-1.5 bg-slate-950 rounded-full border border-slate-850 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
                        <i class="ph-bold ph-caret-down text-slate-500 group-hover:text-emerald-400 transition-transform duration-300 text-xs" id="draws-icon-${p.id}" style="transform: rotate(180deg);"></i>
                    </div>
                </div>

                <!-- Isi Kandungan Pasaran (Collapsible) -->
                <div class="flex-1 flex flex-col" id="draws-container-${p.id}">
                    <!-- Kotak Utama Live Result Sekarang -->
                    <div class="relative bg-gradient-to-br from-slate-950 to-slate-900 p-5 md:p-6 rounded-2xl border border-emerald-500/25 shadow-inner flex flex-col items-center justify-center text-center overflow-hidden min-h-[140px] md:min-h-[150px] group/main">
                        <div class="absolute inset-0 bg-gradient-to-t from-emerald-500/5 via-transparent to-transparent pointer-events-none"></div>
                        <button onclick="previewLiveScrape('${p.id}', ${mainDrawIdx})" class="absolute top-3 right-3 z-20 text-slate-500 hover:text-emerald-400 opacity-60 hover:opacity-100 bg-slate-950 p-1.5 rounded-lg border border-slate-800 transition-all active:scale-95 cursor-pointer" title="Lihat Raw Data"><i class="ph-bold ph-eye text-xs md:text-sm"></i></button>
                        <span class="text-[9px] md:text-[10px] font-extrabold text-emerald-400 tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 mb-2 uppercase">${mainDraw.name}</span>
                        <div class="text-4xl md:text-5xl font-black text-emerald-400/40 animate-pulse tracking-widest font-mono drop-shadow-sm select-all" id="draw-res-${p.id}-${mainDrawIdx}">....</div>
                    </div>
        `;

        if (draws.length > 1) {
            const otherDraws = draws.map((d: any, index: number) => ({ d, index })).filter((item: any) => item.index !== mainDrawIdx);
            
            innerHtml += `
                    <!-- Accordion Toggle Button -->
                    <button id="toggle-btn-${p.id}" onclick="toggleOtherDraws('${p.id}')" class="w-full mt-3 py-2 px-3 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-emerald-400 rounded-xl border border-slate-850 hover:border-slate-800 text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm">
                        <i class="ph-bold ph-grid-four text-slate-500"></i>
                        <span id="toggle-lbl-${p.id}">TAMPILKAN ${otherDraws.length} PUTARAN LAIN</span>
                        <i class="ph-bold ph-caret-down transition-transform duration-300" id="toggle-icon-${p.id}"></i>
                    </button>
                    
                    <!-- Other drawings container with beautiful tight symmetry of grid -->
                    <div id="other-draws-${p.id}" class="hidden grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/60 transition-all">
            `;
            
            otherDraws.forEach((item: any) => {
                innerHtml += `
                        <div class="bg-slate-950/60 hover:bg-slate-950 p-2.5 rounded-xl border border-slate-850 hover:border-emerald-500/20 text-center relative group/sub transition-all">
                            <button onclick="previewLiveScrape('${p.id}', ${item.index})" class="absolute top-1 right-1 opacity-0 group-hover/sub:opacity-100 text-[9px] text-slate-500 hover:text-emerald-400 transition-opacity active:scale-95 cursor-pointer" title="Lihat Raw Data"><i class="ph-bold ph-eye"></i></button>
                            <span class="text-[8px] md:text-[9px] font-bold text-slate-400 block truncate uppercase tracking-tight mb-1">${item.d.name}</span>
                            <div class="text-sm md:text-base font-extrabold text-emerald-400/40 animate-pulse font-mono tracking-wider" id="draw-res-${p.id}-${item.index}">..</div>
                        </div>
                `;
            });
            
            innerHtml += `
                    </div>
            `;
        }

        innerHtml += `
                </div>
            </div>
        `;
        
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

                resEl.classList.remove('text-emerald-400/40', 'animate-pulse');
                resEl.classList.add('text-emerald-400', 'drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]');
                resEl.innerText = cleanRes;
            } catch(e) {
                resEl.classList.remove('text-emerald-400/40', 'animate-pulse', 'text-sm', 'text-base', 'text-lg', 'text-3xl', 'text-4xl', 'text-5xl');
                resEl.classList.add('text-red-400', 'text-xs');
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
    
    (window as any).openEditModal('container-form-pasaran', 'Edit Pasaran TOTO');
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
    
    (window as any).closeEditModal('container-form-pasaran', 'original-slot-pasaran');
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
    
    (window as any).closeEditModal('form-sandingan', 'original-slot-sandingan');
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

(window as any).addPrompt = async (e: any) => {
    e.preventDefault();
    if(!(window as any).cloudUserId) return (window as any).showToast("Cloud DB belum siap", true);
    
    const btn = document.getElementById('btn-submit-prompt') as HTMLButtonElement;
    if(btn) {
        btn.innerHTML = `<i class="ph ph-spinner-gap animate-spin"></i> MENYIMPAN...`;
        btn.disabled = true;
    }

    const title = (document.getElementById('input-prompt-title') as HTMLInputElement).value;
    const text = (document.getElementById('input-prompt-text') as HTMLTextAreaElement).value;

    const id = (window as any).editingPromptId || Date.now().toString();
    
    try {
        await setDoc(doc(db, 'prompts', id), { id, title, text }, { merge: true });
        (window as any).showToast((window as any).editingPromptId ? "Pola Prompt Diperbarui!" : "Pola Prompt Baru ditambahkan!");
        (window as any).cancelEditPrompt();
    } catch (err: any) {
        (window as any).showToast("Gagal menyimpan prompt: " + err.message, true);
    } finally {
        if(btn) {
            btn.innerHTML = `SIMPAN POLA MANUAL`;
            btn.disabled = false;
        }
    }
};

(window as any).editPrompt = (id: string) => {
    const pr = (window as any).aiPrompts.find((x: any) => x.id === id);
    if(!pr) return;
    
    (window as any).editingPromptId = id;
    (document.getElementById('input-prompt-title') as HTMLInputElement).value = pr.title || '';
    (document.getElementById('input-prompt-text') as HTMLTextAreaElement).value = pr.text || '';
    
    document.getElementById('btn-cancel-prompt')?.classList.remove('hidden');
    const submitBtn = document.getElementById('btn-submit-prompt') as HTMLButtonElement;
    if(submitBtn) submitBtn.innerText = 'UPDATE POLA MANUAL CLOUD';
    
    (window as any).openEditModal('container-form-prompt', 'Edit Pola AI');
};

(window as any).cancelEditPrompt = () => {
    (window as any).editingPromptId = null;
    const titleIn = document.getElementById('input-prompt-title') as HTMLInputElement;
    const textIn = document.getElementById('input-prompt-text') as HTMLTextAreaElement;
    if(titleIn) titleIn.value = '';
    if(textIn) textIn.value = '';
    
    document.getElementById('btn-cancel-prompt')?.classList.add('hidden');
    const submitBtn = document.getElementById('btn-submit-prompt') as HTMLButtonElement;
    if(submitBtn) submitBtn.innerText = 'SIMPAN POLA MANUAL';
    
    (window as any).closeEditModal('container-form-prompt', 'original-slot-prompt');
};

(window as any).openAddNewPrompt = () => {
    (window as any).editingPromptId = null;
    const titleIn = document.getElementById('input-prompt-title') as HTMLInputElement;
    const textIn = document.getElementById('input-prompt-text') as HTMLTextAreaElement;
    if(titleIn) titleIn.value = '';
    if(textIn) textIn.value = '';
    
    document.getElementById('btn-cancel-prompt')?.classList.remove('hidden');
    const submitBtn = document.getElementById('btn-submit-prompt') as HTMLButtonElement;
    if(submitBtn) submitBtn.innerText = 'SIMPAN POLA MANUAL';
    
    (window as any).openEditModal('container-form-prompt', 'Tambah Pola Manual Baru');
};

(window as any).duplicatePrompt = async (id: string) => {
    if(!(window as any).cloudUserId) return;
    const pr = (window as any).aiPrompts.find((x: any) => x.id === id);
    if(!pr) return;
    
    const newId = Date.now().toString();
    try {
        await setDoc(doc(db, 'prompts', newId), { id: newId, title: pr.title + " (Copy)", text: pr.text });
        (window as any).showToast("Pola prompt diduplikasi!");
    } catch (err: any) {
        (window as any).showToast("Gagal menduplikat: " + err.message, true);
    }
};

(window as any).deletePrompt = (id: string) => {
    (window as any).showConfirm("Yakin menghapus pola prompt ini secara permanen?", async () => {
        if(!(window as any).cloudUserId) return;
        try {
            await deleteDoc(doc(db, 'prompts', id));
            (window as any).showToast("Pola prompt dihapus!", true);
        } catch (err: any) {
            (window as any).showToast("Gagal menghapus: " + err.message, true);
        }
    });
};

(window as any).addGlobalRule = async (e: any) => {
    e.preventDefault();
    if(!(window as any).cloudUserId) return (window as any).showToast("Cloud DB belum siap", true);
    
    const btn = document.getElementById('btn-submit-global') as HTMLButtonElement;
    if(btn) {
        btn.innerHTML = `<i class="ph ph-spinner-gap animate-spin"></i> MENYIMPAN...`;
        btn.disabled = true;
    }

    const text = (document.getElementById('input-global-text') as HTMLTextAreaElement).value;
    const id = (window as any).editingGlobalRuleId || Date.now().toString();
    
    try {
        await setDoc(doc(db, 'globals', id), { id, text }, { merge: true });
        (window as any).showToast((window as any).editingGlobalRuleId ? "Aturan Global Diperbarui!" : "Aturan Global Baru ditambahkan!");
        (window as any).cancelEditGlobalRule();
    } catch (err: any) {
        (window as any).showToast("Gagal menyimpan aturan global: " + err.message, true);
    } finally {
        if(btn) {
            btn.innerHTML = `INJEKSI KE SISTEM`;
            btn.disabled = false;
        }
    }
};

(window as any).editGlobalRule = (id: string) => {
    const g = (window as any).globalRules.find((x: any) => x.id === id);
    if(!g) return;
    
    (window as any).editingGlobalRuleId = id;
    (document.getElementById('input-global-text') as HTMLTextAreaElement).value = g.text || '';
    
    document.getElementById('btn-cancel-global')?.classList.remove('hidden');
    const submitBtn = document.getElementById('btn-submit-global') as HTMLButtonElement;
    if(submitBtn) submitBtn.innerText = 'UPDATE SYSTEM PROMPT CLOUD';
    
    (window as any).openEditModal('container-form-global', 'Edit System Prompt');
};

(window as any).cancelEditGlobalRule = () => {
    (window as any).editingGlobalRuleId = null;
    const textIn = document.getElementById('input-global-text') as HTMLTextAreaElement;
    if(textIn) textIn.value = '';
    
    document.getElementById('btn-cancel-global')?.classList.add('hidden');
    const submitBtn = document.getElementById('btn-submit-global') as HTMLButtonElement;
    if(submitBtn) submitBtn.innerText = 'INJEKSI KE SISTEM';
    
    (window as any).closeEditModal('container-form-global', 'original-slot-global');
};

(window as any).openAddNewGlobalRule = () => {
    (window as any).editingGlobalRuleId = null;
    const textIn = document.getElementById('input-global-text') as HTMLTextAreaElement;
    if(textIn) textIn.value = '';
    
    document.getElementById('btn-cancel-global')?.classList.remove('hidden');
    const submitBtn = document.getElementById('btn-submit-global') as HTMLButtonElement;
    if(submitBtn) submitBtn.innerText = 'INJEKSI KE SISTEM';
    
    (window as any).openEditModal('container-form-global', 'Tambah Aturan Global Baru');
};

(window as any).duplicateGlobalRule = async (id: string) => {
    if(!(window as any).cloudUserId) return;
    const g = (window as any).globalRules.find((x: any) => x.id === id);
    if(!g) return;
    
    const newId = Date.now().toString();
    try {
        await setDoc(doc(db, 'globals', newId), { id: newId, text: g.text + " (Copy)" });
        (window as any).showToast("Aturan global diduplikasi!");
    } catch (err: any) {
        (window as any).showToast("Gagal menduplikat: " + err.message, true);
    }
};

(window as any).deleteGlobalRule = (id: string) => {
    (window as any).showConfirm("Yakin menghapus aturan global ini secara permanen?", async () => {
        if(!(window as any).cloudUserId) return;
        try {
            await deleteDoc(doc(db, 'globals', id));
            (window as any).showToast("Aturan global dihapus!", true);
        } catch (err: any) {
            (window as any).showToast("Gagal menghapus: " + err.message, true);
        }
    });
};

(window as any).handleImportPrompts = (e: any) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (ev: any) => {
        try {
            const content = ev.target.result;
            const lines = content.split('\n');
            const batch = writeBatch(db);
            let count = 0;
            
            lines.forEach((line: string) => {
                const tr = line.trim();
                if(!tr) return;
                const parts = tr.split('|');
                const title = parts[0]?.trim();
                const text = parts[1]?.trim() || '';
                if(title) {
                    const id = Date.now().toString() + count;
                    batch.set(doc(db, 'prompts', id), { id, title, text });
                    count++;
                }
            });
            
            if(count > 0) {
                await batch.commit();
                (window as any).showToast(`Berhasil mengimpor ${count} pola prompt!`);
            }
        } catch (err: any) {
            (window as any).showToast("Gagal impor: " + err.message, true);
        }
        e.target.value = '';
    };
    reader.readAsText(file);
};

(window as any).handleImportGlobals = (e: any) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (ev: any) => {
        try {
            const content = ev.target.result;
            const lines = content.split('\n');
            const batch = writeBatch(db);
            let count = 0;
            
            lines.forEach((line: string) => {
                const tr = line.trim();
                if(!tr) return;
                const id = Date.now().toString() + count;
                batch.set(doc(db, 'globals', id), { id, text: tr });
                count++;
            });
            
            if(count > 0) {
                await batch.commit();
                (window as any).showToast(`Berhasil mengimpor ${count} aturan global!`);
            }
        } catch (err: any) {
            (window as any).showToast("Gagal impor: " + err.message, true);
        }
        e.target.value = '';
    };
    reader.readAsText(file);
};

(window as any).duplicateMimpi = async (id: string) => {
    if(!(window as any).cloudUserId) return;
    const m = (window as any).dataBukuMimpi.find((x: any) => x.id === id);
    if(!m) return;
    
    const newId = Date.now().toString();
    try {
        await setDoc(doc(db, 'mimpi', newId), { id: newId, type: m.type, no: m.no, desc: m.desc + " (Copy)" });
        (window as any).showToast("Tafsir mimpi diduplikasi!");
    } catch (err: any) {
        (window as any).showToast("Gagal menduplikat: " + err.message, true);
    }
};

(window as any).deleteMimpi = (id: string) => {
    (window as any).showConfirm("Yakin menghapus tafsir mimpi ini?", async () => {
        if(!(window as any).cloudUserId) return;
        try {
            await deleteDoc(doc(db, 'mimpi', id));
            (window as any).showToast("Tafsir mimpi dihapus!", true);
        } catch (err: any) {
            (window as any).showToast("Gagal menghapus: " + err.message, true);
        }
    });
};

(window as any).openAddNewPasaran = () => {
    (window as any).editingPasaranId = null;
    ['input-name', 'input-image-url', 'input-url-history', 'input-pasaran-sheetname', 'input-pasaran-rangehistory', 'input-pasaran-map-cols', 'input-pasaran-map-headers'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if(el) el.value = '';
    });
    const autofillEl = document.getElementById('input-pasaran-autofill') as HTMLInputElement;
    if(autofillEl) autofillEl.checked = false;
    const visibleEl = document.getElementById('input-visible') as HTMLInputElement;
    if(visibleEl) visibleEl.checked = true;
    (window as any).currentLiveDraws = [];
    (window as any).renderLiveDrawsEditor();
    
    document.getElementById('btn-cancel-pasaran')?.classList.remove('hidden');
    const submitBtn = document.getElementById('btn-submit-pasaran') as HTMLButtonElement;
    if(submitBtn) submitBtn.innerText = 'SIMPAN KE CLOUD';
    
    (window as any).openEditModal('container-form-pasaran', 'Tambah Pasaran Baru');
};

(window as any).addMimpi = async (e: any) => {
    e.preventDefault();
    if (!(window as any).cloudUserId) return (window as any).showToast("Cloud DB belum siap", true);
    
    const btn = document.getElementById('btn-submit-mimpi') as HTMLButtonElement;
    if (btn) {
        btn.innerHTML = `<i class="ph ph-spinner-gap animate-spin"></i> MENYIMPAN...`;
        btn.disabled = true;
    }

    const type = (document.getElementById('input-mimpi-type') as HTMLSelectElement).value;
    const no = (document.getElementById('input-mimpi-no') as HTMLInputElement).value;
    const desc = (document.getElementById('input-mimpi-desc') as HTMLTextAreaElement).value;
    
    const id = (window as any).editingMimpiId || Date.now().toString();

    try {
        await setDoc(doc(db, 'mimpi', id), {
            id,
            type,
            no,
            desc
        }, { merge: true });
        
        (window as any).showToast((window as any).editingMimpiId ? "Tafsir mimpi diperbarui!" : "Tafsir mimpi baru ditambahkan!");
        (window as any).cancelEditMimpi();
    } catch (err: any) {
        (window as any).showToast("Gagal menyimpan: " + err.message, true);
    } finally {
        if (btn) {
            btn.innerHTML = 'SIMPAN TAFSIR MANUAL';
            btn.disabled = false;
        }
    }
};

(window as any).editMimpi = (id: string) => {
    const m = (window as any).dataBukuMimpi.find((x: any) => x.id === id);
    if (!m) return;
    
    (window as any).editingMimpiId = id;
    (document.getElementById('input-mimpi-type') as HTMLSelectElement).value = m.type || '2D';
    (document.getElementById('input-mimpi-no') as HTMLInputElement).value = m.no || '';
    (document.getElementById('input-mimpi-desc') as HTMLTextAreaElement).value = m.desc || '';
    
    document.getElementById('btn-cancel-mimpi')?.classList.remove('hidden');
    const submitBtn = document.getElementById('btn-submit-mimpi') as HTMLButtonElement;
    if (submitBtn) submitBtn.innerText = 'UPDATE TAFSIR CLOUD';
    
    (window as any).openEditModal('container-form-mimpi', 'Edit Tafsir Mimpi');
};

(window as any).openAddNewMimpi = () => {
    (window as any).editingMimpiId = null;
    (document.getElementById('input-mimpi-type') as HTMLSelectElement).value = '2D';
    (document.getElementById('input-mimpi-no') as HTMLInputElement).value = '';
    (document.getElementById('input-mimpi-desc') as HTMLTextAreaElement).value = '';
    
    document.getElementById('btn-cancel-mimpi')?.classList.remove('hidden');
    const submitBtn = document.getElementById('btn-submit-mimpi') as HTMLButtonElement;
    if (submitBtn) submitBtn.innerText = 'SIMPAN TAFSIR MANUAL';
    
    (window as any).openEditModal('container-form-mimpi', 'Tambah Tafsir Mimpi');
};

(window as any).cancelEditMimpi = () => {
    (window as any).editingMimpiId = null;
    (document.getElementById('input-mimpi-type') as HTMLSelectElement).value = '2D';
    (document.getElementById('input-mimpi-no') as HTMLInputElement).value = '';
    (document.getElementById('input-mimpi-desc') as HTMLTextAreaElement).value = '';
    
    document.getElementById('btn-cancel-mimpi')?.classList.add('hidden');
    const submitBtn = document.getElementById('btn-submit-mimpi') as HTMLButtonElement;
    if (submitBtn) submitBtn.innerText = 'SIMPAN TAFSIR MANUAL';
    
    (window as any).closeEditModal('container-form-mimpi', 'original-slot-mimpi');
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
    
    (window as any).openEditModal('form-sandingan', 'Edit Koneksi Sandingan');
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
    
    (document.getElementById('pool-selector') as HTMLSelectElement).value = poolId;
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

async function fetchGeminiWithRetry(url: string, options: any, maxRetries = 3) {
    let lastError: any = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                let errMsg = `Gagal terhubung ke server Gemini (Status: ${response.status})`;
                try {
                    const errBody = await response.text();
                    const parsedErr = JSON.parse(errBody);
                    if (parsedErr.error && parsedErr.error.message) {
                        errMsg = parsedErr.error.message;
                    }
                } catch {
                    // fallback to status code
                }
                throw new Error(errMsg);
            }
            return await response.json();
        } catch (e: any) {
            lastError = e;
            if (i === maxRetries - 1) throw e;
            // Exponential backoff
            await new Promise(r => setTimeout(r, 1000 * (Math.pow(2, i))));
        }
    }
    throw lastError || new Error("Gagal mengambil data dari Gemini API.");
}

(window as any).applyPromptTemplate = () => {
    const sel = document.getElementById('ai-prompt-selector') as HTMLSelectElement;
    const txt = document.getElementById('analisis-prompt') as HTMLTextAreaElement;
    if (sel && txt) {
        txt.value = sel.value;
    }
};

(window as any).parseMarkdown = (text: string): string => {
    if (!text) return "";
    
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-sm font-extrabold text-purple-300 mt-4 mb-2 flex items-center gap-2 border-l-2 border-purple-500/50 pl-2"><i class="ph-bold ph-sketch-logo"></i> $1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-base font-black text-emerald-400 mt-5 mb-2.5 border-b border-slate-800 pb-1.5 flex items-center gap-2"><i class="ph-bold ph-arrow-circle-right animate-pulse text-emerald-500"></i> $1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1 class="text-lg font-black text-white mt-6 mb-3 uppercase tracking-wider flex items-center gap-2"><i class="ph-fill ph-crown text-amber-400 animate-bounce"></i> $1</h1>');
    
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-emerald-300">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>');
    
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-950 p-3 rounded-xl font-mono text-xs text-indigo-300 border border-slate-800 my-3.5 overflow-x-auto shadow-inner">$1</pre>');
    html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-xs text-pink-400 border border-slate-800">$1</code>');
    
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="border-l-4 border-purple-500 bg-purple-500/10 px-4 py-2.5 my-3.5 rounded-r-xl text-slate-300 italic">$1</blockquote>');
    
    const lines = html.split('\n');
    let insideTable = false;
    let tableHtml = "";
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
            if (!insideTable) {
                insideTable = true;
                tableHtml += '<div class="overflow-x-auto my-4 rounded-xl border border-slate-800/80 shadow-xl max-w-full"><table class="w-full text-xs text-left text-slate-300 overflow-hidden">';
            }
            
            const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
            if (cells.every(c => c.startsWith('-'))) {
                continue;
            }
            
            const isHeader = tableHtml.includes('</thead>') === false && !tableHtml.includes('<tbody>');
            if (isHeader) {
                tableHtml += '<thead class="bg-slate-900 border-b border-slate-800 text-purple-400 font-extrabold uppercase tracking-widest text-[10px]"><tr>';
                cells.forEach(c => {
                    tableHtml += `<th class="px-3 py-3 font-bold">${c}</th>`;
                });
                tableHtml += '</tr></thead><tbody>';
            } else {
                tableHtml += '<tr class="border-b border-slate-900/60 hover:bg-slate-900/30 transition-all font-mono">';
                cells.forEach(c => {
                    tableHtml += `<td class="px-3 py-2 text-slate-300 border-r border-slate-900/30">${c}</td>`;
                });
                tableHtml += '</tr>';
            }
        } else {
            if (insideTable) {
                insideTable = false;
                tableHtml += '</tbody></table></div>';
                lines[i - 1] = tableHtml;
                tableHtml = "";
            }
        }
    }
    
    if (insideTable) {
        tableHtml += '</tbody></table></div>';
        lines[lines.length - 1] = tableHtml;
    }
    
    html = lines.map(l => {
        if (l.trim().startsWith('<div') || l.trim().startsWith('<thead') || l.trim().startsWith('<tr') || l.trim().startsWith('</table') || l.trim().startsWith('<h') || l.trim().startsWith('<li') || l.trim().startsWith('<blockquote') || l.trim().startsWith('<pre')) {
            return l;
        }
        
        if (l.trim().startsWith('- ') || l.trim().startsWith('* ')) {
            return `<li class="ml-4 list-disc text-slate-300 pl-1 py-1 leading-relaxed">${l.replace(/^[-*]\s+/, '')}</li>`;
        }
        
        if (l.trim() === '') return '';
        return `<p class="mb-3.5 leading-relaxed text-slate-300 text-sm">${l}</p>`;
    }).join('\n');
    
    return html;
};

(window as any).aiChatSessionHistory = [];

(window as any).resetAIChatHistory = () => {
    const currentBasePrompt = (window as any).currentAIBasePrompt || "";
    const activeResText = (window as any).lastAITextSyair || "";
    
    if (currentBasePrompt && activeResText) {
        (window as any).aiChatSessionHistory = [
            { role: "user", parts: [{ text: currentBasePrompt }] },
            { role: "model", parts: [{ text: activeResText }] }
        ];
    } else {
        (window as any).aiChatSessionHistory = [];
    }
    
    const container = document.getElementById('ai-chat-history-container');
    if (container) {
        container.innerHTML = `
            <div class="flex items-start gap-2.5 max-w-[85%] animate-fade-in">
                <div class="bg-purple-500/20 text-purple-400 p-1.5 rounded-lg text-xs mt-0.5"><i class="ph-fill ph-robot"></i></div>
                <div class="bg-slate-900 p-3 rounded-2xl rounded-tl-none border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                    Halo! Hasil analisis pola angka jitu untuk pasaran ini telah siap di atas. Anda bisa menanyakan lebih lanjut tentang rincian rumus, sandingan, Shio, atau prediksi Kepala/Ekor spesifik ke saya di sini. Silakan ketik pertanyaan Anda!
                </div>
            </div>`;
    }
    (window as any).showToast("Riwayat chat ulang berhasil direset");
};

(window as any).sendFollowUpQuestion = async () => {
    const inputEl = document.getElementById('ai-chat-input') as HTMLTextAreaElement;
    const btn = document.getElementById('btn-send-ai-chat') as HTMLButtonElement;
    const sendIcon = document.getElementById('ai-chat-send-icon');
    const container = document.getElementById('ai-chat-history-container');
    
    if (!inputEl || !container) return;
    
    const question = inputEl.value.trim();
    if (!question) {
        return (window as any).showToast("Ketik pertanyaan anda terlebih dahulu!", true);
    }
    
    // Add Enter key event listener to the input element if not already added
    if (!inputEl.dataset.enterHook) {
        inputEl.dataset.enterHook = "true";
        inputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                (window as any).sendFollowUpQuestion();
            }
        });
    }
    
    inputEl.disabled = true;
    if (btn) btn.disabled = true;
    if (sendIcon) {
        sendIcon.className = "ph-bold ph-spinner-gap animate-spin text-base text-purple-200";
    }
    
    // Append user query bubble
    const userBox = document.createElement('div');
    userBox.className = "flex items-start gap-2.5 max-w-[85%] ml-auto justify-end animate-slice-in";
    userBox.innerHTML = `
        <div class="bg-purple-600 p-3 rounded-2xl rounded-tr-none text-xs text-white leading-relaxed font-semibold shadow-inner">
            ${question.replace(/\n/g, '<br>')}
        </div>
        <div class="bg-purple-900/40 text-purple-300 p-1.5 rounded-lg text-xs mt-0.5"><i class="ph-fill ph-user"></i></div>
    `;
    container.appendChild(userBox);
    container.scrollTop = container.scrollHeight;
    
    inputEl.value = "";
    
    // Add loader bubble
    const loaderId = "ai-reply-loader-" + Date.now();
    const loaderBox = document.createElement('div');
    loaderBox.id = loaderId;
    loaderBox.className = "flex items-start gap-2.5 max-w-[85%] animate-fade-in";
    loaderBox.innerHTML = `
        <div class="bg-purple-500/20 text-purple-400 p-1.5 rounded-lg text-xs mt-0.5"><i class="ph-fill ph-robot"></i></div>
        <div class="bg-slate-900/60 p-3 rounded-2xl rounded-tl-none border border-slate-800/80 text-xs text-slate-400 leading-relaxed italic flex items-center gap-2">
            <div class="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
            <div class="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div class="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            <span>Mengonsep jawaban pola jitu...</span>
        </div>
    `;
    container.appendChild(loaderBox);
    container.scrollTop = container.scrollHeight;
    
    if (!(window as any).aiChatSessionHistory || (window as any).aiChatSessionHistory.length === 0) {
        const coreBasePrompt = (window as any).currentAIBasePrompt || "Kamu adalah Engine SupremeTOTO Master.";
        const coreLastResText = (window as any).lastAITextSyair || "Analisis angka jitu.";
        (window as any).aiChatSessionHistory = [
            { role: "user", parts: [{ text: coreBasePrompt }] },
            { role: "model", parts: [{ text: coreLastResText }] }
        ];
    }
    
    (window as any).aiChatSessionHistory.push({
        role: "user",
        parts: [{ text: question }]
    });
    
    const apiKey = (window as any).getGeminiAPIKey();
    
    try {
        let data: any = null;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
        
        try {
            data = await fetchGeminiWithRetry(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: (window as any).aiChatSessionHistory })
            }, 2);
        } catch (firstErr: any) {
            console.warn("Primary model gemini-3-flash-preview failed, attempting fallback to gemini-3.5-flash...", firstErr);
            const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
            data = await fetchGeminiWithRetry(fallbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: (window as any).aiChatSessionHistory })
            }, 2);
        }
        
        let replyText = "";
        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            replyText = data.candidates[0].content.parts[0].text || "";
        }
        
        if (!replyText || replyText.trim() === "") {
            throw new Error("Gemini mengembalikan respon kosong atau diblokir oleh filter keamanan.");
        }
        
        (window as any).aiChatSessionHistory.push({
            role: "model",
            parts: [{ text: replyText }]
        });
        
        loaderBox.remove();
        
        const replyBox = document.createElement('div');
        replyBox.className = "flex items-start gap-2.5 max-w-[85%] animate-fade-in";
        replyBox.innerHTML = `
            <div class="bg-purple-500/20 text-purple-400 p-1.5 rounded-lg text-xs mt-0.5"><i class="ph-fill ph-robot"></i></div>
            <div class="bg-slate-900 p-3 rounded-2xl rounded-tl-none border border-slate-800 text-xs text-slate-300 leading-relaxed">
                ${(window as any).parseMarkdown(replyText)}
            </div>
        `;
        container.appendChild(replyBox);
        container.scrollTop = container.scrollHeight;
        
    } catch(e: any) {
        loaderBox.remove();
        const errorBox = document.createElement('div');
        errorBox.className = "flex items-start gap-2.5 max-w-[85%] animate-fade-in";
        errorBox.innerHTML = `
            <div class="bg-red-500/20 text-red-400 p-1.5 rounded-lg text-xs mt-0.5"><i class="ph-fill ph-warning-circle"></i></div>
            <div class="bg-red-500/10 p-3 rounded-2xl rounded-tl-none border border-red-500/30 text-xs text-red-400 leading-relaxed">
                Gagal memanggil AI: ${e.message || 'Koneksi terganggu'}. Silakan coba tanyakan kembali.
            </div>
        `;
        container.appendChild(errorBox);
        container.scrollTop = container.scrollHeight;
        (window as any).aiChatSessionHistory.pop();
    } finally {
        inputEl.disabled = false;
        if (btn) btn.disabled = false;
        if (sendIcon) sendIcon.className = "ph-bold ph-paper-plane-right text-base text-white";
        // Also ensure key listener is kept
        setTimeout(() => {
            const freshInput = document.getElementById('ai-chat-input') as HTMLTextAreaElement;
            if (freshInput) {
                freshInput.focus();
                if (!freshInput.dataset.enterHook) {
                    freshInput.dataset.enterHook = "true";
                    freshInput.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            (window as any).sendFollowUpQuestion();
                        }
                    });
                }
            }
        }, 50);
    }
};

(window as any).generateAI = async () => {
    const sel = document.getElementById('ai-pool-selector') as HTMLSelectElement;
    const aiRes = (document.getElementById('hasil-analisis') || document.getElementById('ai-result')) as HTMLDivElement;
    const aiRawBtn = document.getElementById('btn-raw-tafsir');
    if(!sel || !sel.value || !aiRes) return (window as any).showToast("Pilih pasaran dulu!", true);

    const apiKey = (window as any).getGeminiAPIKey();
    
    if(!apiKey || apiKey.trim() === "") {
         return (window as any).showToast("Kunci API Master Belum Diatur! Masukkan API Key Gemini di Panel Admin.", true);
    }
    
    const pPromptSelector = document.getElementById('ai-prompt-selector') as HTMLSelectElement;
    const pPrompt = pPromptSelector ? pPromptSelector.value : "";
    
    const manualPromptEl = (document.getElementById('analisis-prompt') || document.getElementById('ai-manual-prompt')) as HTMLTextAreaElement;
    const manualPrompt = manualPromptEl ? manualPromptEl.value : "";

    const btn = (document.getElementById('btn-start-ai') || document.getElementById('btn-generate-ai')) as HTMLButtonElement;
    if(btn) { 
        btn.innerHTML = `<i class="ph-fill ph-spinner-gap animate-spin text-lg md:text-xl"></i> ANALISIS...`; 
        btn.disabled = true; 
    }
    
    // Render dynamic premium loader inside the results container
    if (aiRes) {
        aiRes.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-slate-400 select-none animate-pulse">
                <div class="relative w-16 h-16 mb-5">
                    <div class="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
                    <div class="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin"></div>
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-400 text-xl font-bold"><i class="ph-fill ph-brain"></i></div>
                </div>
                <p class="font-extrabold text-slate-100 tracking-wider text-sm flex items-center gap-2 justify-center"><span class="w-2 h-2 bg-purple-500 rounded-full animate-ping"></span> MENGHUBUNGKAN KE GEMINI ENGINE...</p>
                <p class="text-[10px] text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed font-mono">Bekerja di latar belakang. Merambah basis data histori angka pasaran, menyatukan vector data sandingan aktif, dan mensinkronisasikan pola jitu.</p>
            </div>
        `;
    }
    
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

    const toggleSandinganEl = document.getElementById('toggle-sandingan') as HTMLInputElement;
    const useSandingan = toggleSandinganEl ? toggleSandinganEl.checked : false;
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

    if (typeof (window as any).updateGeminiStatusIndicator === 'function') {
        (window as any).updateGeminiStatusIndicator('loading');
    }

    try {
        let data: any = null;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
        
        try {
            data = await fetchGeminiWithRetry(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: basePrompt }] }] })
            }, 3);
        } catch (firstErr: any) {
            console.warn("Primary model gemini-3-flash-preview failed, attempting fallback to gemini-3.5-flash...", firstErr);
            const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
            data = await fetchGeminiWithRetry(fallbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: basePrompt }] }] })
            }, 3);
        }

        let resTxt = "";
        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            resTxt = data.candidates[0].content.parts[0].text || "";
        }
        
        if (!resTxt || resTxt.trim() === "") {
            throw new Error("Gemini mengembalikan respon kosong atau diblokir oleh filter keamanan.");
        }

        (window as any).lastAITextSyair = resTxt;
        (window as any).currentAIBasePrompt = basePrompt;

        if (infoEl) infoEl.innerHTML = `<span class="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold border border-purple-400">GEMINI 3.0</span> <span class="text-xs text-slate-400 ml-2">Analisis Selesai</span>`;
        if (aiRawBtn) aiRawBtn.classList.remove('hidden');

        if (typeof (window as any).updateGeminiStatusIndicator === 'function') {
            (window as any).updateGeminiStatusIndicator('ready');
        }

        // Render response details inside the page container
        if (aiRes) {
            aiRes.innerHTML = `
                <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 md:p-8 text-sm text-slate-300 leading-relaxed shadow-lg mb-6 backdrop-blur-sm animate-fade-in">
                    ${(window as any).parseMarkdown(resTxt)}
                </div>
                
                <!-- Q&A Portal -->
                <div class="mt-8 border-t border-purple-500/20 pt-6" id="ai-chat-section">
                    <div class="bg-slate-900/50 rounded-2xl border border-purple-500/30 p-4 md:p-6 shadow-[0_0_25px_rgba(147,51,234,0.05)]">
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                            <div class="flex items-center gap-2">
                                <div class="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                                    <i class="ph-bold ph-chats-circle text-xl"></i>
                                </div>
                                <div>
                                    <h4 class="font-extrabold text-sm text-slate-100 uppercase tracking-widest leading-none">Pusat Konsultasi AI</h4>
                                    <span class="text-[9px] text-purple-400 font-mono font-bold font-extrabold">TANYA JAWAB POLA LANJUTAN</span>
                                </div>
                            </div>
                            <button onclick="window.resetAIChatHistory()" class="text-[9px] uppercase font-bold text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/50 cursor-pointer">
                                <i class="ph-bold ph-trash font-bold"></i> Reset Chat
                            </button>
                        </div>
                        
                        <!-- Chat Bubbles -->
                        <div id="ai-chat-history-container" class="space-y-4 max-h-[300px] overflow-y-auto mb-4 p-3 rounded-xl bg-slate-950 border border-slate-900/80 custom-scrollbar">
                            <div class="flex items-start gap-2.5 max-w-[85%]">
                                <div class="bg-purple-500/20 text-purple-400 p-1.5 rounded-lg text-xs mt-0.5"><i class="ph-fill ph-robot"></i></div>
                                <div class="bg-slate-900 p-3 rounded-2xl rounded-tl-none border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                                    Halo! Hasil analisis pola angka jitu untuk pasaran ini telah siap di atas. Anda bisa menanyakan lebih lanjut tentang rincian rumus, sandingan, Shio, atau prediksi Kepala/Ekor spesifik ke saya di sini. Silakan ketik pertanyaan Anda!
                                </div>
                            </div>
                        </div>

                        <!-- Input group -->
                        <div class="flex gap-2 relative">
                            <textarea id="ai-chat-input" placeholder="Tanyakan detail pola, BBFS, Shio, atau hapus angka..." class="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-purple-500/50 outline-none rounded-xl p-3 text-xs text-slate-200 h-11 resize-none transition-all leading-tight"></textarea>
                            <button id="btn-send-ai-chat" onclick="window.sendFollowUpQuestion()" class="bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white font-bold px-4 rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center cursor-pointer active:scale-95">
                                <i id="ai-chat-send-icon" class="ph-bold ph-paper-plane-right text-base text-white"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            aiRes.removeAttribute('style');
            aiRes.scrollTop = 0;
            
            // Set up chat session
            (window as any).aiChatSessionHistory = [
                { role: "user", parts: [{ text: basePrompt }] },
                { role: "model", parts: [{ text: resTxt }] }
            ];
        }

        // Show studio button bar at bottom
        const panelExp = document.getElementById('panel-export-syair');
        if (panelExp) {
            panelExp.classList.remove('hidden');
        }

        (window as any).showToast("Analisis AI Selesai dan disimpan!");

    } catch (error: any) {
        const currentKey = (window as any).getGeminiAPIKey();
        const isDefaultKey = currentKey === (window as any).DEFAULT_API_KEY;
        const keyStatusText = isDefaultKey 
            ? "Anda menggunakan API Key Default sistem (mungkin kuota habis / diblokir oleh Google)." 
            : `Menggunakan Kunci API: ${currentKey || "Belum diisi"}.`;

        if (typeof (window as any).updateGeminiStatusIndicator === 'function') {
            (window as any).updateGeminiStatusIndicator('failed', error.message || 'Koneksi AI Gagal');
        }

        aiRes.innerHTML = `
            <div class="bg-red-500/10 border border-red-500/35 p-5 rounded-2xl text-red-400 flex flex-col gap-3 max-w-2xl mx-auto my-4 shadow-lg animate-fade-in text-left">
                <div class="flex items-start gap-3">
                    <i class="ph-fill ph-warning-octagon text-3xl text-red-500 shrink-0 mt-0.5"></i>
                    <div>
                        <p class="font-extrabold text-base text-red-400 uppercase tracking-wide">Gagal Sinkronisasi AI</p>
                        <p class="text-xs text-slate-300 mt-1 leading-relaxed font-sans">${error.message || "Gagal mengambil data dari Gemini API. Silakan periksa koneksi internet atau API Key Anda."}</p>
                    </div>
                </div>
                <div class="border-t border-red-500/10 my-1"></div>
                <div class="text-[11px] text-slate-400 leading-relaxed font-sans space-y-1">
                    <p class="font-bold text-slate-300"><i class="ph-bold ph-key text-amber-500"></i> Status Kunci API Gemini:</p>
                    <p class="text-slate-400 ml-4">${keyStatusText}</p>
                    <p class="text-amber-400 font-bold mt-2"><i class="ph-bold ph-lightbulb"></i> Solusi untuk Github Pages / Hosting Luar:</p>
                    <p class="ml-4 font-normal text-slate-300">1. Buka <b>Panel Admin</b> (paling bawah menu navigasi samping).</p>
                    <p class="ml-4 font-normal text-slate-300">2. Masukkan PIN Admin Anda.</p>
                    <p class="ml-4 font-normal text-slate-300">3. Gulir ke bawah ke bagian <b>Registri Multi-Engine & API Key Gemini</b>.</p>
                    <p class="ml-4 font-normal text-slate-300">4. Masukkan API Key Gemini pribadi Anda yang valid agar tidak terkena limit atau blokir.</p>
                </div>
            </div>
        `;
        if (infoEl) infoEl.innerHTML = `<span class="text-red-400 text-xs font-bold leading-normal"><i class="ph-fill ph-warning-circle"></i> Koneksi AI Gagal</span>`;
    } finally {
        if(btn) { 
            btn.innerHTML = `<i class="ph-fill ph-magic-wand text-lg"></i> Mulai`; 
            btn.disabled = false; 
        }
    }
};

(window as any).analyzeWithGemini = (window as any).generateAI;

(window as any).renderSyairVarsAdmin = () => {
    const list = document.getElementById('admin-syair-variables-list') || document.getElementById('syair-vars-list');
    if (!list) return;
    
    list.innerHTML = '';
    ((window as any).syairVariables || []).forEach((v: string) => {
        list.innerHTML += `
            <span class="flex items-center gap-1.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-bold font-mono">
                {{${v}}}
                <button type="button" onclick="deleteSyairVar('${v}')" class="text-indigo-400 hover:text-indigo-200 hover:bg-indigo-500/35 rounded h-5 w-5 flex items-center justify-center transition-all cursor-pointer">
                    <i class="ph-bold ph-x text-[10px]"></i>
                </button>
            </span>
        `;
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

    const previewContainer = document.getElementById('admin-syair-preview') || document.getElementById('admin-syair-preview-canvas');
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
    const btn = (document.getElementById('btn-save-syair') || e.submitter || e.target.querySelector('button[type="submit"]')) as HTMLButtonElement;
    const prevHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<i class="ph ph-spinner-gap animate-spin"></i> MENYIMPAN...`;
        btn.disabled = true;
    }

    try {
        const docData = {
            bgUrl: (document.getElementById('edit-syair-bg') as HTMLInputElement)?.value || (window as any).syairTemplate?.bgUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
            opacity: (document.getElementById('edit-syair-opacity') as HTMLInputElement)?.value || (window as any).syairTemplate?.opacity || "80",
            mainColor: (document.getElementById('edit-syair-color-main') as HTMLInputElement)?.value || (window as any).syairTemplate?.mainColor || "#fbbf24",
            accentColor: (document.getElementById('edit-syair-color-accent') as HTMLInputElement)?.value || (window as any).syairTemplate?.accentColor || "#b45309",
            footer: (document.getElementById('edit-syair-footer') as HTMLInputElement)?.value || (window as any).syairTemplate?.footer || "Utamakan Prediksi Sendiri",
            html: ((document.getElementById('input-syair-html') as HTMLTextAreaElement).value).trim(),
            variables: (window as any).syairVariables
        };
        await setDoc(doc(db, 'settings', 'syair_template'), docData, {merge: true});
        (window as any).showToast("Desain Syair & Variabel berhasil tersimpan!");
    } catch(err: any) {
        (window as any).showToast(`Gagal menyimpan: ${err.message}`, true);
    } finally {
        if (btn) {
            btn.innerHTML = prevHtml;
            btn.disabled = false;
        }
    }
};

(window as any).saveSyairCustomHTML = async (e: any) => {
    await (window as any).saveSyairTemplate(e);
};

(window as any).addSyairVar = async (e: any) => {
    e.preventDefault();
    if(!(window as any).cloudUserId) return;
    const input = document.getElementById('input-new-syair-var') as HTMLInputElement;
    if(!input) return;
    const newVar = input.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
    if(!newVar) return;
    
    if(((window as any).syairVariables || []).includes(newVar)) {
        (window as any).showToast("Variabel sudah ada!", true);
        return;
    }
    
    (window as any).syairVariables = [...((window as any).syairVariables || []), newVar];
    input.value = '';
    
    try {
        const docData = {
            bgUrl: (document.getElementById('edit-syair-bg') as HTMLInputElement)?.value || (window as any).syairTemplate?.bgUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
            opacity: (document.getElementById('edit-syair-opacity') as HTMLInputElement)?.value || (window as any).syairTemplate?.opacity || "80",
            mainColor: (document.getElementById('edit-syair-color-main') as HTMLInputElement)?.value || (window as any).syairTemplate?.mainColor || "#fbbf24",
            accentColor: (document.getElementById('edit-syair-color-accent') as HTMLInputElement)?.value || (window as any).syairTemplate?.accentColor || "#b45309",
            footer: (document.getElementById('edit-syair-footer') as HTMLInputElement)?.value || (window as any).syairTemplate?.footer || "Utamakan Prediksi Sendiri",
            html: ((document.getElementById('input-syair-html') as HTMLTextAreaElement).value).trim(),
            variables: (window as any).syairVariables
        };
        await setDoc(doc(db, 'settings', 'syair_template'), docData, {merge: true});
        (window as any).showToast(`Variabel {{${newVar}}} berhasil ditambahkan!`);
    } catch(err: any) {
        (window as any).showToast("Gagal menyimpan: " + err.message, true);
    }
};

(window as any).deleteSyairVar = async (varName: string) => {
    if(!(window as any).cloudUserId) return;
    if(!confirm(`Yakin ingin menghapus variabel {{${varName}}}?`)) return;
    
    (window as any).syairVariables = ((window as any).syairVariables || []).filter((v: string) => v !== varName);
    
    try {
        const docData = {
            bgUrl: (document.getElementById('edit-syair-bg') as HTMLInputElement)?.value || (window as any).syairTemplate?.bgUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
            opacity: (document.getElementById('edit-syair-opacity') as HTMLInputElement)?.value || (window as any).syairTemplate?.opacity || "80",
            mainColor: (document.getElementById('edit-syair-color-main') as HTMLInputElement)?.value || (window as any).syairTemplate?.mainColor || "#fbbf24",
            accentColor: (document.getElementById('edit-syair-color-accent') as HTMLInputElement)?.value || (window as any).syairTemplate?.accentColor || "#b45309",
            footer: (document.getElementById('edit-syair-footer') as HTMLInputElement)?.value || (window as any).syairTemplate?.footer || "Utamakan Prediksi Sendiri",
            html: ((document.getElementById('input-syair-html') as HTMLTextAreaElement).value).trim(),
            variables: (window as any).syairVariables
        };
        await setDoc(doc(db, 'settings', 'syair_template'), docData, {merge: true});
        (window as any).showToast(`Variabel {{${varName}}} berhasil dihapus!`);
    } catch(err: any) {
        (window as any).showToast("Gagal menghapus: " + err.message, true);
    }
};

(window as any).importSyairHTML = (e: any) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (ev: any) => {
        try {
            const content = ev.target.result as string;
            
            // Try parsing as JSON first
            if (file.name.endsWith('.json') || content.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(content);
                    const html = parsed.html || parsed.text || '';
                    const variables = parsed.variables || [];
                    
                    if (!html) {
                        (window as any).showToast("File JSON tidak valid / tidak ada data HTML syair", true);
                        return;
                    }
                    
                    const bgUrl = parsed.bgUrl || (window as any).syairTemplate?.bgUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
                    const opacity = parsed.opacity || (window as any).syairTemplate?.opacity || "80";
                    const mainColor = parsed.mainColor || (window as any).syairTemplate?.mainColor || "#fbbf24";
                    const accentColor = parsed.accentColor || (window as any).syairTemplate?.accentColor || "#b45309";
                    const footer = parsed.footer || (window as any).syairTemplate?.footer || "Utamakan Prediksi Sendiri";
                    
                    if (variables.length > 0) {
                        (window as any).syairVariables = variables;
                    }
                    
                    const htmlTextarea = document.getElementById('input-syair-html') as HTMLTextAreaElement;
                    if (htmlTextarea) htmlTextarea.value = html;
                    
                    await setDoc(doc(db, 'settings', 'syair_template'), {
                        html,
                        variables: (window as any).syairVariables,
                        bgUrl,
                        opacity,
                        mainColor,
                        accentColor,
                        footer
                    }, { merge: true });
                    
                    (window as any).showToast("Templat Syair & Variabel berhasil diimpor!");
                    return;
                } catch(jsonErr) {
                    // Not valid JSON, continue to raw text
                }
            }
            
            // Raw HTML or TXT file
            const bgUrl = (window as any).syairTemplate?.bgUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
            const opacity = (window as any).syairTemplate?.opacity || "80";
            const mainColor = (window as any).syairTemplate?.mainColor || "#fbbf24";
            const accentColor = (window as any).syairTemplate?.accentColor || "#b45309";
            const footer = (window as any).syairTemplate?.footer || "Utamakan Prediksi Sendiri";
            
            const htmlTextarea = document.getElementById('input-syair-html') as HTMLTextAreaElement;
            if (htmlTextarea) htmlTextarea.value = content;
            
            await setDoc(doc(db, 'settings', 'syair_template'), {
                html: content,
                variables: (window as any).syairVariables,
                bgUrl,
                opacity,
                mainColor,
                accentColor,
                footer
            }, { merge: true });
            
            (window as any).showToast("Kode HTML Syair berhasil diimpor!");
        } catch(err: any) {
            (window as any).showToast("Gagal mengimpor file: " + err.message, true);
        }
    };
    reader.readAsText(file);
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
            
            if(parsed.pools) parsed.pools.forEach((p: any) => b.set(doc(db, 'pools', p.id), p, { merge: true }));
            if(parsed.mimpi) parsed.mimpi.forEach((m: any) => b.set(doc(db, 'mimpi', m.id), m, { merge: true }));
            if(parsed.prompts) parsed.prompts.forEach((p: any) => b.set(doc(db, 'prompts', p.id), p, { merge: true }));
            if(parsed.globals) parsed.globals.forEach((g: any) => b.set(doc(db, 'globals', g.id), g, { merge: true }));
            if(parsed.extraSources) parsed.extraSources.forEach((s: any) => b.set(doc(db, 'extra_sources', s.id), s, { merge: true }));
            
            // Handle both old nested and new flat formats for settings
            const conf = parsed.config || parsed.settings?.config;
            const sandConf = parsed.sandinganConfig || parsed.settings?.sandinganConfig;
            const syConf = parsed.syairTemplate || parsed.settings?.syairTemplate;
            
            if(conf) b.set(doc(db, 'settings', 'config'), conf, { merge: true });
            if(sandConf) b.set(doc(db, 'settings', 'sandingan_config'), sandConf, { merge: true });
            if(syConf) b.set(doc(db, 'settings', 'syair_template'), syConf, { merge: true });

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
        if(parsed.pools) parsed.pools.forEach((p: any) => b.set(doc(db, 'pools', p.id), p, { merge: true }));
        if(parsed.mimpi) parsed.mimpi.forEach((m: any) => b.set(doc(db, 'mimpi', m.id), m, { merge: true }));
        if(parsed.prompts) parsed.prompts.forEach((p: any) => b.set(doc(db, 'prompts', p.id), p, { merge: true }));
        if(parsed.globals) parsed.globals.forEach((g: any) => b.set(doc(db, 'globals', g.id), g, { merge: true }));
        if(parsed.extraSources) parsed.extraSources.forEach((s: any) => b.set(doc(db, 'extra_sources', s.id), s, { merge: true }));
        
        const conf = parsed.config || parsed.settings?.config;
        const sandConf = parsed.sandinganConfig || parsed.settings?.sandinganConfig;
        const syConf = parsed.syairTemplate || parsed.settings?.syairTemplate;
        
        if(conf) b.set(doc(db, 'settings', 'config'), conf, { merge: true });
        if(sandConf) b.set(doc(db, 'settings', 'sandingan_config'), sandConf, { merge: true });
        if(syConf) b.set(doc(db, 'settings', 'syair_template'), syConf, { merge: true });

        await b.commit();
        console.log("Auto-seeded database from backup.json");
    } catch (e) {
        console.error("Auto-seed failed", e);
    }
};

(window as any).switchToLocalMode = (reason: string) => {
    (window as any).isLocalMode = true;
    (window as any).cloudUserId = "local-user";
    console.warn(`[LocalMode] Activated database bypass. Reason: ${reason}`);
    
    // Update Header Status Indicator to highlight Mode Mandiri (Local)
    const statusText = document.getElementById('cloud-status-text');
    if (statusText) {
        statusText.className = "text-[9px] sm:text-[10px] text-amber-400 font-extrabold tracking-wider shrink-0";
        statusText.innerHTML = `<i class="ph-fill ph-git-fork font-bold"></i> MANDIRI`;
    }
    const statusIcon = document.getElementById('cloud-status-icon');
    if (statusIcon) {
        statusIcon.className = "ph-fill ph-circle text-[8px] text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse";
    }

    // Update Status Info in Admin panel
    const statusDb = document.getElementById('status-db-pribadi');
    if (statusDb) {
        statusDb.classList.remove('hidden');
        statusDb.innerHTML = `
            <div class="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl shadow-lg relative flex flex-col gap-2">
                <i class="ph-fill ph-git-fork absolute top-3 right-3 text-2xl text-amber-500/20 animate-pulse"></i>
                <h3 class="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1.5"><i class="ph-bold ph-warning"></i> Mode Mandiri Aktif (Hosting Luar / Github Pages)</h3>
                <p class="text-[10px] text-slate-300 leading-relaxed font-medium font-sans">
                    Aplikasi mendeteksi berjalan di hosting pihak ketiga / domain GitHub. Karena batasan Firebase API, sistem otomatis mengaktifkan mode sandboxed mandiri yang berbasis <b>Local Storage</b> perangkat Anda.
                </p>
                <div class="border-t border-slate-700/50 my-1"></div>
                <div class="text-[9px] text-slate-400 font-sans space-y-1.5">
                    <p class="flex items-center gap-1 font-bold text-white"><i class="ph-fill ph-check-circle text-emerald-400"></i> Bekerja 100% Sempurna tanpa Error Firebase</p>
                    <p class="flex items-center gap-1"><i class="ph-fill ph-check-circle text-emerald-400"></i> Pengaturan & Kunci Gemini API tersimpan aman di browser Anda</p>
                    <p class="text-emerald-400 text-[10px] font-bold mt-1 leading-relaxed">💡 Tips: Silakan daftarkan kunci API Gemini Anda di registri Multi-Engine di bawah agar proses analisis / pengisian syair terus berjalan di GitHub Pages!</p>
                </div>
            </div>
        `;
    }

    // Helper to extract localStorage or fallback to backupData
    const loadLocal = (key: string, backupArr: any[]) => {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
                if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
            }
        } catch {}
        return backupArr;
    };

    const parsedBackup = (backupData as any) || {};

    (window as any).pools = loadLocal('superemetoto_pools', parsedBackup.pools || []);
    (window as any).pools.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    (window as any).dataBukuMimpi = loadLocal('superemetoto_mimpi', parsedBackup.mimpi || []);
    (window as any).aiPrompts = loadLocal('superemetoto_prompts', parsedBackup.prompts || []);
    (window as any).globalRules = loadLocal('superemetoto_globals', parsedBackup.globals || []);
    (window as any).extraSources = loadLocal('superemetoto_extra_sources', parsedBackup.extraSources || []);

    // Load Settings Config
    try {
        const localConf = localStorage.getItem('superemetoto_settings_config');
        if (localConf) {
            (window as any).appConfig = JSON.parse(localConf);
        } else {
            (window as any).appConfig = parsedBackup.config || parsedBackup.settings?.config || { apiKey: (window as any).DEFAULT_API_KEY };
        }
    } catch {
        (window as any).appConfig = { apiKey: (window as any).DEFAULT_API_KEY };
    }

    // Sync input field value
    const ak = (document.getElementById('input-setting-apikey') as HTMLInputElement);
    if(ak) ak.value = (window as any).appConfig.apiKey || '';

    // Load Sandingan Config
    try {
        const localSand = localStorage.getItem('superemetoto_settings_sandingan_config');
        if (localSand) {
            (window as any).sandinganConfig = JSON.parse(localSand);
        } else {
            (window as any).sandinganConfig = parsedBackup.sandinganConfig || parsedBackup.settings?.sandinganConfig || {};
        }
    } catch {
        (window as any).sandinganConfig = {};
    }

    // Load Syair Template
    try {
        const localSyair = localStorage.getItem('superemetoto_settings_syair_template');
        if (localSyair) {
            (window as any).syairTemplate = JSON.parse(localSyair);
        } else {
            (window as any).syairTemplate = parsedBackup.syairTemplate || parsedBackup.settings?.syairTemplate || {};
        }
    } catch {
        (window as any).syairTemplate = {};
    }

    const t = (window as any).syairTemplate;
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

    // Render UI lists
    (window as any).renderAdminLists();
    (window as any).renderBukuMimpi();
    (window as any).renderDropdowns();
    (window as any).renderSyairVarsAdmin();
    (window as any).updateAIInfoPanel();
    (window as any).updateAdminSyairPreview();

    if (typeof (window as any).renderGeminiKeys === 'function') {
        (window as any).renderGeminiKeys();
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
                    (window as any).isLocalMode = false;
                    (window as any).cloudUserId = user.uid;
                    const statusText = document.getElementById('cloud-status-text');
                    if(statusText) {
                        statusText.className = "text-[9px] sm:text-[10px] text-emerald-500 font-extrabold tracking-wider shrink-0";
                        statusText.innerHTML = `<i class="ph-fill ph-cloud-check"></i> AKTIF`;
                    }
                    const statusIcon = document.getElementById('cloud-status-icon');
                    if (statusIcon) {
                        statusIcon.className = "ph-fill ph-circle text-[8px] text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
                    }
                    
                    const pid = document.getElementById('active-project-id');
                    if (pid) pid.innerText = "superemetoto";
                    const rid = document.getElementById('active-room-id');
                    if (rid) rid.innerText = "TOTO-PRO-ROOM-PERMANEN";
                    document.getElementById('status-db-pribadi')?.classList.remove('hidden');

                    let isFirstPoolsLoad = true;
                    onSnapshot(collection(db, 'pools'), (snap) => {
                        (window as any).pools = snap.docs.map(d => d.data());
                        (window as any).pools.sort((a:any, b:any) => (a.order || 0) - (b.order || 0));
                        localStorage.setItem('superemetoto_pools', JSON.stringify((window as any).pools));
                        (window as any).renderAdminLists();
                        (window as any).renderDropdowns();
                        (window as any).fetchAllLiveResults();
                        
                        if (isFirstPoolsLoad) {
                            isFirstPoolsLoad = false;
                            if (snap.empty) {
                                console.log("Database pools are empty on first Firestore load, triggering automatic auto seed...");
                                (window as any).autoSeedDatabase();
                            }
                        }
                    });

                    onSnapshot(collection(db, 'mimpi'), (snap) => {
                        (window as any).dataBukuMimpi = snap.docs.map(d => d.data());
                        localStorage.setItem('superemetoto_mimpi', JSON.stringify((window as any).dataBukuMimpi));
                        (window as any).renderAdminLists();
                        (window as any).renderBukuMimpi();
                    });

                    onSnapshot(collection(db, 'prompts'), (snap) => {
                        (window as any).aiPrompts = snap.docs.map(d => d.data());
                        localStorage.setItem('superemetoto_prompts', JSON.stringify((window as any).aiPrompts));
                        (window as any).renderAdminLists();
                    });

                    onSnapshot(collection(db, 'globals'), (snap) => {
                        (window as any).globalRules = snap.docs.map(d => d.data());
                        localStorage.setItem('superemetoto_globals', JSON.stringify((window as any).globalRules));
                        (window as any).renderAdminLists();
                    });

                    onSnapshot(collection(db, 'extra_sources'), (snap) => {
                        (window as any).extraSources = snap.docs.map(d => d.data());
                        localStorage.setItem('superemetoto_extra_sources', JSON.stringify((window as any).extraSources));
                        (window as any).renderAdminLists();
                        (window as any).updateAIInfoPanel();
                    });

                    onSnapshot(doc(db, 'settings', 'config'), (docSnap) => {
                        if (docSnap.exists()) {
                            (window as any).appConfig = docSnap.data();
                            localStorage.setItem('superemetoto_settings_config', JSON.stringify((window as any).appConfig));
                            const ak = (document.getElementById('input-setting-apikey') as HTMLInputElement);
                            if(ak) ak.value = (window as any).appConfig.apiKey || '';
                            
                            // Render multi keys if config updates
                            if (typeof (window as any).renderGeminiKeys === 'function') {
                                (window as any).renderGeminiKeys();
                            }
                        }
                    });
                    
                    onSnapshot(doc(db, 'settings', 'sandingan_config'), (docSnap) => {
                        if (docSnap.exists()) {
                            (window as any).sandinganConfig = docSnap.data();
                            localStorage.setItem('superemetoto_settings_sandingan_config', JSON.stringify((window as any).sandinganConfig));
                        }
                    });

                    onSnapshot(doc(db, 'settings', 'syair_template'), (docSnap) => {
                        if (docSnap.exists()) {
                            const t = docSnap.data();
                            (window as any).syairTemplate = t;
                            localStorage.setItem('superemetoto_settings_syair_template', JSON.stringify((window as any).syairTemplate));
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
            console.error("Auth Fail, falling back to Local Mode", err);
            (window as any).switchToLocalMode(err.message || 'Firebase Auth failed');
        });
    } else {
        (window as any).switchToLocalMode("Firebase Auth not available");
    }
};

(window as any).tafsirMimpiAI = async () => {
    const inputEl = document.getElementById('input-cerita-mimpi') as HTMLTextAreaElement;
    const btn = document.getElementById('btn-tafsir-ai') as HTMLButtonElement;
    const resEl = document.getElementById('hasil-tafsir-ai');
    
    if(!inputEl || !btn || !resEl) return;
    const story = inputEl.value;
    if(!story || story.trim() === '') return (window as any).showToast("Mimpi masih kosong!", true);

    const apiKey = (window as any).getGeminiAPIKey();
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

(window as any).getGeminiAPIKey = (): string => {
    const config = (window as any).appConfig || {};
    const keys = config.geminiKeys || [];
    const activeKeys = keys.filter((k: any) => k.active && k.apiKey && k.apiKey.trim() !== "");
    
    if (activeKeys.length > 0) {
        // Balancer: Rotate randomly among active keys to prevent rating limit.
        const randomKey = activeKeys[Math.floor(Math.random() * activeKeys.length)];
        console.log(`[getGeminiAPIKey] Using active Gemini Key: "${randomKey.title}"`);
        return randomKey.apiKey;
    }
    
    const legacyKey = config.apiKey || "";
    if (legacyKey && legacyKey.trim() !== "") {
        console.log(`[getGeminiAPIKey] Using legacy master Gemini Key`);
        return legacyKey;
    }
    
    console.log(`[getGeminiAPIKey] Using default master Gemini Key`);
    return (window as any).DEFAULT_API_KEY || "";
};

(window as any).renderGeminiKeys = () => {
    const config = (window as any).appConfig || {};
    let keys = config.geminiKeys || [];
    if (!Array.isArray(keys)) keys = [];
    
    const countEl = document.getElementById('active-api-count');
    const activeCount = keys.filter((k: any) => k.active).length;
    if (countEl) countEl.innerText = `${activeCount} Aktif`;
    
    const container = document.getElementById('gemini-keys-list-container');
    if (!container) return;
    
    if (keys.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 text-slate-500 border border-dashed border-slate-700/60 rounded-xl bg-slate-900/30">
                <i class="ph ph-keyhole text-xl opacity-40 mb-1 block"></i>
                <p class="text-[10px] font-medium font-mono">Belum ada Kunci alternatif.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    keys.forEach((k: any) => {
        const maskedKey = k.apiKey ? k.apiKey : "Empty";
        const activeIcon = k.active ? 'ph-fill ph-toggle-right text-lg text-emerald-400' : 'ph-bold ph-toggle-left text-lg text-slate-500';
        
        html += `
            <div class="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-850 hover:border-slate-800 transition-all gap-2 group/key shadow-sm">
                <div class="flex flex-col min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-white uppercase truncate">${k.title || 'Tanpa Judul'}</span>
                        ${k.id === 'default' ? `<span class="text-[7px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-black px-1 uppercase tracking-tight">Legacy</span>` : ''}
                    </div>
                    <span class="text-[9px] font-mono text-slate-500 tracking-wider mt-0.5 select-all" title="${k.apiKey}">${maskedKey}</span>
                </div>
                
                <div class="flex items-center gap-3">
                    <button onclick="toggleGeminiKeyActive('${k.id}')" class="flex items-center justify-center p-1 hover:bg-slate-850 rounded transition-colors" title="Aktifkan / Nonaktifkan">
                        <i class="${activeIcon}"></i>
                    </button>
                    
                    <div class="flex items-center gap-1 border-l border-slate-800 pl-2">
                        <button onclick="editGeminiKey('${k.id}')" class="p-1 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-all" title="Edit Key">
                            <i class="ph-bold ph-pencil-simple text-xs"></i>
                        </button>
                        <button onclick="deleteGeminiKey('${k.id}')" class="p-1 text-slate-450 hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Hapus Key">
                            <i class="ph-bold ph-trash text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
};

(window as any).saveGeminiKey = async () => {
    const titleIn = document.getElementById('gemini-key-title') as HTMLInputElement;
    const valIn = document.getElementById('gemini-key-val') as HTMLInputElement;
    const editingIdIn = document.getElementById('gemini-key-editing-id') as HTMLInputElement;
    
    if (!titleIn || !valIn) return;
    
    const title = titleIn.value.trim();
    const apiKey = valIn.value.trim();
    const editingId = editingIdIn ? editingIdIn.value : "";
    
    if (!title) return (window as any).showToast("Masukkan Judul API!", true);
    if (!apiKey) return (window as any).showToast("Masukkan Kunci API Gemini!", true);
    
    try {
        const config = (window as any).appConfig || {};
        let keys = config.geminiKeys || [];
        if (!Array.isArray(keys)) keys = [];
        
        if (editingId) {
            keys = keys.map((k: any) => {
                if (k.id === editingId) {
                    return { ...k, title, apiKey };
                }
                return k;
            });
            (window as any).showToast("Kunci Gemini diperbarui!");
        } else {
            const newKey = {
                id: Date.now().toString(),
                title,
                apiKey,
                active: true
            };
            keys.push(newKey);
            (window as any).showToast("Kunci Gemini baru ditambahkan!");
        }
        
        await setDoc(doc(db, 'settings', 'config'), { geminiKeys: keys }, { merge: true });
        (window as any).cancelGeminiKeyEdit();
    } catch (e: any) {
        (window as any).showToast("Gagal menyimpan: " + e.message, true);
    }
};

(window as any).cancelGeminiKeyEdit = () => {
    const titleIn = document.getElementById('gemini-key-title') as HTMLInputElement;
    const valIn = document.getElementById('gemini-key-val') as HTMLInputElement;
    const editingIdIn = document.getElementById('gemini-key-editing-id') as HTMLInputElement;
    const formTitle = document.getElementById('gemini-form-title');
    const cancelBtn = document.getElementById('btn-cancel-gk');
    const submitBtn = document.getElementById('btn-submit-gk');
    
    if (titleIn) titleIn.value = '';
    if (valIn) valIn.value = '';
    if (editingIdIn) editingIdIn.value = '';
    if (formTitle) formTitle.innerText = 'Tambah Kunci Baru';
    if (cancelBtn) cancelBtn.classList.add('hidden');
    if (submitBtn) submitBtn.innerText = 'Simpan';
};

(window as any).toggleGeminiKeyActive = async (id: string) => {
    try {
        const config = (window as any).appConfig || {};
        let keys = config.geminiKeys || [];
        
        keys = keys.map((k: any) => {
            if (k.id === id) {
                return { ...k, active: !k.active };
            }
            return k;
        });
        
        await setDoc(doc(db, 'settings', 'config'), { geminiKeys: keys }, { merge: true });
        (window as any).showToast("Status Kunci diperbarui!");
    } catch (e: any) {
        (window as any).showToast("Gagal mengubah status: " + e.message, true);
    }
};

(window as any).editGeminiKey = (id: string) => {
    const config = (window as any).appConfig || {};
    const keys = config.geminiKeys || [];
    const keyToEdit = keys.find((k: any) => k.id === id);
    if (!keyToEdit) return;
    
    const titleIn = document.getElementById('gemini-key-title') as HTMLInputElement;
    const valIn = document.getElementById('gemini-key-val') as HTMLInputElement;
    const editingIdIn = document.getElementById('gemini-key-editing-id') as HTMLInputElement;
    const formTitle = document.getElementById('gemini-form-title');
    const cancelBtn = document.getElementById('btn-cancel-gk');
    const submitBtn = document.getElementById('btn-submit-gk');
    
    if (titleIn) titleIn.value = keyToEdit.title || '';
    if (valIn) valIn.value = keyToEdit.apiKey || '';
    if (editingIdIn) editingIdIn.value = keyToEdit.id || '';
    if (formTitle) formTitle.innerText = 'Edit Kunci Gemini';
    if (cancelBtn) cancelBtn.classList.remove('hidden');
    if (submitBtn) submitBtn.innerText = 'Update';
    
    titleIn?.focus();
};

(window as any).deleteGeminiKey = async (id: string) => {
    if (!confirm("Hapus Kunci Gemini ini dari daftar?")) return;
    try {
        const config = (window as any).appConfig || {};
        let keys = config.geminiKeys || [];
        
        keys = keys.filter((k: any) => k.id !== id);
        
        await setDoc(doc(db, 'settings', 'config'), { geminiKeys: keys }, { merge: true });
        (window as any).showToast("Kunci Gemini dihapus!");
        
        const editingIdIn = document.getElementById('gemini-key-editing-id') as HTMLInputElement;
        if (editingIdIn && editingIdIn.value === id) {
            (window as any).cancelGeminiKeyEdit();
        }
    } catch (e: any) {
        (window as any).showToast("Gagal menghapus: " + e.message, true);
    }
};

(window as any).exportGeminiKeys = () => {
    try {
        const config = (window as any).appConfig || {};
        const keys = config.geminiKeys || [];
        if (keys.length === 0) {
            return (window as any).showToast("Daftar Kunci kosong, tidak ada yang dieksport.", true);
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(keys, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `backup-gemini-keys-${Date.now()}.json`;
        a.click();
        (window as any).showToast("Berhasil ekspor Kunci Gemini!");
    } catch(e: any) {
        (window as any).showToast("Gagal ekspor kunci: " + e.message, true);
    }
};

(window as any).importGeminiKeys = (e: any) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (ev: any) => {
        try {
            const parsed = JSON.parse(ev.target.result);
            if (!Array.isArray(parsed)) {
                return (window as any).showToast("Format file salah! Harus berupa list/array JSON Kunci Gemini.", true);
            }
            if (!confirm(`Impor ${parsed.length} Kunci Gemini? Data baru akan digabungkan.`)) return;
            
            const config = (window as any).appConfig || {};
            let keys = config.geminiKeys || [];
            if (!Array.isArray(keys)) keys = [];
            
            parsed.forEach((newK: any) => {
                if (!newK.id) newK.id = Date.now() + Math.random().toString(36).substring(4);
                if (!newK.title) newK.title = "Imported Key";
                if (!newK.apiKey) return;
                if (newK.active === undefined) newK.active = true;
                
                const existsIdx = keys.findIndex((x: any) => x.id === newK.id || x.apiKey === newK.apiKey);
                if (existsIdx !== -1) {
                    keys[existsIdx] = { ...keys[existsIdx], ...newK };
                } else {
                    keys.push(newK);
                }
            });
            
            await setDoc(doc(db, 'settings', 'config'), { geminiKeys: keys }, { merge: true });
            (window as any).showToast(`Berhasil restore ${parsed.length} Kunci Gemini!`);
        } catch(err: any) {
            (window as any).showToast("Gagal parse/restore JSON: " + err.message, true);
        }
        e.target.value = '';
    };
    reader.readAsText(file);
};

(window as any).initApp();


