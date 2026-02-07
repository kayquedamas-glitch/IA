import { CONFIG } from '../config.js';
import { addXP, logActivity } from './gamification.js';
import { showToast } from './ui.js';
import { playSFX } from './audio.js';

export function initDashboard() {
    // 1. Verifica se a sequência quebrou (Reset se passou de 24h do último dia completo)
    checkStreakIntegrity(); 

    // 2. Carrega dados visuais
    renderMissions();
    updateStreakUI();
    calculateDaysOnBase();
    setTimeout(() => initSciFiCharts(), 500);

    // 3. Conecta botão HTML ao JS
    window.addNewMission = () => {
        const input = document.getElementById('newMissionInput');
        const dateInput = document.getElementById('newMissionDate');
        createMission(input, dateInput);
    };

    // 4. Registra métrica de acesso
    if (window.Database) window.Database.logEvent('DASHBOARD_VIEW', 'Acessou Painel');
    
}

// --- LÓGICA DE DIAS NA BASE (Sincronizado na Nuvem) ---a
// PRO/js/modules/dashboard.js

// ... (código anterior mantém-se igual)

function calculateDaysOnBase() {
    const daysElement = document.getElementById('daysOnBase');
    const titleElement = document.getElementById('dashboardTitle'); // O novo elemento que criamos
    
    if (!daysElement) return;

    // Tenta pegar a data de criação da conta do estado global
    let firstLogin = window.AppEstado?.config?.firstLogin;

    // Se não existir (primeiro acesso da vida), cria agora
    if (!firstLogin) {
        firstLogin = new Date().toISOString();
        if (!window.AppEstado.config) window.AppEstado.config = {};
        window.AppEstado.config.firstLogin = firstLogin;

        // Salva imediatamente no banco
        if (window.Database) window.Database.forceSave();
    }

    try {
        const start = new Date(firstLogin);
        const now = new Date();

        // Zera horas para contar apenas dias corridos
        start.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para contar o dia de hoje

        daysElement.innerText = diffDays;

        // --- LÓGICA DE TEXTO MOTIVACIONAL (NOVO) ---
        if (titleElement) {
            let frase = "QG OPERACIONAL"; // Padrão
            
            // Lógica progressiva baseada na sobrevivência do usuário
            if (diffDays >= 3 && diffDays < 7) {
                frase = "O INÍCIO É O FILTRO.";
            } 
            else if (diffDays >= 7 && diffDays < 15) {
                frase = "A MAIORIA DESISTE AQUI. VOCÊ NÃO.";
            } 
            else if (diffDays >= 15 && diffDays < 30) {
                frase = "SE PARAR HOJE, VOLTA A SER QUEM ERA.";
            } 
            else if (diffDays >= 30) {
                frase = "VOCÊ NÃO É MAIS A MAIORIA.";
            }

            // Efeito de digitação ou apenas troca direta (aqui faremos troca direta com fade se quiser)
            titleElement.innerText = frase;
            
            // Se a frase for longa, diminui um pouco a fonte (ajuste visual opcional)
            if (frase.length > 20) {
                titleElement.classList.replace('text-3xl', 'text-xl'); 
                titleElement.classList.add('md:text-2xl'); // Em desktop mantém grande
            } else {
                titleElement.classList.replace('text-xl', 'text-3xl');
            }
        }

    } catch (e) {
        console.warn("Erro data:", e);
        daysElement.innerText = "1";
    }
}

// ... (resto do arquivo mantém-se igual)

// --- FOGO / STREAK ---
// Adicione esta variável no TOPO do arquivo (logo após os imports)
// EM PRO/js/modules/dashboard.js

// Variável Global do Timer (Coloque no topo do arquivo se não tiver)
// EM PRO/js/modules/dashboard.js

let streakInterval = null;

