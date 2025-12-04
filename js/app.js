/* js/app.js - Controlador Principal */
import { UI } from './ui.js';
import { API } from './api.js';

let conversationHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mensagem Inicial
    setTimeout(() => {
        UI.addMessage("Olá. O que está travando a sua vida hoje?", false);
        UI.renderButtons(["Procrastinação", "Fadiga", "Ansiedade", "Vício"]);
    }, 500);

    // 2. Eventos de Envio
    document.addEventListener('triggerSend', handleSend); // Botões
    UI.elements.sendBtn.addEventListener('click', handleSend); // Botão Enviar
    UI.elements.input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
});

async function handleSend() {
    const text = UI.elements.input.value.trim();
    if(!text) return;

    // UI: Mostra msg do usuário e limpa input
    UI.addMessage(text, true);
    UI.elements.input.value = '';
    const loaderId = UI.showLoading(); // Mostra bolinhas

    // Lógica: Adiciona ao histórico
    conversationHistory.push({ role: "user", content: text });

    try {
        // API: Chama o Gemini
        const reply = await API.send(conversationHistory);
        
        // Remove bolinhas
        UI.removeLoading(loaderId);

        // Verifica Gatilho do Dossiê
        if (reply.includes('[FIM_DA_SESSAO]')) {
            // Mostra bolinhas de novo simulando geração do dossiê
            const finalLoader = UI.showLoading();
            setTimeout(() => {
                UI.removeLoading(finalLoader);
                UI.renderSalesCard(); // Entrega o Dossiê
                UI.elements.input.placeholder = "Sessão Finalizada.";
            }, 2500);
        } else {
            // Conversa normal
            conversationHistory.push({ role: "assistant", content: reply });
            UI.addMessage(reply, false);
            UI.toggleInput(true); // Destrava input
        }

    } catch (error) {
        console.error(error);
        UI.removeLoading(loaderId);
        UI.addMessage("⚠️ Erro de conexão. Tente novamente.", false);
        UI.toggleInput(true);
    }
}