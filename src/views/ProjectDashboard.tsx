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
    const [phasesData, setPhasesData] = useState(project.phasesData || {});
    const [documents, setDocuments] = useState(project.documents || []);
    const [tasks, setTasks] = useState(project.tasks || []);
    const [milestones, setMilestones] = useState(project.milestones || []);
    const [projectMetrics, setProjectMetrics] = useState({
        budget: project.budget,
        startDate: project.startDate,
        endDate: project.endDate,
    });
    
    const [loadingPhase, setLoadingPhase] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [notificationQueue, setNotificationQueue] = useState([]);
    const configuredProjectIdRef = useRef(null);
    const prevDocumentsRef = useRef(project.documents);

    const projectPhases = useMemo(() => {
        if (!project || !Array.isArray(project.documents)) {
            return [];
        }

        // Create a "phase" for each document, sorted by the original phase number.
        const sortedDocuments = [...project.documents].sort((a, b) => {
            if (a.phase !== b.phase) {
                return a.phase - b.phase;
            }
            return a.title.localeCompare(b.title);
        });

        return sortedDocuments.map(doc => {
            // FIX: Explicitly type `staticPhaseInfo` to ensure the `description` property is recognized, even when the object is empty.
            const staticPhaseInfo: { description?: string } = PHASES[doc.phase - 1] || {};
            return {
                id: doc.id, // Use the document's own ID
                title: `Phase ${doc.phase}: ${doc.title}`,
                description: staticPhaseInfo.description || `Actions related to the '${doc.title}' document.`,
                originalPhaseId: `phase${doc.phase}`, // For finding the correct prompt
                docId: doc.id, // Explicitly pass docId
            };
        });
    }, [project.documents]);

    const isPlanningComplete = useMemo(() => {
        const allRequiredDocTitles = [...new Set(Object.values(PHASE_DOCUMENT_REQUIREMENTS).flat())];
        const allDocsApproved = allRequiredDocTitles.every(title => {
            const doc = project.documents.find(d => d.title === title);
            return doc && doc.status === 'Approved';
        });
        return allDocsApproved && project.tasks && project.tasks.length > 0;
    }, [project.documents, project.tasks]);


    const handleTabChange = (tabName) => {
        logAction('Navigate Tab', tabName, { from: activeTab, to: tabName });
        setActiveTab(tabName);
        localStorage.setItem(`hmap-active-tab-${project.id}`, tabName);
    };

    const parseAndPopulateProjectPlan = () => {
        // Find the "Detailed Plans" document content from phasesData using its ID
        const planDocument = project.documents.find(d => d.title === 'Detailed Plans (WBS/WRS)');
        const planContent = planDocument ? project.phasesData?.[planDocument.id]?.content : undefined;
        
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

                const newChecklistDocs = [];
                const existingDocTitles = new Set(project.documents.map(d => d.title));
        
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
                                // Associate the checklist with the phase where the plan was made
                                phase: 7, 
                            });
                        }
                    }
                });
                
                const updatedDocuments = [...project.documents, ...newChecklistDocs];

                setTasks(parsedTasks);
                setMilestones(parsedMilestones);
                setDocuments(updatedDocuments);
                setProjectMetrics(prev => ({ ...prev, endDate: newProjectEndDate }));
                saveProject({ ...project, tasks: parsedTasks, milestones: parsedMilestones, endDate: newProjectEndDate, documents: updatedDocuments });
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
            const newDoc = project.documents.find(d => d.title === docTitle);
            return oldDoc?.status !== 'Approved' && newDoc?.status === 'Approved';
        };

        const planDocsApproved = docWasJustApproved('Detailed Plans (WBS/WRS)') && docWasJustApproved('Project Timeline');
        if (planDocsApproved) {
            parseAndPopulateProjectPlan();
        }

        // If all planning is done and we aren't already there, go to tracking.
        if (isPlanningComplete && activeTab !== 'Project Tracking') {
            logAction('Auto-Navigate', 'Planning complete', { to: 'Project Tracking' });
            handleTabChange('Project Tracking');
        }

        prevDocumentsRef.current = project.documents;
    }, [project.documents, project.tasks, activeTab, isPlanningComplete]);


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

            let initialTab = localStorage.getItem(`hmap-active-tab-${project.id}`) || 'Project Phases';
            const newProjectId = sessionStorage.getItem('hmap-new-project-id');

            if (newProjectId === project.id) {
                // If it's a new project, start at Project Phases.
                sessionStorage.removeItem('hmap-new-project-id');
                initialTab = 'Project Phases';
            } else if (isPlanningComplete) {
                // If planning is complete, default to tracking, unless another tab was saved
                initialTab = localStorage.getItem(`hmap-active-tab-${project.id}`) || 'Project Tracking';
            } else {
                 // Otherwise, default to the phases view
                 initialTab = 'Project Phases';
            }
            
            // If dashboard is locked, don't default to it.
            if (initialTab === 'Dashboard' && !isPlanningComplete) {
                initialTab = 'Project Phases';
            }

            setActiveTab(initialTab);
            localStorage.setItem(`hmap-active-tab-${project.id}`, initialTab);
        }
    }, [project, isPlanningComplete]);

    const handleUpdatePhaseData = (docId, content) => {
        // Content for each document is stored under its own ID
        const newPhasesData = { ...phasesData, [docId]: { ...phasesData[docId], content, status: 'todo' } };
        setPhasesData(newPhasesData);
        saveProject({ ...project, phasesData: newPhasesData });
        logAction('Update Document Content', docId, { newContentLength: content.length });
    };

    const handleCompletePhase = (docId) => {
        // "Completing" a document's phase card is the same as approving the document
        handleUpdateDocument(docId, 'Approved');
        logAction('Complete Document Phase Card', docId, { status: 'Approved' });
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
    
        const taskToUpdate = tasks.find(t => t.id === taskId);
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
                        const assignedPerson = project.team.find(member => member.role === role);
                        // Ensure name and email are present to send a valid notification
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
    
        setTasks(newTasks);
        saveProject({ ...project, tasks: newTasks });
        logAction('Update Task', taskId, { updatedData });
    };

    const handleUpdateTeam = (newTeam) => {
        saveProject({ ...project, team: newTeam });
        logAction('Update Team', project.name, { team: newTeam });
    };
    
    const handleAttachFile = (docId: string, fileData: { name: string, data: string }) => {
        const newPhasesData = { ...phasesData };
        const phase = newPhasesData[docId] || { content: '', status: 'todo' };
        const attachments = phase.attachments || [];
        if (attachments.some(att => att.name === fileData.name)) {
            alert(`A file named "${fileData.name}" is already attached to this document.`);
            return;
        }
        const newAttachments = [...attachments, fileData];
        newPhasesData[docId] = { ...phase, attachments: newAttachments };

        setPhasesData(newPhasesData);
        saveProject({ ...project, phasesData: newPhasesData });
        logAction('Attach File', docId, { fileName: fileData.name });
    };

    const handleRemoveAttachment = (docId: string, fileName: string) => {
        const newPhasesData = { ...phasesData };
        const phase = newPhasesData[docId];
        if (!phase || !phase.attachments) return;

        const newAttachments = phase.attachments.filter(att => att.name !== fileName);
        newPhasesData[docId] = { ...phase, attachments: newAttachments };

        setPhasesData(newPhasesData);
        saveProject({ ...project, phasesData: newPhasesData });
        logAction('Remove Attachment', docId, { fileName });
    };


    const handleGenerateContent = async (docId) => {
        const docToGenerate = project.documents.find(d => d.id === docId);
        if (!docToGenerate) {
            setError(`Could not find document with ID ${docId} to generate content.`);
            return;
        }

        setLoadingPhase(docId);
        setError('');
        try {
            // Context is built from the content of all previously approved documents.
            const prerequisiteDocs = project.documents.filter(d =>
                d.phase < docToGenerate.phase && d.status === 'Approved'
            );
            let context = prerequisiteDocs.map(d =>
                `--- ${d.title} ---\n${phasesData[d.id]?.content || 'Content not available.'}`
            ).join('\n\n');

            // The prompt is determined by the document's original HMAP phase.
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

            handleUpdatePhaseData(docId, response.text);
            
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
                    const updatedDocuments = [...project.documents];
                    let docAdded = false;

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
                    
                    if (docAdded) {
                        saveProject({ ...project, documents: updatedDocuments });
                    }
                }
            }


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
            case 'Dashboard': return <DashboardView project={{...project, ...projectMetrics}} phasesData={phasesData} isPlanningComplete={isPlanningComplete} projectPhases={projectPhases} />;
            case 'Project Phases': return <ProjectPhasesView project={project} projectPhases={projectPhases} phasesData={phasesData} documents={documents} error={error} loadingPhase={loadingPhase} handleUpdatePhaseData={handleUpdatePhaseData} handleCompletePhase={handleCompletePhase} handleGenerateContent={handleGenerateContent} handleAttachFile={handleAttachFile} handleRemoveAttachment={handleRemoveAttachment} />;
            case 'Documents': return <DocumentsView documents={documents} onUpdateDocument={handleUpdateDocument} />;
            case 'Project Tracking': return <ProjectTrackingView project={project} tasks={tasks} sprints={project.sprints} milestones={milestones} projectStartDate={project.startDate} projectEndDate={projectMetrics.endDate} onUpdateTask={handleUpdateTask} onUpdateTeam={handleUpdateTeam} />;
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
                    onClose={() => setNotificationQueue(q => q.slice(1))} // Cancel or close
                    onSend={() => {
                        logAction('Send Notification', notificationQueue[0].taskName, { recipient: notificationQueue[0].recipientEmail });
                        setNotificationQueue(q => q.slice(1)); // Send
                    }}
                />
            )}
        </section>
    );
};