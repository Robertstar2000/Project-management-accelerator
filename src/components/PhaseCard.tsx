import React, { useState, useEffect } from 'react';

// FIX: Define a Props interface for type safety.
interface PhaseCardProps {
    phase: { id: string; title: string; description: string; };
    project: any;
    phaseData: string | undefined;
    updatePhaseData: (phaseId: string, content: string) => void;
    isLocked: boolean;
    lockReason: string | null;
    onGenerate: (phaseId: string) => void;
    onGenerateTasks?: (phaseId: string) => void;
    onComplete: (phaseId: string) => void;
    status: string;
    isLoading: boolean;
    isOpen: boolean;
    onToggleOpen: () => void;
}

// FIX: Apply the props interface to the component.
export const PhaseCard: React.FC<PhaseCardProps> = ({ phase, project, phaseData, updatePhaseData, isLocked, lockReason, onGenerate, onGenerateTasks, onComplete, status, isLoading, isOpen, onToggleOpen }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(phaseData || '');
    
    useEffect(() => {
        setEditedContent(phaseData || '');
    }, [phaseData]);
    
    const handleToggle = () => {
        if (!isLocked) {
            onToggleOpen();
        }
    };
    
    const handleSave = () => {
        updatePhaseData(phase.id, editedContent);
        setIsEditing(false);
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
                    {isLoading && <div className="status-message loading" role="status">Generating content...</div>}
                    {phaseData && !isEditing ? (
                        <p className="display-content">{phaseData}</p>
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
                        {phase.id === 'phase6' && onGenerateTasks && (
                            <button className="button button-primary" onClick={() => onGenerateTasks(phase.id)} disabled={isLoading || status === 'completed'}>
                                Break Down Tasks with AI
                            </button>
                        )}
                        {phaseData && !isEditing && <button className="button" onClick={() => setIsEditing(true)}>Edit</button>}
                        {isEditing && <button className="button button-primary" onClick={handleSave}>Save</button>}
                        {phaseData && <button className="button" onClick={() => onComplete(phase.id)} disabled={status === 'completed'}>Mark as Complete</button>}
                    </div>
                </div>
            )}
        </div>
    );
};