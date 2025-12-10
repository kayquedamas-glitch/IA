// js/app.js - Lógica Original Restaurada & Animações Dopaminérgicas

const CONFIG = {
    API_URL: "https://long-block-7f38.kayquedamas.workers.dev",
    API_MODEL: "llama-3.1-8b-instant"
};

const IS_DEMO = true;
let chatMessageCount = 0;
const CHAT_LIMIT = 8; 
const MISSION_LIMIT = 1;

// --- DEFINIÇÃO EXATA DO SEU ARQUIVO ORIGINAL ---
const toolDefinitions = {
    'Diagnostico': {
        title: "Sessão de Diagnóstico",
        subtitle: "Analisando seu perfil...", 
        typewriterExamples: [ "desabafa comigo...", "sem julgamentos...", "vamos resolver isso." ],
        initialMessage: "Olá. O que está travando a sua vida hoje?",
        initialButtons: ["Procrastinação", "Fadiga", "Ansiedade", "Vício"],
        
        systemPrompt: `Você é o Synapse.
PERSONA: Um especialista em comportamento que fala a língua do povo. Você é direto, mas amigo.
NÃO USE PALAVRAS DIFÍCEIS. Fale como se estivesse no WhatsApp.
TOM: Acolhedor, Empático, Sábio e Não-Julgador.

OBJETIVO: Fazer uma Anamnese (Triagem) e levar o usuário até o momento de revelar o "Sabotador".

REGRAS DE OURO (INTERFACE):
1. NUNCA faça 2 perguntas de uma vez.
2. Sempre termine suas perguntas oferecendo opções em botões no formato <<OPÇÃO>>.
3. A última opção deve ser sempre: <<Outro>>.
4. SEUS BOTÕES DEVEM SER MINÚSCULOS (1 a 3 palavras).
5. SUAS PERGUNTAS DEVEM SER CURTAS E DIRETAS.

ROTEIRO DA CONVERSA:
Fase 1: Investigação (5 a 7 perguntas curtas)
- Pergunte o que está travando a vida dele hoje.
- Aprofunde com perguntas curtas e botões sugeridos.
- NÃO dê explicações ou conselhos agora. Apenas colete dados.

Fase 2: O Diagnóstico (O "Pré-Fechamento")
- Quando tiver dados, diga: "Entendi. O quadro é claro. Você sofre de [Nome do Problema Superficial]."
- Explique brevemente (1 frase).
- Termine com: "A análise está completa. O problema não é você, é esse padrão neuroquímico. Eu tenho o Protocolo exato para corrigir isso. Quer acessar a solução?"
- Botões: <<Sim, quero a solução>>

Fase 3: O Dossiê (O Grande Final)
- Se o usuário disser "Sim", responda: "Ok. Prepare-se. Vou gerar seu Dossiê Completo agora. Ele contém as 2 Raízes do problema e a solução para eliminar seu Sabotador."
- E IMEDIATAMENTE coloque APENAS a tag: [FIM_DA_SESSAO]`
    }
};

let currentAgent = 'Diagnostico';
let chatHistory = [];

// -----------------------------------------------------------
// 1. INICIALIZAÇÃO & NAVEGAÇÃO
// -----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Inicializando Synapse (Modo Divertido)...");
    
    initNavigation();
    initChat();
    initDashboard();
    
    // Inicia Sessão
    selectTool('Diagnostico');

    if (window.innerWidth < 768) {
        setTimeout(() => toggleSidebar(), 100);
    }
    
    // Renderiza calendário estático
    const calGrid = document.getElementById('cal-grid');
    if(calGrid) {
        for(let i=1; i<=30; i++) {
            const d = document.createElement('div');
            d.className = 'aspect-square rounded border border-[#222] flex items-center justify-center text-[10px] text-[#444]';
            d.innerText = i;
            calGrid.appendChild(d);
        }
    }

    document.body.style.visibility = "visible";
    if(window.lucide) lucide.createIcons();
    
    // Listeners Extras
    const btnFoco = document.getElementById('btnFoco');
    if(btnFoco) btnFoco.onclick = () => showLockedFeature("Modo Foco");
    
    const btnRelatorio = document.getElementById('btnRelatorio');
    if(btnRelatorio) btnRelatorio.onclick = () => showLockedFeature("Relatórios Avançados");
    
    window.triggerPanicSequence = () => selectTool('Panico');
});

function initNavigation() {
    window.toggleSidebar = toggleSidebar;
    window.switchTab = switchTab;
    window.selectTool = selectTool;
    window.showLockedFeature = showLockedFeature;
    const overlay = document.getElementById('sidebarOverlay');
    if(overlay) overlay.addEventListener('click', toggleSidebar);
}

