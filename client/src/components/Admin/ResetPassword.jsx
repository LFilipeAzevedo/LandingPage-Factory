import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './Login.css';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Password Strength State
    const [pwdValidations, setPwdValidations] = useState({
        length: false,
        upper: false,
        lower: false,
        number: false
    });

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

        if (password !== confirmPassword) {
            setMessage('As senhas não coincidem.');
            return;
        }

        if (!isPasswordStrong) {
            setMessage('A senha não atende aos requisitos de segurança.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const response = await api.post('/api/auth/reset-password', { token, newPassword: password });

            if (response.data.success) {
                setMessage('Senha redefinida com sucesso! Redirecionando...');
                setTimeout(() => navigate('/admin/login'), 3000);
            } else {
                setMessage(response.data.error || 'Erro ao redefinir senha.');
                setIsSubmitting(false);
            }
        } catch (error) {
            setMessage(error.response?.data?.error || 'Erro ao conectar com o servidor.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Nova Senha</h1>
                <p className="login-subtitle">Crie uma nova senha segura para sua conta.</p>

                {message && (
                    <div className="error-message" style={{
                        background: message.includes('sucesso') ? '#dcfce7' : '#fee2e2',
                        color: message.includes('sucesso') ? '#166534' : '#991b1b',
                        borderColor: message.includes('sucesso') ? '#86efac' : '#fca5a5'
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="password">Nova Senha</label>
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
                        <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            className="input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary login-btn"
                        disabled={isSubmitting}
                        style={{ opacity: isSubmitting ? 0.7 : 1 }}
                    >
                        {isSubmitting ? 'Redefinindo...' : 'Redefinir Senha'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
                        <a href="/admin/login" style={{ color: 'var(--slate-500)', textDecoration: 'none' }}>
                            Voltar para Login
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
