import React, { useState, useEffect, useRef } from 'react';
import { parseMarkdown } from '../utils/markdownParser';

interface PhaseCardProps {
    phase: { id: string; title: string; description: string; };
    project: any;
    phaseData: string | undefined;
    attachments: Array<{ name: string, data: string }>;
    updatePhaseData: (phaseId: string, content: string) => void;
    isLocked: boolean;
    lockReason: string | null;
    onGenerate: (phaseId: string) => void;
    onComplete: (phaseId: string) => void;
    onAttachFile: (phaseId: string, fileData: { name: string, data: string }) => void;
    onRemoveAttachment: (phaseId: string, fileName: string) => void;
    status: string;
    isLoading: boolean;
    loadingStep: 'generating' | 'compacting' | null;
    isOpen: boolean;
    onToggleOpen: () => void;
}

export const PhaseCard: React.FC<PhaseCardProps> = ({ phase, project, phaseData, attachments, updatePhaseData, isLocked, lockReason, onGenerate, onComplete, onAttachFile, onRemoveAttachment, status, isLoading, loadingStep, isOpen, onToggleOpen }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(phaseData || '');
    const descriptionFileInputRef = useRef<HTMLInputElement>(null);
    const attachmentFileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        setEditedContent(phaseData || '');
        // When content generation starts, exit editing mode to show the spinner
        // and prepare for new content to be displayed.
        if (isLoading) {
            setIsEditing(false);
        }
    }, [phaseData, isLoading]);
    
    const handleToggle = () => {
        if (!isLocked) {
            onToggleOpen();
        }
    };
    
    const handleSave = () => {
        updatePhaseData(phase.id, editedContent);
        setIsEditing(false);
    };

    const handleDescriptionFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                updatePhaseData(phase.id, text);
            };
            reader.readAsText(file);
        } else if (file) {
            alert('Please select a .txt file.');
        }
        // Reset file input to allow uploading the same file again
        if (event.target) event.target.value = '';
    };

    const handleAttachmentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result as string;
                onAttachFile(phase.id, { name: file.name, data });
            };
            reader.readAsDataURL(file);
        }
        if (event.target) event.target.value = ''; // Reset input
    };

    const placeholderText = phase.id === 'phase1' 
        ? 'Enter detailed description of project for Concept Proposal...' 
        : `Content for ${phase.title} will appear here...`;

    return (
        <div className={`phase-card ${isLocked ? 'locked' : ''} ${status}`}>
             <div className="phase-header" onClick={handleToggle} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggle()} aria-expanded={isOpen}>
                <div>
                    <h3 id={`phase-title-${phase.id}`}>{phase.title}</h3>
                    <p style={{color: 'var(--secondary-text)', fontSize: '0.9rem'}}>{phase.description}</p>
                    {isLocked && lockReason && <p className="lock-reason">{lockReason}</p>}
                </div>
                <span className={`phase-status ${isLocked ? 'locked' : status}`}>
                    {isLocked ? 'Locked' : status}
                </span>
            </div>
            {!isLocked && isOpen && (
                <div className="phase-content" role="region" aria-labelledby={`phase-title-${phase.id}`}>
                    {isLoading ? (
                        <div className="status-message loading" role="status">
                            <div className="spinner"></div>
                            <p>
                                {loadingStep === 'compacting'
                                    ? 'Compacting content for AI context...'
                                    : 'Generating content...'}
                            </p>
                        </div>
                    ) : isEditing ? (
                         <textarea 
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            placeholder={placeholderText}
                            aria-label={`Content for ${phase.title}`}
                        />
                    ) : phaseData ? (
                        <div className="display-content">{parseMarkdown(phaseData)}</div>
                    ) : (
                         <textarea 
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            placeholder={placeholderText}
                            aria-label={`Content for ${phase.title}`}
                        />
                    )}
                    
                    <div className="phase-actions">
                        <button className="button" onClick={() => onGenerate(phase.id)} disabled={isLoading || status === 'completed'}>
                            {phaseData ? 'Regenerate' : 'Generate'} Content
                        </button>
                        {phase.id === 'phase1' && (
                            <>
                                <button className="button" onClick={() => descriptionFileInputRef.current?.click()} disabled={isLoading || status === 'completed'}>
                                    Upload Description (.txt)
                                </button>
                                <input
                                    type="file"
                                    ref={descriptionFileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleDescriptionFileChange}
                                    accept=".txt"
                                />
                            </>
                        )}
                        
                        {!isLoading && (
                            <>
                                {phaseData && !isEditing && <button className="button" onClick={() => setIsEditing(true)}>Edit</button>}
                                {isEditing && <button className="button button-primary" onClick={handleSave}>Save Changes</button>}
                                {phaseData && <button className="button" onClick={() => onComplete(phase.id)} disabled={status === 'completed'}>Mark as Complete</button>}
                            </>
                        )}
                    </div>
                    
                    <div className="attachments-section">
                        <h4 style={{ marginBottom: '0.75rem', color: 'var(--secondary-text)' }}>Support Documents</h4>
                        {attachments && attachments.length > 0 ? (
                            <ul className="attachment-list">
                                {attachments.map(file => (
                                    <li key={file.name}>
                                        <span>{file.name}</span>
                                        <button onClick={() => onRemoveAttachment(phase.id, file.name)} className="button button-small button-danger" aria-label={`Remove ${file.name}`}>&times;</button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', fontStyle: 'italic' }}>No files attached.</p>
                        )}
                        <button className="button button-small" onClick={() => attachmentFileInputRef.current?.click()} style={{ marginTop: '1rem' }}>
                           📎 Attach File
                        </button>
                        <input
                            type="file"
                            ref={attachmentFileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleAttachmentFileChange}
                        />
                    </div>

                </div>
            )}
        </div>
    );
};