export function updateStreakUI() {
    const streak = window.AppEstado?.gamification?.streak || 0;
    
    // Atualiza o número de DIAS na nova barra
    const daysValue = document.getElementById('streakDaysValue');
    if (daysValue) daysValue.innerText = streak;

    // Inicia a contagem regressiva (Reset timer)
    iniciarContagemRegressiva();

    // Lógica do Fogo (Cores e Níveis)
    const fireIcon = document.getElementById('streak-fire');
    if (!fireIcon) return;

    fireIcon.className = 'fa-solid fa-fire transition-all duration-500';
    
    if (streak > 0) {
        fireIcon.classList.add('animate-flicker');
        if (streak < 7) {
            fireIcon.classList.add('text-orange-500', 'drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]');
        } else if (streak < 30) {
            fireIcon.classList.add('text-red-600', 'drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]');
        } else {
            fireIcon.classList.add('text-purple-500', 'drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]');
        }
    } else {
        fireIcon.classList.add('text-gray-700', 'opacity-30');
    }
}

function iniciarContagemRegressiva() {
    const display = document.getElementById('resetCountdown');
    const bar = document.getElementById('resetBar');
    if (!display) return;

    if (streakInterval) clearInterval(streakInterval);

    const updateTimer = () => {
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0); // Próxima meia-noite

        const diff = midnight - now;

        if (diff <= 0) {
            display.innerText = "00:00:00";
            if(bar) bar.style.width = "0%";
            return;
        }

        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);

        // Formata: 04:30:15
        const timerText = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        display.innerText = timerText;

        // Barra de "Vida" do dia (diminui com o tempo)
        if (bar) {
            const totalDaySeconds = 86400; // 24h em segundos
            const currentSecondsLeft = (h * 3600) + (m * 60) + s;
            const percentage = (currentSecondsLeft / totalDaySeconds) * 100;
            bar.style.width = `${percentage}%`;

            // Alerta Vermelho se faltar menos de 2 horas
            if (h < 2) {
                bar.classList.add('animate-pulse');
                display.classList.add('text-red-500');
            } else {
                bar.classList.remove('animate-pulse');
                display.classList.remove('text-red-500');
            }
        }
    };

    updateTimer();
    streakInterval = setInterval(updateTimer, 1000);
}

// --- GERENCIAMENTO DE MISSÕES ---

function getMissions() {
    return window.AppEstado.gamification?.missions || [];
}

function saveMissions(newMissions) {
    if (!window.AppEstado.gamification) window.AppEstado.gamification = {};
    window.AppEstado.gamification.missions = newMissions;

    if (window.Database) window.Database.forceSave();
    renderMissions();
}

function createMission(input, dateInput) {
    const text = input.value.trim();
    const date = dateInput ? dateInput.value : null;

    if (!text) return;

    const missions = getMissions();
    missions.push({
        id: Date.now(),
        text,
        date: date,
        done: false
    });

    playSFX('type');
    saveMissions(missions);

    input.value = '';
    showToast('MISSÃO AGENDADA', 'Objetivo traçado.', 'neutral');
    if (window.Database) window.Database.logEvent('MISSAO_CRIADA', text);
}

