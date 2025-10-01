import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { PHASES, PROMPTS } from '../constants/projectData';
import { DashboardView } from '../tools/DashboardView';
import { ProjectPhasesView } from './ProjectPhasesView';
import { DocumentsView } from '../tools/DocumentsView';
import { ProjectTrackingView } from '../tools/ProjectTrackingView';
import { RevisionControlView } from '../tools/RevisionControlView';
import { logAction } from '../utils/logging';

const parseMarkdownTable = (tableString) => {
    if (!tableString) return [];
    const rows = tableString.trim().split('\n');
    const headers = rows[0].split('|').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const data = rows.slice(2).map(row => {
        const values = row.split('|').map(v => v.trim());
        const obj = {};
        headers.forEach((header, index) => {
            if (header) obj[header] = values[index];
        });
        return obj;
    });
    return data;
};

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
    const prevDocumentsRef = useRef(project.documents);

    const parseAndPopulateProjectPlan = () => {
        const planContent = project.phasesData?.['phase7']?.content;
        if (!planContent) return;
    
        logAction('Parse Project Plan', project.name, { planContentLength: planContent.length });
        
        try {
            const sections = planContent.split('## ').slice(1);
            const tasksSection = sections.find(s => s.trim().toLowerCase().startsWith('tasks'));
            const milestonesSection = sections.find(s => s.trim().toLowerCase().startsWith('milestones'));
    
            let parsedTasks = [];
            let parsedMilestones = [];
    
            if (tasksSection) {
                const tableContent = tasksSection.substring(tasksSection.indexOf('\n')).trim();
                const rawTasks = parseMarkdownTable(tableContent);
                const taskNameMap = new Map();
                // First pass to create tasks and map names to IDs
                parsedTasks = rawTasks.map((t, index) => {
                    const taskId = `task-${Date.now()}-${index}`;
                    const task = {
                        id: taskId,
                        name: t.task_name,
                        startDate: t.start_date_yyyy_mm_dd,
                        endDate: t.end_date_yyyy_mm_dd,
                        sprintId: project.sprints.find(s => s.name === t.sprint)?.id || project.sprints[0]?.id,
                        status: 'todo',
                        dependsOn: t.dependencies ? t.dependencies.split(',').map(d => d.trim()) : [],
                        actualTime: null,
                        actualCost: null,
                    };
                    taskNameMap.set(task.name, taskId);
                    return task;
                });
                // Second pass to resolve dependency names to IDs
                parsedTasks.forEach(task => {
                    task.dependsOn = task.dependsOn.map(depName => taskNameMap.get(depName)).filter(Boolean);
                });
            }
    
            if (milestonesSection) {
                const tableContent = milestonesSection.substring(milestonesSection.indexOf('\n')).trim();
                const rawMilestones = parseMarkdownTable(tableContent);
                parsedMilestones = rawMilestones.map((m, index) => ({
                    id: `milestone-${Date.now()}-${index}`,
                    name: m.milestone_name,
                    date: m.date_yyyy_mm_dd,
                    health: 'On Track',
                    dependency: null,
                }));
            }
    
            if (parsedTasks.length > 0) {
                const lastTask = parsedTasks.reduce((latest, current) => new Date(latest.endDate) > new Date(current.endDate) ? latest : current);
                const newProjectEndDate = lastTask.endDate;
                
                setTasks(parsedTasks);
                setMilestones(parsedMilestones);
                setProjectMetrics(prev => ({ ...prev, endDate: newProjectEndDate }));
                saveProject({ ...project, tasks: parsedTasks, milestones: parsedMilestones, endDate: newProjectEndDate });
                logAction('Populate Project Plan Success', project.name, { taskCount: parsedTasks.length, milestoneCount: parsedMilestones.length });
            }
        } catch(e) {
            console.error("Failed to parse project plan:", e);
            setError("Failed to parse the project plan documents. Please ensure they follow the specified Markdown format and regenerate if necessary.");
            logAction('Populate Project Plan Failure', project.name, { error: e.message });
        }
    };

    useEffect(() => {
        const docWasJustApproved = (docTitle) => {
            const oldDoc = prevDocumentsRef.current.find(d => d.title === docTitle);
            const newDoc = project.documents.find(d => d.title === docTitle);
            return oldDoc?.status !== 'Approved' && newDoc?.status === 'Approved';
        };

        const planDocsApproved = docWasJustApproved('Detailed Plans (WBS/WRS)') && docWasJustApproved('Project Timeline');
        if (planDocsApproved) {
            parseAndPopulateProjectPlan();
        }

        prevDocumentsRef.current = project.documents;
    }, [project.documents]);


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

    const handleTabChange = (tabName) => {
        logAction('Navigate Tab', tabName, { from: activeTab, to: tabName });
        setActiveTab(tabName);
        localStorage.setItem(`hmap-active-tab-${project.id}`, tabName);
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard': return <DashboardView project={{...project, ...projectMetrics}} phasesData={phasesData} />;
            case 'Project Phases': return <ProjectPhasesView project={project} phasesData={phasesData} documents={documents} error={error} loadingPhase={loadingPhase} handleUpdatePhaseData={handleUpdatePhaseData} handleCompletePhase={handleCompletePhase} handleGenerateContent={handleGenerateContent} />;
            case 'Documents': return <DocumentsView documents={documents} onUpdateDocument={handleUpdateDocument} />;
            case 'Project Tracking': return <ProjectTrackingView project={project} tasks={tasks} sprints={project.sprints} milestones={milestones} projectStartDate={project.startDate} projectEndDate={projectMetrics.endDate} onUpdateTask={handleUpdateTask} />;
            case 'Revision Control': return <RevisionControlView project={project} saveProject={saveProject} ai={ai} />;
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