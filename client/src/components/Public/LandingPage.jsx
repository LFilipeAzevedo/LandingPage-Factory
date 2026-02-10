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

    // Extract sections early for hooks and render safety
    const { customSections = [] } = content || {};

    // --- Font Injection Management ---
    useEffect(() => {
        if (!content) return;

        // Collect fonts from sections
        const fontsToLoad = new Set();
        if (customSections) {
            customSections.forEach(s => {
                if (s.font) fontsToLoad.add(s.font.split(',')[0].replace(/'/g, ''));
            });
        }

        // Add default font
        fontsToLoad.add('Inter');

        if (fontsToLoad.size > 0) {
            const fontsArray = Array.from(fontsToLoad);
            const linkId = 'google-fonts-loader';
            let link = document.getElementById(linkId);

            if (link) link.remove();

            link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontsArray.map(f => f.replace(/ /g, '+')).join('&family=')}:wght@400;700&display=swap`;
            document.head.appendChild(link);
        }
    }, [content, customSections]);

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

    const handleNavClick = (e, href) => {
        e.preventDefault();
        setMenuOpen(false);
        const element = document.querySelector(href);
        if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
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
        topBar = { enabled: false, text: '', backgroundColor: '#0f172a', textColor: '#ffffff' }
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
        salesBackground: '#ffffff',
        salesTitleColor: '#1e293b',
        ...content.sectionStyles
    };

    return (
        <div id="top" className={`landing-page ${topBar.enabled && topBar.text ? 'has-announcement' : ''}`}>
            {/* Announcement Bar (Top Bar) */}
            {topBar.enabled && topBar.text && (
                <div
                    className="announcement-bar"
                    style={{
                        backgroundColor: topBar.backgroundColor || '#0f172a',
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
                    <div className="logo" style={{ display: 'flex', alignItems: 'center' }}>
                        {logo ? (
                            <div style={{ height: '40px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                                <img
                                    src={logo}
                                    alt="Logo"
                                    style={content.logoSettings?.cropW ? {
                                        position: 'absolute',
                                        width: `${100 / content.logoSettings.cropW * 100}%`,
                                        height: `${100 / content.logoSettings.cropH * 100}%`,
                                        top: `${-content.logoSettings.cropY * (100 / content.logoSettings.cropH)}%`,
                                        left: `${-content.logoSettings.cropX * (100 / content.logoSettings.cropW)}%`,
                                        objectFit: 'contain'
                                    } : {
                                        height: '40px',
                                        objectFit: 'contain'
                                    }}
                                />
                                {/* Invisible spacer to maintain width if using absolute img */}
                                <img src={logo} alt="Spacer" style={{ height: '40px', visibility: 'hidden' }} />
                            </div>
                        ) : (
                            'Logo'
                        )}
                    </div>

                    <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle Menu">
                        {menuOpen ? <X size={24} color="white" /> : <Menu size={24} color="white" />}
                    </button>

                    {/* Dynamic Nav Links Calculation */}
                    {(() => {
                        const displayNavLinks = [
                            { label: 'Início', url: '#top' },
                            { label: 'Cases', url: '#events' },
                            { label: 'Serviços', url: '#stations' },
                            { label: 'Sobre nós', url: '#about' },
                            ...(salesSection.enabled ? [{ label: 'Cursos', url: '#sales' }] : []),
                            ...(customSections || []).map(s => ({
                                label: s.navLabel || s.title || 'Módulo',
                                url: `#${s.id}`
                            }))
                        ];

                        return (
                            <ul className={`nav-links ${menuOpen ? 'active' : ''}`}>
                                {displayNavLinks.map((link, index) => (
                                    <li key={index}>
                                        <a href={link.url} onClick={(e) => handleNavClick(e, link.url)}>
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        );
                    })()}
                </div>
            </nav>

            <header
                className="hero"
                style={{ position: 'relative', overflow: 'hidden' }}
            >
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: 0 }}>
                    <img
                        src={heroImage}
                        alt="Hero"
                        style={content.heroImageSettings?.cropW ? {
                            position: 'absolute',
                            width: `${100 / content.heroImageSettings.cropW * 100}%`,
                            height: `${100 / content.heroImageSettings.cropH * 100}%`,
                            top: `${-content.heroImageSettings.cropY * (100 / content.heroImageSettings.cropH)}%`,
                            left: `${-content.heroImageSettings.cropX * (100 / content.heroImageSettings.cropW)}%`,
                            objectFit: 'cover'
                        } : {
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                </div>
                <div className="hero-overlay" style={{ zIndex: 1 }}></div>
                <div className="hero-content" style={{ position: 'relative', zIndex: 2 }}>
                    <h1>{heroTitle}</h1>
                    <p className="hero-subtitle">{heroSubtitle}</p>
                </div>
            </header>



            {content.events && content.events.length > 0 && (
                <section className="section-dark" id="events" style={{ backgroundColor: sectionStyles.eventsBackground, paddingLeft: 0, paddingRight: 0 }}>
                    <div className="content-container" style={{ textAlign: 'center' }}>
                        <h2 style={{ color: sectionStyles.eventsTitleColor, marginBottom: '3rem' }}>{content.eventsTitle || 'Nossos Eventos'}</h2>
                    </div>
                    <div className="carousel-container">
                        <div className="carousel-track" style={{ padding: 0 }}>
                            {/* Duplicate content for seamless infinite scroll */}
                            {[...content.events, ...content.events].map((event, index) => (
                                <div key={index} className={`carousel-item ${event.orientation || 'portrait'}`}>
                                    <div className="gallery-item-wrapper" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                                        <img
                                            src={event.image}
                                            alt={`Evento ${index + 1}`}
                                            style={event.cropW ? {
                                                position: 'absolute',
                                                width: `${100 / event.cropW * 100}%`,
                                                height: `${100 / event.cropH * 100}%`,
                                                top: `${-event.cropY * (100 / event.cropH)}%`,
                                                left: `${-event.cropX * (100 / event.cropW)}%`,
                                                objectFit: 'cover'
                                            } : {
                                                width: '100%',
                                                height: '100%',
                                                objectFit: content.eventsImageFit || 'cover',
                                                objectPosition: 'center'
                                            }}
                                        />
                                        <div className="gallery-overlay">
                                            {event.description && <p className="gallery-overlay-description" style={{ fontSize: '1.1rem' }}>{event.description}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {content.stations && content.stations.length > 0 && (
                <section className="features" id="stations" style={{ backgroundColor: sectionStyles.stationsBackground, paddingLeft: 0, paddingRight: 0 }}>
                    <div className="content-container">
                        <h2 style={{ color: sectionStyles.stationsTitleColor, textAlign: 'center', marginBottom: '3rem' }}>{content.stationsTitle || 'Nossas Estações'}</h2>
                    </div>
                    <div className="carousel-container">
                        <div className="carousel-track" style={{ padding: 0 }}>
                            {/* Duplicate content for seamless infinite scroll */}
                            {[...content.stations, ...content.stations].map((station, index) => (
                                <div
                                    key={index}
                                    className={`carousel-item station-card-carousel ${station.orientation || 'portrait'}`}
                                >
                                    <div className="gallery-item-wrapper" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                                        {station.image && (
                                            <img
                                                src={station.image}
                                                alt={station.title}
                                                style={station.cropW ? {
                                                    position: 'absolute',
                                                    width: `${100 / station.cropW * 100}%`,
                                                    height: `${100 / station.cropH * 100}%`,
                                                    top: `${-station.cropY * (100 / station.cropH)}%`,
                                                    left: `${-station.cropX * (100 / station.cropW)}%`,
                                                    objectFit: 'cover'
                                                } : {
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: content.stationsImageFit || 'cover',
                                                    objectPosition: 'center'
                                                }}
                                            />
                                        )}
                                        <div className="gallery-overlay">
                                            {station.title && <h4 className="gallery-overlay-title">{station.title}</h4>}
                                            {station.description && <p className="gallery-overlay-description">{station.description}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
            <section className="mentor-section" id="about" style={{ backgroundColor: '#ffffff' }}>
                <div className="content-container">
                    <div
                        className="mentor-container"
                        style={{
                            background: sectionStyles.aboutBackground
                                ? `linear-gradient(180deg, ${sectionStyles.aboutBackground} 0%, ${sectionStyles.aboutBackground}dd 100%)`
                                : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
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
                                {(content.aboutText || "").split('\n').map((para, i) => (
                                    <p key={i}>{para}</p>
                                )) || "Adicione sua história no editor."}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sales Section (Courses/Ebooks) */}
            {
                salesSection.enabled && (
                    <section
                        className="sales-section"
                        id="sales"
                        style={{
                            backgroundColor: sectionStyles?.salesBackground || '#ffffff',
                        }}
                    >
                        <div className="content-container sales-container">
                            <div className="sales-info">
                                <h2 className="sales-title" style={{ color: sectionStyles?.salesTitleColor }}>{salesSection.title}</h2>
                                <p className="sales-subtitle" style={{ color: sectionStyles?.salesTitleColor }}>{salesSection.subtitle}</p>

                                <div className="sales-features-list">
                                    {salesSection.features?.map((feature, idx) => (
                                        <div key={idx} className="benefit-item">
                                            <div
                                                className="benefit-icon-wrapper"
                                                style={{
                                                    background: sectionStyles?.salesIconColor
                                                        ? `linear-gradient(135deg, ${sectionStyles.salesIconColor}, ${sectionStyles.salesIconColor}dd)`
                                                        : 'linear-gradient(135deg, #0f172a, #334155)'
                                                }}
                                            >
                                                <div className="benefit-icon-inner">
                                                    <CheckCircle size={20} />
                                                </div>
                                            </div>
                                            <div className="benefit-text">
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
                                        backgroundColor: sectionStyles?.salesCardBackground || '#ffffff',
                                        color: sectionStyles?.salesCardTextColor || '#0f172a'
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
                )
            }


            {/* --- CUSTOM SECTIONS RENDERER --- */}
            {
                (customSections || []).map((section) => (
                    <section
                        key={section.id}
                        id={section.id}
                        className="dynamic-section"
                        style={{
                            backgroundColor: section.backgroundColor || '#ffffff',
                            fontFamily: section.font || "'Inter', sans-serif",
                            padding: (section.type === 'galeria' || section.type === 'grade') ? '80px 0' : '80px 20px',
                            width: '100%',
                            overflow: 'hidden'
                        }}
                    >
                        {(section.type !== 'galeria' && section.type !== 'grade') ? (
                            <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                                <h2 style={{
                                    fontSize: '2.5rem',
                                    textAlign: 'center',
                                    marginBottom: '3rem',
                                    fontFamily: section.font || 'inherit',
                                    color: section.titleColor || '#1e293b'
                                }}>
                                    {section.title}
                                </h2>

                                {section.type === 'text' && (
                                    <div
                                        className="rich-content"
                                        style={{
                                            fontSize: '1.2rem',
                                            lineHeight: '1.8',
                                            color: section.textColor || '#475569'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: section.content }}
                                    />
                                )}

                                {section.type === 'venda' && (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '1.1rem', color: section.textColor || '#64748b', marginBottom: '2rem' }}>{section.subtitle}</p>
                                        <div className="pricing-card" style={{ maxWidth: '400px', margin: '0 auto', background: 'white', padding: '2rem', borderRadius: '16px' }}>
                                            <h3>Oferta Especial</h3>
                                            <div className="price" style={{ fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0' }}>
                                                Confira no Checkout
                                            </div>
                                            <a href="#sales" className="btn btn-primary" style={{ display: 'block', width: '100%' }} onClick={(e) => handleNavClick(e, '#sales')}>
                                                Ver Oferta Completa
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
                                    <h2 style={{
                                        fontSize: '2.5rem',
                                        textAlign: 'center',
                                        marginBottom: '3rem',
                                        fontFamily: section.font || 'inherit',
                                        color: section.titleColor || '#1e293b'
                                    }}>
                                        {section.title}
                                    </h2>
                                </div>

                                {section.type === 'galeria' && (
                                    <div className="carousel-container">
                                        <div className="carousel-track" style={{ padding: 0 }}>
                                            {/* Duplicate content for seamless infinite scroll */}
                                            {[...(section.items || []), ...(section.items || [])].map((item, idx) => (
                                                <div key={idx} className={`carousel-item ${item.orientation || 'portrait'}`}>
                                                    <div className="gallery-item-wrapper" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                                                        <img
                                                            src={item.src}
                                                            alt={`Galeria ${idx}`}
                                                            style={item.cropW ? {
                                                                position: 'absolute',
                                                                width: `${100 / item.cropW * 100}%`,
                                                                height: `${100 / item.cropH * 100}%`,
                                                                top: `${-item.cropY * (100 / item.cropH)}%`,
                                                                left: `${-item.cropX * (100 / item.cropW)}%`,
                                                                objectFit: 'cover'
                                                            } : {
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: section.imageFit || 'cover',
                                                                objectPosition: 'center'
                                                            }}
                                                        />
                                                        {(item.title || item.description) && (
                                                            <div className="gallery-overlay">
                                                                {item.title && <h4 className="gallery-overlay-title">{item.title}</h4>}
                                                                {item.description && <p className="gallery-overlay-description">{item.description}</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {section.type === 'grade' && (
                                    <div className="carousel-container">
                                        <div className="carousel-track" style={{ padding: 0 }}>
                                            {/* Duplicate content for seamless infinite scroll */}
                                            {[...(section.items || []), ...(section.items || [])].map((item, idx) => (
                                                <div key={idx} className="carousel-item portrait">
                                                    {item.image && (
                                                        <div className="gallery-item-wrapper" style={{ position: 'relative', width: '100%', height: '240px', minHeight: '240px', overflow: 'hidden' }}>
                                                            <img
                                                                src={item.image}
                                                                alt={item.title}
                                                                style={item.cropW ? {
                                                                    position: 'absolute',
                                                                    width: `${100 / item.cropW * 100}%`,
                                                                    height: `${100 / item.cropH * 100}%`,
                                                                    top: `${-item.cropY * (100 / item.cropH)}%`,
                                                                    left: `${-item.cropX * (100 / item.cropW)}%`,
                                                                    objectFit: 'cover'
                                                                } : {
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: section.imageFit || 'cover',
                                                                    objectPosition: 'center'
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                    <div style={{ padding: '20px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                        <h3 style={{
                                                            fontSize: '1.4rem',
                                                            fontWeight: '700',
                                                            color: '#1e293b',
                                                            marginBottom: '10px',
                                                            fontFamily: section.font || 'inherit'
                                                        }}>
                                                            {item.title}
                                                        </h3>
                                                        <p style={{
                                                            color: '#64748b',
                                                            lineHeight: '1.6',
                                                            fontSize: '0.95rem',
                                                            margin: 0,
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 4,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden'
                                                        }}>
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                ))
            }

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
                    {socials?.instagram && (
                        <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="social-link instagram">
                            Instagram
                        </a>
                    )}
                    {socials?.whatsapp && (
                        <a
                            href={`https://wa.me/${((socials.whatsapp || '').replace(/[^0-9]/g, '').length <= 11) ? '55' + (socials.whatsapp || '').replace(/[^0-9]/g, '') : (socials.whatsapp || '').replace(/[^0-9]/g, '')}`}
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
        </div >
    );
};

export default LandingPage;
