

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { PHASES, PROMPTS, PHASE_DOCUMENT_REQUIREMENTS } from '../constants/projectData';
import { DashboardView } from '../tools/DashboardView';
import { ProjectPhasesView } from './ProjectPhasesView';
import { DocumentsView } from '../tools/DocumentsView';
import { ProjectTrackingView } from '../tools/ProjectTrackingView';
import { RevisionControlView } from '../tools/RevisionControlView';
import { logAction } from '../utils/logging';
import { NotificationModal } from '../components/NotificationModal';

// FIX: Changed to a standard async function declaration to avoid JSX parsing ambiguity with generic arrow functions.
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    let lastError: Error;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            console.warn(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`, error);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Exponential backoff
            }
        }
    }
    throw lastError;
};

const getPromptFunction = (docTitle, phase) => {
    const title = docTitle.toLowerCase();
    if (phase === 1 && title.includes('concept proposal')) return PROMPTS.phase1;
    if (title.includes('resources & skills')) return PROMPTS.phase2;
    if (title.includes('swot') || title.includes('risk analysis')) return PROMPTS.phase3;
    if (title.includes('kickoff briefing')) return PROMPTS.phase4;
    if (title.includes('statement of work') || title.includes('sow')) return PROMPTS.phase5;
    if (title.includes('preliminary review')) return PROMPTS.phase6;
    if (title.includes('detailed plans') || title.includes('project timeline')) return PROMPTS.phase7;
    if (phase === 8) {
        if (title.includes('sprint requirements') || title.includes('user story backlog')) return PROMPTS.phase8_sprintRequirements;
        if (title.includes('sprint plan review')) return PROMPTS.phase8_sprintPlanReview;
        if (title.includes('critical review')) return PROMPTS.phase8_criticalReview;
        return PROMPTS.phase8_generic; // Fallback for other phase 8 docs
    }
    // Fallback for any other custom documents (e.g. in phase 9)
    return PROMPTS.phase8_generic;
}

const parseMarkdownTable = (sectionString: string) => {
    if (!sectionString) return [];
    
    const lines = sectionString.trim().split('\n');
    let headerIndex = -1;
    
    // Find the start of the table by looking for a header row and a separator row
    for (let i = 0; i < lines.length - 1; i++) {
        const currentRow = lines[i];
        const nextRow = lines[i+1];
        // A valid header row must contain '|', and the next row must be a separator line.
        if (currentRow.includes('|') && nextRow.match(/^[|\s-:]+$/) && nextRow.includes('-')) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) return [];

    const headerLine = lines[headerIndex];
    // Data starts 2 lines after the header (skipping the separator)
    const dataLines = lines.slice(headerIndex + 2);

    const headers = headerLine.split('|').map(h => 
        h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')
    );
    
    const data = dataLines
        .map(row => {
            // Ensure the row is part of the table
            if (!row.includes('|')) return null; 
            const values = row.split('|').map(v => v.trim());
            // If the number of columns doesn't match the header, it's likely not a valid row
            if (values.length !== headers.length) return null;

            const obj: { [key: string]: string } = {};
            headers.forEach((header, index) => {
                if (header) { // Skip empty headers from start/end pipes
                    obj[header] = values[index];
                }
            });
            return obj;
        })
        .filter(Boolean); // remove any nulls from invalid rows

    return data as any[];
};

const getRelevantContext = (docToGenerate, allDocuments, allPhasesData) => {
    if (docToGenerate.phase === 1) {
        return '';
    }

    // Determine the processing order
    const sortedDocuments = [...allDocuments].sort((a, b) => {
        if (a.phase !== b.phase) return a.phase - b.phase;
        return a.title.localeCompare(b.title);
    });

    const currentIndex = sortedDocuments.findIndex(d => d.id === docToGenerate.id);

    // Get all previously approved documents in processing order
    const approvedDocs = sortedDocuments
        .slice(0, currentIndex)
        .filter(doc => doc.status === 'Approved');

    if (approvedDocs.length === 0) {
        return "CRITICAL: No preceding documents have been approved. Generate this document based on its title and the project parameters alone.";
    }

    // Build context from all approved docs, starting with the most foundational
    // and adding more detail from subsequent documents.
    let context = '';
    approvedDocs.forEach(doc => {
        const phaseInfo = allPhasesData[doc.id];
        const content = phaseInfo?.compactedContent || phaseInfo?.content;
        if (content) {
            context += `--- Context from "${doc.title}" ---\n${content}\n\n`;
        }
    });

    return context.trim();
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

// FIX: Added interface for component props to resolve TypeScript errors.
interface ProjectDashboardProps {
    project: any;
    onBack: () => void;
    ai: GoogleGenAI;
    saveProject: (project: any) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ project, onBack, ai, saveProject }) => {
    const [projectData, setProjectData] = useState<any>({ ...project });
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
    
            let parsedTasks: any[] = [];
            let parsedMilestones: any[] = [];
    
            if (tasksSection) {
                const rawTasks = parseMarkdownTable(tasksSection);
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
                const rawMilestones = parseMarkdownTable(milestonesSection);
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
    
        } catch (e: any) {
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

    const handleUpdatePhaseData = (docId: string, content: string, compactedContent: string | undefined | null = undefined) => {
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

    const handleCompletePhase = (docId: string, isAuto = false) => {
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

    const handleGenerateContent = async (docId: string, options: { isAuto?: boolean, currentContent?: string | null } = {}) => {
        const { isAuto = false, currentContent = null } = options;

        const docToGenerate = projectData.documents.find(d => d.id === docId);
        if (!docToGenerate) {
            setError('Could not find the document to generate content for.');
            return;
        }

        setError('');
        let generatedContent = '';
        const { name, discipline, mode, scope, teamSize, complexity = 'typical' } = projectData;
        const docTitle = docToGenerate.title;

        // Step 1: Generate human-readable content
        setLoadingPhase({ docId, step: 'generating' });
        try {
            let promptText;
            const promptGenerator = getPromptFunction(docTitle, docToGenerate.phase);

            if (promptGenerator === PROMPTS.phase1) {
                const userInput = currentContent !== null ? currentContent : (projectData.phasesData?.[docId]?.content || '');
                if (currentContent !== null && userInput !== (projectData.phasesData?.[docId]?.content)) {
                    handleUpdatePhaseData(docId, userInput, null);
                }
                promptText = promptGenerator(name, discipline, userInput, mode, scope, teamSize, complexity);
            } else {
                const context = getRelevantContext(docToGenerate, projectData.documents, projectData.phasesData);
                if (promptGenerator === PROMPTS.phase8_generic) {
                    promptText = promptGenerator(docTitle, name, discipline, context, mode, scope, teamSize, complexity);
                } else {
                    promptText = promptGenerator(name, discipline, context, mode, scope, teamSize, complexity);
                }
            }
            
            const finalPrompt = truncatePrompt(promptText);
            logAction('Generate Content Start', project.name, { docTitle: docToGenerate.title, promptLength: finalPrompt.length });

            const response = await withRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: finalPrompt,
            }));
            
            generatedContent = response.text;
            logAction('Generate Content Success', project.name, { docTitle: docToGenerate.title });
        } catch (err: any) {
            console.error("API Error generating content:", err);
            setError(`Failed to generate content for ${docToGenerate.title}. Please check the console and try again.`);
            logAction('Generate Content Failure', project.name, { docTitle: docToGenerate.title, error: err.message });
            setLoadingPhase({ docId: null, step: null });
            throw err; // Re-throw to be caught by automatic generation process
        }

        // Step 2: Compact content for all documents to improve future context quality.
        setLoadingPhase({ docId, step: 'compacting' });
        if (generatedContent.length > MAX_PAYLOAD_CHARS - 1000) {
            console.warn(`Content for ${docToGenerate.title} is very large (${generatedContent.length} chars). Using a truncated version for context.`);
            logAction('Compact Content Skipped (Too Large)', project.name, { docTitle: docToGenerate.title, length: generatedContent.length });
            const truncatedForContext = generatedContent.substring(0, MAX_PAYLOAD_CHARS - 1000) + "\n\n...[CONTENT TRUNCATED FOR CONTEXT DUE TO SIZE LIMITS]...";
            handleUpdatePhaseData(docId, generatedContent, truncatedForContext);
            if (!isAuto) {
                alert('Content generated successfully. NOTE: Due to its large size, a truncated version will be used for future AI context.');
            }
            setLoadingPhase({ docId: null, step: null });
            return;
        }

        try {
            const compactionPrompt = PROMPTS.compactContent(generatedContent);
            logAction('Compact Content Start', project.name, { docTitle: docToGenerate.title });
            const compactResponse = await withRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: compactionPrompt,
            }));
            const compactedContent = compactResponse.text;
            handleUpdatePhaseData(docId, generatedContent, compactedContent);
            logAction('Compact Content Success', project.name, { docTitle: docToGenerate.title });
            if (!isAuto) {
                alert('Content generated and compacted successfully.');
            }
        } catch (err: any) {
            console.error("API Error compacting content:", err);
            logAction('Compact Content Failure', project.name, { docTitle: docToGenerate.title, error: err.message });
            handleUpdatePhaseData(docId, generatedContent, null); // Save with null compacted content on failure
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
    
    const handleUpdateDocumentStatus = (docId: string, newStatus: string) => {
        handleSave(prevData => ({
            documents: prevData.documents.map(doc => 
                doc.id === docId ? { ...doc, status: newStatus } : doc
            )
        }));
    };
    
    const handleUpdateTask = (taskId: string, updatedTask: any) => {
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

    const runAutomaticGeneration = async () => {
        setIsAutoGenerating(true);
        handleSave({ generationMode: 'automatic' }); // Set mode for UI feedback

        // Get a fresh copy of documents to work with, sorted in processing order
        const sortedDocs = [...projectData.documents].sort((a, b) => {
            if (a.phase !== b.phase) return a.phase - b.phase;
            return a.title.localeCompare(b.title);
        });

        // Use a functional update with `setProjectData` to ensure we're always working with the latest state.
        for (const doc of sortedDocs) {
            // Check the document's current status from the latest state.
            const latestProjectData: any = await new Promise(resolve => setProjectData(current => {
                resolve(current);
                return current;
            }));

            const docToCheck = latestProjectData.documents.find(d => d.id === doc.id);

            if (docToCheck && docToCheck.status !== 'Approved') {
                try {
                    logAction('Auto-generating document', project.name, { docTitle: docToCheck.title });
                    
                    // Generate content. This function already handles saving the content to state.
                    await handleGenerateContent(doc.id, { isAuto: true });

                    // Mark as approved and save to state.
                    handleSave(prevData => ({
                        documents: prevData.documents.map(d =>
                            d.id === doc.id ? { ...d, status: 'Approved' } : d
                        )
                    }));
                    
                    // A brief pause allows the UI to update between steps.
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (err: any) {
                    alert(`Automatic generation failed on document: "${doc.title}". The process has been stopped. Please review the error, fix any issues (you may need to edit previous documents), and restart the process if needed.`);
                    logAction('Automatic Generation Halted', project.name, { failedOn: doc.title, error: err.message });
                     handleSave(prevData => ({
                        documents: prevData.documents.map(d =>
                            d.id === doc.id ? { ...d, status: 'Failed' } : d
                        )
                    }));
                    break; // Stop the process on failure.
                }
            }
        }

        // Finished
        setIsAutoGenerating(false);
        handleSave({ generationMode: 'manual' });
        logAction('Automatic Generation Complete', project.name, {});
        alert('Automatic document generation is complete.');
    };

    const handleSetGenerationMode = (mode) => {
        if (mode === 'automatic' && !isAutoGenerating) {
            if (confirm("This will automatically generate and approve all remaining project documents. This process can take several minutes and cannot be stopped. Are you sure you want to proceed?")) {
                runAutomaticGeneration();
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