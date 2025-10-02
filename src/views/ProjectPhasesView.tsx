import React, { useState } from 'react';
import { PhaseCard } from '../components/PhaseCard';
import { PHASE_DOCUMENT_REQUIREMENTS } from '../constants/projectData';

export const ProjectPhasesView = ({ project, projectPhases, phasesData, documents, error, loadingPhase, handleUpdatePhaseData, handleCompletePhase, handleGenerateContent, handleAttachFile, handleRemoveAttachment }) => {
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

        // Also check for specific document title requirements for this phase.
        const docPhaseId = `phase${doc.phase}`;
        const requiredDocTitles = PHASE_DOCUMENT_REQUIREMENTS[docPhaseId];
        if (requiredDocTitles) {
            const unapprovedDocs = requiredDocTitles.filter(docTitle => {
                // Don't check the document against itself
                if (docTitle === doc.title) return false; 
                const prereqDoc = documents.find(d => d.title === docTitle);
                return !prereqDoc || prereqDoc.status !== 'Approved';
            });

            if (unapprovedDocs.length > 0) {
                const reason = `Requires approval for: ${unapprovedDocs.join(', ')}.`;
                return { isLocked: true, lockReason: reason };
            }
        }

        return { isLocked: false, lockReason: null };
    };

    return (
        <div>
            {error && <div className="status-message error">{error}</div>}
            {projectPhases.map((phase, index) => {
                const doc = documents.find(d => d.id === phase.id);
                const { isLocked, lockReason } = getLockStatus(phase.id);
                // Status for the chip: 'locked', 'completed' (if approved), or 'todo' (if working/rejected/etc.)
                const status = isLocked ? 'locked' : (doc?.status === 'Approved' ? 'completed' : 'todo');

                return (
                    <PhaseCard
                        key={phase.id}
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
                        isLoading={loadingPhase === phase.id}
                        isOpen={openPhases.includes(phase.id)}
                        onToggleOpen={() => togglePhaseOpen(phase.id)}
                    />
                );
            })}
        </div>
    );
};