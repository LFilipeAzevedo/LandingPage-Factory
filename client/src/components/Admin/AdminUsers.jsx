import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
    Users,
    Search,
    ShieldCheck,
    Trash2,
    ArrowLeft,
    Activity,
    Globe,
    CheckCircle,
    TrendingUp,
    LogOut,
    ExternalLink,
    Mail,
    AlertTriangle
} from 'lucide-react';

const AdminUsers = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState('');
    const [toasts, setToasts] = useState([]);

    const showToast = (msg, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    useEffect(() => {
        if (user?.plan_tier !== 'adm_server') {
            navigate('/admin/editor');
            return;
        }
        loadUsers();
    }, [user, navigate]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/admin/users');
            setAllUsers(response.data);
        } catch (error) {
            console.error("Error loading users", error);
            setMessage("Erro ao carregar usuários. Verifique sua conexão.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUserTier = async (userId, newTier) => {
        try {
            await api.put(`/api/admin/users/${userId}/tier`, { plan_tier: newTier });
            loadUsers();
            showToast('Plano do usuário atualizado!');
        } catch (error) {
            console.error("Error updating tier", error);
            showToast('Erro ao atualizar plano.', 'error');
        }
    };

    const handleToggleUserStatus = async (userId, currentStatus) => {
        try {
            await api.put(`/api/admin/users/${userId}/status`, { is_active: !currentStatus });
            loadUsers();
            showToast(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
        } catch (error) {
            console.error("Error toggling status", error);
            showToast('Erro ao alterar status.', 'error');
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente o usuário "${username}" e todas as suas páginas? Esta ação não pode ser desfeita.`)) {
            return;
        }

        try {
            await api.delete(`/api/admin/users/${userId}`);
            loadUsers();
            showToast(`Usuário "${username}" excluído.`);
        } catch (error) {
            console.error("Error deleting user", error);
            showToast(error.response?.data?.error || 'Erro ao excluir usuário.', 'error');
        }
    };

    const filteredUsers = allUsers.filter(u =>
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: allUsers.length,
        active: allUsers.filter(u => u.is_active).length,
        totalVisits: allUsers.reduce((acc, u) => acc + (u.total_visits || 0), 0)
    };

    if (loading && allUsers.length === 0) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <p>Carregando gestão de usuários...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
            {/* Sidebar Simples */}
            <aside style={{ width: '260px', background: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #334155' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>LPFactory <span style={{ color: '#6366f1' }}>ADM</span></h2>
                </div>
                <nav style={{ flex: 1, padding: '20px 0' }}>
                    <button
                        onClick={() => navigate('/admin/editor')}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <ArrowLeft size={18} /> Voltar ao Editor
                    </button>
                    <div style={{ marginTop: '20px', padding: '0 24px', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Administração
                    </div>
                    <button
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', background: 'rgba(99, 102, 241, 0.1)', borderLeft: '4px solid #6366f1', color: 'white', borderRight: 'none', borderTop: 'none', borderBottom: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <Users size={18} /> Gestão de Usuários
                    </button>
                </nav>
                <div style={{ padding: '20px', borderTop: '1px solid #334155' }}>
                    <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <LogOut size={18} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <header style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a' }}>Gestão de Usuários</h1>
                    <p style={{ color: '#64748b' }}>Gerencie permissões, planos e visualize o crescimento da plataforma.</p>
                </header>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Total de Usuários</span>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.total}</h3>
                        </div>
                        <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '12px' }}>
                            <Users size={24} color="#3b82f6" />
                        </div>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Usuários Ativos</span>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.active}</h3>
                        </div>
                        <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '12px' }}>
                            <Activity size={24} color="#22c55e" />
                        </div>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Visitas em todas LPs</span>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.totalVisits}</h3>
                        </div>
                        <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '12px' }}>
                            <Globe size={24} color="#f59e0b" />
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Buscar usuários..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr style={{ textAlign: 'left' }}>
                                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Usuário</th>
                                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>E-mail</th>
                                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Slug / Link</th>
                                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Plano</th>
                                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Cadastro</th>
                                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Expira em</th>
                                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Visitas</th>
                                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px', fontWeight: '600', color: '#0f172a' }}>{u.username}</td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: '#64748b' }}>{u.email}</span>
                                                {u.is_verified ? (
                                                    <CheckCircle size={14} color="#22c55e" title="E-mail Verificado" />
                                                ) : (
                                                    <AlertTriangle size={14} color="#f59e0b" title="E-mail Pendente" />
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            {u.slug ? (
                                                <a
                                                    href={`/${u.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1', textDecoration: 'none', fontSize: '0.875rem' }}
                                                >
                                                    /{u.slug} <ExternalLink size={14} />
                                                </a>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Sem página</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <select
                                                value={u.plan_tier}
                                                onChange={(e) => handleUpdateUserTier(u.id, e.target.value)}
                                                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
                                            >
                                                <option value="static">Static</option>
                                                <option value="basic">Basic</option>
                                                <option value="premium">Premium</option>
                                                <option value="adm_server">Super Admin</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '0.875rem', color: '#64748b' }}>{u.date_formatted}</td>
                                        <td style={{ padding: '16px', fontSize: '0.875rem', color: u.subscription_expires_at ? '#22c55e' : '#94a3b8' }}>
                                            {u.subscription_expires_at ? new Date(u.subscription_expires_at).toLocaleDateString('pt-BR') : '—'}
                                        </td>
                                        <td style={{ padding: '16px', fontWeight: 'bold', color: '#3b82f6' }}>{u.total_visits}</td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                background: u.is_active ? '#dcfce7' : '#fee2e2',
                                                color: u.is_active ? '#166534' : '#991b1b'
                                            }}>
                                                {u.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        fontSize: '0.75rem',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        background: u.is_active ? '#ef4444' : '#22c55e',
                                                        color: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {u.is_active ? 'Desativar' : 'Ativar'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(u.id, u.username)}
                                                    style={{
                                                        padding: '6px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #fee2e2',
                                                        background: 'white',
                                                        color: '#ef4444',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Toasts */}
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10000 }}>
                    {toasts.map(t => (
                        <div key={t.id} style={{
                            background: t.type === 'success' ? '#0f172a' : '#ef4444',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            animation: 'slideIn 0.3s ease-out'
                        }}>
                            {t.type === 'success' ? <CheckCircle size={18} /> : <Activity size={18} />}
                            {t.msg}
                        </div>
                    ))}
                </div>
            </main>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default AdminUsers;
