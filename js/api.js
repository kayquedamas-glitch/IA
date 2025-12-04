import { CONFIG } from './config.js';

let activeModelId = null;

export const API = {
    // 1. Função que descobre qual modelo sua conta tem direito
    async detectBestModel() {
        if (activeModelId) return activeModelId;

        try {
            console.log("Detectando modelos disponíveis...");
            const response = await fetch(`${CONFIG.BASE_URL}/models?key=${CONFIG.API_KEY}`);
            const data = await response.json();

            if (data.error) {
                console.error("Erro ao listar modelos:", data.error);
                return 'gemini-pro'; // Fallback de emergência
            }

            // Lista de preferência (do melhor para o básico)
            const preferences = [
                'gemini-1.5-flash',
                'gemini-1.5-flash-latest',
                'gemini-1.5-flash-001',
                'gemini-1.5-pro',
                'gemini-1.5-pro-latest',
                'gemini-1.0-pro',
                'gemini-pro'
            ];

            const availableModels = data.models || [];
            
            // Tenta encontrar o melhor modelo disponível na sua lista
            for (const pref of preferences) {
                const found = availableModels.find(m => m.name.includes(pref));
                if (found) {
                    // Remove 'models/' do nome se vier da API
                    activeModelId = found.name.replace('models/', '');
                    console.log("Modelo Selecionado Automaticamente:", activeModelId);
                    return activeModelId;
                }
            }

            // Se não achar nenhum preferido, pega o primeiro que gera texto
            const fallback = availableModels.find(m => m.supportedGenerationMethods.includes("generateContent"));
            if (fallback) {
                activeModelId = fallback.name.replace('models/', '');
                return activeModelId;
            }

            return 'gemini-pro'; // Último recurso

        } catch (e) {
            console.error("Falha na detecção, usando padrão:", e);
            return 'gemini-pro';
        }
    },

    // 2. Função de Envio
    async send(history) {
        // Garante que temos um modelo antes de enviar
        const modelToUse = await this.detectBestModel();

        const contents = history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const payload = {
            contents: contents,
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            // Adapta o System Prompt dependendo do modelo (modelos antigos não aceitam systemInstruction)
            ...(modelToUse.includes('1.5') ? {
                systemInstruction: { parts: [{ text: CONFIG.SYSTEM_PROMPT }] }
            } : {})
        };

        // Se for modelo antigo, injeta o system prompt na mensagem
        if (!modelToUse.includes('1.5') && contents.length > 0) {
            contents[0].parts[0].text = `[DIRETRIZES DO SISTEMA: ${CONFIG.SYSTEM_PROMPT}]\n\n${contents[0].parts[0].text}`;
        }

        const url = `${CONFIG.BASE_URL}/models/${modelToUse}:generateContent?key=${CONFIG.API_KEY}`;
        
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (data.error) throw new Error(data.error.message);
        
        return data.candidates[0].content.parts[0].text;
    }
};