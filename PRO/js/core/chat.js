// PRO/js/core/chat.js
import { CONFIG } from '../config.js';
import { toggleSidebar } from '../modules/navigation.js';

// --- DEFINIÇÃO DOS AGENTES (Mantendo a inteligência, removendo ícones visuais) ---
const AGENTS = {
    COMANDANTE: {
        name: "Comandante",
        role: "Disciplina & Execução",
        // Removi as chaves { } que estavam sujando o texto
        welcome: "Missão dada é missão cumprida. Qual o objetivo de hoje?",
        typewriter: ["FOCO TOTAL.", "SEM DESCULPAS.", "DISCIPLINA É LIBERDADE."],
        initialButtons: ["Estou procrastinando", "Preciso de um plano", "Me cobre uma meta"],
        prompt: `
        [SYSTEM ROLE]
        Você é o COMANDANTE. Não é um amigo, é um líder focado em Alta Performance.
        Sua função é garantir que o usuário execute.

        [TONE & STYLE]
        - Direto, autoritário, mas profissional.
        - PROIBIDO: Textões longos, emojis fofos.
        - Se o usuário der desculpas, use lógica para desmontar o argumento.

        [PROTOCOLOS]
        1. LEI DA BREVIDADE: Responda em no máximo 3 parágrafos curtos.
        2. LEI DO COMANDO: Termine TODA resposta com uma ordem clara de ação.
        `
    },
    GENERAL: {
        name: "General",
        role: "Negócios & Estratégia",
        welcome: "O mercado é um campo de batalha. O que vamos conquistar hoje?",
        typewriter: ["VISÃO DE LONGO PRAZO.", "DOMINAÇÃO DE MERCADO.", "CASH IS KING."],
        initialButtons: ["Analisar minha ideia", "Como escalar isso?", "Estratégia de Vendas"],
        prompt: `
        [SYSTEM ROLE]
        Você é o GENERAL. Um estrategista de negócios frio e calculista.
        Sua única lealdade é ao LUCRO e à EXPANSÃO do império do usuário.

        [TONE & STYLE]
        - Sofisticado, estratégico, focado em ROI (Retorno).
        - Use termos de negócios.
        - Se a ideia não dá dinheiro, diga: "Isso é queimar caixa".

        [PROTOCOLOS]
        1. LEI DO LUCRO: Avalie tudo baseando-se no potencial financeiro.
        2. CALL TO ACTION: Termine perguntando qual o próximo passo tático.
        `
    },
    TATICO: {
        name: "Tático",
        role: "Tech & Operacional",
        welcome: "Sistemas online. Qual o problema técnico para resolver?",
        typewriter: ["SISTEMA OPERACIONAL.", "DEBUGGING...", "CLEAN CODE."],
        initialButtons: ["Corrigir este código", "Criar nova funcionalidade", "Melhorar performance"],
        prompt: `
        [SYSTEM ROLE]
        Você é o TÁTICO. O especialista em Tech e Código.
        Você odeia enrolação. Você ama soluções elegantes.

        [TONE & STYLE]
        - Técnico, preciso.
        - Respostas diretas ao ponto. "Talk is cheap, show me the code".

        [PROTOCOLOS]
        1. LEI DO CÓDIGO: Se pedir código, entregue o bloco pronto.
        2. EXPLICAÇÃO: Explique o "porquê" técnico em 1 frase simples.
        `
    }
};

let currentAgent = 'COMANDANTE'; 
let chatHistory = [];

export function initChat() {
    window.selectTool = selectTool;
    
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keydown', (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } 
    });

    // Iniciar direto com o COMANDANTE
    selectTool('COMANDANTE');
}

export function selectTool(agentKey) {
    if(!AGENTS[agentKey]) agentKey = 'COMANDANTE';
    
    currentAgent = agentKey;
    const agentData = AGENTS[agentKey];
    
    document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
    
    const activeTool = document.getElementById(`tool${agentKey}`);
    if(activeTool) activeTool.classList.add('active');
    
    // Atualiza Título Mobile (Sem mudar cor para não quebrar layout)
    const mobileTitle = document.getElementById('mobileTitle');
    if(mobileTitle) {
        mobileTitle.innerText = agentData.name.toUpperCase();
    }

    resetChat();
    if (window.innerWidth < 768) toggleSidebar();
}