function selectTool(toolKey) {
    if (window.innerWidth < 768) toggleSidebar();

    // Sempre vai pro chat ao selecionar ferramenta
    switchTab('chat');

    if (toolKey === 'Diagnostico') {
        resetChat('Diagnostico'); 
    } else if (toolKey === 'Panico') {
        playPanicSequence(); 
    } else {
        showToolBlockedScreen(toolKey); 
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;
    const isOpen = sidebar.style.transform === 'translateX(0px)';
    sidebar.style.transform = isOpen ? 'translateX(-100%)' : 'translateX(0px)';
    overlay.style.visibility = isOpen ? 'hidden' : 'visible';
    overlay.style.opacity = isOpen ? '0' : '1';
}

function switchTab(tab) {
    const viewChat = document.getElementById('viewChat');
    const viewProtocolo = document.getElementById('viewProtocolo');
    const tabChat = document.getElementById('tabChat');
    const tabJornada = document.getElementById('tabJornada');
    const bottomNav = document.querySelector('.bottom-nav');
    const mobileHeader = document.getElementById('mobileHeader');

    // Reset Tabs
    if(tabChat) { tabChat.classList.remove('active'); tabChat.style.color = '#666'; }
    if(tabJornada) { tabJornada.classList.remove('active'); tabJornada.style.color = '#666'; }
    
    // Esconde views
    viewChat.classList.add('hidden');
    viewProtocolo.classList.add('hidden');

    // UI Fixa (Nunca some)
    if(bottomNav) bottomNav.style.transform = 'translateY(0)';
    if(mobileHeader) mobileHeader.style.transform = 'translateY(0)';

    if (tab === 'chat') {
        viewChat.classList.remove('hidden');
        if(tabChat) { tabChat.classList.add('active'); tabChat.style.color = '#CC0000'; }
    } else {
        // ENTRADA NA JORNADA (ANIMAÇÃO)
        viewProtocolo.classList.remove('hidden');
        if(tabJornada) { tabJornada.classList.add('active'); tabJornada.style.color = '#CC0000'; }
        
        
        
        // Re-executa animação de pop-in (remove e readiciona a classe)
        document.querySelectorAll('.dopamine-card').forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; /* trigger reflow */
            el.style.animation = null; 
        });
        
        // Anima Barra de XP
        setTimeout(() => {
            const xpBar = document.getElementById('xpBar');
            if(xpBar) {
                xpBar.style.width = '0%';
                setTimeout(() => xpBar.style.width = '35%', 100);
            }
        }, 200);
    }
}

function showLockedFeature(featureName) {
    alert(`🔒 RECURSO BLOQUEADO NA DEMO\n\nO acesso ao módulo "${featureName}" é exclusivo para membros PRO.\n\nAssine agora para liberar.`);
}

// -----------------------------------------------------------
// 2. MÓDULO DE CHAT
// -----------------------------------------------------------
function initChat() {
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keydown', (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } 
    });
}

function resetChat(agentKey = 'Diagnostico') {
    const container = document.getElementById('messagesContainer');
    if(!container) return;
    
    container.innerHTML = ''; 
    chatMessageCount = 0;
    
    const input = document.getElementById('chatInput');
    if(input) {
        input.disabled = false;
        input.placeholder = "Digite seu comando...";
    }

    const tool = toolDefinitions[agentKey];
    
    // Header
    const headerHTML = `
        <div class="w-full text-center mb-6 p-4 fade-in">
            <p class="text-gray-500 text-xs tracking-widest uppercase">
                <span id="typewriter-text" class="text-red-500 font-bold"></span><span class="animate-pulse">|</span>
            </p>
        </div>
    `;
    container.insertAdjacentHTML('afterbegin', headerHTML);
    
    addIAMessage(tool.initialMessage, false); 
    if(tool.initialButtons) renderButtons(tool.initialButtons);
    
    chatHistory = [{ role: "system", content: tool.systemPrompt }];
    startTypewriter(tool.typewriterExamples);
}

