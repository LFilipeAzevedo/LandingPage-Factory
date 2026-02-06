import axios from 'axios';

const getBaseUrl = () => {
    // Check if a production API URL is provided via env var (Vite)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Fallback to current hostname (good for local dev and LAN testing)
    const { hostname } = window.location;
    return `http://${hostname}:3001`;
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