export function addMissionFromAI(text) {
    const missions = getMissions();
    missions.push({
        id: Date.now(),
        text,
        date: new Date().toISOString().split('T')[0],
        done: false
    });
    saveMissions(missions);
    return true;
}
export function renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;

    const state = getRPGState();
    const scores = state.dailyScores || {};
    
    // Configuração
    const daysToShow = 28; // 4 semanas
    const today = new Date();
    
    let html = '<div class="grid grid-cols-7 gap-1.5 w-full h-full">';
    
    // Loop reverso (do dia mais antigo para hoje)
    for (let i = daysToShow - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        
        // Formata data igual ao gamification.js (YYYY-MM-DD)
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const score = scores[dateStr] || 0;
        
        // Define a cor baseada no score (Mapa de Calor Verde)
        let colorClass = 'bg-[#161b22]'; // Vazio (Cinza escuro)
        if (score > 0) colorClass = 'bg-green-900/40'; // Pouco (Verde Escuro)
        if (score >= 50) colorClass = 'bg-green-600/60'; // Médio
        if (score >= 80) colorClass = 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]'; // Perfeito (Verde Neon)

        // Tooltip simples (Title)
        const displayDate = `${day}/${month}`;
        
        html += `
            <div title="${displayDate}: ${score}%" 
                 class="${colorClass} w-full aspect-square rounded-sm transition-all duration-300 hover:scale-110 border border-white/5">
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

window.completeMission = (id) => {
    const missions = getMissions();
    const index = missions.findIndex(m => m.id == id);

    if (index > -1) {
        const m = missions[index];
        m.done = !m.done;

        if (m.done) {
            playSFX('success');
            // XP por missão individual (opcional, pode manter ou tirar)
            addXP(20); 
            logActivity('MISSION', m.text, 20);
            
            if (window.Database) window.Database.logEvent('MISSAO_COMPLETA', m.text);
        } else {
            playSFX('click');
        }
        
        // 1. Salva o estado atual da missão
        saveMissions(missions);

        // 2. VERIFICA SE COMPLETOU TUDO HOJE (NOVA LÓGICA)
        if (m.done) {
            checkDailyAllDone();
        }
    }
};

window.deleteMission = (id) => {
    if (confirm('Abortar missão?')) {
        let missions = getMissions();
        missions = missions.filter(m => m.id != id);
        saveMissions(missions);
    }
};

window.clearCompleted = () => {
    let missions = getMissions();
    missions = missions.filter(m => !m.done);
    saveMissions(missions);
    playSFX('click');
    showToast('LIMPEZA', 'Missões arquivadas.', 'neutral');
};

// --- GRÁFICOS ---
function updateDashboardProgress() {
    const missions = getMissions();
    const total = missions.length;
    const done = missions.filter(m => m.done).length;

    const textEl = document.getElementById('dailyMetaText');
    const circleEl = document.querySelector('.circle-chart');
    const percentEl = document.getElementById('dailyPercentage');

    if (textEl) textEl.innerText = `${done}/${total}`;

    const percentage = total === 0 ? 0 : Math.round((done / total) * 100);

    if (percentEl) percentEl.innerText = `${percentage}%`;

    if (circleEl) {
        circleEl.style.background = `conic-gradient(#cc0000 ${percentage}%, #222 ${percentage}%)`;
        circleEl.style.boxShadow = percentage === 100 ? '0 0 15px rgba(204, 0, 0, 0.5)' : 'none';
    }
}

function renderMissions() {
    updateDashboardProgress();
    const missions = getMissions();
    const list = document.getElementById('missionList');
    if (!list) return;

    if (missions.length === 0) {
        list.innerHTML = `<div class="text-center text-gray-700 py-8 flex flex-col items-center"><i class="fa-solid fa-list-check text-2xl mb-2 opacity-30"></i><p class="text-[10px] uppercase tracking-widest opacity-50">Sem ordens ativas</p></div>`;
        return;
    }

    missions.sort((a, b) => {
        if (a.done === b.done) return (new Date(b.date || 0) - new Date(a.date || 0));
        return a.done ? 1 : -1;
    });

    list.innerHTML = missions.map(m => {
        const isLate = m.date && new Date(m.date) < new Date().setHours(0, 0, 0, 0) && !m.done;
        return `
        <div class="group flex items-center justify-between p-4 bg-[#0a0a0a] border ${m.done ? 'border-green-900/30 opacity-60' : (isLate ? 'border-red-900/60' : 'border-white/5')} rounded-xl hover:border-white/20 transition-all mb-2">
            <div class="flex items-center gap-3 w-full cursor-pointer" onclick="window.completeMission(${m.id})">
                <div class="flex-shrink-0 w-6 h-6 rounded-full border ${m.done ? 'bg-green-900/50 border-green-500' : 'border-gray-600 hover:border-red-500'} transition flex items-center justify-center">
                    ${m.done ? '<i class="fa-solid fa-check text-[10px] text-green-400"></i>' : ''}
                </div>
                <div class="flex flex-col w-full overflow-hidden">
                    <span class="text-sm ${m.done ? 'text-gray-500 line-through' : 'text-gray-200 font-medium'} truncate">${m.text}</span>
                    ${m.date ? `<div class="flex items-center gap-2 mt-1"><span class="text-[10px] font-mono flex items-center gap-1 ${isLate && !m.done ? 'text-red-500 font-bold animate-pulse' : 'text-gray-600'}"><i class="fa-regular fa-calendar"></i> ${m.date.split('-').reverse().join('/').substring(0, 5)}</span></div>` : ''}
                </div>
            </div>
            <button onclick="window.deleteMission(${m.id})" class="text-gray-700 hover:text-red-500 transition p-2 ml-2"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>`
    }).join('');
}
// --- LÓGICA AVANÇADA DE SEQUÊNCIA (STREAK) ---

