import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Login.css'; // Reusing Login styles for consistency

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setMessage('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const response = await fetch('http://localhost:3001/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Senha redefinida com sucesso! Redirecionando...');
                setTimeout(() => navigate('/admin/login'), 3000);
            } else {
                setMessage(data.error || 'Erro ao redefinir senha.');
                setIsSubmitting(false);
            }
        } catch (error) {
            setMessage('Erro de conexão. Tente novamente.');
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
