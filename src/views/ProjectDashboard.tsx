

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// FIX: Import GenerateContentResponse to explicitly type API call results.
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
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

    // FIX: More robustly handle spaces and hyphens as separators in headers
    // to prevent parsing failures from AI-generated variations like 'Milestone-Name'.
    const headers = headerLine.split('|').map(h =>
        h.trim().toLowerCase().replace(/[()]/g, '').replace(/[\s-]+/g, '_')
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

const BackToTopButton = () => {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = useCallback(() => {
        if (window.scrollY > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => {
            window.removeEventListener('scroll', toggleVisibility);
        };
    }, [toggleVisibility]);

    return (
        <button 
            onClick={scrollToTop} 
            className={`back-to-top-fab ${isVisible ? 'visible' : ''}`} 
            aria-label="Go to top"
            aria-hidden={!isVisible}
            tabIndex={isVisible ? 0 : -1}
        >
            ↑
        </button>
    );
};


export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ project, onBack, ai, saveProject }) => {
    const [projectData, setProjectData] = useState<any>({ ...project });
    const [loadingPhase, setLoadingPhase] = useState<{ docId: string | null; step: 'generating' | 'compacting' | null }>({ docId: null, step: null });
    const [error, setError] = useState('');
    // FIX: Changed initial state to 'Project Phases' as it's always accessible, preventing a confusing initial load on a potentially disabled 'Dashboard' tab.
    const [activeTab, setActiveTab] = useState('Project Phases');
    const [notificationQueue, setNotificationQueue] = useState([]);
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);
    const [isParsingPlan, setIsParsingPlan] = useState(false);
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
        if (!projectData.documents || projectData.documents.length === 0) {
            return false;
        }
        // Planning is considered complete when every document has been approved.
        // The project tracking tools will be populated as a side-effect of the plan document being approved.
        return projectData.documents.every(doc => doc.status === 'Approved');
    }, [projectData.documents]);

    const handleSave = useCallback((update): Promise<any> => {
        return new Promise(resolve => {
            setProjectData(prevData => {
                const dataToMerge = typeof update === 'function' ? update(prevData) : update;
                const newState = { ...prevData, ...dataToMerge };
                saveProject(newState);
                resolve(newState);
                return newState;
            });
        });
    }, [saveProject]);

    const handleTabChange = useCallback((tabName) => {
        setActiveTab(currentTab => {
            logAction('Navigate Tab', tabName, { from: currentTab, to: tabName });
            return tabName;
        });
        localStorage.setItem(`hmap-active-tab-${project.id}`, tabName);
    }, [project.id]);

    // FIX: Refactored the effect that sets the initial tab. It now checks if a saved tab is currently locked and defaults to 'Project Phases' if so. This prevents the app from loading into an unusable state.
    useEffect(() => {
        const newProjectId = sessionStorage.getItem('hmap-new-project-id');
        if (newProjectId === project.id) {
            handleTabChange('Project Phases');
            sessionStorage.removeItem('hmap-new-project-id');
        } else {
            const savedTab = localStorage.getItem(`hmap-active-tab-${project.id}`);
            const isSavedTabLocked = !isPlanningComplete && ['Dashboard', 'Project Tracking', 'Revision Control'].includes(savedTab);
            
            if (savedTab && !isSavedTabLocked) {
                setActiveTab(savedTab);
            } else {
                // If there's no saved tab, or if the saved tab is now locked, default to the safe 'Project Phases' tab.
                setActiveTab('Project Phases');
            }
        }
    }, [project.id, isPlanningComplete, handleTabChange]);

    const parseAndPopulateProjectPlan = useCallback(async () => {
        const planDocument = projectData.documents.find(d => d.title === 'Detailed Plans (WBS/WRS)');
        const planContent = planDocument ? projectData.phasesData?.[planDocument.id]?.content : undefined;
        
        if (!planContent) return;
    
        setIsParsingPlan(true);
        logAction('Parse Project Plan', project.name, { planContentLength: planContent.length });
        
        try {
            // Allow the UI to update and show the spinner before running potentially blocking logic
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const isValidDateString = (dateStr) => {
                if (!dateStr || typeof dateStr !== 'string') return false;
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
                const d = new Date(dateStr);
                return d instanceof Date && !isNaN(d.getTime());
            };
            
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

                    const startDate = isValidDateString(t.start_date_yyyy_mm_dd) 
                        ? t.start_date_yyyy_mm_dd 
                        : projectData.startDate;
                    
                    const endDate = isValidDateString(t.end_date_yyyy_mm_dd) 
                        ? t.end_date_yyyy_mm_dd 
                        : startDate;

                    if (!isValidDateString(t.start_date_yyyy_mm_dd)) {
                        console.warn(`Invalid start date "${t.start_date_yyyy_mm_dd}" for task "${t.task_name}". Using project start date.`);
                    }
                    if (!isValidDateString(t.end_date_yyyy_mm_dd)) {
                        console.warn(`Invalid end date "${t.end_date_yyyy_mm_dd}" for task "${t.task_name}". Using start date.`);
                    }

                    const task = {
                        id: taskId,
                        name: t.task_name,
                        role: t.role || null,
                        startDate: startDate,
                        endDate: endDate,
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
                    task.dependsOn = task.dependsOn
                        .map(depName => taskNameMap.get(depName))
                        .filter(Boolean);
                });
            }
    
            if (milestonesSection) {
                const rawMilestones = parseMarkdownTable(milestonesSection);
                parsedMilestones = rawMilestones.map((m, index) => {
                    const milestoneDate = isValidDateString(m.date_yyyy_mm_dd) ? m.date_yyyy_mm_dd : projectData.startDate;
                    if (!isValidDateString(m.date_yyyy_mm_dd)) {
                        console.warn(`Invalid date "${m.date_yyyy_mm_dd}" for milestone "${m.milestone_name}". Using project start date.`);
                    }
                    return {
                        id: `milestone-${Date.now()}-${index}`,
                        name: m.milestone_name,
                        plannedDate: milestoneDate,
                        status: 'Not Started', // 'Not Started', 'In Progress', 'Completed'
                        actualStartDate: null,
                        actualCompletedDate: null,
                    };
                });
            }
            
            if (parsedTasks.length > 0) {
                const lastTask = parsedTasks.reduce((latest, current) => {
                    return new Date(latest.endDate) > new Date(current.endDate) ? latest : current;
                });
                
                await handleSave({ 
                    tasks: parsedTasks, 
                    milestones: parsedMilestones, 
                    endDate: lastTask.endDate,
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
        } finally {
            setIsParsingPlan(false);
        }
    }, [projectData, project.name, project.sprints, handleSave]);

    useEffect(() => {
        const planDoc = projectData.documents.find(d => d.title === 'Detailed Plans (WBS/WRS)');
        const prevPlanDoc = prevDocumentsRef.current.find(d => d.title === 'Detailed Plans (WBS/WRS)');

        if (planDoc && prevPlanDoc && planDoc.status === 'Approved' && prevPlanDoc.status !== 'Approved') {
            parseAndPopulateProjectPlan();
        }

        prevDocumentsRef.current = projectData.documents;
    }, [projectData.documents, parseAndPopulateProjectPlan]);
    
    useEffect(() => {
        if (project) {
            setProjectData(project);
        }
    }, [project]);

    const handleUpdatePhaseData = async (docId: string, content: string, compactedContent: string | undefined | null = undefined) => {
        await handleSave(prevData => {
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

    const handleCompletePhase = async (docId: string, isAuto = false) => {
        await handleSave(prevData => ({
            documents: prevData.documents.map(doc =>
                doc.id === docId ? { ...doc, status: 'Approved' } : doc
            )
        }));
        if (!isAuto) {
            alert(`Document marked as "Approved". You can now proceed to the next phase.`);
        }
        logAction('Complete Phase', project.name, { docId });
    };

    const handleGenerateContent = async (docId: string, currentProjectData: any, options: { isAuto?: boolean, currentContent?: string | null } = {}) => {
        const { currentContent = null } = options;
    
        const docToGenerate = currentProjectData.documents.find(d => d.id === docId);
        if (!docToGenerate) {
            throw new Error('Could not find the document to generate content for.');
        }
    
        let generatedContent = '';
        const { name, discipline, mode, scope, teamSize, complexity = 'typical' } = currentProjectData;
        const docTitle = docToGenerate.title;
    
        // Step 1: Generate human-readable content
        setLoadingPhase({ docId, step: 'generating' });
        try {
            let promptText;
            const promptGenerator = getPromptFunction(docTitle, docToGenerate.phase);
    
            if (promptGenerator === PROMPTS.phase1) {
                const userInput = currentContent !== null ? currentContent : (currentProjectData.phasesData?.[docId]?.content || '');
                if (currentContent !== null && userInput !== (currentProjectData.phasesData?.[docId]?.content)) {
                    await handleUpdatePhaseData(docId, userInput, null);
                }
                promptText = promptGenerator(name, discipline, userInput, mode, scope, teamSize, complexity);
            } else {
                const context = getRelevantContext(docToGenerate, currentProjectData.documents, currentProjectData.phasesData);
                if (promptGenerator === PROMPTS.phase8_generic) {
                    promptText = promptGenerator(docTitle, name, discipline, context, mode, scope, teamSize, complexity);
                } else {
                    promptText = promptGenerator(name, discipline, context, mode, scope, teamSize, complexity);
                }
            }
            
            const finalPrompt = truncatePrompt(promptText);
            logAction('Generate Content Start', project.name, { docTitle: docToGenerate.title, promptLength: finalPrompt.length });
    
            const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: finalPrompt,
            }));
            
            generatedContent = response.text;
            logAction('Generate Content Success', project.name, { docTitle: docToGenerate.title });
        } catch (err: any) {
            console.error("API Error generating content:", err);
            let userFriendlyError = `Failed to generate content for ${docToGenerate.title}. Please check the console and try again.`;
            if (err.message && typeof err.message === 'string') {
                try {
                    const errorObj = JSON.parse(err.message);
                    if (errorObj?.error?.status === 'RESOURCE_EXHAUSTED' || errorObj?.error?.code === 429) {
                        userFriendlyError = `Failed to generate content for "${docToGenerate.title}" due to API rate limiting. Please wait a moment and try again.`;
                    }
                } catch (e) { /* Not a JSON error message, proceed with default. */ }
            }
            setError(userFriendlyError);
            logAction('Generate Content Failure', project.name, { docTitle: docToGenerate.title, error: err.message });
            setLoadingPhase({ docId: null, step: null });
            throw err;
        }
    
        // Step 2: Compact content for AI context optimization
        setLoadingPhase({ docId, step: 'compacting' });
        try {
            const compactionPromptText = PROMPTS.compactContent(generatedContent);
            const compactionPrompt = truncatePrompt(compactionPromptText);
            
            logAction('Compact Content Start', project.name, { docTitle: docToGenerate.title, promptLength: compactionPrompt.length });
            
            const compactResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: compactionPrompt,
            }));
    
            const compactedContent = compactResponse.text;
            logAction('Compact Content Success', project.name, { docTitle: docToGenerate.title });
            return { generatedContent, compactedContent };
        } catch (err: any) {
            console.error("API Error compacting content:", err);
            logAction('Compact Content Failure', project.name, { docTitle: docToGenerate.title, error: err.message });
            const truncatedForContext = generatedContent.substring(0, MAX_PAYLOAD_CHARS - 2000) + "\n\n...[CONTENT TRUNCATED FOR CONTEXT DUE TO FAILED COMPACTION]...";
            return { generatedContent, compactedContent: truncatedForContext };
        } finally {
            setLoadingPhase({ docId: null, step: null });
        }
    };
    
    const handleManualGenerate = async (docId, currentContent) => {
        setError('');
        try {
            const { generatedContent, compactedContent } = await handleGenerateContent(docId, projectData, { currentContent });
            await handleUpdatePhaseData(docId, generatedContent, compactedContent);
            alert('Content generated and compacted successfully.');
        } catch (err) {
            // Error is already set inside handleGenerateContent
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

    const handleUpdateMilestone = (milestoneId: string, updatedMilestone: any) => {
        handleSave(prevData => ({
            milestones: prevData.milestones.map(m =>
                m.id === milestoneId ? { ...m, ...updatedMilestone } : m
            )
        }));
    };

    const runAutomaticGeneration = async () => {
        setIsAutoGenerating(true);
        await handleSave({ generationMode: 'automatic' });

        let currentProjectData = projectData;

        try {
            const sortedDocs = [...currentProjectData.documents].sort((a, b) => {
                if (a.phase !== b.phase) return a.phase - b.phase;
                return a.title.localeCompare(b.title);
            });
    
            for (const doc of sortedDocs) {
                const docToCheck = currentProjectData.documents.find(d => d.id === doc.id);
    
                if (docToCheck && docToCheck.status !== 'Approved') {
                    try {
                        logAction('Auto-generating document', project.name, { docTitle: docToCheck.title });
                        
                        const { generatedContent, compactedContent } = await handleGenerateContent(doc.id, currentProjectData, { isAuto: true });
                        
                        currentProjectData = await handleSave(prevData => {
                            const newPhasesData = { ...prevData.phasesData };
                            const currentDocData = newPhasesData[doc.id] || { attachments: [] };
                            currentDocData.content = generatedContent;
                            currentDocData.compactedContent = compactedContent;
                            newPhasesData[doc.id] = currentDocData;
                            
                            const newDocuments = prevData.documents.map(d => 
                                d.id === doc.id ? { ...d, status: 'Approved' } : d
                            );
    
                            return { phasesData: newPhasesData, documents: newDocuments };
                        });
                        
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } catch (err: any) {
                        let errorMessage = `Automatic generation failed on document: "${doc.title}". The process has been stopped. Please review the error, fix any issues (you may need to edit previous documents), and restart the process if needed.`;
                        if (err.message && typeof err.message === 'string') {
                            try {
                                const errorObj = JSON.parse(err.message);
                                if (errorObj?.error?.status === 'RESOURCE_EXHAUSTED' || errorObj?.error?.code === 429) {
                                    errorMessage = `Automatic generation failed on document: "${doc.title}" due to API rate limiting (too many requests).\n\nThe process has been stopped. Please wait a few minutes before trying again.`;
                                }
                            } catch (e) { /* Not a JSON error message, proceed with default. */ }
                        }
                        
                        alert(errorMessage);
                        logAction('Automatic Generation Halted', project.name, { failedOn: doc.title, error: err.message });
                         await handleSave(prevData => ({
                            documents: prevData.documents.map(d =>
                                d.id === doc.id ? { ...d, status: 'Failed' } : d
                            )
                        }));
                        break;
                    }
                }
            }
            alert('Automatic document generation is complete.');
            logAction('Automatic Generation Complete', project.name, {});
        } finally {
            setIsAutoGenerating(false);
            await handleSave({ generationMode: 'manual' });
        }
    };

    const handleSetGenerationMode = (mode) => {
        if (mode === 'automatic' && !isAutoGenerating) {
            runAutomaticGeneration();
        } else if (mode === 'manual') {
            if (!isAutoGenerating) {
                handleSave({ generationMode: 'manual' });
            }
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
                            handleGenerateContent={handleManualGenerate}
                            handleAttachFile={handleAttachFile}
                            handleRemoveAttachment={handleRemoveAttachment}
                            generationMode={projectData.generationMode || 'manual'}
                            onSetGenerationMode={handleSetGenerationMode}
                            isAutoGenerating={isAutoGenerating}
                        />;
            case 'Documents':
                return <DocumentsView 
                            project={projectData}
                            documents={projectData.documents} 
                            onUpdateDocument={handleUpdateDocumentStatus} 
                            phasesData={projectData.phasesData || {}} 
                            ai={ai}
                        />;
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
                            onUpdateMilestone={handleUpdateMilestone}
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
                <button onClick={() => handleTabChange('Dashboard')} className={activeTab === 'Dashboard' ? 'active' : ''} disabled={!isPlanningComplete} title={!isPlanningComplete ? "Complete all planning phases to unlock" : ""}>Dashboard</button>
                <button onClick={() => handleTabChange('Project Phases')} className={activeTab === 'Project Phases' ? 'active' : ''}>Project Phases</button>
                <button onClick={() => handleTabChange('Documents')} className={activeTab === 'Documents' ? 'active' : ''}>Documents</button>
                <button onClick={() => handleTabChange('Project Tracking')} className={activeTab === 'Project Tracking' ? 'active' : ''} disabled={!isPlanningComplete} title={!isPlanningComplete ? "Complete all planning phases to unlock" : ""}>Project Tracking</button>
                <button onClick={() => handleTabChange('Revision Control')} className={activeTab === 'Revision Control' ? 'active' : ''} disabled={!isPlanningComplete} title={!isPlanningComplete ? "Complete all planning phases to unlock" : ""}>Revision Control</button>
                {isParsingPlan && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', color: 'var(--secondary-text)' }} role="status" aria-live="polite">
                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                        <span>Parsing Project Plan...</span>
                    </div>
                )}
            </nav>
            
            {renderActiveTab()}

            <BackToTopButton />

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
