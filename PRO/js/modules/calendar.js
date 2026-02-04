// PRO/js/modules/calendar.js

export function initCalendar() {
    // Garante que o container existe
    const container = document.getElementById('heatmapContainer');
    if (container) {
        renderHeatmap(container);
    }
    
    // Expõe globalmente para que o gamification.js possa chamar
    window.renderCalendar = () => {
        const c = document.getElementById('heatmapContainer');
        if (c) renderHeatmap(c);
    };
}

function renderHeatmap(container) {
    // 1. Prepara os dados
    const scores = window.AppEstado?.gamification?.dailyScores || {};
    const today = new Date();
    
    // Ajuste de semanas: Desktop (52 semanas = 1 ano), Mobile (20 semanas)
    const isMobile = window.innerWidth < 768;
    const totalWeeks = isMobile ? 20 : 52;

    // Calcula a data de início (retrocedendo no tempo)
    const startDate = new Date();
    startDate.setDate(today.getDate() - (totalWeeks * 7));
    // Ajusta para começar no Domingo anterior para alinhar
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    // 2. Cria a estrutura HTML
    // 'heatmap-scroll-container' é a classe CSS que definimos para rolagem horizontal
    let html = `<div class="heatmap-scroll-container custom-scrollbar">`;

    for (let w = 0; w < totalWeeks; w++) {
        // Coluna da semana
        html += `<div class="heatmap-week">`;
        
        for (let d = 0; d < 7; d++) {
            // Calcula a data atual do loop
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + (w * 7) + d);
            
            // Formata YYYY-MM-DD (local) para buscar no banco
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            
            // Pega a pontuação (0 a 100)
            const score = scores[dateString] !== undefined ? Number(scores[dateString]) : null;
            
            // Define o nível de cor (classes CSS h-level-0 a h-level-4)
            let levelClass = '';
            if (score !== null) {
                if (score === 0) levelClass = 'h-level-0';       // Falha
                else if (score < 40) levelClass = 'h-level-1';   // Pouco
                else if (score < 70) levelClass = 'h-level-2';   // Médio
                else if (score < 100) levelClass = 'h-level-3';  // Bom
                else if (score === 100) levelClass = 'h-level-4'; // Perfeito
            }

            // Verifica se é hoje (borda branca)
            const isToday = currentDate.toDateString() === today.toDateString();
            const todayClass = isToday ? 'ring-1 ring-white z-20' : '';

            // Texto do Tooltip
            const tooltip = `${dateString}: ${score !== null ? score + '%' : 'Sem dados'}`;

            // Renderiza o quadradinho
            html += `<div class="heatmap-cell ${levelClass} ${todayClass}" data-title="${tooltip}"></div>`;
        }
        
        html += `</div>`; // Fecha semana
    }
    
    html += `</div>`; // Fecha container

    // 3. Injeta no HTML
    container.innerHTML = html;
    
    // 4. Rola para o final (data de hoje) automaticamente
    setTimeout(() => {
        const scroller = container.querySelector('.heatmap-scroll-container');
        if(scroller) scroller.scrollLeft = scroller.scrollWidth;
    }, 50);
}

// Funções de suporte (mantidas para compatibilidade)
export function changeCalendarMonth(delta) {}