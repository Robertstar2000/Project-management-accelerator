import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { PHASES, PROMPTS } from '../constants/projectData';
import { DashboardView } from '../tools/DashboardView';
import { ProjectPhasesView } from './ProjectPhasesView';
import { DocumentsView } from '../tools/DocumentsView';
import { ProjectTrackingView } from '../tools/ProjectTrackingView';
import { RevisionControlView } from '../tools/RevisionControlView';
import { logAction } from '../utils/logging';

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
    const configuredProjectIdRef = useRef(null);

    useEffect(() => {
        // Update all local states from the project prop
        setPhasesData(project.phasesData || {});
        setDocuments(project.documents || []);
        setTasks(project.tasks || []);
        setMilestones(project.milestones || []);
        setProjectMetrics({
            budget: project.budget,
            startDate: project.startDate,
            endDate: project.endDate,
        });

        // Smart navigation logic: only runs when the project ID changes.
        if (configuredProjectIdRef.current !== project.id) {
            configuredProjectIdRef.current = project.id;

            let initialTab = 'Dashboard';
            const newProjectId = sessionStorage.getItem('hmap-new-project-id');

            if (newProjectId === project.id) {
                // If it's a new project, start at Project Phases.
                sessionStorage.removeItem('hmap-new-project-id');
                initialTab = 'Project Phases';
            } else {
                // For existing projects, find the next action item.
                const firstUnapprovedDoc = project.documents?.find(doc => doc.status !== 'Approved');
                if (firstUnapprovedDoc) {
                    initialTab = 'Documents';
                } else {
                    const firstIncompleteTask = project.tasks?.find(task => task.status !== 'done');
                    if (firstIncompleteTask) {
                        initialTab = 'Project Tracking';
                    }
                }
            }
            setActiveTab(initialTab);
            localStorage.setItem(`hmap-active-tab-${project.id}`, initialTab);
        }
    }, [project]);

    const handleUpdatePhaseData = (phaseId, content) => {
        const newPhasesData = { ...phasesData, [phaseId]: { ...phasesData[phaseId], content, status: 'todo' } };
        setPhasesData(newPhasesData);
        saveProject({ ...project, phasesData: newPhasesData });
        logAction('Update Phase Content', phaseId, { newContentLength: content.length });
    };

    const handleCompletePhase = (phaseId) => {
        const newPhasesData = { ...phasesData, [phaseId]: { ...phasesData[phaseId], status: 'completed' } };
        setPhasesData(newPhasesData);
        saveProject({ ...project, phasesData: newPhasesData });
        logAction('Complete Phase', phaseId, { status: 'completed' });
    };

    const handleUpdateDocument = (docId, newStatus) => {
        const newDocuments = documents.map(doc => 
            doc.id === docId ? { ...doc, status: newStatus } : doc
        );
        setDocuments(newDocuments);
        saveProject({ ...project, documents: newDocuments });
        logAction('Update Document Status', docId, { newStatus });
    };

    const handleUpdateTask = (taskId, updatedData) => {
        const newTasks = tasks.map(task =>
            task.id === taskId ? { ...task, ...updatedData } : task
        );
        setTasks(newTasks);
        saveProject({ ...project, tasks: newTasks });
        logAction('Update Task', taskId, { updatedData });
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
            
            logAction('Generate AI Content', phaseId, { promptLength: prompt.length });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            handleUpdatePhaseData(phaseId, response.text);

        } catch (err) {
            console.error("API Error:", err);
            setError(`Failed to generate content for ${PHASES.find(p=>p.id === phaseId).title}. Please try again.`);
            logAction('Error AI Content', phaseId, { error: err.message });
        } finally {
            setLoadingPhase(null);
        }
    };
    
    const handleGenerateTasks = async (phaseId) => {
        if (phaseId !== 'phase6') return;
    
        setLoadingPhase(phaseId);
        setError('');
        try {
            const context = phasesData['phase5']?.content;
            if (!context) {
                setError('Statement of Work (Phase 5) must be completed before generating tasks.');
                setLoadingPhase(null);
                return;
            }
    
            const prompt = PROMPTS.phase6_tasks(project.name, project.discipline, context);
            logAction('Generate AI Tasks', phaseId, { promptLength: prompt.length });
    
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            tasks: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        duration: { type: Type.NUMBER, description: "Estimated duration in work days" }
                                    },
                                    required: ['name', 'duration']
                                }
                            }
                        },
                        required: ['tasks']
                    }
                }
            });
            
            const result = JSON.parse(response.text);
            const generatedTasks = result.tasks;
    
            let currentDate = new Date(project.startDate);
            const newTasks = generatedTasks.map((taskInfo, index) => {
                const startDate = new Date(currentDate);
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + (taskInfo.duration > 0 ? taskInfo.duration - 1 : 0));
                
                currentDate.setDate(endDate.getDate() + 1);
    
                const sprintIndex = Math.floor(index / (generatedTasks.length / project.sprints.length));
                const sprintId = project.sprints[sprintIndex % project.sprints.length].id;
    
                return {
                    id: `task-gen-${Date.now()}-${index}`,
                    sprintId: sprintId,
                    name: taskInfo.name,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    status: 'todo',
                    dependsOn: []
                };
            });
            
            const lastTask = newTasks[newTasks.length - 1];
            const newProjectEndDate = lastTask ? lastTask.endDate : project.endDate;
    
            setTasks(newTasks);
            setProjectMetrics({ ...projectMetrics, endDate: newProjectEndDate });
            saveProject({ ...project, tasks: newTasks, endDate: newProjectEndDate });
    
        } catch (err) {
            console.error("API Error generating tasks:", err);
            setError(`Failed to generate tasks. The AI's response may have been invalid. Please check the SOW and try again.`);
            logAction('Error AI Tasks', phaseId, { error: err.message });
        } finally {
            setLoadingPhase(null);
        }
    };

    const handleTabChange = (tabName) => {
        logAction('Navigate Tab', tabName, { from: activeTab, to: tabName });
        setActiveTab(tabName);
        localStorage.setItem(`hmap-active-tab-${project.id}`, tabName);
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard': return <DashboardView project={{...project, ...projectMetrics}} phasesData={phasesData} />;
            case 'Project Phases': return <ProjectPhasesView project={project} phasesData={phasesData} documents={documents} error={error} loadingPhase={loadingPhase} handleUpdatePhaseData={handleUpdatePhaseData} handleCompletePhase={handleCompletePhase} handleGenerateContent={handleGenerateContent} handleGenerateTasks={handleGenerateTasks} />;
            case 'Documents': return <DocumentsView documents={documents} onUpdateDocument={handleUpdateDocument} />;
            case 'Project Tracking': return <ProjectTrackingView project={project} tasks={tasks} sprints={project.sprints} milestones={milestones} projectStartDate={project.startDate} projectEndDate={projectMetrics.endDate} onUpdateTask={handleUpdateTask} />;
            case 'Revision Control': return <RevisionControlView project={project} saveProject={saveProject} />;
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
                <button onClick={() => handleTabChange('Dashboard')} className={activeTab === 'Dashboard' ? 'active' : ''}>Dashboard</button>
                <button onClick={() => handleTabChange('Project Phases')} className={activeTab === 'Project Phases' ? 'active' : ''}>Project Phases</button>
                <button onClick={() => handleTabChange('Project Tracking')} className={activeTab === 'Project Tracking' ? 'active' : ''}>Project Tracking</button>
                <button onClick={() => handleTabChange('Documents')} className={activeTab === 'Documents' ? 'active' : ''}>Documents</button>
                <button onClick={() => handleTabChange('Revision Control')} className={activeTab === 'Revision Control' ? 'active' : ''}>Revision Control</button>
            </nav>

            <div>
                {renderContent()}
            </div>
        </section>
    );
};