import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    // Forgot Password State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotMessage, setForgotMessage] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const handleForgotPassword = async () => {
        if (!forgotEmail) {
            setForgotMessage('Por favor, digite seu e-mail.');
            return;
        }
        setIsResetting(true);
        try {
            const response = await api.post('/api/auth/forgot-password', { email: forgotEmail });
            setForgotMessage(response.data.message || 'Se o e-mail existir, enviamos um link.');
        } catch (error) {
            setForgotMessage(error.response?.data?.message || 'Ocorreu um erro ao tentar enviar o e-mail.');
        } finally {
            setIsResetting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const result = await login(username, password);
        if (result.success) {
            navigate('/admin/editor');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Admin Access</h1>
                <p className="login-subtitle">Entre com suas credenciais para editar o site.</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Usuário</label>
                        <input
                            type="text"
                            id="username"
                            className="input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Senha</label>
                        <input
                            type="password"
                            id="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary login-btn">
                        Entrar na Plataforma
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
                        Novo por aqui? <a href="/admin/register" style={{ color: 'var(--primary-600)', fontWeight: 'bold' }}>Crie sua conta aqui</a>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowForgotModal(true)}
                            style={{ background: 'none', border: 'none', color: 'var(--slate-500)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Esqueci minha senha
                        </button>
                    </div>
                </form>
            </div>

            {showForgotModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0, color: '#1e293b' }}>Recuperar Senha</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Digite seu e-mail para receber um link de redefinição.</p>

                        {forgotMessage && <div style={{ padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', background: forgotMessage.includes('erro') ? '#fee2e2' : '#dcfce7', color: forgotMessage.includes('erro') ? '#991b1b' : '#166534', fontSize: '0.9rem' }}>{forgotMessage}</div>}

                        <input
                            type="email"
                            placeholder="seu@email.com"
                            className="input"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            style={{ width: '100%', marginBottom: '1rem' }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => { setShowForgotModal(false); setForgotMessage(''); }}
                                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                disabled={isResetting}
                                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#109426ff', color: '#ffffffff', cursor: 'pointer', opacity: isResetting ? 0.7 : 1 }}
                            >
                                {isResetting ? 'Enviando...' : 'Enviar Link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