function checkDailyAllDone() {
    const missions = getMissions();
    
    // Se não houver missões, não faz nada
    if (missions.length === 0) return;

    // Verifica se TODAS estão completas
    const allCompleted = missions.every(m => m.done);

    if (allCompleted) {
        incrementStreak();
    }
}

function incrementStreak() {
    const today = new Date().toDateString(); // Ex: "Tue Jan 27 2026"
    const gamification = window.AppEstado.gamification || {};
    const lastDate = gamification.lastStreakDate;

    // Se já computou a sequência HOJE, não aumenta de novo
    if (lastDate === today) {
        return;
    }

    // Aumenta a sequência
    gamification.streak = (gamification.streak || 0) + 1;
    gamification.lastStreakDate = today; // Marca hoje como feito

    // Salva no estado global
    window.AppEstado.gamification = gamification;
    if (window.Database) window.Database.forceSave();

    // Feedback Visual Épico
    updateStreakUI();
    showToast('DIA CONQUISTADO!', 'Sequência Aumentada +1', 'success');
    playSFX('level-up'); // Ou outro som de vitória
    
    // Opcional: XP Bônus por fechar o dia
    addXP(100);
}

function checkStreakIntegrity() {
    const gamification = window.AppEstado.gamification || {};
    const lastDateStr = gamification.lastStreakDate;
    
    if (!lastDateStr) return; // Nunca começou uma sequência

    const lastDate = new Date(lastDateStr);
    const today = new Date();
    
    // Zera as horas para comparar apenas os dias
    lastDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    // Diferença em milissegundos
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Se a diferença for maior que 1 dia (ex: fez anteontem, pulou ontem, entrou hoje)
    // diffDays = 0 (mesmo dia)
    // diffDays = 1 (dia seguinte, ok)
    // diffDays > 1 (quebrou a sequência)
    if (diffDays > 1) {
        console.log("Sequência quebrada. Resetando...");
        gamification.streak = 0;
        // Não resetamos o lastStreakDate para não bugar lógicas futuras, 
        // apenas o contador visual.
        
        window.AppEstado.gamification = gamification;
        if (window.Database) window.Database.forceSave();
    }
}
// Adicione esta função no final do dashboard.js e chame-a no initDashboard()

