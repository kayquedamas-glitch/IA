// PRO/js/modules/storage.js
import { CONFIG } from '../config.js';

// Inicializa Dexie
// Nota: Dexie deve ser carregado via CDN no index.html antes deste módulo
const db = new Dexie(CONFIG.STORAGE.DB_NAME);

db.version(CONFIG.STORAGE.DB_VERSION).stores({
    [CONFIG.STORAGE.STORES.KV]: 'key', // Armazena estado global blob
    [CONFIG.STORAGE.STORES.QUEUE]: '++id, type, status, created_at' // Fila de sincronização
});

const Storage = {
    // --- KEY-VALUE STORE (Estado Global) ---

    async setLocalState(key, state) {
        try {
            // Clona para evitar problemas de referência
            const dataToSave = JSON.parse(JSON.stringify(state));
            await db[CONFIG.STORAGE.STORES.KV].put({ key, value: dataToSave, updated_at: Date.now() });
            return true;
        } catch (e) {
            console.error("Storage Error (setLocalState):", e);
            return false;
        }
    },

    async getLocalState(key) {
        try {
            const record = await db[CONFIG.STORAGE.STORES.KV].get(key);
            return record ? record.value : null;
        } catch (e) {
            console.error("Storage Error (getLocalState):", e);
            return null;
        }
    },

    // --- SYNC QUEUE (Fila) ---

    async enqueueOp(type, payload) {
        try {
            await db[CONFIG.STORAGE.STORES.QUEUE].add({
                type,
                payload,
                status: 'pending',
                created_at: Date.now(),
                retry_count: 0
            });
            return true;
        } catch (e) {
            console.error("Storage Error (enqueueOp):", e);
            return false;
        }
    },

    async getPendingOps() {
        return await db[CONFIG.STORAGE.STORES.QUEUE]
            .where('status').equals('pending')
            .sortBy('created_at');
    },

    async getAllOps() {
        return await db[CONFIG.STORAGE.STORES.QUEUE].toArray();
    },

    async markOpProcessed(id, success, errorDetails = null) {
        const updates = {
            status: success ? 'processed' : 'failed',
            processed_at: Date.now()
        };
        if (errorDetails) updates.error = errorDetails;

        await db[CONFIG.STORAGE.STORES.QUEUE].update(id, updates);

        // Se sucesso, limpa para não acumular lixo (ou move para log/arquivado se preferir)
        if (success) {
            await db[CONFIG.STORAGE.STORES.QUEUE].delete(id);
        }
    },

    async clearQueue() {
        await db[CONFIG.STORAGE.STORES.QUEUE].clear();
    }
};

window.AppStorage = Storage;
export default Storage;
