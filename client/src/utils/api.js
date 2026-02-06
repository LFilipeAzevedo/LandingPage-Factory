import axios from 'axios';

const getBaseUrl = () => {
    // Check if a production API URL is provided via env var (Vite)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Em produção (Railway), o frontend e backend rodam no mesmo domínio/porta
    return window.location.origin;
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
