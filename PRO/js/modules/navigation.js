// PRO/js/modules/navigation.js
export function initNavigation() {
    // Expor função globalmente para o HTML poder chamar onclick="toggleSidebar()"
    window.toggleSidebar = toggleSidebar;
    window.switchTab = switchTab;
    
    // Listeners do Overlay
    document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);
}

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;

    const isOpen = sidebar.style.transform === 'translateX(0px)';
    sidebar.style.transform = isOpen ? 'translateX(-100%)' : 'translateX(0px)';
    overlay.style.visibility = isOpen ? 'hidden' : 'visible';
    overlay.style.opacity = isOpen ? '0' : '1';
}

export function switchTab(tab) {
    const viewChat = document.getElementById('viewChat');
    const viewProtocolo = document.getElementById('viewProtocolo');
    const tabChat = document.getElementById('tabChat');
    const tabJornada = document.getElementById('tabJornada');
    
    const bottomNav = document.querySelector('.bottom-nav');
    const mobileHeader = document.getElementById('mobileHeader');

    // Reset Visual
    if(tabChat) { tabChat.classList.remove('active'); tabChat.style.color = '#666'; }
    if(tabJornada) { tabJornada.classList.remove('active'); tabJornada.style.color = '#666'; }
    
    viewChat.classList.add('hidden');
    viewProtocolo.classList.add('hidden');

    if (tab === 'chat') {
        viewChat.classList.remove('hidden');
        if(tabChat) { tabChat.classList.add('active'); tabChat.style.color = '#CC0000'; }
        
        // Mostrar Barras (Mobile)
        if(bottomNav) bottomNav.style.transform = 'translateY(0)';
        if(mobileHeader) mobileHeader.style.transform = 'translateY(0)';
        
    } else {
        viewProtocolo.classList.remove('hidden');
        if(tabJornada) { tabJornada.classList.add('active'); tabJornada.style.color = '#CC0000'; }
        
        // Esconder Barras para Imersão (Mobile)
        if(bottomNav) bottomNav.style.transform = 'translateY(100%)';
        if(mobileHeader) mobileHeader.style.transform = 'translateY(-100%)';
        
        // Dispara evento customizado para avisar que a aba mudou (útil para atualizar calendário)
        document.dispatchEvent(new Event('tabChanged:protocolo'));
    }
}