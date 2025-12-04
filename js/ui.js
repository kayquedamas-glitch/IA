/* js/ui.js - Interface Visual */

// Injeta o CSS das bolinhas automaticamente
const style = document.createElement('style');
style.innerHTML = `
.typing-indicator { display: flex; justify-content: center; gap: 5px; padding: 15px; }
.dot { width: 8px; height: 8px; background: #CC0000; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
`;
document.head.appendChild(style);

export const UI = {
    elements: {
        container: document.getElementById('messagesContainer'),
        input: document.getElementById('chatInput'),
        sendBtn: document.getElementById('sendBtn')
    },

    addMessage(text, isUser) {
        if (!text) return;
        const div = document.createElement('div');
        div.className = isUser ? 'chat-message-user' : 'chat-message-ia';
        
        // Formata Botões e Negrito
        let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        const btnRegex = /<<(.+?)>>/g;
        const buttons = [];
        let match;
        
        while ((match = btnRegex.exec(text)) !== null) buttons.push(match[1]);
        html = html.replace(btnRegex, '').trim();

        div.innerHTML = html;
        this.elements.container.appendChild(div);
        
        if (!isUser && buttons.length > 0) this.renderButtons(buttons);
        this.scrollToBottom();
    },

    renderButtons(labels) {
        const div = document.createElement('div');
        div.className = 'quick-reply-container';
        labels.forEach(lbl => {
            const btn = document.createElement('button');
            btn.className = 'cyber-btn';
            btn.innerText = lbl;
            // Dispara evento customizado para o app.js ouvir
            btn.onclick = () => { 
                div.remove();
                this.elements.input.value = lbl; 
                document.dispatchEvent(new Event('triggerSend')); 
            };
            div.appendChild(btn);
        });
        this.elements.container.appendChild(div);
        this.scrollToBottom();
    },

    showLoading() {
        this.toggleInput(false);
        this.elements.input.placeholder = "Processando...";
        const id = 'loader-' + Date.now();
        this.elements.container.insertAdjacentHTML('beforeend', `
            <div id="${id}" class="typing-indicator">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
        `);
        this.scrollToBottom();
        return id;
    },

    removeLoading(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    },

    renderSalesCard() {
        this.elements.container.insertAdjacentHTML('beforeend', `
            <div class="w-full mt-4 mb-8 fade-in">
                <div class="bg-[#0f0f0f] border border-red-900/50 rounded-xl p-6 text-center shadow-lg">
                    <h3 class="text-white font-bold text-sm mb-2">DOSSIÊ GERADO</h3>
                    <p class="text-gray-500 text-[10px] mb-4">Sua estratégia está pronta.</p>
                    <a href="index.html#planos" class="block w-full py-3 bg-[#CC0000] text-white font-bold rounded-lg text-xs">DESBLOQUEAR</a>
                </div>
            </div>
        `);
        this.scrollToBottom();
    },

    toggleInput(enable) {
        this.elements.input.disabled = !enable;
        if(enable) {
            this.elements.input.focus();
            this.elements.input.placeholder = "Digite aqui...";
        }
    },

    scrollToBottom() {
        // Ajuste para encontrar o scroll correto
        const parent = this.elements.container.parentElement; 
        if(parent) parent.scrollTop = parent.scrollHeight;
    }
};