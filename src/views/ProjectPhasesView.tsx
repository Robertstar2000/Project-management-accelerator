

import React, { useState } from 'react';
import { PhaseCard } from '../components/PhaseCard';
import { PHASE_DOCUMENT_REQUIREMENTS } from '../constants/projectData';

export const ProjectPhasesView = ({ project, projectPhases, phasesData, documents, error, loadingPhase, handleUpdatePhaseData, handleCompletePhase, handleGenerateContent, handleAttachFile, handleRemoveAttachment, generationMode, onSetGenerationMode, isAutoGenerating }) => {
    const [openPhases, setOpenPhases] = useState(() => {
        try {
            // Default to opening the first un-approved document
            const firstTodoDoc = documents.find(d => d.status !== 'Approved');
            const defaultOpen = firstTodoDoc ? [firstTodoDoc.id] : (projectPhases.length > 0 ? [projectPhases[0].id] : []);
            const saved = localStorage.getItem(`hmap-open-phases-${project.id}`);
            return saved ? JSON.parse(saved) : defaultOpen;
        } catch (e) {
            console.error("Failed to parse open phases from localStorage", e);
            const firstTodoDoc = documents.find(d => d.status !== 'Approved');
            return firstTodoDoc ? [firstTodoDoc.id] : (projectPhases.length > 0 ? [projectPhases[0].id] : []);
        }
    });

    const togglePhaseOpen = (docId) => {
        const newOpenPhases = openPhases.includes(docId)
            ? openPhases.filter(id => id !== docId)
            : [...openPhases, docId];
        setOpenPhases(newOpenPhases);
        localStorage.setItem(`hmap-open-phases-${project.id}`, JSON.stringify(newOpenPhases));
    };

    const getLockStatus = (docId) => {
        const docIndex = projectPhases.findIndex(p => p.id === docId);
    
        if (docIndex === -1) {
            return { isLocked: true, lockReason: 'Document not found.' };
        }
    
        // The very first document in the sequence is never locked.
        if (docIndex === 0) {
            return { isLocked: false, lockReason: null };
        }
    
        // Check the status of the immediately preceding document in the sorted list.
        const prevDocInSequence = projectPhases[docIndex - 1];
        const prevDocData = documents.find(d => d.id === prevDocInSequence.id);
    
        if (prevDocData && prevDocData.status !== 'Approved') {
            return {
                isLocked: true,
                lockReason: `Requires "${prevDocData.title}" to be approved first.`
            };
        }
    
        return { isLocked: false, lockReason: null };
    };

    const isPhase1Complete = documents
        .filter(d => d.phase === 1)
        .every(d => d.status === 'Approved');

    let lastPhase = -1;

    return (
        <div>
            {error && <div className="status-message error">{error}</div>}
            
            {isPhase1Complete && (
                <div className="tool-card" style={{ marginBottom: '1.5rem', background: 'var(--background-color)' }}>
                    <div className="form-group">
                        <label>Generation Mode</label>
                        <div className="mode-switch">
                            <button 
                                type="button" 
                                onClick={() => onSetGenerationMode('manual')} 
                                className={generationMode === 'manual' ? 'active' : ''}
                                aria-pressed={generationMode === 'manual'}
                                disabled={isAutoGenerating}
                            >
                                HMAP Human Mediated Agentic Process
                                <span>Manually generate, edit, and approve each document. This is the standard, recommended workflow.</span>
                            </button>
                            <button 
                                type="button" 
                                onClick={() => onSetGenerationMode('automatic')} 
                                className={generationMode === 'automatic' ? 'active' : ''}
                                aria-pressed={generationMode === 'automatic'}
                                disabled={isAutoGenerating}
                            >
                                Automated Document Generation
                                <span>The AI will generate and approve all remaining documents in sequence. Use this to accelerate initial setup.</span>
                            </button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--secondary-text)', marginTop: '1rem', padding: '0 0.5rem', lineHeight: '1.5' }}>
                            The **manual HMAP workflow** provides the best alignment with your intent, as you review and edit each AI-generated document. The **automated workflow** is much faster for initial setup, but the generated documents will still require your final review for correctness and context.
                        </p>
                        {isAutoGenerating && <p style={{color: 'var(--accent-color)', textAlign: 'center', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}><span className="spinner" style={{width: '20px', height: '20px', borderWidth: '2px'}}></span>Automatic generation in progress...</p>}
                    </div>
                </div>
            )}

            {projectPhases.map((phase, index) => {
                const doc = documents.find(d => d.id === phase.id);
                if (!doc) return null;

                const { isLocked, lockReason } = getLockStatus(phase.id);
                // Status for the chip: 'locked', 'completed' (if approved), or 'todo' (if working/rejected/etc.)
                const status = isLocked 
                    ? 'locked' 
                    : doc?.status === 'Approved' 
                        ? 'completed' 
                        : (doc?.status === 'Failed' || doc?.status === 'Rejected') 
                            ? 'failed' 
                            : 'todo';

                const isLoading = loadingPhase?.docId === phase.id;
                const loadingStep = isLoading ? loadingPhase.step : null;

                const showPhaseHeader = doc.phase !== lastPhase;
                lastPhase = doc.phase;

                return (
                    <div key={phase.id}>
                        {showPhaseHeader && (
                             <h2 className="subsection-title" style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                                Phase {doc.phase}
                            </h2>
                        )}
                        <PhaseCard
                            phase={phase}
                            project={project}
                            phaseData={phasesData[phase.id]?.content}
                            attachments={phasesData[phase.id]?.attachments || []}
                            updatePhaseData={handleUpdatePhaseData}
                            isLocked={isLocked}
                            lockReason={lockReason}
                            onGenerate={handleGenerateContent}
                            onComplete={handleCompletePhase}
                            onAttachFile={handleAttachFile}
                            onRemoveAttachment={handleRemoveAttachment}
                            status={status}
                            isLoading={isLoading}
                            loadingStep={loadingStep}
                            isOpen={openPhases.includes(phase.id)}
                            onToggleOpen={() => togglePhaseOpen(phase.id)}
                        />
                    </div>
                );
            })}

            {projectPhases.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '3rem', paddingBottom: '2rem' }}>
                    <button 
                        className="button" 
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        ↑ Back to Top
                    </button>
                </div>
            )}
        </div>
    );
};