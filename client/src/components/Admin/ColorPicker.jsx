import { useState, useEffect, useRef, useCallback } from 'react';
import './ColorPicker.css';

// --- Utility Functions ---

const hexToHsv = (hex) => {
    let r = 0, g = 0, b = 0;
    const cleanHex = hex?.replace('#', '') || 'ff0000';
    if (cleanHex.length === 3) {
        r = parseInt(cleanHex[0] + cleanHex[0], 16);
        g = parseInt(cleanHex[1] + cleanHex[1], 16);
        b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else if (cleanHex.length === 6) {
        r = parseInt(cleanHex.slice(0, 2), 16);
        g = parseInt(cleanHex.slice(2, 4), 16);
        b = parseInt(cleanHex.slice(4, 6), 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
            default: h = 0;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToHex = (h, s, v) => {
    h /= 360; s /= 100; v /= 100;
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
        default: r = 0; g = 0; b = 0;
    }
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const ColorPicker = ({ color = '#ff0000', onChange, label }) => {
    // --- State & Refs ---
    const [hsv, setHsv] = useState(() => hexToHsv(color));
    const [isOpen, setIsOpen] = useState(false);
    const [localHex, setLocalHex] = useState(color.toUpperCase());

    const hsvRef = useRef(hsv);
    const areaRef = useRef(null);
    const hueRef = useRef(null);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const lastEmitTime = useRef(0);
    const onChangeRef = useRef(onChange);

    // Keep parent callback up to date
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // External Sync (prop color -> internal state)
    // ONLY fires if we are NOT actively dragging to avoid jumps
    useEffect(() => {
        if (!isDragging.current) {
            const nextHsv = hexToHsv(color);
            setHsv(nextHsv);
            hsvRef.current = nextHsv;
            setLocalHex(color.toUpperCase());
        }
    }, [color]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // --- Core Interaction Logic ---

    const updateInternal = useCallback((type, clientX, clientY, isFinal = false) => {
        let nextHsv = { ...hsvRef.current };
        const targetRef = type === 'area' ? areaRef : hueRef;

        if (targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            if (type === 'area') {
                const s = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
                const v = Math.max(0, Math.min(100, (1 - (clientY - rect.top) / rect.height) * 100));
                nextHsv = { ...nextHsv, s, v };
            } else {
                const h = Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360));
                nextHsv = { ...nextHsv, h };
            }
        }

        // 1. Update internal state (Local UI feedback - 60fps)
        hsvRef.current = nextHsv;
        setHsv(nextHsv);
        const hex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
        setLocalHex(hex.toUpperCase());

        // 2. Throttled emit to parent (prevents flashing & excessive re-renders)
        const now = Date.now();
        // Emits at most every 150ms, or immediately if it's the final value
        if (isFinal || (now - lastEmitTime.current > 150)) {
            lastEmitTime.current = now;
            if (onChangeRef.current) {
                onChangeRef.current(hex);
            }
        }
    }, []);

    const handleDragStart = (type, e) => {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();

        isDragging.current = true;
        // Inject global style to disable transitions and prevent flashing
        document.body.classList.add('color-picker-dragging');

        const startX = e.touches ? e.touches[0].clientX : e.clientX;
        const startY = e.touches ? e.touches[0].clientY : e.clientY;
        updateInternal(type, startX, startY);

        const onMove = (moveEvent) => {
            if (!isDragging.current) return;
            if (moveEvent.cancelable) moveEvent.preventDefault();
            const x = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const y = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
            updateInternal(type, x, y);
        };

        const onEnd = () => {
            if (isDragging.current) {
                // Ensure the final state is synced to the parent
                const lastHex = hsvToHex(hsvRef.current.h, hsvRef.current.s, hsvRef.current.v);
                if (onChangeRef.current) onChangeRef.current(lastHex);
            }

            isDragging.current = false;
            document.body.classList.remove('color-picker-dragging');

            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
            document.body.style.userSelect = '';
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        document.body.style.userSelect = 'none';
    };

    const handleHexInput = (e) => {
        const val = e.target.value.toUpperCase();
        setLocalHex(val);
        // Basic hex validation
        if (/^#?([0-9A-F]{3}){1,2}$/i.test(val)) {
            const hex = val.startsWith('#') ? val : `#${val}`;
            const nextHsv = hexToHsv(hex);
            setHsv(nextHsv);
            hsvRef.current = nextHsv;
            if (onChangeRef.current) onChangeRef.current(hex);
        }
    };

    return (
        <div className="color-picker-wrapper" ref={containerRef}>
            {label && <label className="color-picker-label">{label}</label>}
            <div className="color-swatch-container" onClick={() => setIsOpen(!isOpen)}>
                <button
                    className="color-swatch"
                    type="button"
                    style={{ backgroundColor: color }}
                    title="Selecione a cor"
                    onClick={(e) => e.stopPropagation()} // Let the container handle toggle
                />
                <span className="color-hex-label">{color.toUpperCase()}</span>
            </div>

            {isOpen && (
                <div className="color-picker-popover" onMouseDown={(e) => e.stopPropagation()}>
                    <div
                        className="color-area"
                        ref={areaRef}
                        style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
                        onMouseDown={(e) => handleDragStart('area', e)}
                        onTouchStart={(e) => handleDragStart('area', e)}
                    >
                        <div className="saturation-gradient"><div className="value-gradient" /></div>
                        <div className="color-cursor" style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }} />
                    </div>

                    <div className="color-picker-footer">
                        <div
                            className="hue-slider"
                            ref={hueRef}
                            onMouseDown={(e) => handleDragStart('hue', e)}
                            onTouchStart={(e) => handleDragStart('hue', e)}
                        >
                            <div className="hue-cursor" style={{ left: `${(hsv.h / 360) * 100}%` }} />
                        </div>
                        <div className="hex-input-row" onMouseDown={(e) => e.stopPropagation()}>
                            <span className="hex-symbol">#</span>
                            <input
                                type="text"
                                className="hex-input-field"
                                value={localHex.replace('#', '')}
                                onChange={handleHexInput}
                                maxLength={6}
                                spellCheck={false}
                            />
                            <div className="current-color-dot" style={{ backgroundColor: color }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColorPicker;
