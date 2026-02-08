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

    const [priceData, setPriceData] = useState(null);

    useEffect(() => {
        // Fetch price from backend (connected to Stripe)
        api.get('/api/payment/price-details')
            .then(res => setPriceData(res.data))
            .catch(err => console.error('Error fetching price:', err));
    }, []);

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        if (searchParams.get('success')) {
            setShowSuccessModal(true);
            // Remove params from URL but keep the modal open
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
        if (searchParams.get('canceled')) {
            alert('Pagamento cancelado.'); // Keep simple alert for cancel or upgrade later
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

    // Format currency
    const formattedPrice = priceData
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: priceData.currency || 'BRL' }).format(priceData.amount)
        : 'R$ ...';

    const intervalMap = { month: 'mês', year: 'ano' };
    const interval = priceData?.interval ? intervalMap[priceData.interval] || 'mês' : 'mês';

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
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', margin: '16px 0' }}>R$ 0<span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '400' }}>/{interval}</span></div>
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
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', margin: '16px 0' }}>{formattedPrice}<span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '400' }}>/{interval}</span></div>
                        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Cobrança recorrente. Cancele quando quiser.</p>

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

            {/* Success Modal */}
            {showSuccessModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '24px', padding: '40px', width: '90%', maxWidth: '400px',
                        textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{
                            width: '80px', height: '80px', background: '#dcfce7', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto'
                        }}>
                            <svg className="w-12 h-12 text-green-600" fill="none" stroke="#16a34a" viewBox="0 0 24 24" style={{ width: '48px', height: '48px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Pagamento Aprovado!</h2>
                        <p style={{ color: '#64748b', marginBottom: '16px' }}>Agora você faz parte do time Premium. Aproveite todos os recursos desbloqueados.</p>
                        <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '32px', background: '#fee2e2', padding: '8px', borderRadius: '8px' }}>
                            <strong>Nota:</strong> Se o status não mudar imediatamente, tente sair e entrar novamente na sua conta.
                        </p>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            style={{
                                width: '100%', background: '#16a34a', color: '#fff', padding: '12px', borderRadius: '12px',
                                fontWeight: '600', border: 'none', cursor: 'pointer', fontSize: '1rem'
                            }}
                        >
                            Começar Agora
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Plans;
