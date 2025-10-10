import React, { useState } from 'react';
import { parseMarkdown } from '../utils/markdownParser';

interface AiReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    onAddToDocuments: (title: string, content: string) => void;
}

export const AiReportModal: React.FC<AiReportModalProps> = ({ isOpen, onClose, title, content, onAddToDocuments }) => {
    const [copyButtonText, setCopyButtonText] = useState('Copy to Clipboard');

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(content).then(() => {
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy to Clipboard'), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            setCopyButtonText('Copy Failed');
             setTimeout(() => setCopyButtonText('Copy to Clipboard'), 2000);
        });
    };
    
    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };
    
    const handleAddToProject = () => {
        onAddToDocuments(title, content);
        onClose(); // Close modal after adding
    };

    const parsedContent = parseMarkdown(content);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0}}>
                    <h2 id="ai-report-title">{title}</h2>
                    <button onClick={onClose} className="button-close" aria-label="Close">&times;</button>
                </div>
                
                <div className="ai-report-body" style={{ flexGrow: 1, overflowY: 'auto', background: 'var(--background-color)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-color)'}}>
                    {parsedContent}
                </div>
                
                <div className="modal-actions" style={{justifyContent: 'space-between', flexShrink: 0, alignItems: 'center'}}>
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <button type="button" className="button" onClick={handleCopy}>{copyButtonText}</button>
                        <button type="button" className="button" onClick={handleDownload}>Download (.md)</button>
                    </div>
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <button type="button" className="button" onClick={handleAddToProject}>Add to Project</button>
                        <button type="button" className="button button-primary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};