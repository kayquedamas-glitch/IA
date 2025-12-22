// PRO/js/modules/ui.js
export function showToast(title, message, type = 'neutral') {
    let container = document.getElementById('system-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'system-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `synapse-toast ${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-check';
    if (type === 'level-up') icon = 'fa-bolt';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon} toast-icon"></i>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;

    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show'); 
        setTimeout(() => toast.remove(), 500); 
    }, 4000);
}
// --- MODAL DE INPUT PERSONALIZADO ---
export function showInputModal(title, placeholder, callback) {
    // Evita abrir dois ao mesmo tempo
    if (document.getElementById('custom-input-modal')) return;

    // 1. Cria o Fundo Escuro
    const overlay = document.createElement('div');
    overlay.id = 'custom-input-modal';
    overlay.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-sm opacity-0 transition-opacity duration-300';

    // 2. Cria a Janela (Modal)
    overlay.innerHTML = `
        <div class="bg-[#121212] border border-white/10 p-6 rounded-2xl w-[90%] max-w-md shadow-2xl transform scale-95 transition-transform duration-300">
            <h3 class="text-white font-bold uppercase tracking-wider mb-3 text-xs text-gray-400">${title}</h3>
            
            <input type="text" id="modalInput" 
                class="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-4 text-white outline-none focus:border-red-600 focus:bg-[#0a0a0a] transition-all mb-6 text-sm font-inter shadow-inner" 
                placeholder="${placeholder}" autocomplete="off">
            
            <div class="flex justify-end gap-3">
                <button id="modalCancel" class="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-wider px-4 py-3 transition-colors">
                    Cancelar
                </button>
                <button id="modalConfirm" class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg shadow-red-900/20 transition-all active:scale-95 flex items-center gap-2">
                    <i class="fa-solid fa-check"></i> Confirmar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#modalInput');
    
    // Animação de Entrada
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        overlay.querySelector('div').classList.remove('scale-95');
        overlay.querySelector('div').classList.add('scale-100');
        input.focus();
    });

    // Funções de Fechar e Confirmar
    const close = () => {
        overlay.classList.add('opacity-0');
        overlay.querySelector('div').classList.remove('scale-100');
        overlay.querySelector('div').classList.add('scale-95');
        setTimeout(() => overlay.remove(), 300);
    };

    const confirm = () => {
        const val = input.value.trim();
        if (val) {
            callback(val);
            close();
        } else {
            // Treme o input se estiver vazio
            input.classList.add('border-red-500', 'animate-pulse');
            setTimeout(() => input.classList.remove('border-red-500', 'animate-pulse'), 500);
        }
    };

    // Eventos de Clique e Teclado
    overlay.querySelector('#modalCancel').onclick = close;
    overlay.querySelector('#modalConfirm').onclick = confirm;
    
    input.onkeydown = (e) => {
        if(e.key === 'Enter') confirm();
        if(e.key === 'Escape') close();
    };
}