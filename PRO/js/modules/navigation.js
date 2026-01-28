// PRO/js/modules/navigation.js

export const Navigation = {
    init: () => {
        // 1. Inicia na Dashboard por padrão (ou recupera do localStorage se quiser persistência)
        Navigation.navigateTo('dashboard');

        // 2. Garante que os botões funcionem mesmo sem onclick no HTML (segurança extra)
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Encontra o botão pai caso o clique seja no ícone
                const targetBtn = e.target.closest('.nav-btn');
                const targetId = targetBtn?.dataset.target;
                if(targetId) Navigation.navigateTo(targetId);
            });
        });
        
        console.log("Sistema de Navegação V2: Online");
    },

    navigateTo: (targetId) => {
        // 1. LISTA DE TODAS AS VIEWS
        const views = ['dashboard', 'tactical', 'chat', 'profile'];
        
        // 2. ESCONDE TUDO
        views.forEach(view => {
            const el = document.getElementById(`view-${view}`);
            if (el) {
                el.classList.add('hidden');
                el.classList.remove('animate-fade-in'); // Remove para poder reiniciar animação depois
            }
        });

        // 3. MOSTRA A VIEW ALVO
        const targetEl = document.getElementById(`view-${targetId}`);
        if (targetEl) {
            targetEl.classList.remove('hidden');
            
            // Força o navegador a recalcular o layout para reiniciar a animação (Reflow)
            void targetEl.offsetWidth; 
            targetEl.classList.add('animate-fade-in');

            // Scroll para o topo (exceto no chat para manter histórico)
            if(targetId !== 'chat') window.scrollTo(0,0);
        }

        // 4. ATUALIZA A BARRA DE NAVEGAÇÃO (ESTILO VERMELHO)
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const btnTarget = btn.dataset.target;
            const icon = btn.querySelector('i');
            const text = btn.querySelector('span');
            const glowDot = btn.querySelector('.absolute.bottom-1'); // O ponto de luz (se houver no HTML)

            if (btnTarget === targetId) {
                // --- ESTADO ATIVO ---
                
                // Ícone: Vermelho, Brilhante e Levemente Maior
                if(icon) {
                    icon.className = icon.className.replace('text-gray-500', 'text-red-500');
                    icon.classList.add('drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]', 'scale-110');
                }

                // Texto: Branco e Visível
                if(text) {
                    text.classList.remove('text-gray-600', 'opacity-80');
                    text.classList.add('text-white', 'opacity-100', 'font-black');
                }

                // Ponto de Luz (Opcional, se adicionou no HTML)
                if(glowDot) {
                    glowDot.classList.remove('opacity-0');
                    glowDot.classList.add('opacity-100');
                }

            } else {
                // --- ESTADO INATIVO (RESET) ---
                
                // Ícone: Cinza e Normal
                if(icon) {
                    icon.classList.remove('text-red-500', 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]', 'scale-110');
                    if(!icon.classList.contains('text-gray-500')) icon.classList.add('text-gray-500');
                }

                // Texto: Cinza Escuro
                if(text) {
                    text.classList.remove('text-white', 'opacity-100', 'font-black');
                    text.classList.add('text-gray-600', 'opacity-80');
                }

                // Ponto de Luz
                if(glowDot) {
                    glowDot.classList.remove('opacity-100');
                    glowDot.classList.add('opacity-0');
                }
            }
        });

        // 5. EXECUTAR AÇÕES ESPECÍFICAS POR TELA
        if (targetId === 'tactical') {
            // Renderiza o calendário se estiver na tela tática
            if(window.renderCalendar) window.renderCalendar();
        }
    }
};

// Exporta para o main.js poder iniciar
export function initNavigation() {
    Navigation.init();
}

// Expõe globalmente para o HTML (onclick="Navigation.navigateTo(...)")
window.Navigation = Navigation;