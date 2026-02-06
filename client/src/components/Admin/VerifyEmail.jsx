import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import './Login.css';

const VerifyEmail = () => {
    const { token } = useParams();
    const [status, setStatus] = useState('verificando'); // 'verificando', 'sucesso', 'erro'
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            try {
                const response = await api.get(`/auth/verify-email/${token}`);
                if (response.data.success) {
                    setStatus('sucesso');
                    setMessage(response.data.message);
                }
            } catch (err) {
                setStatus('erro');
                setMessage(err.response?.data?.error || 'Link de verificação inválido ou expirado.');
            }
        };

        if (token) {
            verify();
        }
    }, [token]);

    return (
        <div className="login-container">
            <div className="login-card" style={{ textAlign: 'center' }}>
                <h1 className="login-title">Verificação de Conta</h1>

                <div style={{ margin: '2rem 0' }}>
                    {status === 'verificando' && (
                        <div>
                            <p>Estamos verificando sua conta...</p>
                            <div className="loading-spinner" style={{ margin: '1rem auto' }}></div>
                        </div>
                    )}

                    {status === 'sucesso' && (
                        <div style={{ color: '#059669' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
                            <p style={{ fontWeight: 'bold' }}>{message}</p>
                        </div>
                    )}

                    {status === 'erro' && (
                        <div style={{ color: '#dc2626' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠</div>
                            <p style={{ fontWeight: 'bold' }}>{message}</p>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <Link to="/admin/login" className="btn btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                        Ir para o Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