async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const text = chatInput.value.trim();
    if(!text) return;

    addUserMessage(text);
    chatInput.value = '';
    chatHistory.push({ role: "user", content: text });
    chatMessageCount++;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message-ia opacity-50 text-xs';
    loadingDiv.id = 'loadingMsg';
    loadingDiv.innerText = `Analisando...`;
    document.getElementById('messagesContainer').appendChild(loadingDiv);
    scrollToBottom();

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ model: CONFIG.API_MODEL, messages: chatHistory, temperature: 0.7 })
        });
        loadingDiv.remove();
        const data = await response.json();
        
        if (!data.choices || !data.choices[0]) throw new Error("API sem resposta");
        const reply = data.choices[0].message.content;
        
        if (reply.includes('[FIM_DA_SESSAO]')) {
            const cleanReply = reply.replace('[FIM_DA_SESSAO]', '').trim();
            if(cleanReply) addIAMessage(cleanReply);
            triggerFakeLoading(document.getElementById('messagesContainer'), chatInput);
        } else {
            addIAMessage(reply);
            chatHistory.push({ role: "assistant", content: reply });
        }

    } catch (e) {
        const loadMsg = document.getElementById('loadingMsg');
        if(loadMsg) loadMsg.remove();
        addIAMessage("Erro de conexão. Tente novamente.", true);
    }
}

// --- VISUAL DO CHAT ---
function addUserMessage(text) {
    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'chat-message-user';
    div.innerText = text;
    container.appendChild(div);
    scrollToBottom();
}

function addIAMessage(text, isError = false) {
    const container = document.getElementById('messagesContainer');
    
    const buttonRegex = /<<(.+?)>>/g;
    const buttons = [];
    let match;
    while ((match = buttonRegex.exec(text)) !== null) buttons.push(match[1]);
    
    let cleanMessage = text.replace(buttonRegex, '').trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

    if (cleanMessage) {
        const div = document.createElement('div');
        div.className = 'chat-message-ia';
        if(isError) div.style.color = '#ef4444';
        div.innerHTML = cleanMessage;
        container.appendChild(div);
    }
    
    if(buttons.length > 0) renderButtons(buttons);
    scrollToBottom();
}

function renderButtons(labels) {
    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'quick-reply-container'; 
    
    labels.forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'cyber-btn'; 
        btn.innerText = text;
        btn.onclick = () => { 
            div.style.display='none'; 
            document.getElementById('chatInput').value = text; 
            sendMessage(); 
        };
        div.appendChild(btn);
    });
    container.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    const parent = container.parentElement;
    if(parent) parent.scrollTop = parent.scrollHeight;
}

function startTypewriter(phrases) {
    const el = document.getElementById('typewriter-text');
    if(!el) return;
    let pIndex = 0, cIndex = 0, isDeleting = false;
    if(window.typewriterTimeout) clearTimeout(window.typewriterTimeout);

    function type() {
        const current = phrases[pIndex];
        el.textContent = current.substring(0, isDeleting ? cIndex-1 : cIndex+1);
        cIndex += isDeleting ? -1 : 1;
        let speed = isDeleting ? 30 : 80;
        if(!isDeleting && cIndex === current.length) { isDeleting = true; speed = 2000; }
        else if(isDeleting && cIndex === 0) { isDeleting = false; pIndex = (pIndex+1)%phrases.length; speed = 500; }
        window.typewriterTimeout = setTimeout(type, speed);
    }
    type();
}

