import React, { useState } from 'react';
import { PHASES, PROMPTS } from '../constants/projectData';
import { DashboardView } from '../tools/DashboardView';
import { HmapPhasesView } from '../hmap/HmapPhasesView';
import { DocumentsView } from '../tools/DocumentsView';
import { ProjectTrackingView } from '../tools/ProjectTrackingView';
import { RevisionControlView } from '../tools/RevisionControlView';

export const ProjectDashboard = ({ project, onBack, ai, saveProject }) => {
    const [phasesData, setPhasesData] = useState(project.phasesData || {});
    const [documents, setDocuments] = useState(project.documents || []);
    const [tasks, setTasks] = useState(project.tasks || []);
    const [milestones, setMilestones] = useState(project.milestones || []);
    const [projectMetrics, setProjectMetrics] = useState({
        budget: project.budget,
        startDate: project.startDate,
        endDate: project.endDate,
    });
    
    const [loadingPhase, setLoadingPhase] = useState(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('Dashboard');

    const handleUpdatePhaseData = (phaseId, content) => {
        const newPhasesData = { ...phasesData, [phaseId]: { ...phasesData[phaseId], content, status: 'todo' } };
        setPhasesData(newPhasesData);
        saveProject({ ...project, phasesData: newPhasesData });
    };

    const handleCompletePhase = (phaseId) => {
        const newPhasesData = { ...phasesData, [phaseId]: { ...phasesData[phaseId], status: 'completed' } };
        setPhasesData(newPhasesData);
        saveProject({ ...project, phasesData: newPhasesData });
    };

    const handleUpdateDocument = (docId, newStatus) => {
        const newDocuments = documents.map(doc => 
            doc.id === docId ? { ...doc, status: newStatus } : doc
        );
        setDocuments(newDocuments);
        saveProject({ ...project, documents: newDocuments });
    };

    const handleGenerateContent = async (phaseId) => {
        setLoadingPhase(phaseId);
        setError('');
        try {
            const phaseIndex = PHASES.findIndex(p => p.id === phaseId);
            let context = '';
            if (phaseIndex > 0) {
                 const prevPhaseIds = PHASES.slice(0, phaseIndex).map(p => p.id);
                 context = prevPhaseIds.map(id => `--- ${PHASES.find(p => p.id === id).title} ---\n${phasesData[id]?.content || ''}`).join('\n\n');
            }

            const promptFn = PROMPTS[phaseId];
            const prompt = promptFn(project.name, project.discipline, context);

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            handleUpdatePhaseData(phaseId, response.text);

        } catch (err) {
            console.error("API Error:", err);
            setError(`Failed to generate content for ${PHASES.find(p=>p.id === phaseId).title}. Please try again.`);
        } finally {
            setLoadingPhase(null);
        }
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard': return <DashboardView project={{...project, ...projectMetrics}} phasesData={phasesData} />;
            case 'HMAP Phases': return <HmapPhasesView project={project} phasesData={phasesData} documents={documents} error={error} loadingPhase={loadingPhase} handleUpdatePhaseData={handleUpdatePhaseData} handleCompletePhase={handleCompletePhase} handleGenerateContent={handleGenerateContent} />;
            case 'Documents': return <DocumentsView documents={documents} onUpdateDocument={handleUpdateDocument} />;
            case 'Project Tracking': return <ProjectTrackingView tasks={tasks} sprints={project.sprints} milestones={milestones} projectStartDate={project.startDate} projectEndDate={project.endDate} />;
            case 'Revision Control': return <RevisionControlView projectMetrics={projectMetrics} />;
            default: return null;
        }
    };

    return (
        <section>
            <div className="dashboard-header">
                <button className="button back-button" onClick={onBack}>&larr; Back to Projects</button>
                <h1>{project.name}</h1>
                <p>{project.discipline}</p>
            </div>

            <nav className="dashboard-nav">
                <button onClick={() => setActiveTab('Dashboard')} className={activeTab === 'Dashboard' ? 'active' : ''}>Dashboard</button>
                <button onClick={() => setActiveTab('HMAP Phases')} className={activeTab === 'HMAP Phases' ? 'active' : ''}>HMAP Phases</button>
                <button onClick={() => setActiveTab('Project Tracking')} className={activeTab === 'Project Tracking' ? 'active' : ''}>Project Tracking</button>
                <button onClick={() => setActiveTab('Documents')} className={activeTab === 'Documents' ? 'active' : ''}>Documents</button>
                <button onClick={() => setActiveTab('Revision Control')} className={activeTab === 'Revision Control' ? 'active' : ''}>Revision Control</button>
            </nav>

            <div>
                {renderContent()}
            </div>
        </section>
    );
};