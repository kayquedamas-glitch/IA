/* app.js - VERSÃO FINAL COMPLETA */

document.addEventListener('DOMContentLoaded', () => {
    
    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; 
    const API_MODEL = "llama-3.1-8b-instant"; 
    const DEMO_COUNT_KEY = 'demoUsageCount';
    const SAFETY_LIMIT = 20;

    // --- ELEMENTOS ---
    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const viewChat = document.getElementById('viewChat');
    const viewProtocolo = document.getElementById('viewProtocolo');
    const tabChat = document.getElementById('tabChat');
    const tabProtocolo = document.getElementById('tabJornada') || document.getElementById('tabProtocolo');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    let conversationHistory = [{ 
        role: "system", 
        content: `Você é o Synapse. Fale curto. Pergunte sobre vícios. 
        Ao final de cada pergunta, dê opções de resposta no formato <<Opção>>. 
        Sempre termine com <<Outro>>.` 
    }];

    const toolDefinitions = {
        'Diagnostico': { title: "Diagnóstico", subtitle: "Análise...", typewriterExamples: ["o que você sente?", "vício?", "procrastinação?"] },
        'Estrategista': { title: "Estrategista", isLocked: true },
        'Mestre': { title: "Ferreiro", isLocked: true },
        'Auditor': { title: "Auditor", isLocked: true }
    };

    // --- FUNÇÕES GLOBAIS ---
    window.switchTab = function(tab) {
        tabChat.classList.remove('active');
        tabChat.style.color = '#666';
        if(tabProtocolo) {
            tabProtocolo.classList.remove('active');
            tabProtocolo.style.color = '#666';
        }
        viewChat.classList.add('hidden');
        viewProtocolo.classList.add('hidden');

        if (tab === 'chat') {
            viewChat.classList.remove('hidden');
            tabChat.classList.add('active');
            tabChat.style.color = '#CC0000';
        } else {
            viewProtocolo.classList.remove('hidden');
            if(tabProtocolo) {
                tabProtocolo.classList.add('active');
                tabProtocolo.style.color = '#CC0000';
            }
        }
    }

    function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('open'); }
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

    // --- CHAT LOGIC ---
    function addMessage(message, isUser, isError = false) {
        const buttonRegex = /<<(.+?)>>/g;
        const buttons = [];
        let match;
        while ((match = buttonRegex.exec(message)) !== null) buttons.push(match[1]);

        let cleanMessage = message.replace(buttonRegex, '').replace('[FIM_DA_SESSAO]', '').trim();
        cleanMessage = cleanMessage.replace(/\{/g, '<strong>').replace(/\}/g, '</strong>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

        if (cleanMessage) {
            const div = document.createElement('div');
            div.className = isUser ? 'chat-message-user' : 'chat-message-ia';
            if(isError) div.style.color = '#ff4d4d';
            div.innerHTML = cleanMessage;
            messagesContainer.appendChild(div);
        }

        if (buttons.length > 0 && !isUser) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'quick-reply-container';
            buttons.forEach(btnText => {
                const btn = document.createElement('button');
                btn.className = 'cyber-btn';
                btn.innerText = btnText;
                btn.onclick = () => sendQuickReply(btnText);
                btnContainer.appendChild(btn);
            });
            messagesContainer.appendChild(btnContainer);
        }

        const scroller = document.querySelector('.chat-messages');
        if(scroller) setTimeout(() => { scroller.scrollTop = scroller.scrollHeight; }, 50);
    }

    function sendQuickReply(text) {
        const lastBtns = messagesContainer.querySelector('.quick-reply-container:last-child');
        if(lastBtns) lastBtns.style.display = 'none';
        chatInput.value = text;
        sendMessage();
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, true);
        chatInput.value = '';
        chatInput.disabled = true;
        
        conversationHistory.push({ role: "user", content: text });

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: API_MODEL,
                    messages: conversationHistory,
                    temperature: 0.7
                })
            });
            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || "Erro de conexão.";
            addMessage(reply, false);
            conversationHistory.push({ role: "assistant", content: reply });
        } catch (e) {
            addMessage("Erro ao conectar.", false, true);
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
        }
    }

    // CHECK-IN GAMIFICADO
    const btnCheckIn = document.getElementById('btnCheckIn');
    const streakDisplay = document.getElementById('streakDisplay');
    const checkIconBox = document.getElementById('checkIconBox');
    const checkIcon = document.getElementById('checkIcon');
    const checkText = document.getElementById('checkText');

    const today = new Date().toDateString();
    const lastCheckIn = localStorage.getItem('lastCheckInDate');
    let currentStreak = parseInt(localStorage.getItem('userStreak') || '0');
    if(streakDisplay) streakDisplay.textContent = currentStreak;

    function markCheckInComplete() {
        btnCheckIn.classList.add('btn-checkin-active');
        checkIconBox.classList.remove('border-gray-600');
        checkIconBox.classList.add('bg-green-500', 'border-green-500');
        checkIcon.classList.remove('opacity-0', 'scale-50');
        checkIcon.classList.add('opacity-100', 'scale-100');
        checkText.textContent = "Vitória Registrada!";
        checkText.classList.add('text-green-500');
        const todayBubble = document.querySelector('#calendarGrid .bg-white');
        if(todayBubble) {
            todayBubble.classList.remove('bg-white', 'text-black');
            todayBubble.classList.add('calendar-day-done');
            todayBubble.innerHTML = '<i class="fas fa-check"></i>';
        }
    }

    if (lastCheckIn === today && btnCheckIn) markCheckInComplete();

    if (btnCheckIn) {
        btnCheckIn.addEventListener('click', () => {
            if (btnCheckIn.classList.contains('btn-checkin-active')) return;
            markCheckInComplete();
            currentStreak++;
            localStorage.setItem('userStreak', currentStreak);
            localStorage.setItem('lastCheckInDate', today);
            if(streakDisplay) {
                streakDisplay.textContent = currentStreak;
                streakDisplay.style.color = "#22c55e";
            }
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        });
    }

    // ANIMAÇÃO
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
    startTypewriter(toolDefinitions['Diagnostico'].typewriterExamples);

    // LISTENERS
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    if(menuBtn) menuBtn.addEventListener('click', openSidebar);
    if(overlay) overlay.addEventListener('click', closeSidebar);
    document.querySelectorAll('.tool-item').forEach(i => i.addEventListener('click', () => { closeSidebar(); }));
});