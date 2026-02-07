import React from 'react';
import { Type } from 'lucide-react';
import './FontSelector.css';

const GOOGLE_FONTS = [
    { name: 'Padrão (Inter)', value: "'Inter', sans-serif" },
    { name: 'Montserrat', value: "'Montserrat', sans-serif" },
    { name: 'Poppins', value: "'Poppins', sans-serif" },
    { name: 'Roboto', value: "'Roboto', sans-serif" },
    { name: 'Open Sans', value: "'Open Sans', sans-serif" },
    { name: 'Playfair Display', value: "'Playfair Display', serif" },
    { name: 'Lora', value: "'Lora', serif" },
    { name: 'Oswald', value: "'Oswald', sans-serif" },
    { name: 'Bebas Neue', value: "'Bebas Neue', cursive" },
    { name: 'Dancing Script', value: "'Dancing Script', cursive" }
];

const FontSelector = ({ selectedFont, onSelect, label = "Fonte da Seção" }) => {
    return (
        <div className="font-selector-wrapper">
            <label className="font-selector-label">
                <Type size={14} /> {label}
            </label>
            <select
                value={selectedFont}
                onChange={(e) => onSelect(e.target.value)}
                className="font-select"
            >
                {GOOGLE_FONTS.map((font) => (
                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default FontSelector;
export { GOOGLE_FONTS };
