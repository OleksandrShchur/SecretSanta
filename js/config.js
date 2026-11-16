window.SecretSanta = window.SecretSanta || {};

(function (ns) {
    const STORAGE_KEY = 'secret_santa_cloud_config';

    const defaultConfig = {
        supabaseUrl: '',
        supabaseAnonKey: '',
    };

    function loadConfig() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                return { ...defaultConfig, ...JSON.parse(raw) };
            }
        } catch (e) {
            console.warn('Failed to parse saved config:', e);
        }
        return { ...defaultConfig };
    }

    function saveConfig(cfg) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        } catch (e) {
            console.warn('Failed to save config:', e);
        }
    }

    ns.config = {
        get: loadConfig,
        set: saveConfig,
        isConfigured: function () {
            const cfg = loadConfig();
            return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
        }
    };
})(window.SecretSanta);
