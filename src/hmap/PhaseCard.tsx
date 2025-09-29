import React, { useState, useEffect } from 'react';

export const PhaseCard = ({ phase, project, phaseData, updatePhaseData, isLocked, lockReason, onGenerate, onComplete, status, isLoading }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(phaseData || '');
    
    useEffect(() => {
        setEditedContent(phaseData || '');
        if (status !== 'locked' && !isOpen) {
            setIsOpen(phase.id === 'phase1');
        }
    }, [phaseData, status, isOpen, phase.id]);
    
    const handleToggle = () => {
        if (!isLocked) {
            setIsOpen(!isOpen);
        }
    };
    
    const handleSave = () => {
        updatePhaseData(phase.id, editedContent);
        setIsEditing(false);
    };

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
                    {isLoading && <div className="status-message loading" role="status">Generating content...</div>}
                    {phaseData && !isEditing ? (
                        <p className="display-content">{phaseData}</p>
                    ) : (
                        <textarea 
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            placeholder={`Content for ${phase.title} will appear here...`}
                            aria-label={`Content for ${phase.title}`}
                        />
                    )}
                    <div className="phase-actions">
                        <button className="button" onClick={() => onGenerate(phase.id)} disabled={isLoading || status === 'completed'}>
                            {phaseData ? 'Regenerate' : 'Generate'} with AI
                        </button>
                        {phaseData && !isEditing && <button className="button" onClick={() => setIsEditing(true)}>Edit</button>}
                        {isEditing && <button className="button button-primary" onClick={handleSave}>Save</button>}
                        {phaseData && <button className="button" onClick={() => onComplete(phase.id)} disabled={status === 'completed'}>Mark as Complete</button>}
                    </div>
                </div>
            )}
        </div>
    );
};