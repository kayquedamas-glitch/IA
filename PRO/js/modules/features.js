// PRO/js/modules/features.js

export function startZenMode() {
    // Remove se já existir
    const existing = document.getElementById('zen-overlay');
    if(existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'zen-overlay';
    overlay.className = 'fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center animate-fade-in';
    overlay.innerHTML = `
        <div class="absolute top-5 right-5">
            <button id="exitZen" class="text-gray-500 hover:text-white transition uppercase text-xs tracking-widest border border-gray-800 px-4 py-2 rounded-full">
                ENCERRAR SESSÃO
            </button>
        </div>
        <div class="text-center">
            <h2 class="text-gray-500 text-sm tracking-[0.3em] uppercase mb-4">MODO FOCO</h2>
            <div id="zenTimer" class="text-9xl font-black text-white font-mono tracking-tighter mb-8">25:00</div>
            <p class="text-xs text-gray-600 animate-pulse">Bloqueando distrações...</p>
        </div>
    `;

    document.body.appendChild(overlay);

    let duration = 25 * 60;
    const display = document.getElementById('zenTimer');
    
    const interval = setInterval(() => {
        let minutes = parseInt(duration / 60, 10);
        let seconds = parseInt(duration % 60, 10);
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        display.textContent = `${minutes}:${seconds}`;

        if (--duration < 0) {
            clearInterval(interval);
            display.textContent = "CONCLUÍDO";
            display.style.color = "#22c55e";
            if(window.confetti) window.confetti();
        }
    }, 1000);

    document.getElementById('exitZen').onclick = () => {
        clearInterval(interval);
        overlay.remove();
    };
}

export function showWeeklyReport() {
    const existing = document.getElementById('report-modal');
    if(existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'report-modal';
    modal.className = 'fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in';
    
    // Pega dados reais da tela
    const doneTasks = document.querySelectorAll('.fa-check').length;
    
    modal.innerHTML = `
        <div class="bg-[#121212] border border-[#333] w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button id="closeReport" class="absolute top-4 right-4 text-gray-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-white font-bold text-xl mb-1">Relatório Tático</h3>
            <p class="text-xs text-gray-500 mb-6">Resumo da sua performance atual.</p>

            <div class="space-y-3">
                <div class="bg-black p-4 rounded-xl flex justify-between border border-[#222]">
                    <span class="text-gray-400 text-sm">Missões Cumpridas</span>
                    <span class="text-green-500 font-bold">${doneTasks}</span>
                </div>
                <div class="bg-black p-4 rounded-xl flex justify-between border border-[#222]">
                    <span class="text-gray-400 text-sm">Nível Atual</span>
                    <span class="text-blue-500 font-bold">1</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('closeReport').onclick = () => modal.remove();
}