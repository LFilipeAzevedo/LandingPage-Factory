import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import './Login.css'; // Reusing some base styles

const Plans = () => {
    const { user, refreshUser } = useAuth(); // Assuming refreshUser exists or we trigger reload
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (searchParams.get('success')) {
            alert('Pagamento realizado com sucesso! Seu plano agora é Premium.');
            // Remove params from URL
            navigate('/admin/plans', { replace: true });
        }
        if (searchParams.get('canceled')) {
            alert('Pagamento cancelado.');
            navigate('/admin/plans', { replace: true });
        }
    }, [searchParams, navigate]);

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const response = await api.post('/api/payment/create-checkout-session');
            if (response.data.url) {
                window.location.href = response.data.url;
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
            const msg = error.response?.data?.error || 'Erro ao iniciar pagamento. Tente novamente.';
            alert(msg);
            setLoading(false);
        }
    };

    const handleManage = async () => {
        setLoading(true);
        try {
            const response = await api.post('/api/payment/create-portal-session');
            if (response.data.url) {
                window.location.href = response.data.url;
            }
        } catch (error) {
            console.error('Error creating portal session:', error);
            alert('Erro ao acessar portal. Tente novamente.');
            setLoading(false);
        }
    };

    const isPremium = user?.plan_tier === 'premium';

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Seus Planos</h1>
                        <p style={{ color: '#64748b' }}>Gerencie sua assinatura e desbloqueie recursos exclusivos.</p>
                    </div>
                    <button onClick={() => navigate('/admin/editor')} className="btn btn-secondary" style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569' }}>
                        Voltar para o Editor
                    </button>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

                    {/* Free Plan */}
                    <div style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '32px',
                        border: isPremium ? '1px solid #e2e8f0' : '2px solid #94a3b8',
                        opacity: isPremium ? 0.7 : 1
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#334155' }}>Plano Gratuito</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', margin: '16px 0' }}>R$ 0<span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '400' }}>/mês</span></div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', color: '#475569', lineHeight: '2' }}>
                            <li>✅ Editor Básico</li>
                            <li>✅ 1 Landing Page</li>
                            <li>❌ Domínio Customizado</li>
                            <li>❌ Remoção de Créditos</li>
                        </ul>
                        {!isPremium && <button disabled className="btn" style={{ width: '100%', background: '#e2e8f0', color: '#64748b', cursor: 'default' }}>Seu Plano Atual</button>}
                    </div>

                    {/* Premium Plan */}
                    <div style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '32px',
                        border: isPremium ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {isPremium && <div style={{ position: 'absolute', top: 0, right: 0, background: '#2563eb', color: '#fff', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderBottomLeftRadius: '8px' }}>ATIVO</div>}

                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#2563eb' }}>Plano Premium</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', margin: '16px 0' }}>R$ 29,90<span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '400' }}>/mês</span></div>
                        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Cobrado anualmente ou R$ 39,90 mensal.</p>

                        <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', color: '#334155', lineHeight: '2' }}>
                            <li>✅ <strong>Editor Completo</strong></li>
                            <li>✅ <strong>Páginas Ilimitadas</strong></li>
                            <li>✅ <strong>Domínio Próprio</strong></li>
                            <li>✅ Suporte Prioritário</li>
                        </ul>

                        {isPremium ? (
                            <button
                                onClick={handleManage}
                                disabled={loading}
                                className="btn"
                                style={{ width: '100%', background: '#fff', border: '1px solid #2563eb', color: '#2563eb' }}
                            >
                                {loading ? 'Carregando...' : 'Gerenciar Assinatura'}
                            </button>
                        ) : (
                            <button
                                onClick={handleSubscribe}
                                disabled={loading}
                                className="btn btn-primary"
                                style={{ width: '100%', background: '#2563eb', color: '#fff' }}
                            >
                                {loading ? 'Redirecionando...' : 'Assinar Agora 🚀'}
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Plans;
