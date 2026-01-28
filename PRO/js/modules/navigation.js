// PRO/js/modules/navigation.js

// PRO/js/modules/navigation.js

export const Navigation = {
    init: () => {
        // Tenta recuperar a última tela ou vai para dashboard
        const lastPage = 'dashboard'; 
        Navigation.navigateTo(lastPage);

        // Adiciona listeners manuais como backup
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.getAttribute('data-target');
                if(targetId) Navigation.navigateTo(targetId);
            });
        });
        
        console.log("📍 Navegação V2: Online");
    },

    navigateTo: (targetId) => {
        // 1. Esconde TODAS as views
        const views = document.querySelectorAll('.view-section');
        views.forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('animate-fade-in');
        });

        // 2. Mostra a view ALVO
        const targetEl = document.getElementById(`view-${targetId}`);
        if (targetEl) {
            targetEl.classList.remove('hidden');
            void targetEl.offsetWidth; // Trigger reflow para reiniciar animação
            targetEl.classList.add('animate-fade-in');
            
            if(targetId !== 'chat') window.scrollTo(0,0);
        } else {
            console.error(`View não encontrada: view-${targetId}`);
        }

        // 3. Atualiza os botões (Estilo Vermelho)
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const btnTarget = btn.getAttribute('data-target');
            const icon = btn.querySelector('i');
            const text = btn.querySelector('span');

            if (btnTarget === targetId) {
                // ATIVO
                if(icon) {
                    icon.classList.remove('text-gray-500');
                    icon.classList.add('text-red-500', 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]', 'scale-110');
                }
                if(text) {
                    text.classList.remove('text-gray-600', 'opacity-80');
                    text.classList.add('text-white', 'opacity-100', 'font-black');
                }
            } else {
                // INATIVO
                if(icon) {
                    icon.classList.remove('text-red-500', 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]', 'scale-110');
                    icon.classList.add('text-gray-500');
                }
                if(text) {
                    text.classList.remove('text-white', 'opacity-100', 'font-black');
                    text.classList.add('text-gray-600', 'opacity-80');
                }
            }
        });
        
        // Renderizações específicas
       if(targetId === 'tactical' && window.Tactical && typeof window.Tactical.renderCalendarStrip === 'function') {
            window.Tactical.renderCalendarStrip();
        }
    }
};

// Exporta para o main.js poder iniciar
export function initNavigation() {
    Navigation.init();
}

// Expõe globalmente para o HTML (onclick="Navigation.navigateTo(...)")
window.Navigation = Navigation;
window.Tactical = Tactical;