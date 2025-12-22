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