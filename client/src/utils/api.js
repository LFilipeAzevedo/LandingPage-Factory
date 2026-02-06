import axios from 'axios';

const getBaseUrl = () => {
    // 1. Se houver uma variável de ambiente explícita, use-a
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    const { hostname, origin } = window.location;

    // 2. Se estiver localmente (localhost) e NÃO estiver na porta 3001 (ex: Vite na 5173)
    // assume que o backend está na 3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        if (window.location.port !== '3001') {
            return `http://${hostname}:3001`;
        }
    }

    // 3. Em produção (Railway), o frontend e backend rodam no mesmo domínio/porta
    return origin;
};

const api = axios.create({
    baseURL: getBaseUrl(),
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
