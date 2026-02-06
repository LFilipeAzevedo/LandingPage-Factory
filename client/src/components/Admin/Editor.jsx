import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Editor.css';
import { LogOut, Save, Layout, Type, Image as ImageIcon, TrendingUp, ShoppingBag, CheckCircle, Plus, Trash2, ShieldCheck, Users, Activity, Globe, Search } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ColorPicker from './ColorPicker';

const LockedFeature = ({ title, requiredTier, currentTier, children }) => {
    const hasAccess = currentTier === 'adm_server' || (requiredTier
        ? (currentTier === requiredTier || currentTier === 'premium')
        : currentTier === 'premium');

    if (hasAccess) return children;
    return (
        <div className="locked-feature-container" style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', margin: '0.5rem 0', minHeight: '200px' }}>
            <div style={{ filter: 'blur(16px)', pointerEvents: 'none', opacity: 0.4, height: '100%' }}>
                {children}
            </div>
            <div className="locked-overlay" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                textAlign: 'center',
                padding: '1.5rem',
                zIndex: 10
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    marginBottom: '1rem',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                    border: '2px solid rgba(255,255,255,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <ShieldCheck size={30} color="white" />
                </div>
                <h3 style={{ margin: '0 0 0.4rem 0', color: 'white', fontSize: '1.1rem', fontWeight: 'bold' }}>{title}</h3>
                <p style={{ margin: '0 0 1.2rem 0', fontSize: '0.85rem', maxWidth: '320px', lineHeight: '1.4', color: 'rgba(255,255,255,0.9)' }}>
                    Disponível apenas no <strong style={{ color: '#fbbf24' }}>Plano Ouro</strong>. Faça o upgrade e escale seu negócio.
                </p>
                <button
                    className="btn-upgrade-premium"
                    style={{
                        background: 'linear-gradient(to right, #f59e0b, #fbbf24)',
                        border: 'none',
                        padding: '0.7rem 1.5rem',
                        borderRadius: '30px',
                        color: '#1e293b',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                        transition: 'all 0.2s ease',
                        textTransform: 'uppercase',
                        flexShrink: 0
                    }}
                    onClick={() => window.open('https://sua-url-de-upgrade.com', '_blank')}
                >
                    Quero Ser Premium
                </button>
            </div>
        </div>
    );
};

