import { CONFIG } from '../config.js';

export function initPanic() {
    window.startPanicProtocol = startPanicProtocol;
}

function startPanicProtocol() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-[#CC0000] z-[9999] flex flex-col items-center justify-center animate-pulse';
    overlay.id = 'panic-overlay';
    
    overlay.innerHTML = `
        <div class="text-center max-w-md p-6">
            <div class="text-white font-mono text-sm uppercase tracking-wider mb-8">PROTOCOLO DE EMERGÊNCIA</div>
            
            <div id="breathing-circle" class="w-64 h-64 bg-white rounded-full mx-auto mb-12 flex items-center justify-center transition-all duration-[4000ms] ease-in-out scale-100">
                <span id="panic-counter" class="text-[#CC0000] font-mono font-bold text-6xl">4</span>
            </div>
            
            <h2 id="panic-instruction" class="text-white font-mono text-2xl font-bold mb-8 uppercase">INSPIRE</h2>
            
            <button onclick="stopPanic()" class="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#CC0000] font-mono uppercase px-8 py-3 rounded text-lg transition-colors">
                ENCERRAR PROTOCOLO
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    runBreathingCycle();
}

function runBreathingCycle() {
    let phase = 'inhale'; // inhale, hold, exhale
    let count = 4;
    const circle = document.getElementById('breathing-circle');
    const text = document.getElementById('panic-instruction');
    const counter = document.getElementById('panic-counter');
    
    if(!circle) return;

    // Configuração inicial
    circle.className = "w-64 h-64 bg-white rounded-full mx-auto mb-12 flex items-center justify-center transition-all duration-[4000ms] ease-in-out scale-150"; // Expand
    text.innerText = "INSPIRE";

    window.panicInterval = setInterval(() => {
        count--;
        if(counter) counter.innerText = count;

        if (count === 0) {
            if (phase === 'inhale') {
                phase = 'hold';
                count = 4;
                text.innerText = "SEGURE";
                // Mantém tamanho
            } else if (phase === 'hold') {
                phase = 'exhale';
                count = 4;
                text.innerText = "EXPIRE";
                circle.classList.remove('scale-150');
                circle.classList.add('scale-50'); // Contrai
            } else {
                phase = 'inhale';
                count = 4;
                text.innerText = "INSPIRE";
                circle.classList.remove('scale-50');
                circle.classList.add('scale-150'); // Expande
            }
            if(counter) counter.innerText = 4;
        }
    }, 1000);
}

window.stopPanic = function() {
    clearInterval(window.panicInterval);
    const overlay = document.getElementById('panic-overlay');
    if(overlay) overlay.remove();
    // Opcional: Registrar no Supabase que usou o pânico
}