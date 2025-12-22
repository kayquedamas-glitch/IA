// PRO/js/modules/ui.js

export function showToast(title, message, type = 'neutral') {
    // 1. Verifica se o container existe, se não, cria-o
    let container = document.getElementById('system-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'system-toast-container';
        document.body.appendChild(container);
    }

    // 2. Cria o elemento da notificação
    const toast = document.createElement('div');
    // Adiciona classes base e o tipo (success, level-up, warning)
    toast.className = `synapse-toast ${type}`;
    
    // 3. Seleciona o ícone baseado no tipo
    let icon = 'fa-circle-info'; // Ícone padrão
    if (type === 'success') icon = 'fa-check';
    if (type === 'level-up') icon = 'fa-bolt'; // Raio para subir de nível
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    // 4. Monta o HTML interno
    toast.innerHTML = `
        <i class="fa-solid ${icon} toast-icon"></i>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;

    // 5. Adiciona ao ecrã
    container.appendChild(toast);

    // 6. Animação de entrada (pequeno delay para o CSS transition funcionar)
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 7. Remove automaticamente após 4 segundos
    setTimeout(() => {
        toast.classList.remove('show'); // Inicia a saída (fade out)
        setTimeout(() => toast.remove(), 500); // Remove do HTML depois da animação
    }, 4000);
}