export function renderDisciplineGraph() {
    // Procura o container onde ficava a "streak" (Sequência)
    // Sugestão: Crie uma div com id="disciplineChartContainer" no seu HTML onde deseja exibir
    const container = document.getElementById('streakDisplay')?.parentElement; 
    
    if (!container) return;
    
    // Limpa o container para desenhar o gráfico novo (mantendo o título se quiser)
    // Vamos substituir o número simples pelo gráfico
    
    const scores = window.AppEstado?.gamification?.dailyScores || {};
    const history = [];
    const today = new Date();
    const DAYS_TO_SHOW = 14; // Últimas 2 semanas

    // Coleta dados dos últimos X dias
    for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        // Se não tiver dado, assume 0 para o gráfico não quebrar
        history.push(scores[dateStr] !== undefined ? scores[dateStr] : 0);
    }

    // Configuração do SVG
    const width = 200; // Largura interna do SVG
    const height = 50; // Altura interna
    const maxVal = 100;
    const stepX = width / (DAYS_TO_SHOW - 1);

    // Cria os pontos da linha (Polilinha)
    let points = history.map((val, index) => {
        const x = index * stepX;
        const y = height - ((val / maxVal) * height); // Inverte Y pois SVG começa em cima
        return `${x},${y}`;
    }).join(' ');

    // Cria os pontos para o preenchimento (Area Chart) - fecha o loop embaixo
    const areaPoints = `${points} ${width},${height} 0,${height}`;

    // Cor dinâmica baseada na média recente
    const avg = history.reduce((a,b)=>a+b,0) / history.length;
    const color = avg > 80 ? '#39d353' : (avg > 40 ? '#eab308' : '#ef4444');

    const html = `
    <div class="flex flex-col w-full h-full justify-between relative group overflow-hidden rounded-lg bg-[#0a0a0a] border border-white/5 p-3">
        <div class="flex justify-between items-center z-10 mb-2">
            <span class="text-[9px] text-gray-500 uppercase tracking-widest font-bold">DISCIPLINA (14 DIAS)</span>
            <span class="text-xs font-mono font-bold" style="color:${color}">${Math.round(avg)}%</span>
        </div>
        
        <div class="relative w-full h-12">
            <svg viewBox="0 0 ${width} ${height}" class="w-full h-full overflow-visible drop-shadow-[0_0_5px_${color}40]">
                <line x1="0" y1="${height/2}" x2="${width}" y2="${height/2}" stroke="#333" stroke-width="0.5" stroke-dasharray="2,2" />
                
                <defs>
                    <linearGradient id="gradGraph" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
                    </linearGradient>
                </defs>
                <polygon points="${areaPoints}" fill="url(#gradGraph)" />
                
                <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke" />
                
                <circle cx="${width}" cy="${height - ((history[history.length-1]/100)*height)}" r="3" fill="white" class="animate-pulse" />
            </svg>
        </div>
        
        <div class="absolute top-0 left-0 w-full h-[1px] bg-white/10 animate-scan-vertical pointer-events-none"></div>
    </div>
    `;

    // Substitui o conteúdo antigo pelo gráfico
    // IMPORTANTE: Certifique-se que no HTML existe um elemento pai adequado
    if(document.getElementById('streakDisplay')) {
         // Substitui o pai do streakDisplay (o card inteiro)
         const card = document.getElementById('streakDisplay').closest('.dopamine-card') || document.getElementById('streakDisplay').parentElement;
         if(card) {
             card.outerHTML = html;
         }
    }
}
// --- NOVOS GRÁFICOS SCI-FI (ApexCharts) ---

export function initSciFiCharts() {
    if (typeof ApexCharts === 'undefined') return;

    // Coleta dados reais do Estado Global
    const gamification = window.AppEstado?.gamification || {};
    const xp = gamification.xp || 0;
    const level = gamification.level || 1;
    const streak = gamification.streak || 0;
    
    // Calcula atributos baseados no comportamento (Lógica de Gamificação)
    // Ex: Streak alto = Foco | Muitas missões = Disciplina | XP alto = Inteligência
    const stats = {
        foco: Math.min(100, streak * 5), // 20 dias de streak = 100% foco
        disciplina: Math.min(100, (gamification.missions?.filter(m => m.done).length || 0) * 2),
        inteligencia: Math.min(100, level * 5),
        vigor: Math.min(100, (gamification.habits?.length || 0) * 10),
        agilidade: 75 // Valor fixo ou calculado por tempo de resposta
    };

    renderRadarChart(stats);
    renderRadialChart(level, xp);
    renderAreaChart();
}

