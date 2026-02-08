import React, { useRef, useEffect } from 'react';
import './RichTextEditor.css';

const RichTextEditor = ({ value, onChange, placeholder, textColor }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <div className="rich-editor-container">
            <div
                ref={editorRef}
                className="rich-editor-content"
                contentEditable
                style={{ color: textColor || 'inherit' }}
                onInput={handleInput}
                placeholder={placeholder}
            />
            <div className="rich-editor-toolbar bottom-toolbar">
                <div className="toolbar-group">
                    <button type="button" onClick={() => execCommand('bold')} title="Negrito" className="toolbar-btn bold-btn">B</button>
                    <button type="button" onClick={() => execCommand('italic')} title="Itálico" className="toolbar-btn italic-btn">I</button>
                    <button type="button" onClick={() => execCommand('underline')} title="Sublinhado" className="toolbar-btn underline-btn">U</button>
                </div>

                <div className="toolbar-separator-v" />

                <div className="toolbar-group">
                    <button type="button" onClick={() => execCommand('insertUnorderedList')} title="Lista Simples" className="toolbar-btn list-btn">•</button>
                    <button type="button" onClick={() => execCommand('insertOrderedList')} title="Lista Numerada" className="toolbar-btn list-btn">1.</button>
                </div>

                <div className="toolbar-separator-v" />

                <div className="toolbar-group">
                    <button type="button" onClick={() => {
                        const url = prompt("Insira a URL:");
                        if (url) execCommand('createLink', url);
                    }} title="Link" className="toolbar-btn link-btn">🔗</button>
                </div>
            </div>
        </div>
    );
};

export default RichTextEditor;
