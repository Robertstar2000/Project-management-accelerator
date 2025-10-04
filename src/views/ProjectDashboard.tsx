


import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

const getRelevantContext = (docToGenerate, allDocuments, allPhasesData) => {
    const phaseNumber = docToGenerate.phase;
    let requiredDocTitles = [];

    switch (phaseNumber) {
        case 2:
            requiredDocTitles = ['Concept Proposal'];
            break;
        case 3:
            requiredDocTitles = ['Concept Proposal'];
            break;
        case 4:
            requiredDocTitles = ['Concept Proposal', 'Resources & Skills List', 'SWOT Analysis'];
            break;
        case 5:
            requiredDocTitles = ['Concept Proposal', 'Resources & Skills List', 'Kickoff Briefing'];
            break;
        case 7:
            requiredDocTitles = ['Statement of Work (SOW)', 'Resources & Skills List'];
            break;
        case 8:
            requiredDocTitles = ['Detailed Plans (WBS/WRS)', 'Statement of Work (SOW)'];
            break;
        default:
            const prevPhaseDocs = allDocuments.filter(d => d.phase === phaseNumber - 1 && d.status === 'Approved');
            requiredDocTitles = prevPhaseDocs.map(d => d.title);
            break;
    }

    const contextDocs = allDocuments.filter(doc => 
        requiredDocTitles.includes(doc.title) && doc.status === 'Approved'
    );
    
    if (contextDocs.length === 0 && phaseNumber > 1) {
         const prevPhaseDocs = allDocuments.filter(d => d.phase === phaseNumber - 1 && d.status === 'Approved');
         return prevPhaseDocs.map(d => `--- ${d.title} ---\n${allPhasesData[d.id]?.content || 'Content not available.'}`).join('\n\n');
    }
    
    const contextStrings = contextDocs.map(d => {
        const phaseInfo = allPhasesData[d.id];
        // Prioritize compacted content for efficiency, falling back to full content.
        let content = phaseInfo?.compactedContent || phaseInfo?.content || 'Content not available.';
        return `--- ${d.title} (AI Context) ---\n${content}`;
    });

    return contextStrings.join('\n\n');
};

// Safety limits for API payload
const MAX_PAYLOAD_CHARS = 900000; // Be conservative to avoid 1MB limit.
const MAX_OUTPUT_TOKENS_ESTIMATE_CHARS = 8000 * 4; // Reserve ~32k chars for output (matches maxOutputTokens)

const truncatePrompt = (prompt: string): string => {
    const totalLimit = MAX_PAYLOAD_CHARS - MAX_OUTPUT_TOKENS_ESTIMATE_CHARS;
    if (prompt.length <= totalLimit) {
        return prompt;
    }

    console.warn('Prompt is too large, truncating from the end to fit payload limits.');
    logAction('Truncate Prompt', 'Payload Management', { originalLength: prompt.length, newLength: totalLimit });
    
    // Truncate from the end to preserve the initial instructions
    return prompt.substring(0, totalLimit) + "\n...[PROMPT TRUNCATED DUE TO PAYLOAD SIZE]...";
};


