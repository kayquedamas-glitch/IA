/* script.js (PRO) - LÓGICA COMPLETA */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. DADOS DO USUÁRIO ---
    const user = JSON.parse(localStorage.getItem('synapseUser'));
    const nameDisplay = document.getElementById('userNameDisplay');
    const avatarDisplay = document.getElementById('userAvatar');
    
    if (user) {
        if (nameDisplay) nameDisplay.innerText = user.name || "Membro";
        if (avatarDisplay) avatarDisplay.innerText = (user.name || "M").charAt(0).toUpperCase();
    }

    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; 
    const API_MODEL = "llama-3.1-8b-instant"; 

    // Elementos
    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const viewChat = document.getElementById('viewChat');
    const viewProtocolo = document.getElementById('viewProtocolo');
    const tabChat = document.getElementById('tabChat');
    const tabProtocolo = document.getElementById('tabJornada');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    // Personas
    const agents = {
        'Diagnostico': { name: "Diagnóstico", prompt: "Você é o Agente de Diagnóstico. Analítico. Ajude a encontrar a raiz do problema.", welcome: `Olá ${user ? user.name : ''}. O que vamos analisar hoje?` },
        'Estrategista': { name: "Estrategista", prompt: "Você é o Estrategista. Foco em planos de ação práticos.", welcome: "Estrategista online. Qual a meta de hoje?" },
        'Mestre': { name: "Ferreiro", prompt: "Você é o Ferreiro de Hábitos. Foco em disciplina.", welcome: "O dia saiu do trilho? Vamos consertar." },
        'Auditor': { name: "Auditor", prompt: "Você é o Auditor. Analise rotinas.", welcome: "Cole sua rotina aqui para auditoria." }
    };
    
    let currentAgent = 'Diagnostico';
    let chatHistory = [];

    // --- 2. NAVEGAÇÃO ---
    window.switchTab = function(tab) {
        viewChat.classList.add('hidden');
        viewProtocolo.classList.add('hidden');
        tabChat.classList.remove('active');
        tabChat.style.color = '#666';
        tabProtocolo.classList.remove('active');
        tabProtocolo.style.color = '#666';

        if (tab === 'chat') {
            viewChat.classList.remove('hidden');
            tabChat.classList.add('active');
            tabChat.style.color = '#CC0000';
        } else {
            viewProtocolo.classList.remove('hidden');
            tabProtocolo.classList.add('active');
            tabProtocolo.style.color = '#CC0000';
            renderCalendar();
        }
    }

    window.selectTool = function(agentKey) {
        currentAgent = agentKey;
        document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`tool${agentKey}`).classList.add('active');
        
        // Atualiza Titulo Mobile
        const mobileTitle = document.getElementById('mobileTitle');
        if(mobileTitle) mobileTitle.innerText = agents[agentKey].name.toUpperCase();

        // Reset Chat
        messagesContainer.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'chat-message-ia';
        div.innerText = agents[agentKey].welcome;
        messagesContainer.appendChild(div);

        chatHistory = [{ role: "system", content: agents[agentKey].prompt }];
        
        if (window.innerWidth < 768) toggleSidebar();
    }

    window.toggleSidebar = function() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    }
    if(overlay) overlay.addEventListener('click', toggleSidebar);

    window.logout = function() {
        localStorage.removeItem('synapseUser');
        window.location.href = 'login.html';
    }

    // --- 3. CHAT ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        if(!text) return;

        const userDiv = document.createElement('div');
        userDiv.className = 'chat-message-user';
        userDiv.innerText = text;
        messagesContainer.appendChild(userDiv);
        
        chatInput.value = '';
        chatHistory.push({ role: "user", content: text });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ model: API_MODEL, messages: chatHistory, temperature: 0.7 })
            });
            const data = await response.json();
            const reply = data.choices[0].message.content;
            
            const iaDiv = document.createElement('div');
            iaDiv.className = 'chat-message-ia';
            iaDiv.innerText = reply;
            messagesContainer.appendChild(iaDiv);
            chatHistory.push({ role: "assistant", content: reply });

        } catch (e) {
            const iaDiv = document.createElement('div');
            iaDiv.className = 'chat-message-ia';
            iaDiv.innerText = "Estou processando... (Tente novamente)";
            messagesContainer.appendChild(iaDiv);
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    // --- 4. JORNADA ---
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
            div.innerHTML = `
                <div class="flex items-center">
                    <div class="habit-checkbox ${isChecked ? 'bg-brutal-red border-brutal-red' : 'border-[#333]'} w-5 h-5 rounded border flex items-center justify-center mr-3">
                        <i class="fas fa-check text-white text-xs ${isChecked ? '' : 'hidden'}"></i>
                    </div>
                    <span class="text-sm text-gray-300">${habit.name}</span>
                </div>`;
            
            div.onclick = () => {
                const currentData = loadData();
                const dayData = currentData.days[todayKey] || [];
                if (dayData.includes(habit.id)) {
                    const index = dayData.indexOf(habit.id);
                    dayData.splice(index, 1);
                } else {
                    dayData.push(habit.id);
                    if(navigator.vibrate) navigator.vibrate(50);
                }
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
        
        // Atualiza Streak
        let count = 0;
        for (const key in appData.days) { if (appData.days[key].length > 0) count++; }
        if(document.getElementById('proStreakDisplay')) 
            document.getElementById('proStreakDisplay').innerText = count;
    }
    
    window.clearHistory = function() {
        if(confirm("Apagar histórico?")) {
            localStorage.removeItem('synapseData');
            renderHabits();
            renderCalendar();
        }
    }

    // INICIALIZA
    selectTool('Diagnostico');
    renderHabits();
    renderCalendar();
});