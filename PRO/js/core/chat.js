// PRO/js/core/chat.js
import { CONFIG } from '../config.js';
import { agents } from '../data/agents.js';
import { toggleSidebar } from '../modules/navigation.js';

let currentAgent = 'Diagnostico';
let chatHistory = [];

export function initChat() {
    // Expor funções necessárias para o HTML (botoes de resposta rápida)
    window.selectTool = selectTool;
    
    // Listeners
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keydown', (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } 
    });

    // Iniciar com o primeiro agente
    selectTool('Diagnostico');
}

export function selectTool(agentKey) {
    if(!agents[agentKey]) return;
    currentAgent = agentKey;
    
    // Atualiza UI da Sidebar
    document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
    const activeTool = document.getElementById(`tool${agentKey}`);
    if(activeTool) activeTool.classList.add('active');
    
    // Atualiza Título Mobile
    const mobileTitle = document.getElementById('mobileTitle');
    if(mobileTitle) {
        mobileTitle.innerText = agents[agentKey].name.toUpperCase();
        if(agentKey === 'Panico') {
            mobileTitle.style.color = '#ef4444';
            mobileTitle.classList.add('animate-pulse');
        } else {
            mobileTitle.style.color = 'white';
            mobileTitle.classList.remove('animate-pulse');
        }
    }

    resetChat();
    // Fecha sidebar se estiver no mobile
    if (window.innerWidth < 768) toggleSidebar();
}

function resetChat() {
    const container = document.getElementById('messagesContainer');
    if(!container) return;
    container.innerHTML = '';
    
    // Cabeçalho
    const headerHTML = `
        <div class="w-full text-center mb-6 p-4">
            <p id="chatSubtitle" class="text-gray-400 text-sm">
                <span id="typewriter-text" class="text-brutal-red font-medium"></span>
                <span class="animate-pulse">|</span>
            </p>
        </div>
    `;
    container.insertAdjacentHTML('afterbegin', headerHTML);

    // Boas vindas
    addIAMessage(agents[currentAgent].welcome);

    // Botões Iniciais
    renderQuickReplies(agents[currentAgent].initialButtons);

    // Reset Contexto
    chatHistory = [{ role: "system", content: agents[currentAgent].prompt }];
    startTypewriter(agents[currentAgent].typewriter);
}

async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const text = chatInput.value.trim();
    if(!text) return;

    // Adiciona msg do usuário
    addUserMessage(text);
    
    chatInput.value = '';
    chatHistory.push({ role: "user", content: text });

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ model: CONFIG.API_MODEL, messages: chatHistory, temperature: 0.7 })
        });
        const data = await response.json();
        const reply = data.choices[0].message.content;
        
        addIAMessage(reply);
        chatHistory.push({ role: "assistant", content: reply });
    } catch (e) {
        setTimeout(() => addIAMessage("Falha na conexão neural. Tente novamente.", true), 1000);
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
    
    // Regex para extrair botões <<Botão>>
    const buttonRegex = /<<(.+?)>>/g;
    const buttons = [];
    let match;
    while ((match = buttonRegex.exec(text)) !== null) buttons.push(match[1]);

    let cleanMessage = text.replace(buttonRegex, '').trim();
    // Formatação básica
    cleanMessage = cleanMessage.replace(/\{/g, '<strong>').replace(/\}/g, '</strong>').replace(/\n/g, '<br>');

    if (cleanMessage) {
        const div = document.createElement('div');
        div.className = 'chat-message-ia';
        if(isError) div.style.color = 'red';
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
            btn.className = 'cyber-btn';
            
            if(currentAgent === 'Panico') {
                btn.style.borderColor = '#7f1d1d';
                btn.style.color = '#fca5a5';
            }
            
            btn.innerText = btnText;
            btn.onclick = () => {
                btnContainer.style.display = 'none'; // Esconde botões após clique
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
    
    // Limpar timeout anterior se houver mudança rápida de ferramenta
    if(window.typewriterTimeout) clearTimeout(window.typewriterTimeout);

    function type() {
        const current = phrases[pIndex];
        el.textContent = current.substring(0, isDeleting ? cIndex - 1 : cIndex + 1);
        cIndex += isDeleting ? -1 : 1;
        
        let speed = isDeleting ? 50 : 100;
        
        if(!isDeleting && cIndex === current.length) { 
            isDeleting = true; 
            speed = 2000; // Espera antes de apagar
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
    // Rola o container pai (chat-messages)
    const parent = container.parentElement;
    if(parent) parent.scrollTop = parent.scrollHeight;
}