export const ProjectDashboard = ({ project, onBack, ai, saveProject }) => {
    const [projectData, setProjectData] = useState({ ...project });
    const [loadingPhase, setLoadingPhase] = useState<{ docId: string | null; step: 'generating' | 'compacting' | null }>({ docId: null, step: null });
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [notificationQueue, setNotificationQueue] = useState([]);
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);
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

    const handleSave = (update) => {
        setProjectData(prevData => {
            const dataToMerge = typeof update === 'function' ? update(prevData) : update;
            const newState = { ...prevData, ...dataToMerge };
            saveProject(newState);
            return newState;
        });
    };

    const handleTabChange = useCallback((tabName) => {
        setActiveTab(currentTab => {
            logAction('Navigate Tab', tabName, { from: currentTab, to: tabName });
            return tabName;
        });
        localStorage.setItem(`hmap-active-tab-${project.id}`, tabName);
    }, [project.id]);

    useEffect(() => {
        // Smart navigation: If this is a newly created project, go to the Phases tab.
        const newProjectId = sessionStorage.getItem('hmap-new-project-id');
        if (newProjectId === project.id) {
            handleTabChange('Project Phases');
            // Clean up the session flag so it doesn't trigger again on refresh.
            sessionStorage.removeItem('hmap-new-project-id');
        } else {
            // Otherwise, load the last active tab for this project from localStorage.
            const savedTab = localStorage.getItem(`hmap-active-tab-${project.id}`);
            if (savedTab) {
                setActiveTab(savedTab);
            }
        }
    }, [project.id, handleTabChange]);

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
    
                // Resolve dependencies from names to IDs
                parsedTasks.forEach(task => {
                    task.dependsOn = task.dependsOn
                        .map(depName => taskNameMap.get(depName))
                        .filter(Boolean); // Filter out any unresolved dependencies
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
                }));
            }
            
            if (parsedTasks.length > 0) {
                const lastTask = parsedTasks.reduce((latest, current) => {
                    return new Date(latest.endDate) > new Date(current.endDate) ? latest : current;
                });
                
                handleSave({ 
                    tasks: parsedTasks, 
                    milestones: parsedMilestones, 
                    endDate: lastTask.endDate, // Update project end date based on plan
                });
                logAction('Parse Project Plan Success', project.name, { taskCount: parsedTasks.length, milestoneCount: parsedMilestones.length });
                alert('Project plan successfully parsed and populated in the "Project Tracking" tab.');
            } else {
                 throw new Error("No tasks were found in the document.");
            }
    
        } catch (e) {
            console.error("Failed to parse project plan:", e);
            logAction('Parse Project Plan Failure', project.name, { error: e.message });
            alert("Error: Could not parse the project plan from the document. Please check the document's formatting in the 'Project Phases' tab and try again. The document must contain '## Tasks' and '## Milestones' sections with valid Markdown tables.");
        }
    };

    useEffect(() => {
        const planDoc = projectData.documents.find(d => d.title === 'Detailed Plans (WBS/WRS)');
        const prevPlanDoc = prevDocumentsRef.current.find(d => d.title === 'Detailed Plans (WBS/WRS)');

        if (planDoc && prevPlanDoc && planDoc.status === 'Approved' && prevPlanDoc.status !== 'Approved') {
            parseAndPopulateProjectPlan();
        }

        prevDocumentsRef.current = projectData.documents;
    }, [projectData.documents]);
    
    useEffect(() => {
        if (project) {
            setProjectData(project);
        }
    }, [project]);

    useEffect(() => {
        // Only run auto-generation logic if the mode is 'automatic' and we're not already running it.
        if (projectData.generationMode !== 'automatic' || isAutoGenerating) return;

        const docsToGenerate = projectData.documents.filter(doc => doc.status !== 'Approved');
        
        // Find the first document that is not approved and is not locked.
        const nextDocToProcess = docsToGenerate.find(doc => {
             const prevPhaseNumber = doc.phase - 1;
             if (prevPhaseNumber > 0) {
                 const prevPhaseDocs = projectData.documents.filter(d => d.phase === prevPhaseNumber);
                 return prevPhaseDocs.every(pd => pd.status === 'Approved');
             }
             return true; // Phase 1 docs are never locked by a previous phase.
        });

        if (nextDocToProcess) {
            const processNextDoc = async () => {
                setIsAutoGenerating(true);
                // 1. Generate content for the document
                const phaseIdForGeneration = projectPhases.find(p => p.docId === nextDocToProcess.id)?.id;
                if (phaseIdForGeneration) {
                    await handleGenerateContent(phaseIdForGeneration, true); // Pass flag to indicate auto-mode
                }
                
                // 2. Mark it as "Approved"
                // The state update from handleGenerateContent might be async, so we use a timeout
                // to allow the state to hopefully be updated before we complete it. A more robust
                // solution might involve passing a callback to handleGenerateContent.
                setTimeout(() => {
                    handleCompletePhase(nextDocToProcess.id, true); // Mark as approved
                    setIsAutoGenerating(false); // Allow the useEffect to pick up the next doc
                }, 1000); // 1-second delay to allow state to settle.
            };
            processNextDoc();
        } else {
            // No more documents to process, turn off automatic mode.
            handleSave({ generationMode: 'manual' });
        }

    }, [projectData, projectPhases, isAutoGenerating]); // Rerun when project data changes

    const handleUpdatePhaseData = (docId, content, compactedContent = undefined) => {
        handleSave(prevData => {
            const newPhasesData = { ...prevData.phasesData };
            const currentData = newPhasesData[docId] || { attachments: [] };

            if (compactedContent === undefined && content !== currentData.content) {
                currentData.compactedContent = null;
            } else if (compactedContent !== undefined) {
                currentData.compactedContent = compactedContent;
            }
            
            currentData.content = content;
            newPhasesData[docId] = currentData;
            return { phasesData: newPhasesData };
        });
    };

    const handleCompletePhase = (docId, isAuto = false) => {
        handleSave(prevData => ({
            documents: prevData.documents.map(doc =>
                doc.id === docId ? { ...doc, status: 'Approved' } : doc
            )
        }));
        if (!isAuto) {
            alert(`Document marked as "Approved". You can now proceed to the next phase.`);
        }
        logAction('Complete Phase', project.name, { docId });
    };

    const handleGenerateContent = async (docId, isAuto = false) => {
        const docToGenerate = projectData.documents.find(d => d.id === docId);
        if (!docToGenerate) {
            setError('Could not find the document to generate content for.');
            return;
        }

        setError('');
        let generatedContent = '';
        const complexity = projectData.complexity || 'typical';

        // Step 1: Generate human-readable content
        setLoadingPhase({ docId, step: 'generating' });
        try {
            // FIX: Passed the correct arguments to `getRelevantContext`. It requires the specific document to generate, all documents, and all phase data.
            const context = getRelevantContext(docToGenerate, projectData.documents, projectData.phasesData);
            const promptFn = PROMPTS[`phase${docToGenerate.phase}`] || PROMPTS.phase8_generic;
            let promptText;

            // Handle specific named documents in phase 8
            if (docToGenerate.phase === 8) {
                if (docToGenerate.title.includes('Sprint Requirements') || docToGenerate.title.includes('User Story Backlog')) {
                    promptText = PROMPTS.phase8_sprintRequirements(projectData.name, projectData.discipline, context, project.mode, project.scope, project.teamSize, complexity);
                } else if (docToGenerate.title.includes('Sprint Plan Review')) {
                    promptText = PROMPTS.phase8_sprintPlanReview(projectData.name, projectData.discipline, context, project.mode, project.scope, project.teamSize, complexity);
                } else if (docToGenerate.title.includes('Critical Review')) {
                    promptText = PROMPTS.phase8_criticalReview(projectData.name, projectData.discipline, context, project.mode, project.scope, project.teamSize, complexity);
                } else {
                    promptText = PROMPTS.phase8_generic(docToGenerate.title, projectData.name, projectData.discipline, context, project.mode, project.scope, project.teamSize, complexity);
                }
            } else {
                promptText = promptFn(projectData.name, projectData.discipline, context, project.mode, project.scope, project.teamSize, complexity);
            }
            
            const finalPrompt = truncatePrompt(promptText);
            logAction('Generate Content Start', project.name, { docTitle: docToGenerate.title, promptLength: finalPrompt.length });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: finalPrompt,
                config: {
                    maxOutputTokens: 7900,
                    thinkingConfig: { thinkingBudget: 1000 },
                }
            });
            
            generatedContent = response.text;
            handleUpdatePhaseData(docId, generatedContent, null); // Save human-readable content, invalidate compacted
            logAction('Generate Content Success', project.name, { docTitle: docToGenerate.title });
        } catch (err) {
            console.error("API Error generating content:", err);
            setError(`Failed to generate content for ${docToGenerate.title}. Please check the console and try again.`);
            logAction('Generate Content Failure', project.name, { docTitle: docToGenerate.title, error: err.message });
            setLoadingPhase({ docId: null, step: null });
            return;
        }

        // Step 2: Compact the generated content for future context
        setLoadingPhase({ docId, step: 'compacting' });
        try {
            const compactionPrompt = PROMPTS.compactContent(generatedContent);
            const finalCompactionPrompt = truncatePrompt(compactionPrompt);
            logAction('Compact Content Start', project.name, { docTitle: docToGenerate.title, promptLength: finalCompactionPrompt.length });
            
            const compactResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: finalCompactionPrompt,
                config: {
                    maxOutputTokens: 7900,
                    thinkingConfig: { thinkingBudget: 1000 },
                }
            });
            
            const compactedContent = compactResponse.text;
            handleUpdatePhaseData(docId, generatedContent, compactedContent); // Update with compacted content
            logAction('Compact Content Success', project.name, { docTitle: docToGenerate.title });
            
            if (!isAuto) {
                alert('Content generated and compacted successfully.');
            }
        } catch (err) {
            console.error("API Error compacting content:", err);
            logAction('Compact Content Failure', project.name, { docTitle: docToGenerate.title, error: err.message });
        } finally {
            setLoadingPhase({ docId: null, step: null });
        }
    };
    
    const handleAttachFile = (docId, file) => {
        handleSave(prevData => {
            const phaseData = prevData.phasesData[docId] || { content: '', attachments: [] };
            const updatedAttachments = [...phaseData.attachments, file];
            const newPhasesData = { ...prevData.phasesData, [docId]: { ...phaseData, attachments: updatedAttachments } };
            return { phasesData: newPhasesData };
        });
    };

    const handleRemoveAttachment = (docId, fileName) => {
        handleSave(prevData => {
            const phaseData = prevData.phasesData[docId];
            if (phaseData) {
                const updatedAttachments = phaseData.attachments.filter(f => f.name !== fileName);
                const newPhasesData = { ...prevData.phasesData, [docId]: { ...phaseData, attachments: updatedAttachments } };
                return { phasesData: newPhasesData };
            }
            return {};
        });
    };
    
    const handleUpdateDocumentStatus = (docId, newStatus) => {
        handleSave(prevData => ({
            documents: prevData.documents.map(doc => 
                doc.id === docId ? { ...doc, status: newStatus } : doc
            )
        }));
    };
    
    const handleUpdateTask = (taskId, updatedTask) => {
        setProjectData(prevData => {
            const updatedTasks = prevData.tasks.map(t => t.id === taskId ? updatedTask : t);
            const newState = { ...prevData, tasks: updatedTasks };
            saveProject(newState);

            if (updatedTask.status === 'done') {
                const dependentTasks = prevData.tasks.filter(t => t.dependsOn?.includes(taskId));
                dependentTasks.forEach(dependentTask => {
                    const isReady = dependentTask.dependsOn.every(depId => {
                        const prereq = updatedTasks.find(t => t.id === depId);
                        return prereq && prereq.status === 'done';
                    });
                    if (isReady) {
                        const assignedPerson = prevData.team.find(p => p.role === dependentTask.role);
                        if (assignedPerson && assignedPerson.email) {
                            setNotificationQueue(prevQueue => [...prevQueue, {
                                recipientName: assignedPerson.name,
                                recipientEmail: assignedPerson.email,
                                taskName: dependentTask.name,
                            }]);
                        }
                    }
                });
            }
            return newState;
        });
    };
    
    const handleUpdateTeam = (updatedTeam) => {
        handleSave({ team: updatedTeam });
    };

    const handleSetGenerationMode = (mode) => {
        if (mode === 'automatic' && !isAutoGenerating) {
            if (confirm("This will automatically generate and approve all remaining project documents. This process can take several minutes and cannot be stopped. Are you sure you want to proceed?")) {
                handleSave({ generationMode: 'automatic' });
            }
        } else {
            handleSave({ generationMode: 'manual' });
        }
    };

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'Dashboard':
                return <DashboardView project={projectData} phasesData={projectData.phasesData || {}} isPlanningComplete={isPlanningComplete} projectPhases={projectPhases} />;
            case 'Project Phases':
                return <ProjectPhasesView 
                            project={projectData} 
                            projectPhases={projectPhases}
                            phasesData={projectData.phasesData || {}}
                            documents={projectData.documents}
                            error={error}
                            loadingPhase={loadingPhase}
                            handleUpdatePhaseData={handleUpdatePhaseData}
                            handleCompletePhase={handleCompletePhase}
                            handleGenerateContent={handleGenerateContent}
                            handleAttachFile={handleAttachFile}
                            handleRemoveAttachment={handleRemoveAttachment}
                            generationMode={projectData.generationMode || 'manual'}
                            onSetGenerationMode={handleSetGenerationMode}
                            isAutoGenerating={isAutoGenerating}
                        />;
            case 'Documents':
                return <DocumentsView documents={projectData.documents} onUpdateDocument={handleUpdateDocumentStatus} />;
            case 'Project Tracking':
                return <ProjectTrackingView 
                            project={projectData}
                            tasks={projectData.tasks}
                            sprints={projectData.sprints}
                            milestones={projectData.milestones}
                            projectStartDate={projectData.startDate}
                            projectEndDate={projectData.endDate}
                            onUpdateTask={handleUpdateTask}
                            onUpdateTeam={handleUpdateTeam}
                        />;
            case 'Revision Control':
                return <RevisionControlView project={projectData} onUpdateProject={(d) => handleSave(d)} ai={ai} />;
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <>
            <div className="dashboard-header">
                <button className="button back-button" onClick={onBack}>← Back to Projects</button>
                <h1>{projectData.name}</h1>
                <p>
                    {projectData.discipline}
                    <span style={{ 
                        textTransform: 'capitalize', 
                        color: 'var(--accent-color)', 
                        backgroundColor: 'var(--card-background)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '1rem',
                        fontSize: '1rem',
                        marginLeft: '1rem',
                        fontWeight: 'bold'
                    }}>
                        {projectData.complexity || 'Typical'}
                    </span>
                </p>
            </div>

            <nav className="dashboard-nav">
                <button onClick={() => handleTabChange('Dashboard')} className={activeTab === 'Dashboard' ? 'active' : ''}>Dashboard</button>
                <button onClick={() => handleTabChange('Project Phases')} className={activeTab === 'Project Phases' ? 'active' : ''}>Project Phases</button>
                <button onClick={() => handleTabChange('Documents')} className={activeTab === 'Documents' ? 'active' : ''}>Documents</button>
                <button onClick={() => handleTabChange('Project Tracking')} className={activeTab === 'Project Tracking' ? 'active' : ''}>Project Tracking</button>
                <button onClick={() => handleTabChange('Revision Control')} className={activeTab === 'Revision Control' ? 'active' : ''}>Revision Control</button>
            </nav>
            
            {renderActiveTab()}

            <NotificationModal 
                isOpen={notificationQueue.length > 0}
                onClose={() => setNotificationQueue(prev => prev.slice(1))}
                onSend={() => {
                    logAction('Send Notification', 'Email', { notification: notificationQueue[0] });
                    alert(`Notification "sent" to ${notificationQueue[0].recipientEmail}.`);
                    setNotificationQueue(prev => prev.slice(1));
                }}
                notification={notificationQueue[0] || null}
            />
        </>
    );
};