// -----------------------------------------------------------
// 3. ANIMAÇÕES & PAYWALL
// -----------------------------------------------------------
function triggerFakeLoading(container, input) {
    input.disabled = true;
    input.placeholder = "Gerando Dossiê...";

    const loaderId = 'loader-' + Date.now();
    const loaderHTML = `
        <div id="${loaderId}" class="w-full mt-4 mb-8 fade-in">
            <div class="bg-[#111] border border-white/10 rounded-xl p-6 text-center shadow-lg">
                <p class="text-gray-400 text-xs mb-3 font-mono-code animate-pulse" id="loaderText${loaderId}">> Mapeando padrões...</p>
                <div class="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div class="bg-red-600 h-full w-0 transition-all duration-[3000ms] ease-out shadow-[0_0_10px_rgba(220,38,38,0.7)]" id="loaderBar${loaderId}"></div>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', loaderHTML);
    const bar = document.getElementById(`loaderBar${loaderId}`);
    const text = document.getElementById(`loaderText${loaderId}`);
    scrollToBottom();

    setTimeout(() => { if(bar) bar.style.width = "45%"; }, 100);
    setTimeout(() => { if(text) text.innerText = "> Cruzando dados neuroquímicos..."; }, 1500);
    setTimeout(() => { if(bar && text) { bar.style.width = "80%"; text.innerText = "> Identificando gatilhos..."; } }, 2200);
    setTimeout(() => { if(bar && text) { bar.style.width = "100%"; text.innerText = "> Dossiê Gerado."; } }, 3200);

    setTimeout(() => {
        const loaderEl = document.getElementById(loaderId);
        if(loaderEl) loaderEl.remove();
        renderSalesCard(container);
    }, 3800);
}

function renderSalesCard(container) {
    const saleHTML = `
        <div class="w-full mt-4 mb-8 animate-fade-in-up">
            <div class="bg-[#0f0f0f] border border-red-900/50 rounded-xl p-6 text-center shadow-[0_0_25px_rgba(204,0,0,0.1)] relative overflow-hidden group">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-900 via-red-600 to-red-900"></div>
                <div class="flex justify-center mb-3">
                    <div class="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center border border-red-500/30">
                        <i class="fas fa-file-medical-alt text-red-500"></i>
                    </div>
                </div>
                <h3 class="text-white font-bold text-sm uppercase tracking-wider mb-1">Dossiê Completo Gerado</h3>
                <p class="text-gray-500 text-[10px] mb-4">Estratégia personalizada pronta para acesso.</p>
                <div class="text-left bg-black/40 border border-white/5 p-4 rounded mb-5 relative select-none overflow-hidden cursor-pointer" onclick="window.location.href='index.html#planos'">
                    <div class="filter blur-[4px] opacity-50 text-[10px] text-gray-400 group-hover:blur-[2.5px] transition-all duration-500 leading-relaxed">
                        <strong>1. Gatilho Primário:</strong> O padrão identificado mostra uma sobrecarga de dopamina barata às...<br>
                        <strong>2. Ação Corretiva:</strong> Aplicar o jejum de telas por 15 minutos logo após...<br>
                        <strong>3. Ferramenta Sugerida:</strong> Utilizar o "Faca na caveira" sempre que sentir...
                    </div>
                    <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/20 to-transparent">
                        <div class="bg-black/80 backdrop-blur-sm border border-red-500/30 px-3 py-1.5 rounded-full flex items-center gap-2">
                            <i class="fas fa-lock text-red-500 text-xs"></i>
                            <span class="text-[9px] font-bold text-white uppercase tracking-wider">Conteúdo Bloqueado</span>
                        </div>
                    </div>
                </div>
                <a href="index.html#planos" class="block w-full py-3.5 bg-[#CC0000] hover:bg-red-700 text-white font-bold rounded-lg text-xs uppercase tracking-[0.15em] transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]">
                    DESBLOQUEAR AGORA
                </a>
                <p class="text-[9px] text-gray-600 mt-2">Garantia de 7 dias ou seu dinheiro de volta.</p>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', saleHTML);
    scrollToBottom();
}

