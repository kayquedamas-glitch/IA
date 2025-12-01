/* script.js (PRO) - ARSENAL ATUALIZADO 2.0 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- DADOS DO USUÁRIO ---
    const storedUser = localStorage.getItem('synapseUser') || localStorage.getItem('synapse_session_v2');
    let user = null;
    try { user = JSON.parse(storedUser); } catch(e) {}

    const nameDisplay = document.getElementById('userNameDisplay');
    const avatarDisplay = document.getElementById('userAvatar');
    
    if (user) {
        const displayName = user.name || user.user || "Operador";
        if (nameDisplay) nameDisplay.innerText = displayName;
        if (avatarDisplay) avatarDisplay.innerText = displayName.charAt(0).toUpperCase();
    }

    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; 
    const API_MODEL = "llama-3.1-8b-instant"; 
    
    // --- ARSENAL DE FERRAMENTAS (NOVAS IAs) ---
    const agents = {
        'Diagnostico': { 
            name: "Diagnóstico", 
            welcome: `Olá. O primeiro passo é a consciência. O que está travando sua evolução hoje?`,
            typewriter: ["acessando núcleo...", "calibrando análise...", "pronto."],
            initialButtons: ["Procrastinação Crônica", "Vício em Telas", "Cansaço Mental", "Falta de Propósito"],
            prompt: `Você é o Synapse. 
            OBJETIVO: Identificar o sabotador do usuário.
            ESTILO: Direto, analítico, sem rodeios.
            REGRAS: 1. Faça perguntas curtas para investigar a causa raiz. 2. Termine sempre com opções <<Opção A>> <<Opção B>>. 3. No final, gere um diagnóstico brutal.`
        },
        'Panico': { 
            name: "Botão do Pânico", 
            welcome: `⚠️ ALERTA DE RECAÍDA DETECTADO. PARE TUDO AGORA.
            Não feche este chat. Essa vontade é química, não é você.
            
            O que você está prestes a fazer?`,
            typewriter: ["ATIVANDO PROTOCOLO SOS...", "BLOQUEANDO RECAÍDA...", "AGUARDE."],
            initialButtons: ["Ver Pornografia/Telas", "Comer Besteira", "Procrastinar", "Crise de Ansiedade"],
            prompt: `Você é O SENTINELA. 
            OBJETIVO: Impedir uma recaída IMEDIATA usando a técnica de "Urge Surfing" (Surfar na vontade).
            ESTILO: Autoritário, urgente, protetor. Use frases curtas.
            
            ROTEIRO:
            1. Ordene que o usuário PARE e RESPIRE. Diga que a fissura dura apenas 10-15 minutos.
            2. Pergunte o gatilho: "O que disparou isso? Tédio, Estresse ou Hábito?"
            3. Dê uma tarefa física imediata: "Beba um copo d'água gelada", "Faça 10 flexões", "Saia do quarto".
            4. Só libere o usuário quando ele disser que a vontade passou.
            
            IMPORTANTE: Não dê palestras. Dê ordens de sobrevivência.`
        },
        'Faca na Caveira': { 
            name: "Faca na Caveira", 
            welcome: `Chega de planejar. Planejamento excessivo é procrastinação.
            Vamos entrar em Hiperfoco AGORA. Qual a missão?`,
            typewriter: ["carregando flow state...", "eliminando ruído...", "pronto."],
            initialButtons: ["Trabalho Focado", "Estudo Pesado", "Tarefa Chata", "Treino Físico"],
            prompt: `Você é o Faca na Caveira.
            OBJETIVO: Colocar o usuário em ação em menos de 2 minutos.
            ESTILO: Energético, militar, prático.
            
            MÉTODO:
            1. Não monte cronogramas. Monte RITUAIS DE INÍCIO.
            2. Ordene a preparação do ambiente: "Celular longe", "Água na mesa", "Fone de ouvido".
            3. Use a regra dos 5 minutos: "Você só precisa fazer isso por 5 minutos. Aceita o desafio?"
            4. Termine com: "VÁ. AGORA."`
        },
        'Mentor': { 
            name: "O Mentor", 
            welcome: `A mente confusa toma decisões ruins.
            Esvazie sua cabeça aqui. O que está pesando mais?`,
            typewriter: ["organizando caos...", "filtrando prioridades...", "pronto."],
            initialButtons: ["Mente Cheia (Overthinking)", "Indecisão", "Desânimo", "Estresse"],
            prompt: `Você é O MENTOR (Baseado em Marco Aurélio e Sêneca).
            OBJETIVO: Trazer clareza e remover ruído mental.
            ESTILO: Calmo, sábio, estoico.
            
            MÉTODO:
            1. Se ele estiver sobrecarregado, use a Matriz de Eisenhower ou Pareto (80/20) para eliminar o inútil.
            2. Faça ele focar no que está sob o controle dele.
            3. Pergunte: "Disso tudo, qual é a ÚNICA coisa que, se resolvida, resolve o resto?"`
        },
        'Mestre': { 
            name: "Ferreiro", 
            welcome: "Um dia ruim não define sua vida, mas dois dias ruins criam um hábito. Vamos consertar isso.",
            typewriter: ["reaquecendo forja...", "restaurando honra...", "pronto."],
            initialButtons: ["Perdi o dia todo", "Quebrei a dieta", "Não treinei", "Dormi demais"],
            prompt: `Você é O FERREIRO.
            OBJETIVO: Recuperação de falhas.
            ESTILO: Duro mas justo. Sem vitimismo.
            
            MÉTODO:
            1. Reconheça a falha, mas não deixe ele se culpar. Culpa gasta energia.
            2. Dê uma micro-vitória para agora: "Arrume sua cama", "Tome um banho frio".
            3. O objetivo é terminar o dia com UMA vitória, não importa quão pequena.`
        }
    };
    
    let currentAgent = 'Diagnostico';
    let chatHistory = [];

    // --- NAVEGAÇÃO IMERSIVA ---
    window.switchTab = function(tab) {
        const viewChat = document.getElementById('viewChat');
        const viewProtocolo = document.getElementById('viewProtocolo');
        const tabChat = document.getElementById('tabChat');
        const tabJornada = document.getElementById('tabJornada');
        
        const bottomNav = document.querySelector('.bottom-nav');
        const mobileHeader = document.getElementById('mobileHeader');

        // Reset
        if(tabChat) { tabChat.classList.remove('active'); tabChat.style.color = '#666'; }
        if(tabJornada) { tabJornada.classList.remove('active'); tabJornada.style.color = '#666'; }
        
        viewChat.classList.add('hidden');
        viewProtocolo.classList.add('hidden');

        if (tab === 'chat') {
            viewChat.classList.remove('hidden');
            if(tabChat) { tabChat.classList.add('active'); tabChat.style.color = '#CC0000'; }
            
            // Mostrar Barras
            if(bottomNav) { bottomNav.style.transform = 'translateY(0)'; }
            if(mobileHeader) { mobileHeader.style.transform = 'translateY(0)'; }
            
        } else {
            viewProtocolo.classList.remove('hidden');
            if(tabJornada) { tabJornada.classList.add('active'); tabJornada.style.color = '#CC0000'; }
            
            // Esconder Barras (Imersão)
            if(bottomNav) { bottomNav.style.transform = 'translateY(100%)'; }
            if(mobileHeader) { mobileHeader.style.transform = 'translateY(-100%)'; }
            
            renderCalendar();
            renderHabits();
        }
    }

    // --- SELETOR DE FERRAMENTAS ---
    window.selectTool = function(agentKey) {
        currentAgent = agentKey;
        document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
        
        const activeTool = document.getElementById(`tool${agentKey}`);
        if(activeTool) activeTool.classList.add('active');
        
        const mobileTitle = document.getElementById('mobileTitle');
        if(mobileTitle) {
            mobileTitle.innerText = agents[agentKey].name.toUpperCase();
            // Muda cor do título se for Pânico
            if(agentKey === 'Panico') {
                mobileTitle.style.color = '#ef4444';
                mobileTitle.classList.add('animate-pulse');
            } else {
                mobileTitle.style.color = 'white';
                mobileTitle.classList.remove('animate-pulse');
            }
        }

        resetChat();
        if (window.innerWidth < 768) toggleSidebar();
    }

    // --- CHAT ENGINE ---
    function resetChat() {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';
        
        // Cabeçalho Typewriter
        const headerHTML = `
            <div class="w-full text-center mb-6 p-4">
                <p id="chatSubtitle" class="text-gray-400 text-sm">
                    <span id="typewriter-text" class="text-brutal-red font-medium"></span>
                    <span class="animate-pulse">|</span>
                </p>
            </div>
        `;
        container.insertAdjacentHTML('afterbegin', headerHTML);

        // Mensagem de Boas Vindas
        const div = document.createElement('div');
        div.className = 'chat-message-ia';
        div.innerHTML = agents[currentAgent].welcome.replace(/\n/g, '<br>'); // Suporte a quebra de linha
        container.appendChild(div);

        // Botões Iniciais
        const btnContainer = document.createElement('div');
        btnContainer.className = 'quick-reply-container';
        agents[currentAgent].initialButtons.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'cyber-btn';
            
            // Estilo especial para Botão do Pânico
            if(currentAgent === 'Panico') {
                btn.style.borderColor = '#7f1d1d';
                btn.style.color = '#fca5a5';
            }
            
            btn.innerText = text;
            btn.onclick = () => sendQuickReply(text);
            btnContainer.appendChild(btn);
        });
        container.appendChild(btnContainer);

        // Reset Contexto
        chatHistory = [{ role: "system", content: agents[currentAgent].prompt }];
        startTypewriter(agents[currentAgent].typewriter);
    }

    function startTypewriter(phrases) {
        const el = document.getElementById('typewriter-text');
        if(!el) return;
        let pIndex = 0, cIndex = 0, isDeleting = false;
        function type() {
            const current = phrases[pIndex];
            el.textContent = current.substring(0, isDeleting ? cIndex - 1 : cIndex + 1);
            cIndex += isDeleting ? -1 : 1;
            if(!isDeleting && cIndex === current.length) { isDeleting = true; setTimeout(type, 2000); }
            else if(isDeleting && cIndex === 0) { isDeleting = false; pIndex = (pIndex + 1) % phrases.length; setTimeout(type, 500); }
            else setTimeout(type, isDeleting ? 50 : 100);
        }
        type();
    }

    function sendQuickReply(text) {
        const lastBtns = document.querySelector('.quick-reply-container:last-child');
        if(lastBtns) lastBtns.style.display = 'none';
        
        const chatInput = document.getElementById('chatInput');
        chatInput.value = text;
        sendMessage();
    }

    async function sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const text = chatInput.value.trim();
        if(!text) return;

        const container = document.getElementById('messagesContainer');
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-message-user';
        userDiv.innerText = text;
        container.appendChild(userDiv);
        
        chatInput.value = '';
        chatHistory.push({ role: "user", content: text });
        container.scrollTop = container.scrollHeight;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ model: API_MODEL, messages: chatHistory, temperature: 0.7 })
            });
            const data = await response.json();
            const reply = data.choices[0].message.content;
            renderIAMessage(reply, container);
            chatHistory.push({ role: "assistant", content: reply });
        } catch (e) {
            setTimeout(() => {
                const iaDiv = document.createElement('div');
                iaDiv.className = 'chat-message-ia';
                iaDiv.innerText = "Falha na conexão neural. Tente novamente.";
                iaDiv.style.color = 'red';
                container.appendChild(iaDiv);
            }, 1000);
        }
        container.scrollTop = container.scrollHeight;
    }
    
    function renderIAMessage(message, container) {
        const buttonRegex = /<<(.+?)>>/g;
        const buttons = [];
        let match;
        while ((match = buttonRegex.exec(message)) !== null) buttons.push(match[1]);

        let cleanMessage = message.replace(buttonRegex, '').trim();
        cleanMessage = cleanMessage.replace(/\{/g, '<strong>').replace(/\}/g, '</strong>').replace(/\n/g, '<br>');

        if (cleanMessage) {
            const div = document.createElement('div');
            div.className = 'chat-message-ia';
            div.innerHTML = cleanMessage;
            container.appendChild(div);
        }

        if (buttons.length > 0) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'quick-reply-container';
            buttons.forEach(btnText => {
                if(btnText.toUpperCase() !== "OPÇÃO") {
                    const btn = document.createElement('button');
                    btn.className = 'cyber-btn';
                    
                    if(currentAgent === 'Panico') {
                        btn.style.borderColor = '#7f1d1d';
                        btn.style.color = '#fca5a5';
                    }
                    
                    btn.innerText = btnText;
                    btn.onclick = () => sendQuickReply(btnText);
                    btnContainer.appendChild(btn);
                }
            });
            container.appendChild(btnContainer);
        }
    }

    // Listeners Chat
    const sendBtn = document.getElementById('sendBtn');
    const chatInputElem = document.getElementById('chatInput');
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInputElem) chatInputElem.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isOpen = sidebar.style.transform === 'translateX(0px)';
        sidebar.style.transform = isOpen ? 'translateX(-100%)' : 'translateX(0px)';
        overlay.style.visibility = isOpen ? 'hidden' : 'visible';
        overlay.style.opacity = isOpen ? '0' : '1';
    }
    document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);


    // --- JORNADA & HÁBITOS ---
    
    const defaultHabits = [
        { id: 'h1', name: 'Beber Água ao Acordar' },
        { id: 'h2', name: 'Arrumar a Cama' },
        { id: 'h3', name: 'Banho Gelado' },
        { id: 'h4', name: 'Ler 10 Páginas' },
        { id: 'h5', name: 'Sem Celular na 1ª Hora' }
    ];

    function loadData() {
        const stored = localStorage.getItem('synapseData');
        if (!stored) return { days: {}, habits: defaultHabits };
        const parsed = JSON.parse(stored);
        if(!parsed.habits || parsed.habits.length === 0) parsed.habits = defaultHabits;
        return parsed;
    }
    function saveData(data) { localStorage.setItem('synapseData', JSON.stringify(data)); }

    const habitListEl = document.getElementById('habitList');
    const todayKey = new Date().toISOString().split('T')[0];

    function renderHabits() {
        const data = loadData();
        if (!data.days[todayKey]) data.days[todayKey] = [];
        habitListEl.innerHTML = '';
        
        // Estado Vazio
        if(data.habits.length === 0) {
            habitListEl.innerHTML = `
                <div class="text-center py-8 border border-dashed border-[#222] rounded-xl bg-[#0a0a0a]">
                    <i class="fas fa-plus-circle text-gray-700 text-3xl mb-3"></i>
                    <p class="text-gray-500 text-xs">Adicione seus rituais para começar.</p>
                </div>
            `;
            return;
        }

        const completedCount = data.habits.filter(h => data.days[todayKey].includes(h.id)).length;
        document.getElementById('habitCount').innerText = `${completedCount}/${data.habits.length}`;

        data.habits.forEach(habit => {
            const isChecked = data.days[todayKey].includes(habit.id);
            const div = document.createElement('div');
            
            div.className = `habit-item cursor-pointer flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${isChecked ? 'bg-green-900/10 border-green-500/30' : 'bg-[#111] border-[#222] hover:border-[#333]'}`;
            
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-green-500 border-green-500' : 'border-[#333]'}">
                        <i class="fas fa-check text-black text-xs ${isChecked ? '' : 'opacity-0'}"></i>
                    </div>
                    <span class="text-sm ${isChecked ? 'text-white line-through opacity-50' : 'text-gray-300'}">${habit.name}</span>
                </div>
                ${isChecked ? '<span class="text-[10px] text-green-500 font-bold animate-pulse">+XP</span>' : '<i class="fas fa-chevron-right text-[#333] text-xs"></i>'}
            `;
            
            div.onclick = () => {
                const currentData = loadData();
                const dayData = currentData.days[todayKey] || [];
                
                if (dayData.includes(habit.id)) { 
                    const index = dayData.indexOf(habit.id); 
                    dayData.splice(index, 1); 
                } else { 
                    dayData.push(habit.id); 
                    if(navigator.vibrate) navigator.vibrate(50);
                    
                    // Confetes
                    if (window.confetti) {
                        confetti({
                            particleCount: 80,
                            spread: 60,
                            origin: { y: 0.7 },
                            colors: ['#22c55e', '#ffffff']
                        });
                    }
                }
                currentData.days[todayKey] = dayData;
                saveData(currentData);
                renderHabits(); 
                renderCalendar();
            };
            habitListEl.appendChild(div);
        });
    }

    window.addNewHabitPrompt = function() {
        const newName = prompt("Nome do ritual:");
        if(newName) {
            const data = loadData();
            data.habits.push({ id: 'h'+Date.now(), name: newName });
            saveData(data);
            renderHabits();
        }
    }

    window.renderCalendar = function() {
        const grid = document.getElementById('calendarGrid');
        if(!grid) return;
        grid.innerHTML = '';
        
        ['D','S','T','Q','Q','S','S'].forEach(d => {
            const h = document.createElement('div');
            h.className = 'calendar-day-header';
            h.innerText = d;
            grid.appendChild(h);
        });

        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const today = now.getDate();
        const appData = loadData();
        let streak = 0;

        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), i);
            const offset = d.getTimezoneOffset() * 60000;
            const dateKey = new Date(d.getTime() - offset).toISOString().split('T')[0];
            const dayHabits = appData.days[dateKey] || [];
            const isDone = dayHabits.length > 0;
            
            if(isDone) streak++; 

            const el = document.createElement('div');
            el.className = `calendar-day ${isDone ? 'success' : ''} ${i === today ? 'active' : ''}`;
            if(!isDone && i < today) el.style.color = '#333';
            el.innerText = i;
            grid.appendChild(el);
        }

        // Atualizar Níveis
        const streakEl = document.getElementById('proStreakDisplay');
        if(streakEl) streakEl.innerText = streak;

        let level = 1;
        let nextLevelThreshold = 7;
        
        if (streak >= 7) { level = 2; nextLevelThreshold = 14; }
        if (streak >= 14) { level = 3; nextLevelThreshold = 30; }
        if (streak >= 30) { level = 4; nextLevelThreshold = 60; }
        
        let progressPercent = Math.min((streak / nextLevelThreshold) * 100, 100);
        
        const progressBar = document.getElementById('levelProgressBar');
        if(progressBar) progressBar.style.width = `${progressPercent}%`;
        
        const levelBadge = document.getElementById('levelBadge');
        if(levelBadge) levelBadge.innerText = `NÍVEL ${level}`;
        
        const nextLevelText = document.getElementById('nextLevelText');
        if(nextLevelText) nextLevelText.innerText = `Próximo nível em ${nextLevelThreshold - streak} dias`;
    }

    window.clearHistory = function() { 
        if(confirm("Reiniciar todo o progresso?")) { 
            localStorage.removeItem('synapseData'); 
            renderHabits(); 
            renderCalendar(); 
        } 
    }

    // Inicialização
    selectTool('Diagnostico');
    renderHabits();
    renderCalendar();
});