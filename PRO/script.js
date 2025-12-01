/* script.js (PRO) - ARSENAL ATUALIZADO (LÓGICA DE BOTÕES GOLD + SEM BLOQUEIOS) */

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
    
    // --- ELEMENTOS DO DOM ---
    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    // Navegação UI
    const viewChat = document.getElementById('viewChat');
    const viewProtocolo = document.getElementById('viewProtocolo');
    const tabChat = document.getElementById('tabChat');
    const tabProtocolo = document.getElementById('tabJornada') || document.getElementById('tabProtocolo');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    // --- ARSENAL DE FERRAMENTAS (REGRAS DE OURO + ACESSO TOTAL) ---
    const toolDefinitions = {
        'Diagnostico': { 
            title: "Sessão de Diagnóstico", 
            subtitle: "Analisando perfil...",
            welcome: "Olá. O primeiro passo é a consciência. O que está travando sua evolução hoje?",
            typewriterExamples: ["acessando núcleo...", "calibrando análise...", "pronto."],
            initialButtons: ["Procrastinação", "Vício em Telas", "Cansaço Mental", "Ansiedade"],
            
            systemPrompt: `Você é o Synapse (Versão PRO). 
PERSONA: Especialista em comportamento, direto, curto e cirúrgico.
OBJETIVO: Identificar o sabotador e ENTREGAR O DOSSIÊ COMPLETO E A SOLUÇÃO.

REGRAS DE OURO (INTERFACE):
1. NUNCA faça 2 perguntas de uma vez.
2. SEMPRE termine sua fala oferecendo opções em botões no formato <<OPÇÃO>>.
3. Botões devem ser curtos (1-3 palavras).

ROTEIRO PRO:
1. Faça 3 a 5 perguntas de triagem para entender a raiz.
2. Identifique o Sabotador e dê um nome a ele.
3. Diga: "Diagnóstico concluído. O seu sabotador é [NOME]. A raiz neuroquímica é [RAIZ]. Aqui está o protocolo de correção:"
4. Entregue a solução prática e o exercício para fazer agora.
5. Pergunte: "Quer refinar esse plano ou partir para a ação?"
   Botões: <<Refinar Plano>>, <<Partir para Ação>>.`
        },

        'Faca na Caveira': { 
            name: "Faca na Caveira", 
            welcome: "Chega de planejar. Vamos entrar em Hiperfoco AGORA. Qual a missão?",
            typewriter: ["carregando flow state...", "eliminando ruído...", "pronto."],
            initialButtons: ["Trabalho Focado", "Estudo Pesado", "Tarefa Chata", "Treino Físico"],
            
            systemPrompt: `Você é o Sargento Synapse (Versão PRO).
PERSONA: Militar, energético, imperativo.
OBJETIVO: Fazer o usuário cumprir a tarefa AGORA e monitorar o progresso.

REGRAS DE OURO:
1. SEMPRE use botões de ação <<OPÇÃO>>.
2. Seja curto e grosso.

ROTEIRO PRO:
1. Pergunte o micro-passo ridículo para começar. Ofereça exemplos (<<Abrir PDF>>, <<Pegar Caneta>>).
2. Ordene o início imediato por 2 minutos. Pergunte se ele está pronto.
   Botões: <<ESTOU PRONTO>>, <<JÁ COMECEI>>.
3. Quando ele confirmar, diga: "Cronômetro mental iniciado. Mantenha o foco. Eu estou aqui vigiando. Daqui a pouco eu pergunto como está."
4. (Se o usuário falar depois) Pergunte se concluiu ou se precisa de mais tempo.
   Botões: <<Missão Cumprida>>, <<Mais 15min>>, <<Estou Travado>>.`
        },

        'Mentor': { 
            name: "O Mentor", 
            welcome: "A mente confusa toma decisões ruins. Esvazie sua cabeça aqui. O que está pesando mais?",
            typewriter: ["organizando caos...", "filtrando prioridades...", "pronto."],
            initialButtons: ["Mente Cheia", "Indecisão", "Desânimo", "Estresse"],
            
            systemPrompt: `Você é O MENTOR (Versão PRO).
PERSONA: Sábio, Calmo, Estoico (Baseado em Marco Aurélio).
OBJETIVO: Trazer clareza absoluta e plano de sabedoria.

REGRAS DE OURO:
1. Use perguntas socráticas.
2. Sempre termine com botões reflexivos: <<Faz sentido>>, <<Não controlo isso>>.

ROTEIRO PRO:
1. Ajude o usuário a separar o que ele controla do que não controla.
2. Defina a ÚNICA prioridade essencial.
3. Crie um mantra ou princípio estoico para ele usar hoje.
4. Pergunte se ele quer ajuda para executar.
   Botões: <<Como executar?>>, <<Estou em paz>>.`
        },

        'Mestre': { 
            name: "Ferreiro", 
            welcome: "Um dia ruim não define sua vida, mas dois dias ruins criam um hábito. O que quebrou sua disciplina?",
            typewriter: ["reaquecendo forja...", "restaurando honra...", "pronto."],
            initialButtons: ["Perdi o dia todo", "Quebrei a dieta", "Não treinei", "Dormi demais"],
            
            systemPrompt: `Você é O FERREIRO (Versão PRO).
PERSONA: Duro mas justo. Foco em estoicismo e antifragilidade.
OBJETIVO: Recuperação rápida de falha e fortalecimento mental.

REGRAS DE OURO:
1. Não aceite desculpas, mas foque na solução imediata.
2. Botões de ação rápida: <<Banho Gelado>>, <<Arrumar Mesa>>, <<Respirar Fundo>>.

ROTEIRO PRO:
1. Faça ele aceitar o erro sem culpa (culpa gasta energia).
2. Dê uma micro-vitória imediata para virar o jogo.
3. Monte um plano de "Redenção" para o resto do dia.
   Botões: <<Aceitar Plano>>, <<Ajustar>>.`
        },
        
        'Panico': {
            name: "Botão do Pânico",
            welcome: "⚠️ ALERTA DE RECAÍDA. PARE TUDO. Essa vontade é química, não é você. O que você quer fazer?",
            typewriter: ["ATIVANDO PROTOCOLO SOS...", "BLOQUEANDO RECAÍDA...", "AGUARDE."],
            initialButtons: ["Ver Pornografia", "Comer Besteira", "Procrastinar", "Crise de Ansiedade"],
            
            systemPrompt: `Você é O SENTINELA (Versão PRO - Protocolo Completo).
OBJETIVO: Impedir uma recaída IMEDIATA usando Terapia Cognitiva e Urge Surfing.

REGRAS DE OURO:
1. Ordens curtas e diretas.
2. Botões de sobrevivência: <<Já parei>>, <<Ainda com vontade>>.

ROTEIRO PRO:
1. Ordene que o usuário PARE e RESPIRE.
2. Dê uma tarefa física para mudar o estado (ex: beber água gelada, flexões).
3. Guie ele através da "onda" da vontade (dura 15 min).
4. Só libere quando ele clicar em <<Vontade Passou>>.`
        }
    };
    
    let currentAgent = 'Diagnostico';
    let conversationHistory = [];

    // --- FUNÇÃO GLOBAL DE SELEÇÃO DE FERRAMENTA ---
    window.selectTool = function(toolKey) {
        currentAgent = toolKey; // Sincroniza variável global
        
        // 1. Atualiza Visual da Sidebar
        document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
        const activeToolBtn = document.getElementById('tool' + toolKey.replace(/ /g, '')); // Remove espaços para ID
        // Fallback para IDs antigos se necessário, ou ajuste no HTML
        const legacyIdMap = {
            'Diagnostico': 'toolDiagnostico',
            'Faca na Caveira': 'toolFacanaCaveira',
            'Mentor': 'toolMentor',
            'Mestre': 'toolMestre'
        };
        const targetId = activeToolBtn ? activeToolBtn.id : legacyIdMap[toolKey];
        if (targetId) {
            const el = document.getElementById(targetId);
            if(el) el.classList.add('active');
        }
        
        // Header Mobile
        const mobileTitle = document.getElementById('mobileTitle');
        if(mobileTitle) {
            mobileTitle.innerText = toolDefinitions[toolKey].name.toUpperCase();
            if(toolKey === 'Panico') {
                mobileTitle.style.color = '#ef4444';
                mobileTitle.classList.add('animate-pulse');
            } else {
                mobileTitle.style.color = 'white';
                mobileTitle.classList.remove('animate-pulse');
            }
        }

        // 2. Reseta o Chat
        resetChat();
        
        // 3. UI Mobile
        if (window.innerWidth < 768) toggleSidebar();
        switchTab('chat');
    }

    // --- CHAT ENGINE ---
    function resetChat() {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';
        const tool = toolDefinitions[currentAgent];
        
        // Cabeçalho
        const headerHTML = `
            <div class="w-full text-center mb-6 p-4 fade-in">
                <p id="chatSubtitle" class="text-gray-400 text-sm">
                    <span id="typewriter-text" class="text-brutal-red font-medium"></span>
                    <span class="animate-pulse">|</span>
                </p>
            </div>
        `;
        container.insertAdjacentHTML('afterbegin', headerHTML);

        // Mensagem Inicial
        const div = document.createElement('div');
        div.className = 'chat-message-ia';
        div.innerHTML = tool.welcome.replace(/\n/g, '<br>');
        container.appendChild(div);

        // Botões Iniciais (Renderização Forçada)
        if (tool.initialButtons && tool.initialButtons.length > 0) {
            renderButtons(tool.initialButtons, container);
        }

        // Reset Contexto
        chatHistory = [{ role: "system", content: tool.systemPrompt }];
        
        // Habilita Input
        chatInput.disabled = false;
        chatInput.value = '';
        chatInput.placeholder = "Digite aqui...";
        
        startTypewriter(tool.typewriterExamples);
    }

    // --- LÓGICA DE MENSAGENS E BOTÕES ---
    function addMessage(message, isUser) {
        const container = document.getElementById('messagesContainer');
        
        // Extrai botões da mensagem da IA (formato <<Opção>>)
        const buttonRegex = /<<(.+?)>>/g;
        const buttons = [];
        let match;
        while ((match = buttonRegex.exec(message)) !== null) buttons.push(match[1]);

        let cleanMessage = message.replace(buttonRegex, '').trim();
        cleanMessage = cleanMessage.replace(/\{/g, '<strong>').replace(/\}/g, '</strong>').replace(/\n/g, '<br>');

        if (cleanMessage) {
            const div = document.createElement('div');
            div.className = isUser ? 'chat-message-user' : 'chat-message-ia';
            div.innerHTML = cleanMessage;
            container.appendChild(div);
        }

        // Renderiza Botões extraídos da resposta da IA
        if (buttons.length > 0 && !isUser) {
            renderButtons(buttons, container);
        }
        
        scrollToBottom();
    }

    function renderButtons(buttonLabels, container) {
        const btnContainer = document.createElement('div');
        btnContainer.className = 'quick-reply-container';
        
        buttonLabels.forEach(btnText => {
            const btn = document.createElement('button');
            btn.className = 'cyber-btn';
            
            // Estilo Pânico
            if(currentAgent === 'Panico') {
                btn.style.borderColor = '#7f1d1d';
                btn.style.color = '#fca5a5';
            }
            
            btn.innerText = btnText;
            btn.onclick = () => sendQuickReply(btnText);
            btnContainer.appendChild(btn);
        });
        container.appendChild(btnContainer);
        scrollToBottom();
    }

    function sendQuickReply(text) {
        const lastBtns = document.querySelector('.quick-reply-container:last-child');
        if(lastBtns) lastBtns.style.display = 'none';
        
        chatInput.value = text;
        sendMessage();
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if(!text) return;

        addMessage(text, true); // Adiciona msg do usuário
        chatInput.value = '';
        chatInput.disabled = true; // Bloqueia enquanto pensa
        
        conversationHistory.push({ role: "user", content: text });

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ model: API_MODEL, messages: conversationHistory, temperature: 0.7 })
            });
            const data = await response.json();
            const reply = data.choices[0].message.content;
            
            // IA Responde
            addMessage(reply, false); 
            conversationHistory.push({ role: "assistant", content: reply });
            
        } catch (e) {
            // Erro
            setTimeout(() => {
                const div = document.createElement('div');
                div.className = 'chat-message-ia';
                div.style.color = 'red';
                div.innerText = "Falha na conexão neural. Tente novamente.";
                document.getElementById('messagesContainer').appendChild(div);
            }, 1000);
        } finally {
            chatInput.disabled = false;
            // chatInput.focus(); // Opcional no mobile
        }
    }

    // --- UTILITÁRIOS ---
    function scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        const scroller = document.querySelector('.chat-messages');
        if(scroller) setTimeout(() => { scroller.scrollTop = scroller.scrollHeight; }, 50);
    }

    function startTypewriter(phrases) {
        const el = document.getElementById('typewriter-text');
        if(!el) return;
        let pIndex = 0, cIndex = 0, isDeleting = false;
        if(window.typewriterTimeout) clearTimeout(window.typewriterTimeout);
        function type() {
            const current = phrases[pIndex];
            if (!current) return;
            el.textContent = current.substring(0, isDeleting ? cIndex - 1 : cIndex + 1);
            cIndex += isDeleting ? -1 : 1;
            let speed = isDeleting ? 30 : 80;
            if(!isDeleting && cIndex === current.length) { isDeleting = true; speed = 2000; }
            else if(isDeleting && cIndex === 0) { isDeleting = false; pIndex = (pIndex + 1) % phrases.length; speed = 500; }
            window.typewriterTimeout = setTimeout(type, speed);
        }
        type();
    }

    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isOpen = sidebar.style.transform === 'translateX(0px)';
        sidebar.style.transform = isOpen ? 'translateX(-100%)' : 'translateX(0px)';
        overlay.style.visibility = isOpen ? 'hidden' : 'visible';
        overlay.style.opacity = isOpen ? '0' : '1';
    }
    document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);

    // --- LISTENERS ---
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    // --- JORNADA & CALENDÁRIO (Mantido Igual) ---
    // [O código de calendário e hábitos permanece o mesmo da versão anterior para não quebrar funcionalidades existentes]
    // ... (Código do Calendário Omitido para focar na lógica do Chat, mas assuma que está aqui)
    
    // Inicialização
    renderHabits(); // Funções de hábito e calendário devem estar definidas (copiadas do arquivo anterior se necessário)
    renderCalendar();
    
    // Inicia com Diagnóstico
    selectTool('Diagnostico');

    // Funções de Hábito/Calendário (Recolocadas para garantir funcionamento)
    function loadData() {
        const stored = localStorage.getItem('synapseData');
        if (!stored) return { days: {}, habits: [{ id: 'h1', name: 'Beber Água' }, { id: 'h2', name: 'Arrumar Cama' }, {id:'h3',name:'Banho Gelado'}] };
        return JSON.parse(stored);
    }
    function saveData(data) { localStorage.setItem('synapseData', JSON.stringify(data)); }
    
    function renderHabits() {
        const list = document.getElementById('habitList');
        if(!list) return;
        const data = loadData();
        const today = new Date().toISOString().split('T')[0];
        if(!data.days[today]) data.days[today] = [];
        
        list.innerHTML = '';
        data.habits.forEach(h => {
            const checked = data.days[today].includes(h.id);
            const div = document.createElement('div');
            div.className = `habit-item ${checked ? 'bg-green-900/10 border-green-500/30' : 'bg-[#111] border-[#222]'}`;
            div.innerHTML = `
                <div class="flex items-center gap-3 p-3 rounded-lg border border-transparent cursor-pointer w-full">
                    <div class="w-5 h-5 border rounded flex items-center justify-center ${checked ? 'bg-green-500 border-green-500' : 'border-gray-600'}">
                        ${checked ? '<i class="fas fa-check text-black text-xs"></i>' : ''}
                    </div>
                    <span class="text-sm ${checked ? 'text-gray-400 line-through' : 'text-gray-300'}">${h.name}</span>
                </div>`;
            div.onclick = () => {
                if(checked) data.days[today] = data.days[today].filter(id => id !== h.id);
                else data.days[today].push(h.id);
                saveData(data);
                renderHabits();
                renderCalendar();
            };
            list.appendChild(div);
        });
        
        const count = data.habits.filter(h => data.days[today].includes(h.id)).length;
        const countDisplay = document.getElementById('habitCount');
        if(countDisplay) countDisplay.innerText = `${count}/${data.habits.length}`;
    }

    function renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        if(!grid) return;
        grid.innerHTML = '';
        ['D','S','T','Q','Q','S','S'].forEach(d => {
            const el = document.createElement('div');
            el.className = 'calendar-day-header';
            el.innerText = d;
            grid.appendChild(el);
        });
        
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const data = loadData();
        
        for(let i=1; i<=daysInMonth; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), i);
            const key = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            const done = data.days[key] && data.days[key].length > 0;
            
            const cell = document.createElement('div');
            cell.className = `calendar-day ${done ? 'success' : ''} ${i === now.getDate() ? 'active' : ''}`;
            cell.innerText = i;
            grid.appendChild(cell);
        }
        
        // Atualiza Streak
        const streakEl = document.getElementById('proStreakDisplay');
        if(streakEl) {
            let streak = 0;
            const today = now.getDate();
            for(let i=1; i<=today; i++) {
                const d = new Date(now.getFullYear(), now.getMonth(), i);
                const key = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                if(data.days[key] && data.days[key].length > 0) streak++;
            }
            streakEl.innerText = streak;
        }
    }
    
    window.addNewHabitPrompt = function() {
        const n = prompt("Novo Hábito:");
        if(n) {
            const d = loadData();
            d.habits.push({id: 'h'+Date.now(), name: n});
            saveData(d);
            renderHabits();
        }
    }
    window.clearHistory = function() {
        if(confirm("Resetar dados?")) { localStorage.removeItem('synapseData'); renderHabits(); renderCalendar(); }
    }
});