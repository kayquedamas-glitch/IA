/* script.js (PRO) - APP FUNCIONAL COM VISUAL E LÓGICA DE TRIAGEM */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. DADOS DO USUÁRIO
    const user = JSON.parse(localStorage.getItem('synapseUser'));
    const nameDisplay = document.getElementById('userNameDisplay');
    const avatarDisplay = document.getElementById('userAvatar');
    
    if (user) {
        if (nameDisplay) nameDisplay.innerText = user.name || "Membro";
        if (avatarDisplay) avatarDisplay.innerText = (user.name || "M").charAt(0).toUpperCase();
        
        // Se for um admin, configurar uma "flag" especial, se desejar
        if (user.email === 'admin@admin' && user.password === 'batatinha') {
            // Aqui você poderia adicionar lógica específica para admin
            console.log("Admin logado");
        }
    }

    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; 
    const API_MODEL = "llama-3.1-8b-instant"; 
    
    // --- DEFINIÇÕES INTELIGENTES PARA TODAS AS FERRAMENTAS ---
    // Apliquei a estrutura de "Botões + Perguntas Curtas" em todas
    const agents = {
        'Diagnostico': { 
            name: "Diagnóstico", 
            welcome: `Olá ${user ? user.name.split(' ')[0] : 'Membro'}. Vamos encontrar a raiz do problema.`,
            typewriter: ["analisando perfil...", "acessando dados...", "pronto."],
            initialButtons: ["Procrastinação", "Ansiedade", "Fadiga", "Vício"],
            prompt: `Você é o Synapse. PERSONA: Especialista em comportamento.
            REGRAS:
            1. Faça perguntas curtas para investigar a causa.
            2. Termine sempre com sugestões de resposta entre << >>. Ex: <<Sim>> <<Não>>.
            3. NUNCA use a palavra "OPÇÃO".`
        },
        'Estrategista': { 
            name: "Estrategista", 
            welcome: "Estrategista online. Qual é a meta difícil de hoje?",
            typewriter: ["calibrando estratégia...", "definindo rotas...", "pronto."],
            initialButtons: ["Planejar Dia", "Quebrar Tarefa", "Metas", "Foco"],
            prompt: `Você é o Estrategista. PERSONA: Comandante tático e prático.
            OBJETIVO: Quebrar tarefas grandes em micro-passos.
            REGRAS:
            1. Pergunte qual é a tarefa.
            2. Devolva um plano passo a passo imediato.
            3. Termine com botões de ação. Ex: <<Começar Agora>> <<Refinar>>.`
        },
        'Mestre': { 
            name: "Ferreiro", 
            welcome: "A forja está quente. Se o dia saiu do trilho, vamos consertar.",
            typewriter: ["aquecendo forja...", "preparando mentalidade...", "pronto."],
            initialButtons: ["Resgatar Dia", "Vencer Preguiça", "Disciplina", "Rotina"],
            prompt: `Você é o Ferreiro de Hábitos. PERSONA: Mentor estoico, firme mas sem julgamentos.
            OBJETIVO: Ajudar o usuário a voltar para a rotina após uma falha.
            REGRAS:
            1. Pergunte o que houve.
            2. Dê uma ação imediata de 5 minutos para retomar o controle.
            3. Botões: <<Estou pronto>> <<Preciso de ajuda>>.`
        },
        'Auditor': { 
            name: "Auditor", 
            welcome: "Auditoria pronta. Cole sua rotina ou descreva seu dia para análise.",
            typewriter: ["auditando dados...", "calculando perdas...", "pronto."],
            initialButtons: ["Analisar Ontem", "Otimizar Hoje", "Ver Falhas", "Tempo"],
            prompt: `Você é o Auditor. PERSONA: Analista de dados cético e lógico.
            OBJETIVO: Encontrar desperdícios de tempo na rotina.
            REGRAS:
            1. Peça a rotina.
            2. Aponte onde o tempo está sendo jogado fora.
            3. Botões: <<Entendi>> <<Como melhorar?>>.`
        }
    };
    
    let currentAgent = 'Diagnostico';
    let chatHistory = [];

    // --- NAVEGAÇÃO ---
    window.switchTab = function(tab) {
        const viewChat = document.getElementById('viewChat');
        const viewProtocolo = document.getElementById('viewProtocolo');
        const tabChat = document.getElementById('tabChat');
        const tabJornada = document.getElementById('tabJornada');

        viewChat.classList.add('hidden');
        viewProtocolo.classList.add('hidden');
        tabChat.classList.remove('active');
        tabChat.style.color = '#666';
        tabJornada.classList.remove('active');
        tabJornada.style.color = '#666';

        if (tab === 'chat') {
            viewChat.classList.remove('hidden');
            tabChat.classList.add('active');
            tabChat.style.color = '#CC0000';
        } else {
            viewProtocolo.classList.remove('hidden');
            tabJornada.classList.add('active');
            tabJornada.style.color = '#CC0000';
            renderCalendar();
        }
    }

    window.selectTool = function(agentKey) {
        currentAgent = agentKey;
        document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`tool${agentKey}`).classList.add('active');
        
        const mobileTitle = document.getElementById('mobileTitle');
        if(mobileTitle) mobileTitle.innerText = agents[agentKey].name.toUpperCase();

        resetChat();
        if (window.innerWidth < 768) toggleSidebar();
    }

    // --- RESET INTELIGENTE (A MÁGICA DO APP) ---
    function resetChat() {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';
        
        // 1. Recria o Cabeçalho do Typewriter (Texto Piscando)
        const headerHTML = `
            <div class="w-full text-center mb-6 p-4">
                <p id="chatSubtitle" class="text-gray-400 text-sm">
                    <span id="typewriter-text" class="text-brutal-red font-medium"></span>
                    <span class="animate-pulse">|</span>
                </p>
            </div>
        `;
        container.insertAdjacentHTML('afterbegin', headerHTML);

        // 2. Mensagem Inicial da Ferramenta
        const div = document.createElement('div');
        div.className = 'chat-message-ia';
        div.innerText = agents[currentAgent].welcome;
        container.appendChild(div);

        // 3. Botões Iniciais 3D (Específicos de cada ferramenta)
        const btnContainer = document.createElement('div');
        btnContainer.className = 'quick-reply-container';
        agents[currentAgent].initialButtons.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'cyber-btn';
            btn.innerText = text;
            btn.onclick = () => sendQuickReply(text);
            btnContainer.appendChild(btn);
        });
        container.appendChild(btnContainer);

        // 4. Configura a memória da IA
        chatHistory = [{ role: "system", content: agents[currentAgent].prompt }];
        
        // 5. Inicia a Animação
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
        // Esconde os botões ao clicar
        const lastBtns = document.querySelector('.quick-reply-container:last-child');
        if(lastBtns) lastBtns.style.display = 'none';
        
        const chatInput = document.getElementById('chatInput');
        chatInput.value = text;
        sendMessage();
    }

    // --- SISTEMA DE CHAT (COM FILTRO DE BOTÕES) ---
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    async function sendMessage() {
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
            
            // Renderiza a resposta da IA
            renderIAMessage(reply, container);
            
            chatHistory.push({ role: "assistant", content: reply });

        } catch (e) {
            // Fallback de segurança
            setTimeout(() => {
                const iaDiv = document.createElement('div');
                iaDiv.className = 'chat-message-ia';
                iaDiv.innerText = "Estou processando seus dados... Tente novamente.";
                container.appendChild(iaDiv);
            }, 1000);
        }
        container.scrollTop = container.scrollHeight;
    }
    
    function renderIAMessage(message, container) {
        // 1. Extrai os botões <<Texto>>
        const buttonRegex = /<<(.+?)>>/g;
        const buttons = [];
        let match;
        while ((match = buttonRegex.exec(message)) !== null) buttons.push(match[1]);

        // 2. Limpa o texto
        let cleanMessage = message.replace(buttonRegex, '').trim();
        cleanMessage = cleanMessage.replace(/\{/g, '<strong>').replace(/\}/g, '</strong>').replace(/\n/g, '<br>');

        // 3. Exibe o texto
        if (cleanMessage) {
            const div = document.createElement('div');
            div.className = 'chat-message-ia';
            div.innerHTML = cleanMessage;
            container.appendChild(div);
        }

        // 4. Exibe os botões novos (se houver)
        if (buttons.length > 0) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'quick-reply-container';
            buttons.forEach(btnText => {
                if(btnText.toUpperCase() !== "OPÇÃO") {
                    const btn = document.createElement('button');
                    btn.className = 'cyber-btn';
                    btn.innerText = btnText;
                    btn.onclick = () => sendQuickReply(btnText);
                    btnContainer.appendChild(btn);
                }
            });
            container.appendChild(btnContainer);
        }
    }

    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    // Sidebar
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.toggle('translate-x-0');
        if(sidebar.style.transform === 'translateX(0px)') {
             sidebar.style.transform = 'translateX(-100%)';
             overlay.style.visibility = 'hidden';
             overlay.style.opacity = '0';
        } else {
             sidebar.style.transform = 'translateX(0px)';
             overlay.style.visibility = 'visible';
             overlay.style.opacity = '1';
        }
    }
    const overlay = document.getElementById('sidebarOverlay');
    if(overlay) overlay.addEventListener('click', toggleSidebar);

    window.logout = function() {
        localStorage.removeItem('synapseUser');
        window.location.href = 'login.html';
    }

    // 5. JORNADA PRO (PERSISTENTE)
    const defaultHabits = [
        { id: 'h1', name: 'Hidratação (500ml)' },
        { id: 'h2', name: 'Arrumar a Cama' },
        { id: 'h3', name: 'Banho de Contraste' },
        { id: 'h4', name: 'Meditação NSDR' },
        { id: 'h5', name: 'Deep Work (90min)' }
    ];

    function loadData() {
        const stored = localStorage.getItem('synapseData');
        if (!stored) return { days: {}, habits: defaultHabits };
        const parsed = JSON.parse(stored);
        if(!parsed.habits) parsed.habits = defaultHabits;
        return parsed;
    }
    function saveData(data) { localStorage.setItem('synapseData', JSON.stringify(data)); }

    const habitListEl = document.getElementById('habitList');
    const todayKey = new Date().toISOString().split('T')[0];

    function renderHabits() {
        const data = loadData();
        if (!data.days[todayKey]) data.days[todayKey] = [];
        habitListEl.innerHTML = '';

        data.habits.forEach(habit => {
            const isChecked = data.days[todayKey].includes(habit.id);
            const div = document.createElement('div');
            div.className = `habit-item cursor-pointer ${isChecked ? 'checked' : ''}`;
            div.innerHTML = `<div class="flex items-center"><div class="habit-checkbox ${isChecked ? 'bg-brutal-red border-brutal-red' : 'border-[#333]'} w-5 h-5 rounded border flex items-center justify-center mr-3"><i class="fas fa-check text-white text-xs ${isChecked ? '' : 'hidden'}"></i></div><span class="text-sm text-gray-300">${habit.name}</span></div>`;
            
            div.onclick = () => {
                const currentData = loadData();
                const dayData = currentData.days[todayKey] || [];
                if (dayData.includes(habit.id)) { const index = dayData.indexOf(habit.id); dayData.splice(index, 1); } 
                else { dayData.push(habit.id); if(navigator.vibrate) navigator.vibrate(50); }
                currentData.days[todayKey] = dayData;
                saveData(currentData);
                renderHabits(); renderCalendar(); 
            };
            habitListEl.appendChild(div);
        });
    }

    window.addNewHabitPrompt = function() {
        const newName = prompt("Nome do novo hábito:");
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
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const today = now.getDate();
        const appData = loadData();

        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), i);
            const offset = d.getTimezoneOffset() * 60000;
            const dateKey = new Date(d.getTime() - offset).toISOString().split('T')[0];
            const dayHabits = appData.days[dateKey] || [];
            const isDone = dayHabits.length > 0;
            const el = document.createElement('div');
            el.className = `calendar-day ${isDone ? 'success' : ''} ${i === today ? 'active' : ''}`;
            if(!isDone && i < today) el.style.color = '#333';
            el.innerText = i;
            grid.appendChild(el);
        }
        let count = 0; for (const key in appData.days) { if (appData.days[key].length > 0) count++; }
        if(document.getElementById('proStreakDisplay')) document.getElementById('proStreakDisplay').innerText = count;
    }
    window.clearHistory = function() { if(confirm("Apagar histórico?")) { localStorage.removeItem('synapseData'); renderHabits(); renderCalendar(); } }

    selectTool('Diagnostico');
    renderHabits();
    renderCalendar();
});