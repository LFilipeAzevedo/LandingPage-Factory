import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import './Login.css';

const Plans = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [prices, setPrices] = useState(null);
    const [billingInterval, setBillingInterval] = useState('monthly'); // 'monthly' | 'yearly'
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        api.get('/api/payment/price-details')
            .then(res => setPrices(res.data))
            .catch(err => console.error('Error fetching prices:', err));
    }, []);

    useEffect(() => {
        if (searchParams.get('success')) {
            setShowSuccessModal(true);
            window.history.replaceState({}, '', window.location.pathname);
        }
        if (searchParams.get('canceled')) {
            alert('Pagamento cancelado.');
            navigate('/admin/plans', { replace: true });
        }
    }, [searchParams, navigate]);

    const handleSubscribe = async (planTier) => {
        setLoading(true);
        try {
            const response = await api.post('/api/payment/create-checkout-session', {
                planTier,
                interval: billingInterval
            });
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

    // Helper to format price
    const formatPrice = (amount) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
    };

    // Determine current plan
    const currentTier = user?.plan_tier || 'static'; // static, basic, premium

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <header style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>Escolha o Plano Ideal</h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '32px' }}>Desbloqueie todo o potencial do Landing Page Factory.</p>

                    {/* Toggle Switch */}
                    <div style={{ display: 'inline-flex', background: 'transparent', padding: '4px', borderRadius: '9999px', position: 'relative' }}>
                        <button
                            onClick={() => setBillingInterval('monthly')}
                            style={{
                                padding: '8px 24px',
                                borderRadius: '20px',
                                border: 'none',
                                background: billingInterval === 'monthly' ? '#fff' : 'transparent',
                                color: billingInterval === 'monthly' ? '#0f172a' : '#64748b',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: billingInterval === 'monthly' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            Mensal
                        </button>
                        <button
                            onClick={() => setBillingInterval('yearly')}
                            style={{
                                padding: '8px 24px',
                                borderRadius: '20px',
                                border: 'none',
                                background: billingInterval === 'yearly' ? '#fff' : 'transparent',
                                color: billingInterval === 'yearly' ? '#0f172a' : '#64748b',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: billingInterval === 'yearly' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            Anual <span style={{ fontSize: '0.75rem', color: '#16a34a', marginLeft: '4px' }}>(-17%)</span>
                        </button>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', alignItems: 'start' }}>

                    {/* Free Plan (Static) */}
                    <div style={{
                        background: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0',
                        textAlign: 'left', opacity: currentTier !== 'static' ? 0.8 : 1
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#334155' }}>Gratuito</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', margin: '16px 0' }}>R$ 0</div>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>Para testar e começar.</p>
                        <button disabled className="btn" style={{ width: '100%', background: '#f1f5f9', color: '#64748b', border: 'none' }}>
                            {currentTier === 'static' ? 'Seu Plano Atual' : 'Incluído'}
                        </button>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '32px 0', color: '#475569', lineHeight: '2' }}>
                            <li>✅ 1 Landing Page Profissional</li>
                            <li>✅ Editor de Conteúdo Intuitivo</li>
                            <li>❌ Editor Visual (Cores & Fontes)</li>
                        </ul>
                    </div>

                    {/* Basic Plan */}
                    <div style={{
                        background: '#fff', borderRadius: '24px', padding: '32px', border: currentTier === 'basic' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        textAlign: 'left', position: 'relative'
                    }}>
                        {currentTier === 'basic' && <div style={{ position: 'absolute', top: 12, right: 12, background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>ATIVO</div>}
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#334155' }}>Básico</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', margin: '16px 0' }}>
                            {prices?.basic ? formatPrice(prices.basic[billingInterval].amount) : '...'}
                            <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '400' }}>/{billingInterval === 'monthly' ? 'mês' : 'ano'}</span>
                        </div>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>Personalização completa para sua marca.</p>

                        {currentTier === 'basic' ? (
                            <button onClick={handleManage} className="btn" style={{ width: '100%', background: '#fff', border: '1px solid #2563eb', color: '#2563eb' }}>Gerenciar</button>
                        ) : (
                            <button onClick={() => handleSubscribe('basic')} disabled={loading} className="btn" style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none' }}>
                                Assinar Básico
                            </button>
                        )}

                        <ul style={{ listStyle: 'none', padding: 0, margin: '32px 0', color: '#475569', lineHeight: '2' }}>
                            <li>✅ **Personalização de Cores & Fontes**</li>
                            <li>✅ **Logotipo & Foto de Perfil**</li>
                            <li>✅ 1 Landing Page Completa</li>
                            <li>❌ Módulos de Venda (Stripe)</li>
                        </ul>
                    </div>

                    {/* Premium Plan */}
                    <div style={{
                        background: '#1e293b', borderRadius: '24px', padding: '32px', border: '1px solid #334155',
                        textAlign: 'left', color: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        transform: 'scale(1.05)', position: 'relative'
                    }}>
                        {/* Best Value Badge if Yearly */}
                        {billingInterval === 'yearly' && (
                            <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: '#fff', padding: '4px 16px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 'bold' }}>
                                Melhor Valor
                            </div>
                        )}

                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#94a3b8' }}>Premium</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#fff', margin: '16px 0' }}>
                            {prices?.premium ? formatPrice(prices.premium[billingInterval].amount) : '...'}
                            <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '400' }}>/{billingInterval === 'monthly' ? 'mês' : 'ano'}</span>
                        </div>
                        <p style={{ color: '#cbd5e1', marginBottom: '24px' }}>Poder total sem limites.</p>

                        {currentTier === 'premium' ? (
                            <button onClick={handleManage} className="btn" style={{ width: '100%', background: '#fff', color: '#0f172a', border: 'none' }}>Gerenciar Assinatura</button>
                        ) : (
                            <button onClick={() => handleSubscribe('premium')} disabled={loading} className="btn" style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold' }}>
                                Assinar Premium 🚀
                            </button>
                        )}

                        <ul style={{ listStyle: 'none', padding: 0, margin: '32px 0', color: '#cbd5e1', lineHeight: '2' }}>
                            <li>✅ **Módulos de Venda (Checkout Stripe)**</li>
                            <li>✅ **Barra de Aviso (Anúncios)**</li>
                            <li>✅ **Analytics & Logs Detalhados**</li>
                            <li>✅ Tudo do Plano Básico</li>
                        </ul>
                    </div>

                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '40px', maxWidth: '400px', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#16a34a', marginBottom: '8px' }}>Compra Confirmada! 🎉</h2>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>Bem-vindo ao novo nível do seu negócio.</p>
                        <button onClick={() => setShowSuccessModal(false)} style={{ width: '100%', background: '#0f172a', color: '#fff', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>
                            Começar Agora
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Plans;
