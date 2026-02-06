import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';
import './LandingPage.css';
import { Menu, X, CheckCircle, ShieldCheck, ShoppingCart } from 'lucide-react';

const LandingPage = () => {
    const { slug } = useParams();
    const effectiveSlug = slug || 'home';

    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        api.get(`/api/content/${effectiveSlug}?track=true`)
            .then(res => {
                setContent(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err.response?.data?.error || err.message || 'Erro desconhecido');
                setLoading(false);
            });
    }, [effectiveSlug]);

    useEffect(() => {
        if (!content) return;

        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };

        const revealCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                } else {
                    entry.target.classList.remove('active');
                }
            });
        };

        const observer = new IntersectionObserver(revealCallback, observerOptions);
        const revealElements = document.querySelectorAll('.reveal, .reveal-stagger');

        revealElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [content]);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            Carregando site...
        </div>
    );

    if (error) return (
        <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
            <h2>Página não encontrada</h2>
            <p>O endereço "<strong>{effectiveSlug}</strong>" não possui conteúdo ou ainda não foi criado.</p>
        </div>
    );

    const {
        heroTitle,
        heroSubtitle,
        heroImage,
        ctaText,
        features,
        footerText,
        // Defaults for new fields to prevent crashes on existing data
        heroImageSettings = { position: 'center', size: 'cover' },
        navLinks = [
            { label: 'Sobre nós', url: '#about' },
            { label: 'Eventos', url: '#events' },
            { label: 'Estações', url: '#stations' }
        ],
        socials = { instagram: '', whatsapp: '' },
        logo = '',
        salesSection = { enabled: false },
        topBar = { enabled: false, text: '', backgroundColor: '#fa4eab', textColor: '#ffffff' },
    } = content;

    // Merge styles with defaults to ensure all fields exist
    const sectionStyles = {
        aboutBackground: '#ffffff',
        aboutTitleColor: '#1e293b',
        eventsBackground: '#0f172a',
        eventsTitleColor: '#ffffff',
        stationsBackground: '#f8fafc',
        stationsTitleColor: '#1e293b',
        footerBackground: '#0f172a',
        footerTitleColor: '#cbd5e1',
        ...content.sectionStyles
    };

    return (
        <div className="landing-page">
            {/* Announcement Bar (Top Bar) */}
            {topBar.enabled && topBar.text && (
                <div
                    className="announcement-bar"
                    style={{
                        backgroundColor: topBar.backgroundColor || '#fa4eab',
                        color: topBar.textColor || '#ffffff'
                    }}
                >
                    <div className="container">
                        <span>{topBar.text}</span>
                    </div>
                </div>
            )}

            {/* Top Navigation Bar */}
            <nav className={`top-bar ${topBar.enabled ? 'has-announcement' : ''}`}>
                <div className="nav-container">
                    <div className="logo">
                        {logo ? (
                            <img src={logo} alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
                        ) : (
                            'Logo'
                        )}
                    </div>

                    <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle Menu">
                        {menuOpen ? <X size={24} color="white" /> : <Menu size={24} color="white" />}
                    </button>

                    <ul className={`nav-links ${menuOpen ? 'active' : ''}`}>
                        {navLinks.map((link, index) => (
                            <li key={index}><a href={link.url} onClick={() => setMenuOpen(false)}>{link.label}</a></li>
                        ))}
                    </ul>
                </div>
            </nav>

            <header
                className="hero"
                style={{
                    backgroundImage: `url(${heroImage})`,
                    backgroundPosition: 'top center',
                    backgroundSize: 'cover'
                }}
            >
                <div className="hero-overlay"></div>
                <div className="hero-content reveal">
                    <h1>{heroTitle}</h1>
                    <p className="hero-subtitle">{heroSubtitle}</p>

                </div>
            </header>



            {content.events && content.events.length > 0 && (
                <section className="section-dark" id="events" style={{ backgroundColor: sectionStyles.eventsBackground }}>
                    <h2 style={{ color: sectionStyles.eventsTitleColor }} className="reveal">Nossos Eventos</h2>
                    <div className="carousel-container reveal">
                        <div className="carousel-track">
                            {/* Duplicate content for seamless infinite scroll */}
                            {[...content.events, ...content.events].map((event, index) => (
                                <div key={index} className={`carousel-item ${event.orientation || 'portrait'}`}>
                                    <img
                                        src={event.image}
                                        alt={`Evento ${index + 1}`}
                                        style={{
                                            objectFit: 'contain',
                                            objectPosition: 'center'
                                        }}
                                    />
                                    <div className="carousel-caption">
                                        <p style={{ color: sectionStyles.eventsTitleColor }}>{event.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {content.stations && content.stations.length > 0 && (
                <section className="features" id="stations" style={{ backgroundColor: sectionStyles.stationsBackground }}>
                    <div className="content-container">
                        <h2 style={{ color: sectionStyles.stationsTitleColor }} className="reveal">Nossas Estações</h2>
                        <div className="carousel-container reveal">
                            <div className="carousel-track">
                                {content.stations.map((station, index) => (
                                    <div
                                        key={index}
                                        className={`carousel-item station-card-carousel ${station.orientation || 'portrait'}`}
                                        style={{
                                            backgroundColor: sectionStyles.stationsBackground,
                                            borderColor: sectionStyles.stationsTitleColor + '20', // 20 is low opacity in hex
                                            boxShadow: sectionStyles.stationsBackground === '#ffffff' ? undefined : 'none'
                                        }}
                                    >
                                        <div
                                            className="station-image-wrapper"
                                            style={{ backgroundColor: 'transparent' }}
                                        >
                                            {station.image && (
                                                <img
                                                    src={station.image}
                                                    alt={station.title}
                                                    className="station-image"
                                                    style={{
                                                        objectFit: 'contain',
                                                        objectPosition: 'center'
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div className="station-content">
                                            <h3 style={{ color: sectionStyles.stationsTitleColor }}>{station.title}</h3>
                                            <p style={{ color: sectionStyles.stationsTitleColor, opacity: 0.9 }}>{station.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}
            {/* Sales Section (Courses/Ebooks) */}
            {salesSection.enabled && (
                <section
                    className="sales-section reveal"
                    id="vendas"
                    style={{
                        backgroundColor: sectionStyles?.salesBackground || '#ffffff',
                    }}
                >
                    <div className="content-container sales-container">
                        <div className="sales-info">
                            <h2 className="sales-title" style={{ color: sectionStyles?.salesTitleColor || sectionStyles?.aboutTitleColor }}>{salesSection.title}</h2>
                            <p className="sales-subtitle" style={{ color: sectionStyles?.salesTitleColor || sectionStyles?.aboutTitleColor }}>{salesSection.subtitle}</p>

                            <div className="sales-features-list">
                                {salesSection.features?.map((feature, idx) => (
                                    <div key={idx} className="benefit-item">
                                        <div
                                            className="benefit-icon-wrapper"
                                            style={{
                                                background: sectionStyles?.salesIconColor
                                                    ? `linear-gradient(135deg, ${sectionStyles.salesIconColor}, ${sectionStyles.salesIconColor}dd)`
                                                    : 'linear-gradient(135deg, #fa4eab, #fb7185)'
                                            }}
                                        >
                                            <div className="benefit-icon-inner">
                                                <CheckCircle size={20} />
                                            </div>
                                        </div>
                                        <div className="benefit-text" style={{ color: sectionStyles?.salesTitleColor || sectionStyles?.aboutTitleColor }}>
                                            {feature.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="sales-card-outer">
                            <div
                                className="sales-card-container"
                                style={{
                                    backgroundColor: sectionStyles?.salesCardBackground || '#fa4eab',
                                    color: sectionStyles?.salesCardTextColor || '#ffffff'
                                }}
                            >
                                <h3 className="card-outer-title" style={{ color: sectionStyles?.salesCardTextColor || '#ffffff' }}>{salesSection.card?.title}</h3>

                                <ul className="card-checklist-premium">
                                    {salesSection.card?.highlights?.map((h, idx) => (
                                        <li key={idx}>
                                            <CheckCircle
                                                size={18}
                                                className="icon-check-premium"
                                                style={{ color: sectionStyles?.salesCardIconColor || '#ffd43b' }}
                                            />
                                            <span>{h}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="sales-card">
                                    <div className="price-container-premium">
                                        {salesSection.card?.oldPrice && (
                                            <span className="old-price-premium">
                                                De R$ {salesSection.card.oldPrice} por
                                            </span>
                                        )}
                                        <div className="current-price-premium">
                                            <span className="currency">R$</span>
                                            <span className="amount">{salesSection.card?.currentPrice}</span>
                                        </div>
                                        <span className="installment-premium">{salesSection.card?.installmentInfo}</span>
                                    </div>

                                    {salesSection.card?.checkoutUrl && (
                                        <a
                                            href={salesSection.card.checkoutUrl}
                                            className="checkout-button-premium"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {salesSection.card.buttonText}
                                        </a>
                                    )}

                                    <div className="trust-badges-premium">
                                        <div className="badge-p">
                                            <ShieldCheck size={14} style={{ color: sectionStyles?.salesCardIconColor || '#ffd43b' }} />
                                            <span>Compra Segura</span>
                                        </div>
                                        <div className="badge-p">
                                            <ShieldCheck size={14} style={{ color: sectionStyles?.salesCardIconColor || '#ffd43b' }} />
                                            <span>Satisfação Garantida</span>
                                        </div>
                                        <div className="badge-p">
                                            <ShieldCheck size={14} style={{ color: sectionStyles?.salesCardIconColor || '#ffd43b' }} />
                                            <span>Privacidade Protegida</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}
            <section className="mentor-section reveal" id="about" style={{ backgroundColor: '#ffffff' }}>
                <div className="content-container">
                    <div
                        className="mentor-container"
                        style={{
                            background: sectionStyles.aboutBackground
                                ? `linear-gradient(180deg, ${sectionStyles.aboutBackground} 0%, ${sectionStyles.aboutBackground}dd 100%)`
                                : 'linear-gradient(180deg, #be185d 0%, #f472b6 100%)'
                        }}
                    >
                        <div className="mentor-image">
                            {content.aboutImage && <img src={content.aboutImage} alt={content.aboutTitle} />}
                        </div>
                        <div className="mentor-content">
                            <span className="mentor-label" style={{ color: sectionStyles.aboutLabelColor || '#ffffff' }}>
                                {content.aboutLabel || "Conheça sua Mentora"}
                            </span>
                            <h2 className="mentor-title" style={{ color: sectionStyles.aboutTitleColor || '#ffffff' }}>
                                {content.aboutTitle || "Sobre Mim"}
                            </h2>
                            <div className="mentor-text" style={{ color: sectionStyles.aboutTextColor || '#ffffff' }}>
                                {content.aboutText?.split('\n').map((para, i) => (
                                    <p key={i}>{para}</p>
                                )) || "Adicione sua história no editor."}
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            <footer
                className="footer"
                style={{
                    backgroundColor: sectionStyles?.footerBackground || undefined,
                    color: sectionStyles?.footerTitleColor || undefined,
                    borderTop: sectionStyles?.footerBackground ? 'none' : undefined
                }}
            >
                <p style={{ color: sectionStyles?.footerTitleColor || 'inherit' }}>{footerText}</p>

                {/* Social Links */}
                <div className="social-links">
                    {socials.instagram && (
                        <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="social-link instagram">
                            Instagram
                        </a>
                    )}
                    {socials.whatsapp && (
                        <a
                            href={`https://wa.me/${(socials.whatsapp.replace(/[^0-9]/g, '').length <= 11) ? '55' + socials.whatsapp.replace(/[^0-9]/g, '') : socials.whatsapp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-link whatsapp"
                        >
                            WhatsApp
                        </a>
                    )}
                </div>

                <div style={{ marginTop: '20px', fontSize: '0.8rem', opacity: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                    <p style={{ margin: 0 }}>Orgulhosamente desenvolvido por</p>
                    <a href="/admin/login" style={{ color: sectionStyles?.footerTitleColor || 'inherit', fontWeight: 'bold', textDecoration: 'none' }}>
                        AzTec
                    </a>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
