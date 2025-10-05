


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
    // If we are generating for a phase 1 doc, there is no prior context.
    // User input is handled separately in the calling function.
    if (docToGenerate.phase === 1) {
        return '';
    }

    // For all other phases, specifically find the approved "Concept Proposal".
    const conceptProposalDoc = allDocuments.find(doc =>
        doc.phase === 1 &&
        doc.title.toLowerCase().includes('concept proposal') &&
        doc.status === 'Approved'
    );

    if (!conceptProposalDoc) {
        console.warn("Context generation: 'Concept Proposal' is not approved yet.");
        return "CRITICAL: The context from the 'Concept Proposal' is missing because it has not been approved. Generate the document based on its title and the project parameters alone.";
    }

    const phaseInfo = allPhasesData[conceptProposalDoc.id];
    // Prioritize compacted content for efficiency.
    const content = phaseInfo?.compactedContent || phaseInfo?.content;
    
    if (!content) {
         return `Content for ${conceptProposalDoc.title} is not available.`;
    }

    return `--- High-Level Project Context from "${conceptProposalDoc.title}" ---\n${content}`;
};


// Safety limits for API payload
const MAX_PAYLOAD_CHARS = 20000; // Drastically reduced to prevent potential 500 errors from large requests.

const truncatePrompt = (prompt: string): string => {
    if (prompt.length <= MAX_PAYLOAD_CHARS) {
        return prompt;
    }

    console.warn('Prompt is too large, truncating from the end to fit payload limits.');
    logAction('Truncate Prompt', 'Payload Management', { originalLength: prompt.length, newLength: MAX_PAYLOAD_CHARS });
    
    // Truncate from the end to preserve the initial instructions
    return prompt.substring(0, MAX_PAYLOAD_CHARS) + "\n...[PROMPT TRUNCATED DUE TO PAYLOAD SIZE]...";
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
                title: `${doc.title}`,
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
                    await handleGenerateContent(phaseIdForGeneration, { isAuto: true });
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

    const handleGenerateContent = async (docId, options: { isAuto?: boolean, currentContent?: string } = {}) => {
        const { isAuto = false, currentContent = null } = options;

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
            const { name, discipline, mode, scope, teamSize } = projectData;
            const docTitle = docToGenerate.title;
            const titleLowerCase = docTitle.toLowerCase();
            const phase = docToGenerate.phase;
            let promptText;

            // Create a separate, clear path for the Concept Proposal.
            // For this specific document, the primary input ("context") is the user's raw text entry.
            if (titleLowerCase.includes('concept proposal')) {
                const userInput = currentContent !== null ? currentContent : (projectData.phasesData?.[docId]?.content || '');

                // Persist the user's input if it was passed fresh from the card's state.
                if (currentContent !== null && userInput !== (projectData.phasesData?.[docId]?.content)) {
                    handleUpdatePhaseData(docId, userInput, null); // Save the input and invalidate any old compacted content.
                }
                
                promptText = PROMPTS.phase1(name, discipline, userInput, mode, scope, teamSize, complexity);

            } else {
                // For ALL other documents, derive context from previously approved documents using the standard method.
                const context = getRelevantContext(docToGenerate, projectData.documents, projectData.phasesData);

                if (titleLowerCase.includes('resources & skills list')) {
                    promptText = PROMPTS.phase2(name, discipline, context, mode, scope, teamSize, complexity);
                } else if (titleLowerCase.includes('swot analysis')) {
                    promptText = PROMPTS.phase3(name, discipline, context, mode, scope, teamSize, complexity);
                } else if (titleLowerCase.includes('kickoff briefing')) {
                    promptText = PROMPTS.phase4(name, discipline, context, mode, scope, teamSize, complexity);
                } else if (titleLowerCase.includes('statement of work')) {
                    promptText = PROMPTS.phase5(name, discipline, context, mode, scope, teamSize, complexity);
                } else if (titleLowerCase.includes('preliminary review')) {
                    promptText = PROMPTS.phase6(name, discipline, context, mode, scope, teamSize, complexity);
                } else if (titleLowerCase.includes('detailed plans') || titleLowerCase.includes('project timeline')) {
                    promptText = PROMPTS.phase7(name, discipline, context, mode, scope, teamSize, complexity);
                } else if (phase === 8) {
                    if (titleLowerCase.includes('sprint requirements') || titleLowerCase.includes('user story backlog')) {
                        promptText = PROMPTS.phase8_sprintRequirements(name, discipline, context, mode, scope, teamSize, complexity);
                    } else if (titleLowerCase.includes('sprint plan review')) {
                        promptText = PROMPTS.phase8_sprintPlanReview(name, discipline, context, mode, scope, teamSize, complexity);
                    } else if (titleLowerCase.includes('critical review')) {
                        promptText = PROMPTS.phase8_criticalReview(name, discipline, context, mode, scope, teamSize, complexity);
                    } else {
                        promptText = PROMPTS.phase8_generic(docTitle, name, discipline, context, mode, scope, teamSize, complexity);
                    }
                } else {
                    promptText = PROMPTS.phase8_generic(docTitle, name, discipline, context, mode, scope, teamSize, complexity);
                }
            }
            
            const finalPrompt = truncatePrompt(promptText);
            logAction('Generate Content Start', project.name, { docTitle: docToGenerate.title, promptLength: finalPrompt.length });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: finalPrompt,
            });
            
            generatedContent = response.text;
            logAction('Generate Content Success', project.name, { docTitle: docToGenerate.title });
        } catch (err) {
            console.error("API Error generating content:", err);
            setError(`Failed to generate content for ${docToGenerate.title}. Please check the console and try again.`);
            logAction('Generate Content Failure', project.name, { docTitle: docToGenerate.title, error: err.message });
            setLoadingPhase({ docId: null, step: null });
            return;
        }

        // Step 2: Conditionally compact content ONLY for the Concept Proposal
        if (docToGenerate.title.toLowerCase().includes('concept proposal')) {
            setLoadingPhase({ docId, step: 'compacting' });

            if (generatedContent.length > MAX_PAYLOAD_CHARS - 1000) {
                console.warn(`Content for ${docToGenerate.title} is very large (${generatedContent.length} chars). Using a truncated version for context to avoid compaction errors.`);
                logAction('Compact Content Skipped (Too Large)', project.name, { docTitle: docToGenerate.title, length: generatedContent.length });
                const truncatedForContext = generatedContent.substring(0, MAX_PAYLOAD_CHARS - 1000) + "\n\n...[CONTENT TRUNCATED FOR CONTEXT DUE TO SIZE LIMITS]...";
                handleUpdatePhaseData(docId, generatedContent, truncatedForContext);
                if (!isAuto) {
                    alert('Content generated successfully. NOTE: Due to its large size, a truncated version will be used for future AI context to prevent errors.');
                }
                setLoadingPhase({ docId: null, step: null });
                return;
            }

            try {
                const compactionPrompt = PROMPTS.compactContent(generatedContent);
                logAction('Compact Content Start', project.name, { docTitle: docToGenerate.title, promptLength: compactionPrompt.length });
                const compactResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: compactionPrompt,
                });
                const compactedContent = compactResponse.text;
                handleUpdatePhaseData(docId, generatedContent, compactedContent);
                logAction('Compact Content Success', project.name, { docTitle: docToGenerate.title });
                if (!isAuto) {
                    alert('Content generated and compacted successfully.');
                }
            } catch (err) {
                console.error("API Error compacting content:", err);
                logAction('Compact Content Failure', project.name, { docTitle: docToGenerate.title, error: err.message });
                handleUpdatePhaseData(docId, generatedContent, null); // Save with null compacted content on failure
            } finally {
                setLoadingPhase({ docId: null, step: null });
            }
        } else {
            // For all other documents, skip compaction.
            handleUpdatePhaseData(docId, generatedContent, null);
            logAction('Compact Content Skipped (Not Concept Proposal)', project.name, { docTitle: docToGenerate.title });
            if (!isAuto) {
                alert('Content generated successfully.');
            }
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