const Editor = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [content, setContent] = useState(null);
    const [pageSlug, setPageSlug] = useState('home');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const [uploading, setUploading] = useState(false);
    const [stats, setStats] = useState({ total: 0, today: 0, week: 0, daily: [] });
    const [statsRange, setStatsRange] = useState(30); // Default to monthly as requested
    const [activeTab, setActiveTab] = useState('editor'); // 'editor' or 'users'
    const [allUsers, setAllUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modern Interaction State
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null, username: '' });
    const [toasts, setToasts] = useState([]);

    const showToast = (msg, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const isSystemAdmin = user?.plan_tier === 'adm_server';

    useEffect(() => {
        loadContent();
        loadStats();
    }, []);

    useEffect(() => {
        if (isSystemAdmin && activeTab === 'users') {
            loadAllUsers();
        }
    }, [isSystemAdmin, activeTab]);

    const loadAllUsers = async () => {
        try {
            setLoadingUsers(true);
            setMessage('');
            const response = await api.get('/api/admin/users');
            setAllUsers(response.data);
        } catch (error) {
            console.error("Error loading users", error);
            const status = error.response?.status;
            const errorMsg = error.response?.data?.error || error.message || 'Erro desconhecido';
            setMessage(`Erro ${status || ''}: ${errorMsg} (Tier: ${user?.plan_tier})`);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleUpdateUserTier = async (userId, newTier) => {
        try {
            await api.put(`/api/admin/users/${userId}/tier`, { plan_tier: newTier });
            loadAllUsers();
            showToast('Plano do usuário atualizado!');
        } catch (error) {
            console.error("Error updating tier", error);
            showToast('Erro ao atualizar plano.', 'error');
        }
    };

    const handleToggleUserStatus = async (userId, currentStatus) => {
        try {
            await api.put(`/api/admin/users/${userId}/status`, { is_active: !currentStatus });
            loadAllUsers();
            showToast(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
        } catch (error) {
            console.error("Error toggling status", error);
            showToast('Erro ao alterar status.', 'error');
        }
    };

    const handleDeleteUser = async (userId, username) => {
        setConfirmModal({ isOpen: true, userId, username });
    };

    const executeDelete = async () => {
        const { userId, username } = confirmModal;
        setConfirmModal({ isOpen: false, userId: null, username: '' });

        try {
            await api.delete(`/api/admin/users/${userId}`);
            loadAllUsers();
            showToast(`Usuário "${username}" excluído com sucesso.`);
        } catch (error) {
            console.error("Error deleting user", error);
            const errorMsg = error.response?.data?.error || 'Erro ao excluir usuário.';
            showToast(errorMsg, 'error');
        }
    };

    const loadStats = async () => {
        try {
            const response = await api.get('/api/stats');
            setStats(response.data);
        } catch (error) {
            console.error("Error loading stats", error);
        }
    };

    // Derived Data for Dashboard
    const filteredUsers = allUsers.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const userStats = {
        total: allUsers.length,
        active: allUsers.filter(u => u.is_active).length,
        totalVisits: allUsers.reduce((acc, u) => acc + (u.total_visits || 0), 0)
    };

    const loadContent = async () => {
        try {
            const response = await api.get('/api/content/admin/my-page');
            const { slug, content: data } = response.data;
            setPageSlug(slug);

            // Ensure new fields exist
            if (!data.heroImageSettings) data.heroImageSettings = { position: 'center', size: 'cover' };
            if (!data.socials) data.socials = { instagram: '', whatsapp: '' };
            if (!data.navLinks) data.navLinks = [
                { label: 'Sobre nós', url: '#about' },
                { label: 'Eventos', url: '#events' },
                { label: 'Estações', url: '#stations' }
            ];
            if (!data.aboutText) data.aboutText = '';
            if (!data.events) data.events = [];
            if (!data.stations) data.stations = [];

            // Branding & Section Styles defaults
            const defaultStyles = {
                aboutBackground: '#be185d',
                aboutTitleColor: '#1e293b',
                aboutLabelColor: '#ffffff',
                aboutTextColor: '#ffffff',
                eventsBackground: '#0f172a',
                eventsTitleColor: '#ffffff',
                stationsBackground: '#f8fafc',
                stationsTitleColor: '#1e293b'
            };

            if (!data.sectionStyles) {
                data.sectionStyles = defaultStyles;
            } else {
                data.sectionStyles = { ...defaultStyles, ...data.sectionStyles };
            }

            if (!data.logo) data.logo = '';
            if (!data.aboutLabel) data.aboutLabel = 'Conheça sobre você';
            if (!data.aboutTitle) data.aboutTitle = 'Seu Nome';
            if (!data.aboutImage) data.aboutImage = '';
            if (!data.aboutText) data.aboutText = '';

            if (!data.salesSection) data.salesSection = {
                enabled: false,
                title: "Tudo o que você precisa em um só lugar:",
                subtitle: "Aqui dentro você aprende o PLANO COMPLETO: Produzir + Vender + Escalar",
                features: [
                    { text: "7 Receitas Premium" },
                    { text: "7 sabores diferentes" },
                    { text: "Linha ZERO Açúcar / ZERO Lactose / Zero Glúten" },
                    { text: "Técnicas de Casquinha fina (sem rachadura e sem desperdício)" },
                    { text: "Armazenamento correto (pra durar, manter textura e vender com segurança)" },
                    { text: "Embalagens e Fornecedores (pra você não perder dinheiro testando)" }
                ],
                card: {
                    title: "O Curso te dá:",
                    highlights: [
                        "Acesso imediato",
                        "Acesso e suporte para dúvidas de 1 ano",
                        "Aulas gravadas com todo o passo a passo",
                        "PDFs com receitas e materiais",
                        "Lista de Fornecedores e Embalagens",
                        "Bônus: Praliné de Amêndoas e Picolé de Pudim"
                    ],
                    oldPrice: "197,00",
                    currentPrice: "127,00",
                    installmentInfo: "ou em até 12x R$13,42",
                    buttonText: "GARANTIR MINHA VAGA",
                    checkoutUrl: ""
                }
            };
            if (!data.topBar) data.topBar = { enabled: false, text: '🎉 Novidade: Nosso curso premium está com 50% de desconto!', backgroundColor: '#fa4eab', textColor: '#ffffff' };

            setContent(data);
        } catch (error) {
            console.error("Error loading content", error);
            setMessage('Erro ao carregar conteúdo.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        if (!value) return "0,00";
        let v = value.replace(/\D/g, "");
        v = (v / 100).toFixed(2).replace(".", ",");
        v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return v;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setContent(prev => ({ ...prev, [name]: value }));
    };

    const handleFeatureChange = (index, field, value) => {
        const newFeatures = [...content.features];
        newFeatures[index][field] = value;
        setContent(prev => ({ ...prev, features: newFeatures }));
    };

    // Generic Helper for List Updates
    const handleListChange = (listName, index, field, value) => {
        const newList = [...content[listName]];
        newList[index][field] = value;
        setContent(prev => ({ ...prev, [listName]: newList }));
    };

    const addItem = (listName, template) => {
        setContent(prev => ({ ...prev, [listName]: [...prev[listName], template] }));
    };

    const removeItem = (listName, index) => {
        setContent(prev => ({
            ...prev,
            [listName]: prev[listName].filter((_, i) => i !== index)
        }));
    };

    const handleListImageUpload = async (e, listName, index) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setMessage('Enviando imagem...');

        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            const fullUrl = `${window.location.origin}${response.data.url}`;

            // Create an image object to check dimensions
            const img = new Image();
            img.onload = () => {
                const orientation = img.width > img.height ? 'landscape' : 'portrait';

                // Update state with image URL, orientation, and force 'contain' to avoid cropping quality loss
                const newList = [...content[listName]];
                newList[index]['image'] = fullUrl;
                newList[index]['orientation'] = orientation;
                newList[index]['imageFit'] = 'contain'; // User request: "enquadra-las sem perder qualidade"

                setContent(prev => ({ ...prev, [listName]: newList }));
                setMessage(`Imagem enviada! Detectado: ${orientation === 'landscape' ? 'Paisagem' : 'Retrato'} (Ajuste: Mostrar Tudo)`);
            };
            img.src = fullUrl;

        } catch (error) {
            console.error("Error uploading image", error);
            setMessage('Erro ao enviar imagem do item.');
        }
    };

    const handleImageUpload = async (e, field = 'heroImage') => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            const fullUrl = `${window.location.origin}${response.data.url}`;

            // Handle different fields
            if (field === 'heroImage') {
                setContent(prev => ({ ...prev, heroImage: fullUrl }));
            } else if (field === 'logo') {
                setContent(prev => ({ ...prev, logo: fullUrl }));
            } else if (field === 'aboutImage') {
                setContent(prev => ({ ...prev, aboutImage: fullUrl }));
            }

            setMessage('Imagem enviada com sucesso!');
        } catch (error) {
            console.error("Error uploading image", error);
            const errorMsg = error.response?.data?.error || 'Erro ao enviar imagem.';
            setMessage(errorMsg);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            await api.put(`/api/content/${pageSlug}`, content);
            setMessage('Alterações salvas com sucesso!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Erro ao salvar alterações.');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    if (loading) return <div className="loading">Carregando editor...</div>;

    const isPremium = user?.plan_tier === 'premium' || user?.plan_tier === 'adm_server';

    return (
        <div className="editor-layout">
            <aside className="editor-sidebar">
                <div className="sidebar-header">
                    <h2>CMS</h2>
                    <span className="user-badge">{user?.username}</span>
                </div>
                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${activeTab === 'editor' ? 'active' : ''}`}
                        onClick={() => setActiveTab('editor')}
                    >
                        <Layout size={18} /> Landing Page
                    </button>

                    {isSystemAdmin && (
                        <button
                            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveTab('users')}
                        >
                            <TrendingUp size={18} /> Gestão de Usuários
                        </button>
                    )}
                </nav>
                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="btn-logout"><LogOut size={18} /> Sair</button>
                </div>
            </aside>

            <main className="editor-content">
                <header className="editor-header">
                    <h1>{activeTab === 'editor' ? 'Editar Landing Page' : 'Gerenciamento de Usuários'}</h1>
                    <div className="actions">
                        {activeTab === 'editor' && (
                            <>
                                <a href={`/${pageSlug}`} target="_blank" className="btn btn-secondary">Ver Site</a>
                                <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                                    <Save size={18} style={{ marginRight: '8px' }} />
                                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </>
                        )}
                        {activeTab === 'users' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => api.get('/api/admin/ping').then(() => setMessage('Servidor Online! ✅')).catch(e => setMessage('Servidor Offline ❌'))} className="btn" style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#64748b' }}>Check API</button>
                                <button onClick={loadAllUsers} className="btn btn-secondary" disabled={loadingUsers}>
                                    {loadingUsers ? 'Atualizando...' : 'Atualizar Lista'}
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {message && <div className={`message ${message.includes('Erro') || message.includes('falhou') ? 'error' : 'success'}`}>{message}</div>}

                <div className={`editor-form ${activeTab === 'users' ? 'full-width' : ''}`}>
                    {activeTab === 'users' ? (
                        <section className="admin-users-section">
                            {/* Quick Stats Dashboard */}
                            <div className="stats-grid">
                                <div className="stat-card-mini gradient-indigo">
                                    <div className="stat-card-icon">
                                        <Users size={24} />
                                    </div>
                                    <div className="stat-card-info">
                                        <span className="stat-label">Total de Usuários</span>
                                        <span className="stat-value">{userStats.total}</span>
                                    </div>
                                </div>
                                <div className="stat-card-mini gradient-emerald">
                                    <div className="stat-card-icon">
                                        <Activity size={24} />
                                    </div>
                                    <div className="stat-card-info">
                                        <span className="stat-label">Contas Ativas</span>
                                        <span className="stat-value">{userStats.active}</span>
                                    </div>
                                </div>
                                <div className="stat-card-mini gradient-amber">
                                    <div className="stat-card-icon">
                                        <Globe size={24} />
                                    </div>
                                    <div className="stat-card-info">
                                        <span className="stat-label">Tráfego Total</span>
                                        <span className="stat-value">{userStats.totalVisits}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section full-width" style={{ position: 'relative' }}>
                                <div className="admin-section-header">
                                    <div className="header-title">
                                        <h2>Gerenciamento de Usuários</h2>
                                        <p className="subtitle">Visualize e controle todos os acessos do sistema</p>
                                    </div>
                                    <div className="search-wrapper">
                                        <Search size={18} className="search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por usuário ou e-mail..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="search-input-premium"
                                        />
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', color: '#1e293b' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={{ padding: '15px 12px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usuário</th>
                                                <th style={{ padding: '15px 12px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-mail</th>
                                                <th style={{ padding: '15px 12px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plano</th>
                                                <th style={{ padding: '15px 12px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cadastro</th>
                                                <th style={{ padding: '15px 12px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visitas</th>
                                                <th style={{ padding: '15px 12px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                                <th style={{ padding: '15px 12px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map(u => (
                                                <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.username}</td>
                                                    <td style={{ padding: '12px' }}>{u.email}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <select
                                                            value={u.plan_tier}
                                                            onChange={(e) => handleUpdateUserTier(u.id, e.target.value)}
                                                            className="input"
                                                            style={{ padding: '4px', width: 'auto' }}
                                                        >
                                                            <option value="static">Static</option>
                                                            <option value="basic">Basic</option>
                                                            <option value="premium">Premium</option>
                                                            <option value="adm_server">Super Admin</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '0.9rem', color: '#64748b' }}>{u.date_formatted}</td>
                                                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#2563eb' }}>{u.total_visits}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.75rem',
                                                            background: u.is_active ? '#dcfce7' : '#fee2e2',
                                                            color: u.is_active ? '#166534' : '#991b1b'
                                                        }}>
                                                            {u.is_active ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <button
                                                            onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                                                            className="btn action-btn"
                                                            style={{
                                                                padding: '4px 8px',
                                                                fontSize: '0.75rem',
                                                                background: u.is_active ? '#ef4444' : '#22c55e',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                marginRight: '8px'
                                                            }}
                                                        >
                                                            {u.is_active ? 'Desativar' : 'Ativar'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id, u.username)}
                                                            className="btn action-btn"
                                                            title="Excluir Usuário"
                                                            style={{
                                                                padding: '4px 8px',
                                                                fontSize: '0.75rem',
                                                                background: '#f1f5f9',
                                                                color: '#ef4444',
                                                                border: '1px solid #fee2e2',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredUsers.length === 0 && !loadingUsers && (
                                                <tr>
                                                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                                        {searchTerm ? `Nenhum usuário encontrado para "${searchTerm}"` : 'Nenhum usuário encontrado no sistema.'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <>
                            <LockedFeature title="Painel de Métricas Avançadas" currentTier={user?.plan_tier}>
                                <section className="form-section metrics-section" style={{ border: 'none', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: 'white', marginBottom: '2rem' }}>
                                    <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Layout size={18} /> Resumo de Visitas
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px' }}>
                                            <button
                                                onClick={() => setStatsRange(7)}
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: '0.7rem',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    background: statsRange === 7 ? 'rgba(255,255,255,0.2)' : 'transparent',
                                                    color: 'white',
                                                    cursor: 'pointer'
                                                }}
                                            >7d</button>
                                            <button
                                                onClick={() => setStatsRange(30)}
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: '0.7rem',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    background: statsRange === 30 ? 'rgba(255,255,255,0.2)' : 'transparent',
                                                    color: 'white',
                                                    cursor: 'pointer'
                                                }}
                                            >30d</button>
                                        </div>
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '4px' }}>Total de Acessos</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '4px' }}>Últimas 24h</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>{stats.today}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '4px' }}>Últimos 7 dias</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.week}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '4px' }}>Taxa de Conversão</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>0.0% <span style={{ fontSize: '0.6rem', verticalAlign: 'middle', opacity: 0.6 }}>(BETA)</span></div>
                                        </div>
                                    </div>

                                    {/* Chart Area */}
                                    {stats.daily && stats.daily.length > 0 && (
                                        <div style={{ marginTop: '2rem', height: '200px', width: '100%', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                            <h4 style={{ color: 'white', marginTop: 0, marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <TrendingUp size={14} /> Tendência ({statsRange} dias)
                                            </h4>
                                            <ResponsiveContainer width="100%" height="80%">
                                                <AreaChart data={stats.daily.slice(-statsRange)}>
                                                    <defs>
                                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis
                                                        dataKey="date"
                                                        stroke="rgba(255,255,255,0.3)"
                                                        fontSize={10}
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <YAxis hide />
                                                    <Tooltip
                                                        contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '12px' }}
                                                        itemStyle={{ color: '#4ade80' }}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="count"
                                                        stroke="#4ade80"
                                                        fillOpacity={1}
                                                        fill="url(#colorCount)"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {/* Recent Visits Table */}
                                    {stats.recentVisits && stats.recentVisits.length > 0 && (
                                        <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                            <h4 style={{ color: 'white', marginTop: 0, marginBottom: '0.8rem', fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                                                Últimos Acessos
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {stats.recentVisits.map((visit, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.8 }}>
                                                        <span>Visitante na Página</span>
                                                        <span style={{ color: '#4ade80' }}>{visit.time}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </LockedFeature>

                            {/* Global Settings Section (Top Bar) */}
                            <LockedFeature requiredTier="premium" currentTier={user?.plan_tier}>
                                <section className="form-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '8px', color: '#d97706' }}>
                                                <Plus size={20} />
                                            </div>
                                            <h3 style={{ margin: 0 }}>Barra de Aviso (Destaque no Topo)</h3>
                                        </div>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={content.topBar?.enabled}
                                                onChange={(e) => setContent(prev => ({ ...prev, topBar: { ...prev.topBar, enabled: e.target.checked } }))}
                                            />
                                            <span className="slider round"></span>
                                            <span style={{ marginLeft: '45px', fontSize: '0.8rem', fontWeight: 'bold', color: content.topBar?.enabled ? '#d97706' : '#666' }}>
                                                {content.topBar?.enabled ? 'ATIVADA' : 'DESATIVADA'}
                                            </span>
                                        </label>
                                    </div>

                                    {content.topBar?.enabled && (
                                        <div style={{ animation: 'fadeIn 0.3s ease-out', padding: '1rem', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
                                            <div className="form-group">
                                                <label>Texto do Aviso</label>
                                                <input
                                                    value={content.topBar.text}
                                                    onChange={(e) => setContent(prev => ({ ...prev, topBar: { ...prev.topBar, text: e.target.value } }))}
                                                    className="input"
                                                    placeholder="Ex: 🎉 Novidade: Nosso curso premium..."
                                                />
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.8rem' }}>Fundo</label>
                                                    <label style={{ fontSize: '0.8rem' }}>Texto</label>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: '0.75rem' }}>
                                                    <ColorPicker
                                                        label="Fundo"
                                                        color={content.topBar.backgroundColor}
                                                        onChange={(val) => setContent(prev => ({ ...prev, topBar: { ...prev.topBar, backgroundColor: val } }))}
                                                    />
                                                    <ColorPicker
                                                        label="Texto"
                                                        color={content.topBar.textColor}
                                                        onChange={(val) => setContent(prev => ({ ...prev, topBar: { ...prev.topBar, textColor: val } }))}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                backgroundColor: content.topBar.backgroundColor,
                                                color: content.topBar.textColor,
                                                textAlign: 'center',
                                                fontWeight: 'bold',
                                                fontSize: '0.85rem'
                                            }}>
                                                Prévia: {content.topBar.text}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </LockedFeature>

                            <section className="form-section">
                                <h3><Type size={18} /> Hero Section</h3>
                                <div className="form-group">
                                    <label>Título Principal</label>
                                    <input name="heroTitle" value={content.heroTitle} onChange={handleChange} className="input" />
                                </div>
                                <div className="form-group">
                                    <label>Subtítulo</label>
                                    <textarea name="heroSubtitle" value={content.heroSubtitle} onChange={handleChange} className="input textarea" />
                                </div>

                                <div className="form-group">
                                    <label><ImageIcon size={18} /> Imagem de Fundo (Hero)</label>
                                    <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 0.5rem 0' }}>
                                        <strong>Dica:</strong> Para fundo de tela cheia, use imagens horizontais de <strong>ALTA RESOLUÇÃO</strong>.<br />
                                        • Recomendado: <strong>1920x1080 px</strong> (Evite resoluções baixas como 512px)<br />
                                        <a href="https://www.birme.net/?width=1920&height=1080" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', marginTop: '2px', display: 'inline-block', fontSize: '0.75rem' }}>
                                            ➜ Ajustar e Enquadrar no BIRME (Mantenha 1920 de largura)
                                        </a>
                                    </p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, 'heroImage')}
                                        className="input"
                                        disabled={uploading}
                                    />
                                    {uploading && <p style={{ fontSize: '0.9rem', color: 'var(--primary-600)' }}>Enviando imagem...</p>}

                                    {content.heroImage && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>Prévia:</p>
                                            <img src={content.heroImage} alt="Preview" className="image-preview"
                                                style={{
                                                    objectPosition: 'center',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                                    Ajuste manual não é mais necessário com o uso do <strong>BIRME</strong>.
                                </div>
                            </section>

                            <LockedFeature title="Personalização Visual" currentTier={user?.plan_tier}>
                                <section className="form-section">
                                    <h3><ImageIcon size={18} /> Identidade Visual</h3>

                                    {/* Logo Upload */}
                                    <div className="form-group">
                                        <label>Logo da Empresa</label>
                                        <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 0.5rem 0' }}>
                                            <strong>Dica:</strong> Use imagens com fundo transparente (PNG) para um melhor acabamento.<br />
                                            • Recomendado: altura de <strong>80px a 120px</strong><br />
                                            <a href="https://www.birme.net/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', marginTop: '2px', display: 'inline-block', fontSize: '0.75rem' }}>
                                                ➜ Ajustar Logo no BIRME
                                            </a>
                                        </p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'logo')}
                                            className="input"
                                            disabled={uploading}
                                        />
                                        {content.logo && (
                                            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#ccc', borderRadius: '4px', display: 'inline-block' }}>
                                                <img src={content.logo} alt="Logo Preview" style={{ height: '40px', display: 'block' }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Color Pickers & Preview */}
                                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                        {/* Generic Helper Component for Style Group */}
                                        {['About', 'Events', 'Stations', 'Sales', 'SalesCard', 'Footer'].map((section) => {
                                            const lower = section.toLowerCase();
                                            const bgKey = (section === 'SalesCard') ? 'salesCardBackground' : `${lower}Background`;
                                            const titleKey = (section === 'SalesCard') ? 'salesCardTextColor' : `${lower}TitleColor`;
                                            const iconKey = (section === 'Sales') ? 'salesIconColor' : (section === 'SalesCard' ? 'salesCardIconColor' : null);

                                            // Default colors based on section name
                                            const defaultBG = (section === 'Footer' || section === 'Events') ? '#0f172a' : (section === 'SalesCard' ? '#fa4eab' : '#ffffff');
                                            const defaultText = (section === 'Footer' || section === 'Events' || section === 'SalesCard') ? '#ffffff' : '#1f2937';
                                            const defaultIcon = (section === 'Sales') ? '#fa4eab' : '#ffd43b';

                                            const bgVal = content.sectionStyles?.[bgKey] || defaultBG;
                                            const titleVal = content.sectionStyles?.[titleKey] || defaultText;
                                            const iconVal = iconKey ? (content.sectionStyles?.[iconKey] || defaultIcon) : null;

                                            return (
                                                <div key={section} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <h4 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                                                        Seção "{section === 'About' ? 'Seção Mentora' : section === 'Events' ? 'Eventos' : section === 'Stations' ? 'Estações' : section === 'Sales' ? 'Vendas' : section === 'SalesCard' ? 'Capa do Card' : 'Rodapé'}"
                                                    </h4>

                                                    <div style={{ marginBottom: '1rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                            <label style={{ fontSize: '0.8rem' }}>Fundo</label>
                                                            <label style={{ fontSize: '0.8rem' }}>Texto (Geral)</label>
                                                            {iconKey && <label style={{ fontSize: '0.8rem' }}>Ícones</label>}
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: '0.75rem' }}>
                                                            <ColorPicker
                                                                label="Fundo"
                                                                color={bgVal}
                                                                onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, [bgKey]: val } }))}
                                                            />
                                                            <ColorPicker
                                                                label="Texto"
                                                                color={titleVal}
                                                                onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, [titleKey]: val } }))}
                                                            />
                                                            {section === 'About' && (
                                                                <>
                                                                    <ColorPicker
                                                                        label="Rótulo"
                                                                        color={content.sectionStyles.aboutLabelColor || '#ffffff'}
                                                                        onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, aboutLabelColor: val } }))}
                                                                    />
                                                                    <ColorPicker
                                                                        label="Cor Texto"
                                                                        color={content.sectionStyles.aboutTextColor || '#ffffff'}
                                                                        onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, aboutTextColor: val } }))}
                                                                    />
                                                                </>
                                                            )}
                                                            {iconKey && (
                                                                <ColorPicker
                                                                    label="Ícones"
                                                                    color={iconVal}
                                                                    onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, [iconKey]: val } }))}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Live Preview Box */}
                                                    <div style={{
                                                        backgroundColor: bgVal,
                                                        padding: '1rem',
                                                        borderRadius: '4px',
                                                        border: '1px solid #ccc',
                                                        textAlign: 'center',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        <span style={{
                                                            color: titleVal,
                                                            fontSize: '1rem',
                                                            fontWeight: 'bold',
                                                            display: 'block'
                                                        }}>
                                                            {section === 'Footer' ? 'Texto do Footer' : 'Título Exemplo'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            </LockedFeature>

                            {/* Sales Section (Courses/Ebooks) */}
                            <LockedFeature requiredTier="premium" currentTier={user?.plan_tier}>
                                <section className="form-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ background: '#fce7f3', padding: '8px', borderRadius: '8px', color: '#db2777' }}>
                                                <ShoppingBag size={20} />
                                            </div>
                                            <h3 style={{ margin: 0 }}>Vendas (Cursos, E-books, Infoprodutos)</h3>
                                        </div>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={content.salesSection?.enabled}
                                                onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, enabled: e.target.checked } }))}
                                            />
                                            <span className="slider round"></span>
                                            <span style={{ marginLeft: '45px', fontSize: '0.8rem', fontWeight: 'bold', color: content.salesSection?.enabled ? '#db2777' : '#666' }}>
                                                {content.salesSection?.enabled ? 'ATIVADA' : 'DESATIVADA'}
                                            </span>
                                        </label>
                                    </div>

                                    {content.salesSection?.enabled && (
                                        <div style={{ animation: 'fadeIn 0.3s ease-out', padding: '1rem', background: '#fff5f8', borderRadius: '12px', border: '1px solid #fbcfe8' }}>
                                            <div className="form-group">
                                                <label>Título Chamativo (Esquerda)</label>
                                                <input
                                                    value={content.salesSection.title}
                                                    onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, title: e.target.value } }))}
                                                    className="input"
                                                    placeholder="Ex: Tudo o que você precisa em um só lugar:"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Subtítulo de Apoio</label>
                                                <textarea
                                                    value={content.salesSection.subtitle}
                                                    onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, subtitle: e.target.value } }))}
                                                    className="input textarea"
                                                    placeholder="Descreva o que seu aluno irá aprender..."
                                                    style={{ height: '80px', overflow: 'hidden' }}
                                                />
                                            </div>

                                            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.8rem', color: '#64748b' }}>
                                                    <Plus size={14} /> Benefícios / Diferenciais
                                                </label>
                                                {content.salesSection.features.map((feature, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                        <input
                                                            value={feature.text}
                                                            onChange={(e) => {
                                                                const newFeatures = [...content.salesSection.features];
                                                                newFeatures[idx].text = e.target.value;
                                                                setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, features: newFeatures } }));
                                                            }}
                                                            className="input"
                                                            placeholder="Ex: 7 Receitas Premium"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newFeatures = content.salesSection.features.filter((_, i) => i !== idx);
                                                                setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, features: newFeatures } }));
                                                            }}
                                                            style={{ padding: '0 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, features: [...prev.salesSection.features, { text: '' }] } }))}
                                                    className="btn-secondary"
                                                    style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                                                >+ Adicionar Diferencial</button>
                                            </div>

                                            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                                <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <ShoppingBag size={18} /> Configurações do Card de Preço
                                                </h4>

                                                <div className="form-group">
                                                    <label>Chamada do Card (Ex: O Curso te dá:)</label>
                                                    <input
                                                        value={content.salesSection.card.title}
                                                        onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, title: e.target.value } } }))}
                                                        className="input"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                                        <CheckCircle size={14} /> Itens de Confirmação (Checklist)
                                                    </label>
                                                    {content.salesSection.card.highlights.map((h, idx) => (
                                                        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                            <input
                                                                value={h}
                                                                onChange={(e) => {
                                                                    const newH = [...content.salesSection.card.highlights];
                                                                    newH[idx] = e.target.value;
                                                                    setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, highlights: newH } } }));
                                                                }}
                                                                className="input"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const newH = content.salesSection.card.highlights.filter((_, i) => i !== idx);
                                                                    setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, highlights: newH } } }));
                                                                }}
                                                                style={{ padding: '0 10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                            >X</button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, highlights: [...prev.salesSection.card.highlights, ''] } } }))}
                                                        style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer' }}
                                                    >+ Adicionar Item ao Checklist</button>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                                    <div className="form-group">
                                                        <label>Preço "DE" (R$)</label>
                                                        <input
                                                            value={content.salesSection.card.oldPrice}
                                                            onChange={(e) => {
                                                                const masked = formatCurrency(e.target.value);
                                                                setContent(prev => ({
                                                                    ...prev,
                                                                    salesSection: {
                                                                        ...prev.salesSection,
                                                                        card: { ...prev.salesSection.card, oldPrice: masked }
                                                                    }
                                                                }));
                                                            }}
                                                            className="input"
                                                            placeholder="00,00"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Preço "POR" (R$)</label>
                                                        <input
                                                            value={content.salesSection.card.currentPrice}
                                                            onChange={(e) => {
                                                                const masked = formatCurrency(e.target.value);
                                                                setContent(prev => ({
                                                                    ...prev,
                                                                    salesSection: {
                                                                        ...prev.salesSection,
                                                                        card: { ...prev.salesSection.card, currentPrice: masked }
                                                                    }
                                                                }));
                                                            }}
                                                            className="input"
                                                            placeholder="00,00"
                                                            style={{ fontWeight: 'bold' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label>Texto de Parcelas </label>
                                                    <input
                                                        value={content.salesSection.card.installmentInfo}
                                                        onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, installmentInfo: e.target.value } } }))}
                                                        className="input"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label>Texto do Botão de Compra</label>
                                                    <input
                                                        value={content.salesSection.card.buttonText}
                                                        onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, buttonText: e.target.value } } }))}
                                                        className="input"
                                                        style={{ background: '#ecfdf5', borderColor: '#6ee7b7' }}
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label>⚠️ Link da Página de Pagamento (Hotmart, Kiwify, etc)</label>
                                                    <input
                                                        value={content.salesSection.card.checkoutUrl}
                                                        onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, checkoutUrl: e.target.value } } }))}
                                                        className="input"
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </LockedFeature>

                            <section className="form-section">
                                <h3>Menu Superior (Links)</h3>
                                {content.navLinks.map((link, index) => (
                                    <div key={index} className="form-group" style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #eee' }}>
                                        <label>{link.label}</label>
                                        <input
                                            value={link.url}
                                            placeholder="URL (ex: https://... ou #secao)"
                                            onChange={(e) => {
                                                const newLinks = [...content.navLinks];
                                                newLinks[index].url = e.target.value;
                                                setContent(prev => ({ ...prev, navLinks: newLinks }));
                                            }}
                                            className="input"
                                        />
                                    </div>
                                ))}
                            </section>

                            <LockedFeature title="Seção Mentora" currentTier={user?.plan_tier}>
                                <section className="form-section">
                                    <h3><Type size={18} /> Sobre Você</h3>
                                    <div className="form-group">
                                        <label>Rótulo Superior</label>
                                        <input
                                            name="aboutLabel"
                                            value={content.aboutLabel}
                                            onChange={handleChange}
                                            className="input"
                                            placeholder="Conheça sobre você"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Nome / Título </label>
                                        <input
                                            name="aboutTitle"
                                            value={content.aboutTitle}
                                            onChange={handleChange}
                                            className="input"
                                            placeholder="Seu Nome"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Sua História / Descrição</label>
                                        <textarea
                                            name="aboutText"
                                            value={content.aboutText}
                                            onChange={handleChange}
                                            className="input textarea"
                                            style={{ height: '150px' }}
                                            placeholder="Conte sua trajetória..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label><ImageIcon size={18} /> Foto</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'aboutImage')}
                                            className="input"
                                        />
                                        {content.aboutImage && (
                                            <div style={{ marginTop: '1rem' }}>
                                                <img src={content.aboutImage} alt="Mentor Preview" className="image-preview" style={{ height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </LockedFeature>

                            <section className="form-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div>
                                        <h3>Eventos (Carrossel)</h3>
                                        <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
                                            <strong>Dica:</strong> Para melhor qualidade e enquadramento total, redimensione suas fotos antes de enviar.<br />
                                            • Paisagem: <strong>600x400 px</strong><br />
                                            • Retrato: <strong>300x400 px</strong><br />
                                            <a href="https://www.birme.net/?width=600&height=400" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', marginTop: '4px', display: 'inline-block', fontSize: '0.75rem' }}>
                                                ➜ Ajustar e Enquadrar no BIRME (Sem deformar)
                                            </a>
                                        </p>
                                    </div>
                                    <button onClick={() => addItem('events', { image: '', description: '', imageFit: 'contain' })} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                                        + Adicionar Evento
                                    </button>
                                </div>
                                <div className="features-grid">
                                    {content.events && content.events.map((event, index) => (
                                        <div key={index} className="feature-card-edit">
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <h4>Evento {index + 1}</h4>
                                                <button onClick={() => removeItem('events', index)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Remover</button>
                                            </div>
                                            <div className="form-group">
                                                <label>Imagem</label>
                                                <input type="file" accept="image/*" onChange={(e) => handleListImageUpload(e, 'events', index)} className="input" />
                                                {event.image && (
                                                    <div style={{ marginTop: '0.5rem' }}>
                                                        <img
                                                            src={event.image}
                                                            alt="Preview"
                                                            className="image-preview"
                                                            style={{
                                                                height: '100px',
                                                                objectFit: 'contain',
                                                                objectPosition: 'center'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '4px', fontSize: '0.75rem', color: '#64748b', border: '1px dashed #cbd5e1', textAlign: 'center', marginBottom: '1rem' }}>
                                                Enquadramento manual removido. Use o link do <strong>BIRME</strong> acima para preparar a imagem.
                                            </div>
                                            <div className="form-group">
                                                <label>Descrição Curta</label>
                                                <textarea
                                                    value={event.description}
                                                    onChange={(e) => handleListChange('events', index, 'description', e.target.value)}
                                                    className="input textarea-sm"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="form-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div>
                                        <h3>Estações</h3>
                                        <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
                                            <strong>Dica:</strong> Para melhor qualidade e enquadramento total, redimensione suas fotos antes de enviar.<br />
                                            • Paisagem: <strong>600x400 px</strong><br />
                                            • Retrato: <strong>300x400 px</strong><br />
                                            <a href="https://www.birme.net/?width=600&height=400" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', marginTop: '4px', display: 'inline-block', fontSize: '0.75rem' }}>
                                                ➜ Ajustar e Enquadrar no BIRME (Sem deformar)
                                            </a>
                                        </p>
                                    </div>
                                    <button onClick={() => addItem('stations', { image: '', title: '', description: '', imageFit: 'contain' })} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                                        + Adicionar Estação
                                    </button>
                                </div>
                                <div className="features-grid">
                                    {content.stations && content.stations.map((station, index) => (
                                        <div key={index} className="feature-card-edit">
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <h4>Estação {index + 1}</h4>
                                                <button onClick={() => removeItem('stations', index)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Remover</button>
                                            </div>
                                            <div className="form-group">
                                                <label>Imagem</label>
                                                <input type="file" accept="image/*" onChange={(e) => handleListImageUpload(e, 'stations', index)} className="input" />
                                                {station.image && (
                                                    <div style={{ marginTop: '0.5rem' }}>
                                                        <img
                                                            src={station.image}
                                                            alt="Preview"
                                                            className="image-preview"
                                                            style={{
                                                                height: '100px',
                                                                objectFit: 'contain',
                                                                objectPosition: 'center'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '4px', fontSize: '0.75rem', color: '#64748b', border: '1px dashed #cbd5e1', textAlign: 'center', marginBottom: '1rem' }}>
                                                Enquadramento manual removido. Use o link do <strong>BIRME</strong> acima para preparar a imagem.
                                            </div>
                                            <div className="form-group">
                                                <label>Título</label>
                                                <input
                                                    value={station.title}
                                                    onChange={(e) => handleListChange('stations', index, 'title', e.target.value)}
                                                    className="input"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Descrição</label>
                                                <textarea
                                                    value={station.description}
                                                    onChange={(e) => handleListChange('stations', index, 'description', e.target.value)}
                                                    className="input textarea-sm"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="form-section">
                                <h3>Rodapé & Redes Sociais</h3>
                                <div className="form-group">
                                    <label>Texto do Footer</label>
                                    <input name="footerText" value={content.footerText} onChange={handleChange} className="input" />
                                </div>
                                <div className="form-group">
                                    <label>Instagram (URL)</label>
                                    <input
                                        value={content.socials.instagram}
                                        onChange={(e) => setContent(prev => ({ ...prev, socials: { ...prev.socials, instagram: e.target.value } }))}
                                        className="input"
                                        placeholder="https://instagram.com/..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Contato (WhatsApp)</label>
                                    <input
                                        value={content.socials.whatsapp}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
                                            if (val.length > 11) val = val.slice(0, 11); // Limit length

                                            // Apply mask (XX) XXXXX-XXXX
                                            if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                                            if (val.length > 7) val = `${val.slice(0, 9)}-${val.slice(9)}`;

                                            setContent(prev => ({ ...prev, socials: { ...prev.socials, whatsapp: val } }))
                                        }}
                                        className="input"
                                        placeholder="(XX) XXXXX-XXXX"
                                    />
                                </div>
                            </section>
                        </>
                    )}
                </div >
            </main >
            {/* UI Modals & Toasts */}
            {
                confirmModal.isOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Confirmar Exclusão</h3>
                            <p>TEM CERTEZA? Isso excluirá permanentemente a conta de <strong>"{confirmModal.username}"</strong> e TODAS as suas páginas. Esta ação não pode ser desfeita.</p>
                            <div className="modal-actions">
                                <button onClick={() => setConfirmModal({ isOpen: false, userId: null, username: '' })} className="btn btn-secondary">Cancelar</button>
                                <button onClick={executeDelete} className="btn" style={{ background: '#ef4444', color: 'white', border: 'none' }}>Sim, Excluir</button>
                            </div>
                        </div>
                    </div>
                )
            }

            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast ${toast.type}`}>
                        {toast.type === 'success' ? <CheckCircle size={20} color="var(--success)" /> : <ShieldCheck size={20} color="var(--error)" />}
                        <span>{toast.msg}</span>
                    </div>
                ))}
            </div>
        </div >
    );
};

export default Editor;
