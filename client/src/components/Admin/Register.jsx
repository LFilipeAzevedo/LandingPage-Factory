import { useState, useEffect } from 'react';
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

    // Password Strength State
    const [pwdValidations, setPwdValidations] = useState({
        length: false,
        upper: false,
        lower: false,
        number: false
    });

    const { login } = useAuth();
    const navigate = useNavigate();

    // Validate password on change
    useEffect(() => {
        setPwdValidations({
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /\d/.test(password)
        });
    }, [password]);

    const isPasswordStrong = Object.values(pwdValidations).every(Boolean);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Sanitization (Trim)
        const cleanUsername = username.trim();
        const cleanEmail = email.trim();

        if (password !== confirmPassword) {
            return setError('As senhas não coincidem.');
        }

        if (!isPasswordStrong) {
            return setError('A senha não atende aos requisitos de segurança.');
        }

        setLoading(true);
        try {
            const response = await api.post('/api/auth/register', {
                username: cleanUsername,
                email: cleanEmail,
                password
            });

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
                            <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                                Este será o endereço do seu site. Evite espaços e caracteres especiais.
                            </small>
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
                            {/* Password Strength Meter */}
                            <div style={{ marginTop: '8px', fontSize: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                <span style={{ color: pwdValidations.length ? '#10b981' : '#94a3b8' }}>
                                    {pwdValidations.length ? '✓' : '○'} Mínimo 8 caracteres
                                </span>
                                <span style={{ color: pwdValidations.upper ? '#10b981' : '#94a3b8' }}>
                                    {pwdValidations.upper ? '✓' : '○'} Letra Maiúscula
                                </span>
                                <span style={{ color: pwdValidations.lower ? '#10b981' : '#94a3b8' }}>
                                    {pwdValidations.lower ? '✓' : '○'} Letra Minúscula
                                </span>
                                <span style={{ color: pwdValidations.number ? '#10b981' : '#94a3b8' }}>
                                    {pwdValidations.number ? '✓' : '○'} Número
                                </span>
                            </div>
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
