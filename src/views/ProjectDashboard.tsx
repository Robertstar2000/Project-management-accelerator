import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { PHASES, PROMPTS, PHASE_DOCUMENT_REQUIREMENTS } from '../constants/projectData';
import { DashboardView } from '../tools/DashboardView';
import { ProjectPhasesView } from './ProjectPhasesView';
import { DocumentsView } from '../tools/DocumentsView';
import { ProjectTrackingView } from '../tools/ProjectTrackingView';
import { RevisionControlView } from '../tools/RevisionControlView';
import { logAction } from '../utils/logging';
import { NotificationModal } from '../components/NotificationModal';

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
    const [projectData, setProjectData] = useState({ ...project });
    const [loadingPhase, setLoadingPhase] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [notificationQueue, setNotificationQueue] = useState([]);
    const configuredProjectIdRef = useRef(null);
    const prevDocumentsRef = useRef(project.documents);

    const projectPhases = useMemo(() => {
        if (!projectData || !Array.isArray(projectData.documents)) {
            return [];
        }

        const sortedDocuments = [...projectData.documents].sort((a, b) => {
            if (a.phase !== b.phase) {
                return a.phase - b.phase;
            }
            return a.title.localeCompare(b.title);
        });

        return sortedDocuments.map(doc => {
            const staticPhaseInfo: { description?: string } = PHASES[doc.phase - 1] || {};
            return {
                id: doc.id,
                title: `Phase ${doc.phase}: ${doc.title}`,
                description: staticPhaseInfo.description || `Actions related to the '${doc.title}' document.`,
                originalPhaseId: `phase${doc.phase}`,
                docId: doc.id,
            };
        });
    }, [projectData.documents]);

    const isPlanningComplete = useMemo(() => {
        const allRequiredDocTitles = [...new Set(Object.values(PHASE_DOCUMENT_REQUIREMENTS).flat())];
        const allDocsApproved = allRequiredDocTitles.every(title => {
            const doc = projectData.documents.find(d => d.title === title);
            return doc && doc.status === 'Approved';
        });
        return allDocsApproved && projectData.tasks && projectData.tasks.length > 0;
    }, [projectData.documents, projectData.tasks]);

    const handleSave = (updatedData) => {
        const newState = { ...projectData, ...updatedData };
        setProjectData(newState);
        saveProject(newState);
    };

    const handleTabChange = (tabName) => {
        logAction('Navigate Tab', tabName, { from: activeTab, to: tabName });
        setActiveTab(tabName);
        localStorage.setItem(`hmap-active-tab-${project.id}`, tabName);
    };

    const parseAndPopulateProjectPlan = () => {
        const planDocument = projectData.documents.find(d => d.title === 'Detailed Plans (WBS/WRS)');
        const planContent = planDocument ? projectData.phasesData?.[planDocument.id]?.content : undefined;
        
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
                parsedTasks = rawTasks.map((t, index) => {
                    const taskId = `task-${Date.now()}-${index}`;
                    const task = {
                        id: taskId,
                        name: t.task_name,
                        role: t.role || null,
                        startDate: t.start_date_yyyy_mm_dd,
                        endDate: t.end_date_yyyy_mm_dd,
                        sprintId: project.sprints.find(s => s.name === t.sprint)?.id || project.sprints[0]?.id,
                        status: 'todo',
                        isSubcontracted: t.subcontractor?.toLowerCase() === 'yes',
                        dependsOn: t.dependencies ? t.dependencies.split(',').map(d => d.trim()) : [],
                        actualTime: null,
                        actualCost: null,
                        actualEndDate: null,
                    };
                    taskNameMap.set(task.name, taskId);
                    return task;
                });
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

                const newChecklistDocs = [];
                const existingDocTitles = new Set(projectData.documents.map(d => d.title));
        
                parsedTasks.forEach(task => {
                    if (task.name.toLowerCase().includes('review')) {
                        const checklistTitle = `${task.name} Checklist`;
                        if (!existingDocTitles.has(checklistTitle)) {
                            newChecklistDocs.push({
                                id: `doc-${Date.now()}-${task.id}`,
                                title: checklistTitle,
                                version: 'v1.0',
                                status: 'Working',
                                owner: 'A. User',
                                phase: 7, 
                            });
                        }
                    }
                });
                
                const updatedDocuments = [...projectData.documents, ...newChecklistDocs];
                handleSave({ tasks: parsedTasks, milestones: parsedMilestones, endDate: newProjectEndDate, documents: updatedDocuments });
                logAction('Populate Project Plan Success', project.name, { taskCount: parsedTasks.length, milestoneCount: parsedMilestones.length, newDocs: newChecklistDocs.length });
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
            const newDoc = projectData.documents.find(d => d.title === docTitle);
            return oldDoc?.status !== 'Approved' && newDoc?.status === 'Approved';
        };

        const planDocsApproved = docWasJustApproved('Detailed Plans (WBS/WRS)') && docWasJustApproved('Project Timeline');
        if (planDocsApproved) {
            parseAndPopulateProjectPlan();
        }

        if (isPlanningComplete && activeTab !== 'Project Tracking') {
            logAction('Auto-Navigate', 'Planning complete', { to: 'Project Tracking' });
            handleTabChange('Project Tracking');
        }

        prevDocumentsRef.current = projectData.documents;
    }, [projectData.documents, projectData.tasks, activeTab, isPlanningComplete]);

    useEffect(() => {
        setProjectData({ ...project });

        if (configuredProjectIdRef.current !== project.id) {
            configuredProjectIdRef.current = project.id;
            let initialTab = localStorage.getItem(`hmap-active-tab-${project.id}`) || 'Project Phases';
            const newProjectId = sessionStorage.getItem('hmap-new-project-id');

            if (newProjectId === project.id) {
                sessionStorage.removeItem('hmap-new-project-id');
                initialTab = 'Project Phases';
            } else if (isPlanningComplete) {
                initialTab = localStorage.getItem(`hmap-active-tab-${project.id}`) || 'Project Tracking';
            } else {
                 initialTab = 'Project Phases';
            }
            
            if (initialTab === 'Dashboard' && !isPlanningComplete) {
                initialTab = 'Project Phases';
            }

            setActiveTab(initialTab);
            localStorage.setItem(`hmap-active-tab-${project.id}`, initialTab);
        }
    }, [project]);

    const handleUpdatePhaseData = (docId, content) => {
        const newPhasesData = { ...projectData.phasesData, [docId]: { ...projectData.phasesData[docId], content, status: 'todo' } };
        handleSave({ phasesData: newPhasesData });
        logAction('Update Document Content', docId, { newContentLength: content.length });
    };

    const handleCompletePhase = (docId) => {
        handleUpdateDocument(docId, 'Approved');
        logAction('Complete Document Phase Card', docId, { status: 'Approved' });
    };

    const handleUpdateDocument = (docId, newStatus) => {
        const newDocuments = projectData.documents.map(doc => 
            doc && doc.id === docId ? { ...doc, status: newStatus } : doc
        );
        handleSave({ documents: newDocuments });
        logAction('Update Document Status', docId, { newStatus });
    };

    const handleUpdateTask = (taskId, updatedData) => {
        // FIX: Use Object.assign to fix "Spread types may only be created from object types" error.
        const newTasks = projectData.tasks.map(task =>
            task.id === taskId ? Object.assign({}, task, updatedData) : task
        );
    
        const taskToUpdate = projectData.tasks.find(t => t.id === taskId);
        if (taskToUpdate && updatedData.status === 'done' && taskToUpdate.status !== 'done') {
            const completedTaskId = taskToUpdate.id;
            
            const notificationsToSend = [];
            const dependentTasks = newTasks.filter(t => t.dependsOn?.includes(completedTaskId));
            
            dependentTasks.forEach(dependentTask => {
                const allDependenciesMet = dependentTask.dependsOn.every(depId => {
                    const depTask = newTasks.find(t => t.id === depId);
                    return depTask && depTask.status === 'done';
                });
    
                if (allDependenciesMet) {
                    const role = dependentTask.role;
                    if (role) {
                        const assignedPerson = projectData.team.find(member => member.role === role);
                        if (assignedPerson && assignedPerson.name && assignedPerson.email) {
                            notificationsToSend.push({
                                recipientName: assignedPerson.name,
                                recipientEmail: assignedPerson.email,
                                taskName: dependentTask.name,
                            });
                            logAction('Prepare Notification', dependentTask.name, { recipient: assignedPerson.email });
                        }
                    }
                }
            });

            if (notificationsToSend.length > 0) {
                setNotificationQueue(prevQueue => [...prevQueue, ...notificationsToSend]);
            }
        }
    
        handleSave({ tasks: newTasks });
        logAction('Update Task', taskId, { updatedData });
    };

    const handleUpdateProject = (update) => {
        handleSave(update);
        logAction('Update Project Data from Child', project.name, { update });
    };

    const handleAttachFile = (docId: string, fileData: { name: string, data: string }) => {
        const newPhasesData = { ...projectData.phasesData };
        const phase = newPhasesData[docId] || { content: '', status: 'todo' };
        const attachments = phase.attachments || [];
        if (attachments.some(att => att.name === fileData.name)) {
            alert(`A file named "${fileData.name}" is already attached to this document.`);
            return;
        }
        const newAttachments = [...attachments, fileData];
        newPhasesData[docId] = { ...phase, attachments: newAttachments };

        handleSave({ phasesData: newPhasesData });
        logAction('Attach File', docId, { fileName: fileData.name });
    };

    const handleRemoveAttachment = (docId: string, fileName: string) => {
        const newPhasesData = { ...projectData.phasesData };
        const phase = newPhasesData[docId];
        if (!phase || !phase.attachments) return;

        const newAttachments = phase.attachments.filter(att => att.name !== fileName);
        newPhasesData[docId] = { ...phase, attachments: newAttachments };

        handleSave({ phasesData: newPhasesData });
        logAction('Remove Attachment', docId, { fileName });
    };

    const handleGenerateContent = async (docId) => {
        const docToGenerate = projectData.documents.find(d => d.id === docId);
        if (!docToGenerate) {
            setError(`Could not find document with ID ${docId} to generate content.`);
            return;
        }
    
        setLoadingPhase(docId);
        setError('');
        try {
            const prerequisiteDocs = projectData.documents.filter(d =>
                d.phase < docToGenerate.phase && d.status === 'Approved'
            );
            let context = prerequisiteDocs.map(d =>
                `--- ${d.title} ---\n${projectData.phasesData[d.id]?.content || 'Content not available.'}`
            ).join('\n\n');
    
            const phaseIdForPrompt = `phase${docToGenerate.phase}`;
            const promptFn = PROMPTS[phaseIdForPrompt];
            if (!promptFn) {
                throw new Error(`No prompt function found for ${phaseIdForPrompt}`);
            }
            const prompt = promptFn(project.name, project.discipline, context, project.mode, project.scope);
            
            logAction('Generate AI Content for Document', docId, { promptLength: prompt.length, mode: project.mode });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
    
            const newContent = response.text;
            const newPhasesData = { ...projectData.phasesData, [docId]: { ...projectData.phasesData[docId], content: newContent, status: 'todo' } };
            
            let updatedDocuments = [...projectData.documents];
            let docAdded = false;
    
            const phaseNumber = docToGenerate.phase;
            if (phaseNumber) {
                const singleDocPhases = {
                    phase6: 'Preliminary Review',
                    phase8: ['Sprint Plan Review', 'Critical Review'],
                    phase9: 'Deployment Review',
                };
    
                const docTitlesToUpdate = singleDocPhases[phaseIdForPrompt];
                if (docTitlesToUpdate) {
                    const titles = Array.isArray(docTitlesToUpdate) ? docTitlesToUpdate : [docTitlesToUpdate];
                    
                    titles.forEach(title => {
                        if (!updatedDocuments.some(d => d.title === title)) {
                             updatedDocuments.push({
                                id: `doc-${title.replace(/\s+/g, '')}-${Date.now()}`,
                                title: title,
                                version: 'v1.0',
                                status: 'Working',
                                owner: 'A. User',
                                phase: phaseNumber,
                            });
                            docAdded = true;
                        }
                    });
                }
            }
    
            const finalUpdate = {
                phasesData: newPhasesData,
                ...(docAdded && { documents: updatedDocuments }),
            };
            
            handleSave(finalUpdate);
            logAction('Update Document Content and Save Project', docId, { newContentLength: newContent.length, docsAdded: docAdded });
    
        } catch (err) {
            console.error("API Error:", err);
            setError(`Failed to generate content for ${docToGenerate.title}. Please try again.`);
            logAction('Error AI Content for Document', docId, { error: err.message });
        } finally {
            setLoadingPhase(null);
        }
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard': return <DashboardView project={projectData} phasesData={projectData.phasesData} isPlanningComplete={isPlanningComplete} projectPhases={projectPhases} />;
            case 'Project Phases': return <ProjectPhasesView project={project} projectPhases={projectPhases} phasesData={projectData.phasesData} documents={projectData.documents} error={error} loadingPhase={loadingPhase} handleUpdatePhaseData={handleUpdatePhaseData} handleCompletePhase={handleCompletePhase} handleGenerateContent={handleGenerateContent} handleAttachFile={handleAttachFile} handleRemoveAttachment={handleRemoveAttachment} />;
            case 'Documents': return <DocumentsView documents={projectData.documents} onUpdateDocument={handleUpdateDocument} />;
            case 'Project Tracking': return <ProjectTrackingView project={projectData} tasks={projectData.tasks} sprints={project.sprints} milestones={projectData.milestones} projectStartDate={project.startDate} projectEndDate={projectData.endDate} onUpdateTask={handleUpdateTask} onUpdateTeam={(team) => handleUpdateProject({ team })} />;
            case 'Revision Control': return <RevisionControlView project={projectData} onUpdateProject={handleUpdateProject} ai={ai} />;
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
                <button onClick={() => handleTabChange('Dashboard')} className={activeTab === 'Dashboard' ? 'active' : ''} disabled={!isPlanningComplete} title={!isPlanningComplete ? "Dashboard is locked until all planning documents are approved." : "View Dashboard"}>Dashboard</button>
                <button onClick={() => handleTabChange('Project Phases')} className={activeTab === 'Project Phases' ? 'active' : ''}>Project Phases</button>
                <button onClick={() => handleTabChange('Project Tracking')} className={activeTab === 'Project Tracking' ? 'active' : ''}>Project Tracking</button>
                <button onClick={() => handleTabChange('Documents')} className={activeTab === 'Documents' ? 'active' : ''}>Documents</button>
                <button onClick={() => handleTabChange('Revision Control')} className={activeTab === 'Revision Control' ? 'active' : ''}>Revision Control</button>
            </nav>

            <div>
                {renderContent()}
            </div>
            
            {notificationQueue.length > 0 && (
                <NotificationModal
                    isOpen={true}
                    notification={notificationQueue[0]}
                    onClose={() => setNotificationQueue(q => q.slice(1))}
                    onSend={() => {
                        logAction('Send Notification', notificationQueue[0].taskName, { recipient: notificationQueue[0].recipientEmail });
                        setNotificationQueue(q => q.slice(1));
                    }}
                />
            )}
        </section>
    );
};