function resetChat() {
    const container = document.getElementById('messagesContainer');
    if(!container) return;
    container.innerHTML = '';
    
    const agent = AGENTS[currentAgent];

    // --- CORREÇÃO: Voltei para o cabeçalho original SEM ÍCONE ---
    const headerHTML = `
        <div class="w-full text-center mb-6 p-4">
            <p id="chatSubtitle" class="text-gray-400 text-sm">
                <span id="typewriter-text" class="text-brutal-red font-medium"></span>
                <span class="animate-pulse">|</span>
            </p>
        </div>
    `;
    container.insertAdjacentHTML('afterbegin', headerHTML);

    addIAMessage(agent.welcome);
    renderQuickReplies(agent.initialButtons);

    chatHistory = [{ role: "system", content: agent.prompt }];
    startTypewriter(agent.typewriter);
}

async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const text = chatInput.value.trim();
    if(!text) return;

    addUserMessage(text);
    
    chatInput.value = '';
    chatHistory.push({ role: "user", content: text });

    // Loading simples
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message-ia opacity-50 text-xs';
    loadingDiv.id = 'loadingMsg';
    loadingDiv.innerText = `Analisando...`; // Texto neutro
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
        
        addIAMessage(reply);
        chatHistory.push({ role: "assistant", content: reply });
    } catch (e) {
        if(document.getElementById('loadingMsg')) document.getElementById('loadingMsg').remove();
        setTimeout(() => addIAMessage("FALHA NA COMUNICAÇÃO. TENTE NOVAMENTE.", true), 500);
        console.error(e);
    }
}

// --- Helpers Visuais ---

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

    let cleanMessage = text.replace(buttonRegex, '').trim();
    
    // Formatação limpa (sem cores forçadas)
    cleanMessage = cleanMessage
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    if (cleanMessage) {
        const div = document.createElement('div');
        div.className = 'chat-message-ia';
        if(isError) div.style.color = '#ef4444';
        div.innerHTML = cleanMessage;
        container.appendChild(div);
    }

    if (buttons.length > 0) renderQuickReplies(buttons);
    scrollToBottom();
}

function renderQuickReplies(buttons) {
    const container = document.getElementById('messagesContainer');
    const btnContainer = document.createElement('div');
    btnContainer.className = 'quick-reply-container';
    
    buttons.forEach(btnText => {
        if(btnText.toUpperCase() !== "OPÇÃO") {
            const btn = document.createElement('button');
            
            // --- CORREÇÃO: Voltei para a classe original 'cyber-btn' ---
            // Isso garante que ele use o estilo do seu CSS (style.css)
            btn.className = 'cyber-btn'; 
            
            btn.innerText = btnText;
            btn.onclick = () => {
                btnContainer.style.display = 'none'; 
                document.getElementById('chatInput').value = btnText;
                sendMessage();
            };
            btnContainer.appendChild(btn);
        }
    });
    container.appendChild(btnContainer);
    scrollToBottom();
}

function startTypewriter(phrases) {
    const el = document.getElementById('typewriter-text');
    if(!el) return;
    let pIndex = 0, cIndex = 0, isDeleting = false;
    
    if(window.typewriterTimeout) clearTimeout(window.typewriterTimeout);

    function type() {
        const current = phrases[pIndex];
        el.textContent = current.substring(0, isDeleting ? cIndex - 1 : cIndex + 1);
        cIndex += isDeleting ? -1 : 1;
        
        let speed = isDeleting ? 50 : 100;
        
        if(!isDeleting && cIndex === current.length) { 
            isDeleting = true; 
            speed = 2000; 
        } else if(isDeleting && cIndex === 0) { 
            isDeleting = false; 
            pIndex = (pIndex + 1) % phrases.length; 
            speed = 500; 
        }
        
        window.typewriterTimeout = setTimeout(type, speed);
    }
    type();
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    const parent = container.parentElement;
    if(parent) parent.scrollTop = parent.scrollHeight;
}