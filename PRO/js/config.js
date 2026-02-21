// PRO/js/config.js

const CONFIG = {
    SUPABASE: {
        URL: 'https://gexnzquhqbszqjqwowix.supabase.co',
        KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdleG56cXVocWJzenFqcXdvd2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTI0MzgsImV4cCI6MjA4MzI4ODQzOH0.uykP2vUDmIDibgrLT-ISgxjQc4566M_em413jWxDGd4'
    },
    AI: {
        WORKER_URL: 'https://synapse-ai-worker.kayque-f-soares.workers.dev', // Exemplo / Placeholder se necessário
        MODEL: 'gpt-4o-mini' // ou o modelo que estiver usando
    },
    STORAGE: {
        DB_NAME: 'synapse_db',
        DB_VERSION: 1,
        STORES: {
            KV: 'kv_store',
            QUEUE: 'sync_queue'
        }
    }
};

window.APP_CONFIG = CONFIG;
export { CONFIG };