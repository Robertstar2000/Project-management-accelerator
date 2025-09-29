import React from 'react';
import { PhaseCard } from './PhaseCard';
import { PHASES, PHASE_DOCUMENT_REQUIREMENTS } from '../constants/projectData';

export const HmapPhasesView = ({ project, phasesData, documents, error, loadingPhase, handleUpdatePhaseData, handleCompletePhase, handleGenerateContent }) => {
    const getPhaseStatus = (phaseId, index) => {
        const data = phasesData[phaseId];
        if (data?.status === 'completed') return { status: 'completed', lockReason: null };

        const isFirstPhase = index === 0;
        const prevPhaseId = isFirstPhase ? null : PHASES[index - 1].id;
        const isPrevPhaseComplete = isFirstPhase || phasesData[prevPhaseId]?.status === 'completed';

        if (!isPrevPhaseComplete) {
            return { status: 'locked', lockReason: `Requires previous phase to be complete.` };
        }
        
        const requiredDocs = PHASE_DOCUMENT_REQUIREMENTS[phaseId];
        if (requiredDocs && documents) {
            const unapprovedDocs = requiredDocs.filter(docTitle => {
                const doc = documents.find(d => d.title === docTitle);
                return !doc || doc.status !== 'Approved';
            });

            if (unapprovedDocs.length > 0) {
                const reason = `Requires document${unapprovedDocs.length > 1 ? 's' : ''} to be approved: ${unapprovedDocs.map(t => `'${t}'`).join(', ')}.`;
                return { status: 'locked', lockReason: reason };
            }
        }

        return { status: 'todo', lockReason: null };
    };

    return (
        <div>
            {error && <div className="status-message error">{error}</div>}
            {PHASES.map((phase, index) => {
                const { status, lockReason } = getPhaseStatus(phase.id, index);
                return (
                    <PhaseCard
                        key={phase.id}
                        phase={phase}
                        project={project}
                        phaseData={phasesData[phase.id]?.content}
                        updatePhaseData={handleUpdatePhaseData}
                        isLocked={status === 'locked'}
                        lockReason={lockReason}
                        onGenerate={handleGenerateContent}
                        onComplete={handleCompletePhase}
                        status={status}
                        isLoading={loadingPhase === phase.id}
                    />
                );
            })}
        </div>
    );
};