// 1. GRÁFICO DE RADAR (Igual ao canto inferior esquerdo da sua imagem)
function renderRadarChart(stats) {
    const options = {
        series: [{
            name: 'Atributos',
            data: [stats.foco, stats.disciplina, stats.inteligencia, stats.vigor, stats.agilidade],
        }],
        chart: {
            height: 250,
            type: 'radar',
            toolbar: { show: false },
            fontFamily: 'Inter, sans-serif'
        },
        stroke: { width: 2, colors: ['#00E396'] }, // Verde Neon
        fill: { opacity: 0.2, colors: ['#00E396'] },
        markers: { size: 0 },
        xaxis: {
            categories: ['Foco', 'Disciplina', 'Inteligência', 'Vigor', 'Agilidade'],
            labels: {
                style: {
                    colors: ['#a3a3a3', '#a3a3a3', '#a3a3a3', '#a3a3a3', '#a3a3a3'],
                    fontSize: '10px',
                    fontFamily: 'JetBrains Mono'
                }
            }
        },
        yaxis: { show: false },
        plotOptions: {
            radar: {
                polygons: {
                    strokeColors: '#333',
                    connectorColors: '#333',
                    fill: { colors: ['transparent', 'transparent'] }
                }
            }
        },
        tooltip: { theme: 'dark' }
    };

    const chart = new ApexCharts(document.querySelector("#chart-radar"), options);
    chart.render();
}

// 2. GRÁFICO RADIAL (Igual ao canto superior esquerdo da imagem)
function renderRadialChart(level, xp) {
    // Calcula quanto falta para o próximo nível (lógica simplificada)
    let xpCost = 100;
    for(let i=1; i < level; i++) xpCost = Math.floor(xpCost * 1.10);
    const progress = Math.min(100, Math.floor((xp % xpCost) / xpCost * 100)) || 45; // 45 é fallback

    const options = {
        series: [progress, Math.min(100, level * 2)], // Série 1: XP Atual, Série 2: Nível Global
        chart: {
            height: 250,
            type: 'radialBar',
            fontFamily: 'Inter'
        },
        plotOptions: {
            radialBar: {
                hollow: { size: '50%', background: 'transparent' },
                track: { background: '#1a1a1a', strokeWidth: '100%' },
                dataLabels: {
                    name: { show: false },
                    value: {
                        color: '#fff', fontSize: '22px', fontWeight: '900', show: true,
                        formatter: function (val) { return val + "%" }
                    },
                    total: {
                        show: true, label: 'NÍVEL', color: '#666',
                        formatter: function () { return level }
                    }
                }
            }
        },
        colors: ['#8b5cf6', '#ec4899'], // Roxo e Rosa (Cyberpunk)
        stroke: { lineCap: 'round' },
        labels: ['XP Próx. Nível', 'Nível Total'],
    };

    const chart = new ApexCharts(document.querySelector("#chart-radial"), options);
    chart.render();
}

// 3. AREA CHART (Timeline de atividade)
function renderAreaChart() {
    // Simula dados dos últimos 7 dias (já que não temos histórico complexo ainda)
    const dataMock = [30, 40, 35, 50, 49, 60, 70];
    
    const options = {
        series: [{ name: 'Produtividade', data: dataMock }],
        chart: {
            type: 'area', height: 180, sparkline: { enabled: true }, // Sparkline remove eixos para ficar limpo
            animations: { enabled: true }
        },
        stroke: { curve: 'smooth', width: 2 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100]
            }
        },
        colors: ['#CC0000'], // Vermelho Synapse
        tooltip: { theme: 'dark', x: { show: false } }
    };

    const chart = new ApexCharts(document.querySelector("#chart-area"), options);
    chart.render();
}