function playPanicSequence() {
    switchTab('chat');
    const container = document.getElementById('messagesContainer');
    const inputContainer = document.querySelector('.chat-input-container');
    if(!container) return;

    if(inputContainer) inputContainer.classList.add('hidden-input');
    container.innerHTML = '';
    
    const animationHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center fade-in pt-24 bg-scan-overlay fixed inset-0 z-50">
            <i class="fa-solid fa-biohazard text-5xl text-red-600 mb-6 animate-pulse"></i>
            <h2 class="text-2xl font-black text-white tracking-widest uppercase mb-2 text-glow-red">ANALISANDO CRISE</h2>
            <div class="w-48 h-1 bg-gray-800 rounded-full overflow-hidden mb-2 mt-4 border border-red-900/50">
                <div class="h-full bg-red-600 animate-progress-fill" style="width: 0%"></div>
            </div>
            <p class="text-[10px] text-red-500 tracking-widest uppercase blink-slow">DETECTANDO PADRÃO DE RECAÍDA...</p>
        </div>
    `;
    container.innerHTML = animationHTML;
    
    setTimeout(() => {
        showToolBlockedScreen('Protocolo de Pânico');
        if(inputContainer) inputContainer.classList.remove('hidden-input');
    }, 3000);
}

function showToolBlockedScreen(toolName) {
    switchTab('chat'); 
    const container = document.getElementById('messagesContainer');
    if(!container) return;

    const blockedHTML = `
        <div class="flex flex-col items-center justify-center h-full fade-in pt-16 px-4">
            <div class="bg-[#0a0505] border border-red-600 shadow-[0_0_60px_rgba(220,38,38,0.25)] p-8 rounded-2xl max-w-sm w-full text-center relative overflow-hidden">
                <div class="absolute inset-0 bg-[url('assets/polvo_synapse.png')] bg-center bg-no-repeat opacity-10 pointer-events-none bg-contain mix-blend-overlay"></div>
                <div class="w-14 h-14 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-600 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.6)]">
                    <i class="fas fa-hand-paper text-2xl"></i>
                </div>
                <h3 class="text-white font-black text-xl mb-3 uppercase tracking-wide">Intervenção Bloqueada</h3>
                <p class="text-gray-400 text-xs mb-8 leading-relaxed font-medium">
                    O módulo <strong>${toolName}</strong> é uma ferramenta neuroquímica avançada disponível apenas para membros do <span class="text-red-500 font-bold">Synapse PRO</span>.
                </p>
                <button onclick="window.location.href='index.html#planos'" class="w-full py-4 bg-[#CC0000] hover:bg-red-600 text-white font-black rounded-lg uppercase tracking-[0.15em] text-[10px] shadow-lg shadow-red-900/40 transition-all transform hover:-translate-y-1 active:scale-95">
                    DESBLOQUEAR AGORA
                </button>
                <p class="text-[9px] text-gray-600 mt-4 font-mono-code">SISTEMA PROTEGIDO v2.5</p>
            </div>
        </div>
    `;
    container.innerHTML = blockedHTML;
    const input = document.getElementById('chatInput');
    if(input) {
        input.disabled = true;
        input.placeholder = "Acesso Restrito.";
    }
}

// -----------------------------------------------------------
// 4. MÓDULO DASHBOARD
// -----------------------------------------------------------
let localMissions = []; 

function initDashboard() {
    setupInput();
    renderMissions();
}

function renderMissions() {
    const list = document.getElementById('tactical-list');
    if(!list) return;
    list.innerHTML = '';
    
    if (localMissions.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-gray-700 text-xs">Adicione uma missão para testar o sistema.<br>(Limite: 1 na Demo)</div>';
        updateMeta();
        return;
    }

    localMissions.forEach(m => {
        const div = document.createElement('div');
        div.className = `group flex items-center gap-3 bg-[#111] hover:bg-[#161616] p-3 rounded-lg border border-transparent hover:border-white/5 transition mb-2 ${m.completed ? 'opacity-50' : ''}`;
        div.innerHTML = `
            <button class="check-btn w-5 h-5 rounded border ${m.completed ? 'bg-green-500 border-green-500 text-black' : 'border-[#444] hover:border-white'} flex items-center justify-center transition">
                ${m.completed ? '<i class="fa-solid fa-check text-[10px]"></i>' : ''}
            </button>
            <input type="text" readonly value="${m.title}" class="bg-transparent text-sm w-full outline-none ${m.completed ? 'text-gray-500 line-through' : 'text-gray-200'}">
            <button class="del-btn text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition px-2"><i class="fa-solid fa-trash text-xs"></i></button>
        `;
        div.querySelector('.check-btn').onclick = () => {
            m.completed = !m.completed;
            if(m.completed) {
                const xpBar = document.getElementById('xpBar');
                if(xpBar) xpBar.style.width = '20%';
                if(window.confetti) confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 } });
            }
            renderMissions();
        };
        div.querySelector('.del-btn').onclick = () => {
            localMissions = localMissions.filter(item => item.id !== m.id);
            renderMissions();
        };
        list.appendChild(div);
    });
    updateMeta();
}

function setupInput() {
    const btn = document.getElementById('btnAddBlock');
    const input = document.getElementById('newMissionInput');
    
    if(!btn || !input) return;

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    const addFn = () => {
        const title = input.value.trim();
        if(!title) return;
        if (localMissions.length >= MISSION_LIMIT) {
            alert("🔒 LIMITE DE DEMO ATINGIDO\n\nNa versão gratuita, você pode testar com apenas 1 missão ativa.\n\nDesbloqueie o PRO para missões ilimitadas.");
            return;
        }
        input.value = '';
        localMissions.push({ id: Date.now(), title: title, completed: false });
        renderMissions();
    };
    newBtn.onclick = addFn;
    input.onkeydown = (e) => { if(e.key === 'Enter') addFn(); };
}

function updateMeta() {
    const done = localMissions.filter(m => m.completed).length;
    const total = localMissions.length > 0 ? localMissions.length : 1; 
    const pct = Math.round((done/total)*100);
    
    const metaText = document.getElementById('dailyMetaText');
    const circleContent = document.querySelector('.circle-content');
    const circleChart = document.querySelector('.circle-chart');

    if(metaText) metaText.innerText = `${done}/${localMissions.length}`;
    if(circleContent) circleContent.innerText = `${pct}%`;
    if(circleChart) circleChart.style.setProperty('--percentage', `${pct * 3.6}deg`);
}