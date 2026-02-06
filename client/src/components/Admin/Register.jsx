import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import './Login.css';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (password !== confirmPassword) {
            return setError('As senhas não coincidem.');
        }

        setLoading(true);
        try {
            const response = await api.post('/api/auth/register', { username, email, password });

            if (response.data.success) {
                setSuccessMessage('Conta criada com sucesso! Verifique seu e-mail para ativar sua conta antes de fazer login.');
                // Limpar formulário
                setUsername('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao criar conta.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Criar sua Plataforma</h1>
                <p className="login-subtitle">Comece a construir sua landing page profissional hoje mesmo.</p>

                {error && <div className="error-message">{error}</div>}

                {successMessage && (
                    <div className="success-message" style={{
                        backgroundColor: '#ecfdf5',
                        color: '#059669',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        fontSize: '0.875rem',
                        textAlign: 'center',
                        border: '1px solid #d1fae5'
                    }}>
                        {successMessage}
                        <div style={{ marginTop: '1rem' }}>
                            <Link to="/admin/login" className="btn btn-primary" style={{ display: 'inline-block', textDecoration: 'none', padding: '0.5rem 1rem' }}>
                                Ir para o Login
                            </Link>
                        </div>
                    </div>
                )}

                {!successMessage && (
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="username">Usuário (Nome da Página)</label>
                            <input
                                type="text"
                                id="username"
                                className="input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="ex: brigadeirosda-maria"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">E-mail</label>
                            <input
                                type="email"
                                id="email"
                                className="input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ex: seu@email.com"
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

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirmar Senha</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                className="input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                            {loading ? 'Criando conta...' : 'Criar Minha Página'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
                            Já tem uma conta? <Link to="/admin/login" style={{ color: 'var(--primary-600)', fontWeight: 'bold' }}>Faça login aqui</Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Register;
