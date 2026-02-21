// PRO/js/modules/auth.js
import { CONFIG } from '../config.js';

const Auth = {
    user: null,

    async init() {
        // Tenta recuperar sessão do localStorage (ainda needed para persistencia simples por enquanto)
        // O ideal futuramente é HttpOnly cookies, mas por ora vamos validar o token/sessao
        const savedSession = localStorage.getItem('synapse_user');

        if (window.location.protocol === 'blob:' || window.location.href.includes('usercontent')) {
            console.warn("⚠️ Ambiente de Preview Detectado.");
            if (!savedSession) {
                this.user = { email: "visitante@synapse.ai", nome: "Visitante", status: "PRO", id: "guest" };
                return true;
            }
        }

        if (!savedSession) {
            return false;
        }

        try {
            this.user = JSON.parse(savedSession);
            await this.verifyStatus(); // Verifica status real no servidor
            return true;
        } catch (e) {
            console.error("Auth Error:", e);
            localStorage.removeItem('synapse_user');
            return false;
        }
    },

    async verifyStatus() {
        if (!this.user || !window._supabase) return;

        // Bypassa cache local e pergunta pro Supabase
        // Tabela 'clientes_vip' deve ter RLS que permite leitura apenas do proprio usuario
        try {
            const { data, error } = await window._supabase
                .from('clientes_vip')
                .select('status')
                .eq('email', this.user.email)
                .single();

            if (data && data.status) {
                const serverStatus = data.status.toLowerCase();
                const localStatus = (this.user.status || 'free').toLowerCase();

                if (serverStatus !== localStatus) {
                    console.log(`🔒 Auth: Status corrigido de ${localStatus} para ${serverStatus}`);
                    this.user.status = serverStatus;
                    this.saveSession(); // Atualiza local

                    // Recarrega se houve downgrade critico ou upgrade
                    if (serverStatus === 'free' && localStatus === 'pro') {
                        alert("Sua assinatura PRO expirou ou não foi validada. Recursos bloqueados.");
                        window.location.reload();
                    }
                }
            }
        } catch (e) {
            console.warn("Auth: Falha ao verificar status online. Mantendo cache.", e);
        }
    },

    saveSession() {
        if (this.user) {
            localStorage.setItem('synapse_user', JSON.stringify(this.user));
        }
    },

    logout() {
        localStorage.removeItem('synapse_user');
        window.location.href = "login.html";
    },

    isPro() {
        if (!this.user) return false;
        const s = (this.user.status || '').toLowerCase();
        return s === 'pro' || s === 'vip';
    },

    getUser() {
        return this.user;
    }
};

window.AppAuth = Auth;
export default Auth;
