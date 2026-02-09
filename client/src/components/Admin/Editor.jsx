import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Editor.css';
import { LogOut, Save, Layout, Type, Image as ImageIcon, TrendingUp, ShoppingBag, CheckCircle, Plus, Trash2, ShieldCheck, Users, Activity, Globe, Search, Layers, List, CreditCard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ColorPicker from './ColorPicker';
import RichTextEditor from './RichTextEditor';
import FontSelector from './FontSelector';

const LockedFeature = ({ title, requiredTier, currentTier, children }) => {
    const navigate = useNavigate();
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
                    onClick={() => navigate('/admin/plans')}
                >
                    Quero Ser Premium
                </button>
            </div>
        </div>
    );
};

const Editor = () => {
    const { logout, user } = useAuth();
    const userTier = user?.plan_tier || 'basic'; // Fix: Define userTier
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
    const [activeSection, setActiveSection] = useState('summary'); // 'summary', 'hero', 'about', 'events', 'stations', 'sales', 'custom', 'footer'

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

    const calculateMonthlyStats = (dailyData) => {
        if (!dailyData) return 0;
        return dailyData.slice(-30).reduce((acc, curr) => acc + (curr.visits || 0), 0);
    };

    const getChartData = (dailyData, days) => {
        if (!dailyData) return [];
        return dailyData.slice(-days);
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
            if (!data.eventsTitle) data.eventsTitle = 'Nossos Eventos';
            if (!data.stationsTitle) data.stationsTitle = 'Nossas Estações';
            if (!data.customSections) data.customSections = [];

            // Branding & Section Styles defaults
            const defaultStyles = {
                aboutBackground: '#f8fafc',
                aboutTitleColor: '#0f172a',
                aboutLabelColor: '#64748b',
                aboutTextColor: '#334155',
                eventsBackground: '#f8fafc',
                eventsTitleColor: '#0f172a',
                stationsBackground: '#f8fafc',
                stationsTitleColor: '#0f172a',
                salesIconColor: '#0f172a',
                salesCardBackground: '#ffffff',
                salesCardTextColor: '#0f172a'
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

            // Ensure salesSection structure
            const defaultSalesSection = {
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

            if (!data.salesSection) {
                data.salesSection = defaultSalesSection;
            } else {
                // Deep merge/ensure nested properties exist for existing partial data
                if (!data.salesSection.features) data.salesSection.features = defaultSalesSection.features;
                if (!data.salesSection.card) data.salesSection.card = defaultSalesSection.card;
                else {
                    // Ensure card properties
                    if (!data.salesSection.card.highlights) data.salesSection.card.highlights = defaultSalesSection.card.highlights;
                    if (!data.salesSection.card.title) data.salesSection.card.title = defaultSalesSection.card.title;
                    if (!data.salesSection.card.buttonText) data.salesSection.card.buttonText = defaultSalesSection.card.buttonText;
                    if (!data.salesSection.card.checkoutUrl) data.salesSection.card.checkoutUrl = '';
                }
            }

            // Ensure customSections have items array
            if (data.customSections) {
                data.customSections = data.customSections.map(s => ({
                    ...s,
                    items: s.items || []
                }));
            }
            if (!data.topBar) data.topBar = { enabled: false, text: '🎉 Novidade: Nosso curso premium está com 50% de desconto!', backgroundColor: '#0f172a', textColor: '#ffffff' };

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
        setContent(prev => {
            const newFeatures = [...(prev.features || [])];
            newFeatures[index] = { ...newFeatures[index], [field]: value };
            return { ...prev, features: newFeatures };
        });
    };

    // Generic Helper for List Updates
    const handleListChange = (listName, index, field, value) => {
        setContent(prev => {
            const newList = [...(prev[listName] || [])];
            newList[index] = { ...newList[index], [field]: value };
            return { ...prev, [listName]: newList };
        });
    };

    // --- CUSTOM SECTIONS LOGIC ---
    const addCustomSection = (type) => {
        const id = `section_${Date.now()}`;
        let defaultValue = {
            id,
            type,
            title: 'Nova Seção',
            navLabel: 'Novo Link',
            enabled: true,
            font: "'Inter', sans-serif",
            backgroundColor: '#ffffff',
            titleColor: '#1e293b',
            textColor: '#475569'
        };

        if (type === 'text') {
            defaultValue = { ...defaultValue, content: 'Escreva aqui seu conteúdo rico...', navLabel: 'Texto' };
        } else if (type === 'venda') {
            defaultValue = {
                ...defaultValue,
                navLabel: 'Venda',
                subtitle: 'Subtítulo da venda',
                features: [{ text: 'Recurso 1' }],
                card: { title: 'O que você leva', currentPrice: '97,00', buttonText: 'Comprar Agora', highlights: ['Acesso Imediato'] }
            };
        } else if (type === 'galeria') {
            defaultValue = { ...defaultValue, navLabel: 'Galeria', items: [] };
        } else if (type === 'grade') {
            defaultValue = { ...defaultValue, navLabel: 'Destaques', items: [] };
        }

        setContent(prev => {
            const newSections = [...(prev.customSections || []), defaultValue];
            const newNavLinks = [...(prev.navLinks || []), { label: defaultValue.navLabel, url: `#${id}` }];
            return {
                ...prev,
                customSections: newSections,
                navLinks: newNavLinks
            };
        });
    };

    const removeCustomSection = (id) => {
        setContent(prev => {
            const newSections = (prev.customSections || []).filter(s => s.id !== id);
            const newNavLinks = (prev.navLinks || []).filter(l => l.url !== `#${id}`);
            return {
                ...prev,
                customSections: newSections,
                navLinks: newNavLinks
            };
        });
    };

    const updateCustomSection = (id, field, value) => {
        setContent(prev => {
            const newSections = (prev.customSections || []).map(s => {
                if (s.id === id) {
                    return { ...s, [field]: value };
                }
                return s;
            });

            let newNavLinks = prev.navLinks;
            if (field === 'navLabel') {
                newNavLinks = (prev.navLinks || []).map(l => {
                    if (l.url === `#${id}`) return { ...l, label: value };
                    return l;
                });
            }

            return {
                ...prev,
                customSections: newSections,
                navLinks: newNavLinks
            };
        });
    };

    const handleCustomListChange = (sectionId, index, field, value) => {
        setContent(prev => {
            const newSections = (prev.customSections || []).map(s => {
                if (s.id === sectionId) {
                    const newList = [...(s.items || [])];
                    newList[index] = { ...newList[index], [field]: value };
                    return { ...s, items: newList };
                }
                return s;
            });
            return { ...prev, customSections: newSections };
        });
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

    const handleCustomSectionImageUpload = async (e, sectionId) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        setMessage('Enviando imagem...');

        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
            });
            const fullUrl = `${api.defaults.baseURL}${response.data.url}`;

            // Create an image object to check dimensions
            const img = new Image();
            img.onload = () => {
                const orientation = img.width > img.height ? 'landscape' : 'portrait';

                setContent(prev => {
                    const newSections = prev.customSections.map(s => {
                        if (s.id === sectionId) {
                            return {
                                ...s,
                                imageFit: s.imageFit || 'cover',
                                items: [...(s.items || []), {
                                    src: fullUrl,
                                    id: Date.now(),
                                    orientation,
                                    posX: 50,
                                    posY: 50
                                }]
                            };
                        }
                        return s;
                    });
                    return { ...prev, customSections: newSections };
                });
                setMessage(`Imagem adicionada! (${orientation === 'landscape' ? 'Paisagem' : 'Retrato'})`);
            };
            img.src = fullUrl;
        } catch (error) {
            console.error(error);
            setMessage('Erro ao enviar imagem.');
        }
    };

    const handleCustomGradeImageUpload = async (e, sectionId, index) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        setMessage('Enviando imagem...');

        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
            });
            const fullUrl = `${api.defaults.baseURL}${response.data.url}`;

            const img = new Image();
            img.onload = () => {
                const orientation = img.width > img.height ? 'landscape' : 'portrait';
                setContent(prev => {
                    const newSections = prev.customSections.map(s => {
                        if (s.id === sectionId) {
                            const newItems = [...(s.items || [])];
                            newItems[index] = { ...newItems[index], image: fullUrl, orientation };
                            return { ...s, items: newItems };
                        }
                        return s;
                    });
                    return { ...prev, customSections: newSections };
                });
                setMessage(`Imagem enviada! Detectado: ${orientation === 'landscape' ? 'Paisagem' : 'Retrato'}`);
            };
            img.src = fullUrl;
        } catch (error) {
            console.error(error);
            setMessage('Erro ao enviar imagem.');
        }
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
            const fullUrl = `${api.defaults.baseURL}${response.data.url}`;

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

            const fullUrl = `${api.defaults.baseURL}${response.data.url}`;

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
    if (!content) return <div className="error-message" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Erro ao carregar dados do editor. Por favor, recarregue a página.</div>;

    const isPremium = user?.plan_tier === 'premium' || user?.plan_tier === 'adm_server';

    return (
        <div className="editor-layout">
            <aside className="editor-sidebar">
                <div className="sidebar-header">
                    <h2>CMS</h2>
                    <span className="user-badge">{user?.username}</span>
                </div>
                <nav className="sidebar-nav">
                    {/* Landing Page Group */}
                    <div className="nav-group">
                        <div className="nav-group-header">
                            <Layout size={18} />
                            <span>Landing Page</span>
                        </div>
                        <div className="nav-subitems">
                            <button
                                className={`nav-item ${activeTab === 'editor' && activeSection === 'summary' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('editor'); setActiveSection('summary'); }}
                            >
                                <Activity size={16} /> Resumo
                            </button>
                            <button
                                className={`nav-item ${activeTab === 'editor' && activeSection === 'hero' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('editor'); setActiveSection('hero'); }}
                            >
                                <Globe size={16} /> Tela Inicial
                            </button>
                            <button
                                className={`nav-item ${activeTab === 'editor' && activeSection === 'events' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('editor'); setActiveSection('events'); }}
                            >
                                <CheckCircle size={16} /> Cases
                            </button>
                            <button
                                className={`nav-item ${activeTab === 'editor' && activeSection === 'stations' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('editor'); setActiveSection('stations'); }}
                            >
                                <Layers size={16} /> Serviços
                            </button>
                            <button
                                className={`nav-item ${activeTab === 'editor' && activeSection === 'about' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('editor'); setActiveSection('about'); }}
                            >
                                <Users size={16} /> Sobre Você
                            </button>
                            <button
                                className={`nav-item ${activeTab === 'editor' && activeSection === 'sales' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('editor'); setActiveSection('sales'); }}
                            >
                                <ShoppingBag size={16} /> Cursos / Venda
                            </button>
                            <button
                                className={`nav-item ${activeTab === 'editor' && activeSection === 'custom' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('editor'); setActiveSection('custom'); }}
                            >
                                <Plus size={16} /> Módulos Extras
                            </button>
                            <button
                                className={`nav-item ${activeTab === 'editor' && activeSection === 'footer' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('editor'); setActiveSection('footer'); }}
                            >
                                <List size={16} /> Rodapé
                            </button>
                        </div>
                    </div>

                    <div className="nav-group" style={{ marginTop: '1rem' }}>
                        <div className="nav-group-header">
                            <CreditCard size={18} />
                            <span>Conta</span>
                        </div>
                        <div className="nav-subitems">
                            <button
                                className="nav-item"
                                onClick={() => navigate('/admin/plans')}
                            >
                                <ShieldCheck size={16} /> Meu Plano ({user?.plan_tier === 'premium' ? 'Premium' : 'Gratuito'})
                            </button>
                        </div>
                    </div>

                    {isSystemAdmin && (
                        <div className="nav-group" style={{ marginTop: '1rem' }}>
                            <div className="nav-group-header">
                                <TrendingUp size={18} />
                                <span>Administração</span>
                            </div>
                            <div className="nav-subitems">
                                <button
                                    className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('users')}
                                >
                                    <Users size={16} /> Gestão de Usuários
                                </button>
                            </div>
                        </div>
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
                    {activeTab === 'editor' ? (
                        <>
                            {activeSection === 'summary' && (
                                <LockedFeature requiredTier="premium" currentTier={user?.plan_tier} title="Dashboard de Performance">
                                    <div className="dashboard-container" style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                            <div>
                                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.2rem' }}>Dashboard de Performance</h2>
                                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Acompanhe o crescimento da sua Landing Page.</p>
                                            </div>
                                            <div className="stats-toggle" style={{ background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                                                <button
                                                    className={`toggle-btn ${statsRange === 7 ? 'active' : ''}`}
                                                    onClick={() => setStatsRange(7)}
                                                    style={{ padding: '6px 12px', border: 'none', background: statsRange === 7 ? '#fff' : 'transparent', borderRadius: '6px', cursor: 'pointer', fontWeight: statsRange === 7 ? 'bold' : 'normal', boxShadow: statsRange === 7 ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: statsRange === 7 ? '#0f172a' : '#64748b' }}
                                                >
                                                    7 dias
                                                </button>
                                                <button
                                                    className={`toggle-btn ${statsRange === 30 ? 'active' : ''}`}
                                                    onClick={() => setStatsRange(30)}
                                                    style={{ padding: '6px 12px', border: 'none', background: statsRange === 30 ? '#fff' : 'transparent', borderRadius: '6px', cursor: 'pointer', fontWeight: statsRange === 30 ? 'bold' : 'normal', boxShadow: statsRange === 30 ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: statsRange === 30 ? '#0f172a' : '#64748b' }}
                                                >
                                                    30 dias
                                                </button>
                                            </div>
                                        </div>

                                        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                            <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '1.5rem', borderRadius: '16px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Total de Acessos</span>
                                                        <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>{stats.total}</h3>
                                                    </div>
                                                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>
                                                        <Globe size={20} color="white" />
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <TrendingUp size={14} /> Desde o início
                                                </div>
                                            </div>

                                            <div className="kpi-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Acessos Hoje</span>
                                                        <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: '#0f172a' }}>{stats.today}</h3>
                                                    </div>
                                                    <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '8px' }}>
                                                        <Activity size={20} color="#10b981" />
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                                    <CheckCircle size={14} /> Atualizado agora
                                                </div>
                                            </div>

                                            <div className="kpi-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{statsRange === 7 ? 'Últimos 7 dias' : 'Últimos 30 dias'}</span>
                                                        <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: '#0f172a' }}>
                                                            {statsRange === 7 ? stats.week : calculateMonthlyStats(stats.daily)}
                                                        </h3>
                                                    </div>
                                                    <div style={{ background: '#fffbeb', padding: '8px', borderRadius: '8px' }}>
                                                        <TrendingUp size={20} color="#f59e0b" />
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '1rem' }}>
                                                    Média diária: {Math.round((statsRange === 7 ? stats.week : calculateMonthlyStats(stats.daily)) / statsRange)}
                                                </div>
                                            </div>

                                            <div className="kpi-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Taxa de Conversão</span>
                                                        <h3 style={{ fontSize: '1.8rem', margin: '0.5rem 0 0 0', color: '#0f172a' }}>0.0%</h3>
                                                    </div>
                                                    <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '8px' }}>
                                                        <ShieldCheck size={20} color="#64748b" />
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#6366f1', marginTop: '1rem', fontWeight: 'bold' }}>
                                                    EM BREVE
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                            <div className="chart-section" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', minHeight: '400px' }}>
                                                <h4 style={{ margin: '0 0 1.5rem 0', color: '#1e293b' }}>Tendência de Acessos</h4>
                                                <div style={{ width: '100%', height: '320px' }}>
                                                    <ResponsiveContainer>
                                                        <AreaChart data={getChartData(stats.daily, statsRange)}>
                                                            <defs>
                                                                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                            <XAxis
                                                                dataKey="date"
                                                                axisLine={false}
                                                                tickLine={false}
                                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                                dy={10}
                                                            />
                                                            <YAxis
                                                                axisLine={false}
                                                                tickLine={false}
                                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                            />
                                                            <Tooltip
                                                                contentStyle={{
                                                                    backgroundColor: '#1e293b',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    color: '#fff',
                                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                                }}
                                                                itemStyle={{ color: '#fff' }}
                                                                cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
                                                            />
                                                            <Area
                                                                type="monotone"
                                                                dataKey="visits"
                                                                stroke="#6366f1"
                                                                strokeWidth={3}
                                                                fillOpacity={1}
                                                                fill="url(#colorVisits)"
                                                            />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            <div className="recent-activity" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', height: '400px', overflowY: 'auto' }}>
                                                <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Últimas Visitas</h4>

                                                {stats.recentVisits && stats.recentVisits.length > 0 ? (
                                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                        {stats.recentVisits.map((visit, idx) => (
                                                            <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: idx !== stats.recentVisits.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '50%' }}>
                                                                    <Users size={16} color="#64748b" />
                                                                </div>
                                                                <div>
                                                                    <span style={{ display: 'block', fontSize: '0.85rem', color: '#334155', fontWeight: '500' }}>Novo Visitante</span>
                                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{visit.time}</span>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>
                                                        <Globe size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                                        <p style={{ fontSize: '0.9rem' }}>Nenhuma visita recente.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </LockedFeature>
                            )}



                            {activeSection === 'hero' && (
                                <>
                                    <LockedFeature requiredTier="premium" currentTier={user?.plan_tier}>
                                        <section className="form-section">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '8px', color: '#d97706' }}>
                                                        <Plus size={20} />
                                                    </div>
                                                    <h3 style={{ margin: 0 }}>Barra de Aviso (Topo)</h3>
                                                </div>
                                                <label className="switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={content.topBar?.enabled}
                                                        onChange={(e) => {
                                                            const isEnabled = e.target.checked;
                                                            setContent(prev => ({
                                                                ...prev,
                                                                topBar: {
                                                                    ...prev.topBar,
                                                                    enabled: isEnabled,
                                                                    text: isEnabled && !prev.topBar.text ? '🎉 Novidade: Nosso curso premium está com 50% de desconto!' : prev.topBar.text
                                                                }
                                                            }));
                                                        }}
                                                    />
                                                    <span className="slider round"></span>
                                                </label>
                                            </div>

                                            {content.topBar?.enabled && (
                                                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                    {/* Real-time Preview Area */}
                                                    <div className="preview-box" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '1rem' }}>Pré-visualização da Barra</span>
                                                        <div
                                                            className="announcement-bar-preview"
                                                            style={{
                                                                backgroundColor: content.topBar.backgroundColor || '#3167E7',
                                                                color: content.topBar.textColor || '#ffffff',
                                                                padding: '10px',
                                                                borderRadius: '8px',
                                                                fontWeight: '700',
                                                                fontSize: '0.9rem',
                                                                cursor: 'pointer',
                                                                transition: 'transform 0.2s ease',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                            }}
                                                        >
                                                            <span>{content.topBar.text || '🎉 Novidade: Nosso curso premium está com 50% de desconto!'}</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '8px' }}>Dica: No site, esta barra ficará fixa no topo.</p>
                                                    </div>

                                                    {/* Configuration Controls */}
                                                    <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                        <div className="form-group">
                                                            <label>Texto do Aviso</label>
                                                            <input
                                                                value={content.topBar.text}
                                                                placeholder="🎉 Novidade: Nosso curso premium está com 50% de desconto!"
                                                                onChange={(e) => setContent(prev => ({ ...prev, topBar: { ...prev.topBar, text: e.target.value } }))}
                                                                className="input"
                                                            />
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                                                            <ColorPicker
                                                                label="Cor de Fundo"
                                                                color={content.topBar.backgroundColor || '#3167E7'}
                                                                onChange={(val) => setContent(prev => ({ ...prev, topBar: { ...prev.topBar, backgroundColor: val } }))}
                                                            />
                                                            <ColorPicker
                                                                label="Cor do Texto"
                                                                color={content.topBar.textColor || '#ffffff'}
                                                                onChange={(val) => setContent(prev => ({ ...prev, topBar: { ...prev.topBar, textColor: val } }))}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    </LockedFeature>

                                    <section className="form-section">
                                        <h3><Type size={18} /> Conteúdo Hero</h3>
                                        <div className="form-group">
                                            <label>Título Principal</label>
                                            <input name="heroTitle" value={content.heroTitle} onChange={handleChange} className="input" />
                                        </div>
                                        <div className="form-group">
                                            <label>Subtítulo</label>
                                            <textarea name="heroSubtitle" value={content.heroSubtitle} onChange={handleChange} className="input textarea" />
                                        </div>
                                        <div className="form-group">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <label><ImageIcon size={18} /> Imagem de Fundo</label>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Recomendado: 1920x1080px</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(e, 'heroImage')}
                                                className="input"
                                                disabled={uploading}
                                            />
                                            {content.heroImage && (
                                                <div style={{ marginTop: '1rem' }}>
                                                    <img src={content.heroImage} alt="Preview" className="image-preview" style={{ height: '150px', objectFit: 'cover' }} />
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <LockedFeature title="Identidade da Marca" currentTier={user?.plan_tier}>
                                        <section className="form-section">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <h3><ImageIcon size={18} /> Logotipo</h3>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Recomendado: 250x100px</span>
                                            </div>
                                            <div className="form-group">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e, 'logo')}
                                                    className="input"
                                                    disabled={uploading}
                                                />
                                                {content.logo && (
                                                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#e2e8f0', borderRadius: '4px', display: 'inline-block' }}>
                                                        <img src={content.logo} alt="Logo" style={{ height: '40px' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </LockedFeature>
                                </>
                            )}

                            {activeSection === 'about' && (
                                <>
                                    <section className="form-section">
                                        <h3><Users size={18} /> Dados do Expert</h3>
                                        <div className="form-group">
                                            <label>Rótulo Superior</label>
                                            <input name="aboutLabel" value={content.aboutLabel} onChange={handleChange} className="input" />
                                        </div>
                                        <div className="form-group">
                                            <label>Nome / Título</label>
                                            <input name="aboutTitle" value={content.aboutTitle} onChange={handleChange} className="input" />
                                        </div>
                                        <div className="form-group">
                                            <label>Biografia</label>
                                            <textarea name="aboutText" value={content.aboutText} onChange={handleChange} className="input textarea" style={{ height: '150px' }} />
                                        </div>
                                        <div className="form-group">
                                            <label>Foto de Perfil {['static', 'basic'].includes(user?.plan_tier) && <span style={{ fontSize: '0.7em', color: '#f59e0b' }}>(Premium)</span>}</label>
                                            {!['static', 'basic'].includes(user?.plan_tier) ? (
                                                <>
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'aboutImage')} className="input" />
                                                    {content.aboutImage && (
                                                        <img src={content.aboutImage} alt="About" className="image-preview" style={{ height: '100px', width: '100px', objectFit: 'cover', borderRadius: '50%', marginTop: '1rem' }} />
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{ padding: '10px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                                                    Upload de imagem disponível apenas no Plano Ouro.
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section className="form-section">
                                        <h3>Cores da Seção {['static', 'basic'].includes(user?.plan_tier) && <span style={{ fontSize: '0.7em', color: '#f59e0b' }}>(Premium)</span>}</h3>
                                        {!['static', 'basic'].includes(user?.plan_tier) ? (
                                            <div className="features-grid">
                                                <ColorPicker
                                                    label="Fundo"
                                                    color={content.sectionStyles?.aboutBackground || '#f8fafc'}
                                                    onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, aboutBackground: val } }))}
                                                />
                                                <ColorPicker
                                                    label="Rótulo"
                                                    color={content.sectionStyles?.aboutLabelColor || '#64748b'}
                                                    onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, aboutLabelColor: val } }))}
                                                />
                                                <ColorPicker
                                                    label="Título"
                                                    color={content.sectionStyles?.aboutTitleColor || '#0f172a'}
                                                    onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, aboutTitleColor: val } }))}
                                                />
                                                <ColorPicker
                                                    label="Texto"
                                                    color={content.sectionStyles?.aboutTextColor || '#334155'}
                                                    onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, aboutTextColor: val } }))}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ padding: '1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}>
                                                <p>Personalização de cores disponível apenas no Plano Ouro.</p>
                                                <button className="btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>Fazer Upgrade</button>
                                            </div>
                                        )}
                                    </section>

                                </>
                            )}

                            {activeSection === 'events' && (
                                <section className="form-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <label>Título da Seção</label>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>
                                                    Quadrante: 370x280px
                                                </div>
                                            </div>
                                            <input
                                                value={content.eventsTitle || 'Cases de Sucesso'}
                                                onChange={(e) => setContent(prev => ({ ...prev, eventsTitle: e.target.value }))}
                                                className="input"
                                            />
                                        </div>
                                        <button onClick={() => addItem('events', { image: '', description: '', imageFit: 'contain' })} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
                                            + Novo Item
                                        </button>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '2rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Aparência {['static', 'basic'].includes(user?.plan_tier) && <span style={{ fontSize: '0.7em', color: '#f59e0b' }}>(Premium)</span>}</h4>
                                        {!['static', 'basic'].includes(user?.plan_tier) ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <ColorPicker
                                                    label="Fundo"
                                                    color={content.sectionStyles?.eventsBackground || '#f8fafc'}
                                                    onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, eventsBackground: val } }))}
                                                />
                                                <ColorPicker
                                                    label="Texto"
                                                    color={content.sectionStyles?.eventsTitleColor || '#0f172a'}
                                                    onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, eventsTitleColor: val } }))}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ padding: '10px', background: '#e2e8f0', borderRadius: '6px', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
                                                Personalização de cores disponível apenas no Plano Ouro.
                                            </div>
                                        )}
                                    </div>

                                    <div className="features-grid">
                                        {content.events && content.events.map((event, index) => (
                                            <div key={index} className="feature-card-edit">
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <h4>Item {index + 1}</h4>
                                                    <button onClick={() => removeItem('events', index)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                                </div>
                                                <div className="form-group">
                                                    <label>Imagem</label>
                                                    <input type="file" accept="image/*" onChange={(e) => handleListImageUpload(e, 'events', index)} className="input" />
                                                    {event.image && <img src={event.image} alt="Preview" className="image-preview" style={{ height: '80px', objectFit: 'contain' }} />}
                                                </div>
                                                <div className="form-group">
                                                    <label>Descrição</label>
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
                            )}

                            {activeSection === 'stations' && (
                                <section className="form-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <label>Título da Seção</label>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    Recomendado: 370x280px
                                                </div>
                                            </div>
                                            <input
                                                value={content.stationsTitle || 'Nossos Serviços'}
                                                onChange={(e) => setContent(prev => ({ ...prev, stationsTitle: e.target.value }))}
                                                className="input"
                                            />
                                        </div>
                                        <button onClick={() => addItem('stations', { image: '', title: '', description: '', imageFit: 'contain' })} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
                                            + Novo Serviço
                                        </button>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '2rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Aparência {['static', 'basic'].includes(user?.plan_tier) && <span style={{ fontSize: '0.7em', color: '#f59e0b' }}>(Premium)</span>}</h4>
                                        {!['static', 'basic'].includes(user?.plan_tier) ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <ColorPicker
                                                    label="Fundo"
                                                    color={content.sectionStyles?.stationsBackground || '#f8fafc'}
                                                    onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, stationsBackground: val } }))}
                                                />
                                                <ColorPicker
                                                    label="Texto"
                                                    color={content.sectionStyles?.stationsTitleColor || '#0f172a'}
                                                    onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, stationsTitleColor: val } }))}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ padding: '10px', background: '#e2e8f0', borderRadius: '6px', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
                                                Personalização de cores disponível apenas no Plano Ouro.
                                            </div>
                                        )}
                                    </div>

                                    <div className="features-grid">
                                        {content.stations && content.stations.map((station, index) => (
                                            <div key={index} className="feature-card-edit">
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <h4>Serviço {index + 1}</h4>
                                                    <button onClick={() => removeItem('stations', index)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                                </div>
                                                <div className="form-group">
                                                    <label>Ícone / Imagem</label>
                                                    <input type="file" accept="image/*" onChange={(e) => handleListImageUpload(e, 'stations', index)} className="input" />
                                                    {station.image && <img src={station.image} alt="Preview" className="image-preview" style={{ height: '80px', objectFit: 'contain' }} />}
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

                            )}

                            {activeSection === 'sales' && (
                                <LockedFeature requiredTier="premium" currentTier={user?.plan_tier}>
                                    <section className="form-section">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '8px', color: '#0f172a' }}>
                                                    <ShoppingBag size={20} />
                                                </div>
                                                <h3 style={{ margin: 0 }}>Vendas (Cursos, E-books)</h3>
                                            </div>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={content.salesSection?.enabled}
                                                    onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, enabled: e.target.checked } }))}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>

                                        {content.salesSection?.enabled && (
                                            <>
                                                <div className="form-group">
                                                    <label>Título Chamativo</label>
                                                    <input
                                                        value={content.salesSection?.title || ''}
                                                        onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, title: e.target.value } }))}
                                                        className="input"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Subtítulo de Apoio</label>
                                                    <textarea
                                                        value={content.salesSection?.subtitle || ''}
                                                        onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, subtitle: e.target.value } }))}
                                                        className="input textarea"
                                                        style={{ height: '80px' }}
                                                    />
                                                </div>

                                                <div style={{ margin: '1.5rem 0' }}>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Benefícios</label>
                                                    {(content.salesSection?.features || []).map((feature, idx) => (
                                                        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                            <input
                                                                value={feature.text || ''}
                                                                onChange={(e) => {
                                                                    const newFeatures = [...(content.salesSection?.features || [])];
                                                                    newFeatures[idx] = { ...newFeatures[idx], text: e.target.value };
                                                                    setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, features: newFeatures } }));
                                                                }}
                                                                className="input"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const newFeatures = (content.salesSection?.features || []).filter((_, i) => i !== idx);
                                                                    setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, features: newFeatures } }));
                                                                }}
                                                                style={{ padding: '0 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, features: [...(prev.salesSection?.features || []), { text: '' }] } }))}
                                                        className="btn-secondary"
                                                        style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                                                    >+ Adicionar Diferencial</button>
                                                </div>

                                                <div className="form-group" style={{ marginBottom: '2rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Aparência da Seção</h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                        <ColorPicker
                                                            label="Fundo"
                                                            color={content.sectionStyles?.salesBackground || '#ffffff'}
                                                            onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, salesBackground: val } }))}
                                                        />
                                                        <ColorPicker
                                                            label="Ícone"
                                                            color={content.sectionStyles?.salesIconColor || '#0f172a'}
                                                            onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, salesIconColor: val } }))}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                    <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <ShoppingBag size={18} /> Configurações do Card de Preço
                                                    </h4>
                                                    <div className="form-group">
                                                        <label>Cores do Card</label>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                            <ColorPicker
                                                                label="Fundo Card"
                                                                color={content.sectionStyles?.salesCardBackground || '#ffffff'}
                                                                onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, salesCardBackground: val } }))}
                                                            />
                                                            <ColorPicker
                                                                label="Texto Card"
                                                                color={content.sectionStyles?.salesCardTextColor || '#0f172a'}
                                                                onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, salesCardTextColor: val } }))}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="form-group">
                                                        <label>Título do Card</label>
                                                        <input
                                                            value={content.salesSection?.card?.title || ''}
                                                            onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, title: e.target.value } } }))}
                                                            className="input"
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <label>Itens do Checklist</label>
                                                        {(content.salesSection?.card?.highlights || []).map((h, idx) => (
                                                            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                                <input
                                                                    value={h || ''}
                                                                    onChange={(e) => {
                                                                        const newH = [...(content.salesSection?.card?.highlights || [])];
                                                                        newH[idx] = e.target.value;
                                                                        setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, highlights: newH } } }));
                                                                    }}
                                                                    className="input"
                                                                />
                                                                <button onClick={() => {
                                                                    const newH = (content.salesSection?.card?.highlights || []).filter((_, i) => i !== idx);
                                                                    setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, highlights: newH } } }));
                                                                }} style={{ padding: '0 10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>X</button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, highlights: [...(prev.salesSection?.card?.highlights || []), ''] } } }))} style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px dashed #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>+ Adicionar Item</button>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                        <div className="form-group">
                                                            <label>Preço DE</label>
                                                            <input
                                                                value={content.salesSection?.card?.oldPrice || ''}
                                                                onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, oldPrice: formatCurrency(e.target.value) } } }))}
                                                                className="input"
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Preço POR</label>
                                                            <input
                                                                value={content.salesSection?.card?.currentPrice || ''}
                                                                onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, currentPrice: formatCurrency(e.target.value) } } }))}
                                                                className="input"
                                                                style={{ fontWeight: 'bold' }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="form-group">
                                                        <label>Botão de Ação</label>
                                                        <input
                                                            value={content.salesSection?.card?.buttonText || ''}
                                                            onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, buttonText: e.target.value } } }))}
                                                            className="input"
                                                            style={{ background: '#ecfdf5', borderColor: '#6ee7b7' }}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Link de Checkout</label>
                                                        <input
                                                            value={content.salesSection?.card?.checkoutUrl || ''}
                                                            onChange={(e) => setContent(prev => ({ ...prev, salesSection: { ...prev.salesSection, card: { ...prev.salesSection.card, checkoutUrl: e.target.value } } }))}
                                                            className="input"
                                                            placeholder="https://..."
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </section>
                                </LockedFeature>
                            )}

                            {activeSection === 'custom' && (
                                <LockedFeature requiredTier="premium" currentTier={user?.plan_tier} title="Módulos Extras">
                                    <>
                                        <section className="form-section dynamic-factory-section" style={{ border: '2px dashed #cbd5e1', background: 'transparent' }}>
                                            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                                                <h3 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                    <Layers size={22} /> Fábrica de Módulos
                                                </h3>
                                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                                                    Adicione blocos extras para expandir sua página.
                                                </p>
                                                <div className="factory-buttons-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem' }}>
                                                    <button onClick={() => addCustomSection('text')} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem', background: 'white' }}><Type size={16} /> Texto Rico</button>
                                                    <button onClick={() => addCustomSection('galeria')} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem', background: 'white' }}><ImageIcon size={16} /> Galeria</button>
                                                    <button onClick={() => addCustomSection('grade')} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem', background: 'white' }}><Layout size={16} /> Grade</button>
                                                </div>
                                            </div>
                                        </section>

                                        {content.customSections && content.customSections.map((section) => (
                                            <section key={section.id} id={`edit-${section.id}`} className="form-section custom-section-edit" style={{ borderLeft: '4px solid #cbd5e1' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '8px', color: '#0f172a' }}>
                                                            {section.type === 'text' && <Type size={18} />}
                                                            {section.type === 'galeria' && <ImageIcon size={18} />}
                                                            {section.type === 'grade' && <List size={18} />}
                                                            {section.type === 'venda' && <ShoppingBag size={18} />}
                                                        </div>
                                                        <div>
                                                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{section.title}</h3>
                                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Módulo: {section.type}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeCustomSection(section.id)} style={{ padding: '8px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                        <Trash2 size={14} /> Excluir
                                                    </button>
                                                </div>

                                                {section.type === 'grade' && (
                                                    <div style={{ background: '#f0f9ff', padding: '10px 15px', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Activity size={16} />
                                                        <span><strong>Nota:</strong> Os cartões desta grade são brancos. O texto interno é fixado em cores escuras para manter o contraste, ignorando as cores globais da seção.</span>
                                                    </div>
                                                )}

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                                    <div className="form-group">
                                                        <label>Nome no Menu</label>
                                                        <input
                                                            value={section.navLabel}
                                                            onChange={(e) => updateCustomSection(section.id, 'navLabel', e.target.value)}
                                                            className="input"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Título na Página</label>
                                                        <input
                                                            value={section.title}
                                                            onChange={(e) => updateCustomSection(section.id, 'title', e.target.value)}
                                                            className="input"
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <div className="form-group">
                                                        <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Fonte</label>
                                                        <FontSelector
                                                            selectedFont={section.font}
                                                            onSelect={(font) => updateCustomSection(section.id, 'font', font)}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Fundo</label>
                                                        <ColorPicker
                                                            color={section.backgroundColor || '#ffffff'}
                                                            onChange={(color) => updateCustomSection(section.id, 'backgroundColor', color)}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Título</label>
                                                        <ColorPicker
                                                            color={section.titleColor || '#1e293b'}
                                                            onChange={(color) => updateCustomSection(section.id, 'titleColor', color)}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Texto</label>
                                                        <ColorPicker
                                                            color={section.textColor || '#475569'}
                                                            onChange={(color) => updateCustomSection(section.id, 'textColor', color)}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Ajuste das Fotos</label>
                                                        <select
                                                            value={section.imageFit || 'cover'}
                                                            onChange={(e) => updateCustomSection(section.id, 'imageFit', e.target.value)}
                                                            className="input"
                                                            style={{ fontSize: '0.8rem', height: '36px', padding: '0 8px' }}
                                                        >
                                                            <option value="cover">Preencher Espaço (Zoom - Recomendado)</option>
                                                            <option value="contain">Mostrar Foto Inteira (Pode gerar bordas)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Color Preview Sample */}
                                                <div style={{
                                                    marginBottom: '1.5rem',
                                                    padding: '1.5rem',
                                                    borderRadius: '12px',
                                                    backgroundColor: section.backgroundColor || '#ffffff',
                                                    border: '1px solid #e2e8f0',
                                                    textAlign: 'center',
                                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                                }}>
                                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '10px', textTransform: 'uppercase' }}>Pré-visualização de Cores</span>
                                                    <h4 style={{
                                                        color: section.titleColor || '#1e293b',
                                                        margin: '0 0 10px 0',
                                                        fontFamily: section.font || 'inherit',
                                                        fontSize: '1.4rem'
                                                    }}>
                                                        Título do Módulo
                                                    </h4>
                                                    <p style={{
                                                        color: section.textColor || '#475569',
                                                        margin: 0,
                                                        fontSize: '1rem'
                                                    }}>
                                                        Exemplo de como o texto do seu módulo aparecerá sobre o fundo escolhido.
                                                    </p>
                                                </div>

                                                {section.type === 'text' && (
                                                    <div className="form-group">
                                                        <label>Conteúdo</label>
                                                        <RichTextEditor
                                                            value={section.content}
                                                            onChange={(html) => updateCustomSection(section.id, 'content', html)}
                                                            textColor={section.textColor}
                                                        />
                                                    </div>
                                                )}
                                                {section.type === 'galeria' && (
                                                    <div className="form-group">
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                            <label>Imagens da Galeria</label>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>
                                                                Quadrante: 370x280px
                                                            </div>
                                                        </div>
                                                        <div className="gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                                                            {(section.items || []).map((item, idx) => (
                                                                <div key={idx} style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: 'white', padding: '5px' }}>
                                                                    <div style={{ position: 'relative', width: '100%', height: '100px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9' }}>
                                                                        <img
                                                                            src={item.src || 'https://via.placeholder.com/150'}
                                                                            alt="Item"
                                                                            style={{
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                objectFit: 'cover',
                                                                                objectPosition: `${item.posX || 50}% ${item.posY || 50}%`
                                                                            }}
                                                                        />
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                const newItems = section.items.filter((_, i) => i !== idx);
                                                                                updateCustomSection(section.id, 'items', newItems);
                                                                            }}
                                                                            style={{
                                                                                position: 'absolute',
                                                                                top: 5,
                                                                                right: 5,
                                                                                background: '#ef4444',
                                                                                color: 'white',
                                                                                border: '2px solid white',
                                                                                borderRadius: '50%',
                                                                                width: '28px',
                                                                                height: '28px',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                                                                zIndex: 10
                                                                            }}
                                                                            title="Remover foto"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>

                                                                    {/* Position sliders removed for UI simplification */}
                                                                    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        <input
                                                                            value={item.title || ''}
                                                                            placeholder="Título (Hover)"
                                                                            onChange={(e) => handleCustomListChange(section.id, idx, 'title', e.target.value)}
                                                                            style={{ fontSize: '0.75rem', width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                                                        />
                                                                        <textarea
                                                                            value={item.description || ''}
                                                                            placeholder="Descrição (Hover)"
                                                                            onChange={(e) => handleCustomListChange(section.id, idx, 'description', e.target.value)}
                                                                            style={{ fontSize: '0.7rem', width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', minHeight: '40px', resize: 'none' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <label className="add-gallery-item" style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', height: '100px', background: '#f8fafc' }}>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleCustomSectionImageUpload(e, section.id)}
                                                                    style={{ display: 'none' }}
                                                                />
                                                                <Plus size={24} color="#94a3b8" />
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}

                                                {section.type === 'grade' && (
                                                    <div className="form-group">
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                            <label>Itens da Grade (Destaques)</label>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>
                                                                Quadrante: 370x280px
                                                            </div>
                                                        </div>
                                                        {(section.items || []).map((item, idx) => (
                                                            <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
                                                                        <div className="item-image-upload" style={{ width: '100px', height: '120px', position: 'relative', background: 'white', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #cbd5e1' }}>
                                                                            {item.image ? (
                                                                                <img
                                                                                    src={item.image}
                                                                                    alt="Preview"
                                                                                    style={{
                                                                                        width: '100%',
                                                                                        height: '100%',
                                                                                        objectFit: 'cover',
                                                                                        objectPosition: `${item.posX || 50}% ${item.posY || 50}%`
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><ImageIcon size={24} color="#64748b" /></div>
                                                                            )}
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                onChange={(e) => handleCustomGradeImageUpload(e, section.id, idx)}
                                                                                style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                                                            />
                                                                        </div>

                                                                        {/* Position sliders removed for UI simplification */}
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            const newItems = section.items.filter((_, i) => i !== idx);
                                                                            updateCustomSection(section.id, 'items', newItems);
                                                                        }}
                                                                        style={{
                                                                            background: '#ef4444',
                                                                            border: '2px solid white',
                                                                            padding: '10px',
                                                                            borderRadius: '10px',
                                                                            cursor: 'pointer',
                                                                            color: 'white',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                                                                            transition: 'all 0.2s',
                                                                            zIndex: 10
                                                                        }}
                                                                        title="Excluir Item"
                                                                    >
                                                                        <Trash2 size={20} />
                                                                    </button>
                                                                </div>
                                                                <div className="form-group">
                                                                    <label style={{ fontSize: '0.8rem' }}>Título do Item</label>
                                                                    <input
                                                                        value={item.title || ''}
                                                                        onChange={(e) => handleCustomListChange(section.id, idx, 'title', e.target.value)}
                                                                        className="input"
                                                                    />
                                                                </div>
                                                                <div className="form-group">
                                                                    <label style={{ fontSize: '0.8rem' }}>Descrição</label>
                                                                    <textarea
                                                                        value={item.description || ''}
                                                                        onChange={(e) => handleCustomListChange(section.id, idx, 'description', e.target.value)}
                                                                        className="input textarea-sm"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => {
                                                                const newItem = { title: 'Novo Item', description: 'Descrição...', icon: 'CheckCircle', image: '' };
                                                                const newItems = [...(section.items || []), newItem];
                                                                updateCustomSection(section.id, 'items', newItems);
                                                            }}
                                                            className="btn-secondary"
                                                            style={{ width: '100%', fontSize: '0.8rem' }}
                                                        >
                                                            + Adicionar Item à Grade
                                                        </button>
                                                    </div>
                                                )}
                                            </section>
                                        ))}
                                    </>
                                </LockedFeature>
                            )}

                            {
                                activeSection === 'footer' && (
                                    <section className="form-section">
                                        <h3>Rodapé & Contato</h3>
                                        <div className="form-group">
                                            <label>Texto do Rodapé</label>
                                            <input name="footerText" value={content.footerText} onChange={handleChange} className="input" />
                                        </div>
                                        <div className="form-group">
                                            <label>Instagram URL</label>
                                            <input
                                                value={content.socials.instagram}
                                                onChange={(e) => setContent(prev => ({ ...prev, socials: { ...prev.socials, instagram: e.target.value } }))}
                                                className="input"
                                                placeholder="https://instagram.com/..."
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>WhatsApp</label>
                                            <input
                                                value={content.socials.whatsapp}
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/\D/g, '');
                                                    if (val.length > 11) val = val.slice(0, 11);
                                                    if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                                                    if (val.length > 7) val = `${val.slice(0, 9)}-${val.slice(9)}`;
                                                    setContent(prev => ({ ...prev, socials: { ...prev.socials, whatsapp: val } }))
                                                }}
                                                className="input"
                                                placeholder="(XX) XXXXX-XXXX"
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '2rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginTop: '2rem' }}>
                                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Aparência do Rodapé</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <ColorPicker
                                                    label="Fundo"
                                                    color={content.sectionStyles?.footerBackground || '#0f172a'}
                                                    onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, footerBackground: val } }))}
                                                />
                                                <ColorPicker
                                                    label="Texto"
                                                    color={content.sectionStyles?.footerTitleColor || '#ffffff'}
                                                    onChange={(val) => setContent(prev => ({ ...prev, sectionStyles: { ...prev.sectionStyles, footerTitleColor: val } }))}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                )
                            }
                        </>
                    ) : (
                        <section className="admin-users-section">
                            <div className="admin-section-header">
                                <div className="header-title">
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
                        </section>
                    )
                    }
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