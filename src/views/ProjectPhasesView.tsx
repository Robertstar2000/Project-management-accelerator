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
        const doc = documents.find(d => d.id === docId);
        if (!doc) return { isLocked: true, lockReason: 'Document not found.' };

        // A document is locked if any document from the immediately preceding phase is not 'Approved'.
        const prevPhaseNumber = doc.phase - 1;
        if (prevPhaseNumber > 0) {
            const prevPhaseDocs = documents.filter(d => d.phase === prevPhaseNumber);
            const isPrevPhaseComplete = prevPhaseDocs.length > 0 && prevPhaseDocs.every(d => d.status === 'Approved');
            if (!isPrevPhaseComplete) {
                return { isLocked: true, lockReason: `Requires all documents in Phase ${prevPhaseNumber} to be approved.` };
            }
        }

        return { isLocked: false, lockReason: null };
    };

    const isPhase1Complete = documents
        .filter(d => d.phase === 1)
        .every(d => d.status === 'Approved');

    let lastPhase = -1;

    // This wrapper ensures PhaseCard only needs to care about passing its content,
    // not about the other options `handleGenerateContent` might take.
    const handleManualGenerate = (docId, currentContent) => {
        handleGenerateContent(docId, { currentContent });
    };

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
                                Review and align every document
                                <span>Manually generate, edit, and approve each document.</span>
                            </button>
                            <button 
                                type="button" 
                                onClick={() => onSetGenerationMode('automatic')} 
                                className={generationMode === 'automatic' ? 'active' : ''}
                                aria-pressed={generationMode === 'automatic'}
                                disabled={isAutoGenerating}
                            >
                                Generate all necessary documents automatically
                                <span>The AI will generate and approve all remaining documents.</span>
                            </button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--secondary-text)', marginTop: '1rem', padding: '0 0.5rem', lineHeight: '1.5' }}>
                            Although documents are automatically created they may be extensive and each will require your review, editing and approval. This will provide the best alignment with your intent. Skipping manual review and edit with automatic document generation is faster but still requires time to complete a full set of documents.
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
                const status = isLocked ? 'locked' : (doc?.status === 'Approved' ? 'completed' : 'todo');
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
                            onGenerate={handleManualGenerate}
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
        </div>
    );
};
