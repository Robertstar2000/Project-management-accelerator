
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Project, Task, Notification, User, Milestone } from '../types';
import { PHASES, PROMPTS } from '../constants/projectData';
import { DashboardView } from '../tools/DashboardView';
import { ProjectPhasesView } from './ProjectPhasesView';
import { DocumentsView } from '../tools/DocumentsView';
import { ProjectTrackingView } from '../tools/ProjectTrackingView';
import { RevisionControlView } from '../tools/RevisionControlView';
import { logAction } from '../utils/logging';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { AiReportModal } from '../components/AiReportModal';
import { TestingView } from '../tools/TestingView';

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
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

const getNextRecurrenceDate = (currentEndDate: string, interval: 'daily' | 'weekly' | 'monthly'): string => {
    const date = new Date(currentEndDate);
    // Add 1 day to start the next day, not on the end day of the previous task
    date.setDate(date.getDate() + 1);
    switch (interval) {
        case 'daily':
            // Already added 1 day
            break;
        case 'weekly':
            date.setDate(date.getDate() + 6); // +1 already added, so +6 more
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
    }
    return date.toISOString().split('T')[0];
};


const getPromptFunction = (docTitle, phase) => {
    const title = docTitle.toLowerCase();
    // Specific handlers first
    if (phase === 1 && title.includes('concept proposal')) return PROMPTS.phase1;
    if (title.includes('resources & skills')) return PROMPTS.phase2;
    if (title.includes('swot') || title.includes('risk analysis')) return PROMPTS.phase3;
    if (title.includes('kickoff briefing')) return PROMPTS.phase4;
    if (title.includes('statement of work') || title.includes('sow')) return PROMPTS.phase5;
    if (title.includes('preliminary review')) return PROMPTS.phase6;
    if (title.includes('detailed plans')) return PROMPTS.phase7;
    
    // Phase 8 handlers
    if (phase === 8) {
        if (title.includes('sprint requirements') || title.includes('user story backlog')) return PROMPTS.phase8_sprintRequirements;
        if (title.includes('sprint plan review')) return PROMPTS.phase8_sprintPlanReview;
        if (title.includes('critical review')) return PROMPTS.phase8_criticalReview;
        return PROMPTS.phase8_generic; // Fallback for any other Phase 8 doc
    }
    
    // Fallback for any other document in any other phase (like "Creative Brief" in Phase 1)
    return PROMPTS.genericDocumentPrompt;
}

const parseMarkdownTable = (sectionString: string) => {
    if (!sectionString) return [];
    const lines = sectionString.trim().split('\n');
    let headerIndex = -1;
    for (let i = 0; i < lines.length - 1; i++) {
        const currentRow = lines[i];
        const nextRow = lines[i+1];
        if (currentRow.includes('|') && nextRow.match(/^[|\s-:]+$/) && nextRow.includes('-')) {
            headerIndex = i;
            break;
        }
    }
    if (headerIndex === -1) return [];
    const headerLine = lines[headerIndex];
    const dataLines = lines.slice(headerIndex + 2);
    const headers = headerLine.split('|').map(h => h.trim().toLowerCase().replace(/[()]/g, '').replace(/[\s-]+/g, '_'));
    const data = dataLines.map(row => {
        if (!row.includes('|')) return null; 
        const values = row.split('|').map(v => v.trim());
        if (values.length !== headers.length) return null;
        const obj: { [key: string]: string } = {};
        headers.forEach((header, index) => {
            if (header) {
                obj[header] = values[index];
            }
        });
        return obj;
    }).filter(Boolean);
    return data as any[];
};

const getRelevantContext = (docToGenerate, allDocuments, allPhasesData) => {
    const sortedDocuments = [...allDocuments].sort((a, b) => 
        a.phase - b.phase || 
        (a.sequence || 1) - (b.sequence || 1) || 
        a.title.localeCompare(b.title)
    );
    const currentIndex = sortedDocuments.findIndex(d => d.id === docToGenerate.id);

    // Find First Doc context
    const firstDoc = sortedDocuments[0];
    const firstDocPhaseData = firstDoc ? allPhasesData[firstDoc.id] : null;
    const firstDocContext = (firstDoc && firstDoc.status === 'Approved' && firstDocPhaseData?.compactedContent)
        ? { doc: firstDoc, content: firstDocPhaseData.compactedContent }
        : null;

    // Find Previous Doc context
    const prevDoc = currentIndex > 0 ? sortedDocuments[currentIndex - 1] : null;
    const prevDocPhaseData = prevDoc ? allPhasesData[prevDoc.id] : null;
    const prevDocContext = (prevDoc && prevDoc.status === 'Approved' && prevDocPhaseData?.compactedContent)
        ? { doc: prevDoc, content: prevDocPhaseData.compactedContent }
        : null;

    return { firstDocContext, prevDocContext };
};


const MAX_PAYLOAD_CHARS = 20000;
const truncatePrompt = (prompt: string): string => {
    if (prompt.length <= MAX_PAYLOAD_CHARS) return prompt;
    console.warn('Prompt is too large, truncating from the end to fit payload limits.');
    logAction('Truncate Prompt', 'Payload Management', { originalLength: prompt.length, newLength: MAX_PAYLOAD_CHARS });
    return prompt.substring(0, MAX_PAYLOAD_CHARS) + "\n...[PROMPT TRUNCATED DUE TO PAYLOAD SIZE]...";
};

interface ProjectDashboardProps {
    project: Project;
    onBack: () => void;
    ai: GoogleGenAI;
    saveProject: (project: Project) => void;
    currentUser: User;
    key: number;
}

const BackToTopButton = () => {
    const [isVisible, setIsVisible] = useState(false);
    const toggleVisibility = useCallback(() => setIsVisible(window.scrollY > 300), []);
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, [toggleVisibility]);

    return (
        <button onClick={scrollToTop} className={`back-to-top-fab ${isVisible ? 'visible' : ''}`} aria-label="Go to top" aria-hidden={!isVisible} tabIndex={isVisible ? 0 : -1}>↑</button>
    );
};

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ project, onBack, ai, saveProject, currentUser }) => {
    const [projectData, setProjectData] = useState<Project>({ ...project });
    const [loadingPhase, setLoadingPhase] = useState<{ docId: string | null; step: 'generating' | 'compacting' | null }>({ docId: null, step: null });
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('Project Phases');
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);
    const [isParsingPlan, setIsParsingPlan] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const prevDocumentsRef = useRef(project.documents);
    const [aiReport, setAiReport] = useState({ title: '', content: '', isOpen: false });
    const [isGeneratingReport, setIsGeneratingReport] = useState<'risk' | 'summary' | null>(null);

    const projectDataRef = useRef(projectData);
    useEffect(() => {
        projectDataRef.current = projectData;
    }, [projectData]);

    const handleSave = useCallback((update: Partial<Project> | ((prev: Project) => Partial<Project>)) => {
        setProjectData(prevData => {
            const dataToMerge = typeof update === 'function' ? update(prevData) : update;
            const newState = { ...prevData, ...dataToMerge };
            saveProject(newState);
            return newState;
        });
    }, [saveProject]);

    useEffect(() => {
        setProjectData(project);
    }, [project]);

     useEffect(() => {
        const taskIdToOpen = sessionStorage.getItem('hmap-open-task-on-load');
        if (taskIdToOpen && projectData.tasks?.length > 0) {
            const task = projectData.tasks.find(t => t.id === taskIdToOpen);
            if (task) {
                setSelectedTask(task);
            }
            sessionStorage.removeItem('hmap-open-task-on-load');
        }
    }, [projectData.tasks]);

    const projectPhases = useMemo(() => {
        if (!projectData || !Array.isArray(projectData.documents)) return [];
        const sortedDocuments = [...projectData.documents].sort((a, b) => 
            a.phase - b.phase || 
            (a.sequence || 1) - (b.sequence || 1) || 
            a.title.localeCompare(b.title)
        );
        return sortedDocuments.map(doc => ({
            id: doc.id,
            title: doc.title,
            description: (PHASES[doc.phase - 1] || {}).description || `Actions related to the '${doc.title}' document.`,
            originalPhaseId: `phase${doc.phase}`,
            docId: doc.id,
        }));
    }, [projectData.documents]);

    const isPlanningComplete = useMemo(() => projectData.documents?.every(doc => doc.status === 'Approved'), [projectData.documents]);

    const handleTabChange = useCallback((tabName) => {
        setActiveTab(currentTab => {
            logAction('Navigate Tab', tabName, { from: currentTab, to: tabName });
            return tabName;
        });
        localStorage.setItem(`hmap-active-tab-${project.id}`, tabName);
    }, [project.id]);

    useEffect(() => {
        const savedTab = localStorage.getItem(`hmap-active-tab-${project.id}`);
        const isSavedTabLocked = !isPlanningComplete && ['Dashboard', 'Project Tracking', 'Revision Control'].includes(savedTab);
        setActiveTab(savedTab && !isSavedTabLocked ? savedTab : 'Project Phases');
    }, [project.id, isPlanningComplete]);
    
    const handleUpdatePhaseData = useCallback((docId: string, content: string, compactedContent?: string) => {
        handleSave(prevData => {
            const newPhasesData = { ...prevData.phasesData };
            const currentData = newPhasesData[docId] || { attachments: [] };
            newPhasesData[docId] = {
                ...currentData,
                content,
                compactedContent: compactedContent !== undefined ? compactedContent : currentData.compactedContent
            };
            return { phasesData: newPhasesData };
        });
    }, [handleSave]);

    const handleUpdateDocument = useCallback((docId: string, status: string) => {
        handleSave(prevData => {
            const updatedDocs = prevData.documents.map(d => d.id === docId ? { ...d, status } : d);
            return { documents: updatedDocs };
        });
    }, [handleSave]);

    const handleGenerateContent = useCallback(async (docId: string, userInput: string, projectStateOverride?: Project) => {
        if (!projectStateOverride) {
            setLoadingPhase({ docId, step: 'generating' });
        }
        setError('');
        const currentProjectData = projectStateOverride || projectDataRef.current;
        const docToGenerate = currentProjectData.documents.find(d => d.id === docId);

        if (!docToGenerate) {
            setError("Document not found for generation.");
            if (!projectStateOverride) setLoadingPhase({ docId: null, step: null });
            return { success: false, newContent: null, newCompactedContent: null };
        }

        try {
            const { firstDocContext, prevDocContext } = getRelevantContext(docToGenerate, currentProjectData.documents, currentProjectData.phasesData);
            
            const getPromptTextWithContext = (context: string) => {
                const promptFn = getPromptFunction(docToGenerate.title, docToGenerate.phase);
                const commonArgs = {
                    name: currentProjectData.name, discipline: currentProjectData.discipline, context, mode: currentProjectData.mode,
                    scope: currentProjectData.scope, teamSize: currentProjectData.teamSize, complexity: currentProjectData.complexity,
                };
                if (promptFn === PROMPTS.phase1) {
                    return promptFn(commonArgs.name, commonArgs.discipline, userInput, commonArgs.mode, commonArgs.scope, commonArgs.teamSize, commonArgs.complexity);
                } else if (promptFn === PROMPTS.phase8_generic) {
                    return promptFn(docToGenerate.title, commonArgs.name, commonArgs.discipline, commonArgs.context, commonArgs.mode, commonArgs.scope, commonArgs.teamSize, commonArgs.complexity);
                } else if (promptFn === PROMPTS.genericDocumentPrompt) {
                     return promptFn(docToGenerate.title, docToGenerate.phase, commonArgs.name, commonArgs.discipline, commonArgs.context, commonArgs.mode, commonArgs.scope, commonArgs.teamSize, commonArgs.complexity);
                } else {
                    return promptFn(commonArgs.name, commonArgs.discipline, commonArgs.context, commonArgs.mode, commonArgs.scope, commonArgs.teamSize, commonArgs.complexity);
                }
            };

            const promptInstructions = getPromptTextWithContext('');
            const availableCharsForContext = MAX_PAYLOAD_CHARS - promptInstructions.length;
            
            let firstDocPart = firstDocContext ? firstDocContext.content : '';
            let prevDocPart = (prevDocContext && prevDocContext.doc.id !== firstDocContext?.doc.id) ? prevDocContext.content : '';

            // Robustly assemble and truncate context to respect payload limits and priority.
            // The context passed to the prompt should be clean data, not nested prompt structures.
            let finalContext = '';
            if (firstDocPart) {
                if (firstDocPart.length > availableCharsForContext) {
                    console.warn('First document context is too long, truncating.');
                    firstDocPart = firstDocPart.substring(0, availableCharsForContext);
                }
                finalContext += firstDocPart;
            }

            if (prevDocPart) {
                // Add separator only if there is space for it and the content that will follow
                const separator = '\n\n---\n\n';
                let remainingChars = availableCharsForContext - finalContext.length;

                if (remainingChars > separator.length) {
                    finalContext += separator;
                    remainingChars -= separator.length;

                    if (prevDocPart.length > remainingChars) {
                         console.warn('Previous document context is too long, truncating.');
                         prevDocPart = prevDocPart.substring(0, remainingChars);
                    }
                    finalContext += prevDocPart;
                }
            }

            if (!finalContext.trim() && docToGenerate.phase > 1) {
                finalContext = "CRITICAL: The required preceding documents have not been approved or their compacted context is unavailable. Generate this document based on its title and project parameters alone.";
            }

            const promptText = getPromptTextWithContext(finalContext.trim());
            const prompt = promptText.length > MAX_PAYLOAD_CHARS ? truncatePrompt(promptText) : promptText;
            
            const result: GenerateContentResponse = await withRetry(() => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
            const newContent = result.text;

            if (!projectStateOverride) {
                handleUpdatePhaseData(docId, newContent);
                setLoadingPhase({ docId, step: 'compacting' });
            }
            
            const compactPromptInstructions = PROMPTS.compactContent('');
            const availableCharsForContent = MAX_PAYLOAD_CHARS - compactPromptInstructions.length;
            let contentForCompaction = newContent;

            if (newContent.length > availableCharsForContent) {
                const amountToTruncate = newContent.length - availableCharsForContent;
                console.warn(`Content for compaction is too long. Truncating ${amountToTruncate} chars from the end.`);
                contentForCompaction = newContent.substring(0, availableCharsForContent);
            }
            
            const compactPrompt = PROMPTS.compactContent(contentForCompaction);
            const compactResult: GenerateContentResponse = await withRetry(() => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: compactPrompt }));
            const newCompactedContent = compactResult.text;

            if (!projectStateOverride) {
                handleUpdatePhaseData(docId, newContent, newCompactedContent);
                handleUpdateDocument(docId, 'Working');
            }
            
            return { success: true, newContent, newCompactedContent };

        } catch (err: any) {
            const docTitle = docToGenerate.title || 'the selected document';
            console.error(`AI Generation Failed for document "${docTitle}" after all retries:`, err);
            
            let userFriendlyError: string;
            const errorMessage = err ? err.toString().toLowerCase() : '';

            if (errorMessage.includes('api key not valid') || errorMessage.includes('invalid api key')) {
                userFriendlyError = `AI Generation Failed for "${docTitle}": The API Key appears to be invalid. Please go back to the home page to verify your key and try again.`;
            } else if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
                userFriendlyError = `AI Generation Failed for "${docTitle}": The API quota has been exceeded. This can happen during rapid or automatic generation. Please wait a minute before retrying. If this issue persists, you may need to check your Google AI Studio plan and billing details.`;
            } else {
                userFriendlyError = `Failed to generate content for "${docTitle}". An unexpected error occurred. Please check your network connection and the developer console for more details before trying again.`;
            }

            setError(userFriendlyError);
            handleUpdateDocument(docId, 'Failed');
            return { success: false, newContent: null, newCompactedContent: null };
        } finally {
            if (!projectStateOverride) {
                setLoadingPhase({ docId: null, step: null });
            }
        }
    }, [ai, handleUpdatePhaseData, handleUpdateDocument]);
    
    const runAutomaticGeneration = useCallback(async () => {
        setIsAutoGenerating(true);
        logAction('Start Automatic Generation', project.name, {});
    
        let projectForLoop = { ...projectDataRef.current };
    
        const sortedDocs = [...projectForLoop.documents].sort((a, b) => 
            a.phase - b.phase || 
            (a.sequence || 1) - (b.sequence || 1) || 
            a.title.localeCompare(b.title)
        );
    
        for (const doc of sortedDocs) {
            const currentDocStateInLoop = projectForLoop.documents.find(d => d.id === doc.id);
            if (currentDocStateInLoop?.status === 'Approved') {
                continue;
            }
    
            setLoadingPhase({ docId: doc.id, step: 'generating' });
            logAction('Auto-Generating Document', doc.title, { docId: doc.id });
    
            const result = await handleGenerateContent(doc.id, '', projectForLoop);
    
            if (result.success && result.newContent !== null && result.newCompactedContent !== null) {
                // First, commit the results to the real state for UI updates
                handleUpdatePhaseData(doc.id, result.newContent, result.newCompactedContent);
                handleUpdateDocument(doc.id, 'Approved');
                
                // Second, update the local state for the next iteration's context
                const updatedPhasesData = {
                    ...projectForLoop.phasesData,
                    [doc.id]: {
                        ...(projectForLoop.phasesData[doc.id] || { attachments: [] }),
                        content: result.newContent,
                        compactedContent: result.newCompactedContent,
                    }
                };
                const updatedDocuments = projectForLoop.documents.map(d =>
                    d.id === doc.id ? { ...d, status: 'Approved' } : d
                );
                projectForLoop = {
                    ...projectForLoop,
                    documents: updatedDocuments,
                    phasesData: updatedPhasesData,
                };
                
                // Add a 3-second delay to better respect API rate limits, especially on free tiers.
                // Each document generation involves two API calls (generation + compaction), so a longer
                // pause is needed to avoid exceeding requests-per-minute quotas.
                await new Promise(resolve => setTimeout(resolve, 3000));

            } else {
                logAction('Automatic Generation Failed', doc.title, { docId: doc.id });
                setError(`Automatic generation failed at document: "${doc.title}". Please review the document and continue manually.`);
                break;
            }
        }
    
        setLoadingPhase({ docId: null, step: null });
        setIsAutoGenerating(false);
        handleSave(prev => ({ ...prev, generationMode: 'manual' }));
        logAction('End Automatic Generation', project.name, {});
    }, [project.name, handleGenerateContent, handleUpdatePhaseData, handleUpdateDocument, handleSave, setError]);
    
    const handleSetGenerationMode = useCallback((mode: 'manual' | 'automatic') => {
        handleSave({ generationMode: mode });
        if (mode === 'automatic') runAutomaticGeneration();
    }, [handleSave, runAutomaticGeneration]);
    
    const handleAttachFile = (docId: string, fileData: { name: string; data: string; }) => {
        handleSave(p => ({ phasesData: { ...p.phasesData, [docId]: { ...(p.phasesData[docId] || {}), attachments: [...(p.phasesData[docId]?.attachments || []), fileData] }}}));
    };

    const handleRemoveAttachment = (docId: string, fileName: string) => {
        handleSave(p => ({ phasesData: { ...p.phasesData, [docId]: { ...p.phasesData[docId], attachments: p.phasesData[docId]?.attachments.filter(f => f.name !== fileName) }}}));
    };
    
    const handleUpdateTask = useCallback((taskId: string, updatedTaskData: Partial<Task>, previousStatus: string) => {
        let newNotifications: Notification[] = [];
        let newTasks: Task[] = [];
        
        const originalTask = projectData.tasks.find(t => t.id === taskId);
        
        // Notification Logic
        if (updatedTaskData.status === 'done' && previousStatus !== 'done') {
            const newlyUnblockedTasks = projectData.tasks.filter(task =>
                task.dependsOn?.includes(taskId) && task.status !== 'done'
            ).filter(dependentTask => {
                return dependentTask.dependsOn.every(depId => {
                    const prereq = projectData.tasks.find(t => t.id === depId);
                    if (prereq.id === taskId) return true; 
                    return prereq && prereq.status === 'done';
                });
            });

            newNotifications = newlyUnblockedTasks.map(unblockedTask => {
                const assignee = projectData.team.find(member => member.role === unblockedTask.role);
                if (assignee) {
                    return {
                        id: `notif-${Date.now()}-${unblockedTask.id}`,
                        timestamp: new Date().toISOString(),
                        recipientId: assignee.userId,
                        text: `Task "${unblockedTask.name}" is now unblocked and ready to start.`,
                        read: false,
                        taskId: unblockedTask.id
                    };
                }
                return null;
            }).filter((n): n is Notification => n !== null);
        }

        const updatedTasks = projectData.tasks.map(t => t.id === taskId ? { ...t, ...updatedTaskData } : t);
        const completedTask = updatedTasks.find(t => t.id === taskId);

        // Recurring Task Logic
        if (completedTask && updatedTaskData.status === 'done' && previousStatus !== 'done') {
            if (completedTask.recurrence && completedTask.recurrence.interval !== 'none') {
                const duration = new Date(completedTask.endDate).getTime() - new Date(completedTask.startDate).getTime();
                const newStartDate = getNextRecurrenceDate(completedTask.endDate, completedTask.recurrence.interval);
                
                const newEndDate = new Date(new Date(newStartDate).getTime() + duration).toISOString().split('T')[0];

                const newTask: Task = {
                    ...completedTask,
                    id: `task-${Date.now()}-${Math.random()}`,
                    status: 'todo',
                    startDate: newStartDate,
                    endDate: newEndDate,
                    actualTime: null,
                    actualCost: null,
                    actualEndDate: null,
                    comments: [],
                    attachments: [],
                };
                newTasks.push(newTask);
            }
        }

        handleSave(prevData => ({ 
            tasks: [...updatedTasks, ...newTasks],
            notifications: [...(prevData.notifications || []), ...newNotifications]
        }));
    }, [projectData.tasks, projectData.team, handleSave]);

    const handleSaveTask = (updatedTask: Task) => {
        const updatedTasks = projectData.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        handleSave({ tasks: updatedTasks });
    };
    
    const handleUpdateMilestone = useCallback((milestoneId, updatedMilestoneData) => {
        const updatedMilestones = projectData.milestones.map(m => m.id === milestoneId ? { ...m, ...updatedMilestoneData } : m);
        handleSave({ milestones: updatedMilestones });
    }, [projectData.milestones, handleSave]);

    const handleUpdateTeam = useCallback((newTeam, newOwnerId?: string) => {
        const update: Partial<Project> = { team: newTeam };
        if (newOwnerId) {
            update.ownerId = newOwnerId;
        }
        handleSave(update);
    }, [handleSave]);

    const parseAndPopulateProjectPlan = useCallback(async () => {
        setIsParsingPlan(true);
        logAction('Start Plan Parsing', project.name, {});
        await new Promise(res => setTimeout(res, 500)); // Give UI time to update
    
        try {
            const planDoc = projectData.documents.find(d => 
                d.title.toLowerCase().includes('detailed plans')
            );
    
            if (!planDoc || !projectData.phasesData[planDoc.id]?.content) {
                setError("Could not find the 'Detailed Plans' document content to parse. Please ensure it was generated correctly.");
                setIsParsingPlan(false);
                return;
            }
    
            const content = projectData.phasesData[planDoc.id].content;
            const sections = content.split('## ').slice(1);
            
            const tasksText = sections.find(s => s.toLowerCase().startsWith('tasks')) || '';
            const milestonesText = sections.find(s => s.toLowerCase().startsWith('milestones')) || '';
    
            // Parse Tasks
            const parsedTasks = parseMarkdownTable(tasksText);
            const taskNameMap = new Map<string, string>();
            
            const newTasks: Task[] = parsedTasks.map((t, index) => {
                const taskId = `task-${Date.now()}-${index}`;
                const taskName = t.task_name;
                if (taskName) {
                    taskNameMap.set(taskName, taskId);
                }
                
                const sprintName = t.sprint || '';
                const sprint = projectData.sprints.find(s => s.name.toLowerCase() === sprintName.toLowerCase());
    
                return {
                    id: taskId,
                    name: taskName,
                    role: t.role || null,
                    startDate: t.start_date_yyyy_mm_dd || new Date().toISOString().split('T')[0],
                    endDate: t.end_date_yyyy_mm_dd || new Date().toISOString().split('T')[0],
                    sprintId: sprint ? sprint.id : projectData.sprints[0]?.id || 'sprint1',
                    status: 'todo',
                    isSubcontracted: t.subcontractor?.toLowerCase() === 'yes',
                    dependsOn: t.dependencies ? t.dependencies.split(',').map(d => d.trim()) : [], // Store names temporarily
                    description: '',
                    actualTime: null,
                    actualCost: null,
                    actualEndDate: null,
                    comments: [],
                    attachments: [],
                };
            });
    
            // Resolve Dependencies
            newTasks.forEach(task => {
                task.dependsOn = (task.dependsOn as string[]).map(depName => taskNameMap.get(depName)).filter((id): id is string => !!id);
            });
    
            // Parse Milestones
            const parsedMilestones = parseMarkdownTable(milestonesText);
            const newMilestones: Milestone[] = parsedMilestones.map((m, index) => ({
                id: `milestone-${Date.now()}-${index}`,
                name: m.milestone_name,
                plannedDate: m.date_yyyy_mm_dd,
                status: 'Planned',
            }));
    
            handleSave({ tasks: newTasks, milestones: newMilestones });
            logAction('Plan Parsing Success', project.name, { taskCount: newTasks.length, milestoneCount: newMilestones.length });
            handleTabChange('Project Tracking');
    
        } catch (e: any) {
            console.error("Failed to parse project plan:", e);
            setError("An error occurred while parsing the project plan. Please check the 'Detailed Plans' document format.");
            logAction('Plan Parsing Failure', project.name, { error: e.message });
        } finally {
            setIsParsingPlan(false);
        }
    }, [project.name, projectData.documents, projectData.phasesData, projectData.sprints, handleSave, handleTabChange]);

    // This effect detects when planning is newly completed.
    useEffect(() => {
        const prevDocsWereComplete = prevDocumentsRef.current?.every(doc => doc.status === 'Approved');
        const currentDocsAreComplete = projectData.documents?.every(doc => doc.status === 'Approved');
    
        if (currentDocsAreComplete && !prevDocsWereComplete) {
            // Only parse if tasks haven't been populated yet
            if ((!projectData.tasks || projectData.tasks.length === 0) && (!projectData.milestones || projectData.milestones.length === 0)) {
                parseAndPopulateProjectPlan();
            }
        }
    
        // Update the ref for the next render
        prevDocumentsRef.current = projectData.documents;
    
    }, [projectData.documents, projectData.tasks, projectData.milestones, parseAndPopulateProjectPlan]);

    const handleNotificationClick = (notification: Notification) => {
        const task = projectData.tasks.find(t => t.id === notification.taskId);
        if (task) {
            setSelectedTask(task);
        }
        const updatedNotifications = projectData.notifications.map(n => n.id === notification.id ? {...n, read: true} : n);
        handleSave({notifications: updatedNotifications});
    };
    
    const handleMarkAllNotificationsRead = () => {
        const updatedNotifications = projectData.notifications.map(n => ({...n, read: true}));
        handleSave({notifications: updatedNotifications});
    };

    const createProjectSummaryForAI = useCallback(() => {
        const today = new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(today.getDate() - 7);
    
        const overdueTasks = projectData.tasks.filter(t => t.status !== 'done' && new Date(t.endDate) < today);
        const recentlyCompletedTasks = projectData.tasks.filter(t => t.status === 'done' && t.actualEndDate && new Date(t.actualEndDate) > oneWeekAgo);
    
        return {
            name: projectData.name,
            discipline: projectData.discipline,
            endDate: projectData.endDate,
            budget: projectData.budget,
            tasks: {
                total: projectData.tasks.length,
                done: projectData.tasks.filter(t => t.status === 'done').length,
                overdue: overdueTasks.length,
                overdueTaskNames: overdueTasks.map(t => t.name),
                recentlyCompleted: recentlyCompletedTasks.map(t => t.name)
            },
            milestones: projectData.milestones.map(m => ({ name: m.name, plannedDate: m.plannedDate, status: m.status })),
            openChangeRequest: projectData.changeRequest
        };
    }, [projectData]);

    const handleAnalyzeRisks = async () => {
        setIsGeneratingReport('risk');
        try {
            const projectSummary = createProjectSummaryForAI();
            const keyDocTitles = ['Concept Proposal', 'Statement of Work (SOW)', 'SWOT Analysis'];
            const keyDocumentsContext = keyDocTitles.map(title => {
                const doc = projectData.documents.find(d => d.title === title);
                if (doc && projectData.phasesData[doc.id]?.compactedContent) {
                    return projectData.phasesData[doc.id].compactedContent;
                }
                return '';
            }).filter(Boolean).join('\n\n---\n\n');

            const prompt = PROMPTS.analyzeRisks(projectSummary, keyDocumentsContext);
            const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            
            setAiReport({ title: 'AI Risk Analysis', content: result.text, isOpen: true });
        } catch (err) {
            console.error("Error analyzing risks:", err);
            setError("Failed to generate risk analysis. Please try again.");
        } finally {
            setIsGeneratingReport(null);
        }
    };
    
    const handleGenerateSummary = async () => {
        setIsGeneratingReport('summary');
        try {
            const projectSummary = createProjectSummaryForAI();
            const keyDocTitles = ['Concept Proposal', 'Statement of Work (SOW)'];
            const keyDocumentsContext = keyDocTitles.map(title => {
                const doc = projectData.documents.find(d => d.title === title);
                 if (doc && projectData.phasesData[doc.id]?.compactedContent) {
                    return projectData.phasesData[doc.id].compactedContent;
                }
                return '';
            }).filter(Boolean).join('\n\n---\n\n');

            const prompt = PROMPTS.generateStatusSummary(projectSummary, keyDocumentsContext);
            const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });

            setAiReport({ title: 'AI-Generated Project Summary', content: result.text, isOpen: true });
        } catch (err) {
            console.error("Error generating summary:", err);
            setError("Failed to generate project summary. Please try again.");
        } finally {
            setIsGeneratingReport(null);
        }
    };
    
    const handleAddReportToDocuments = (title: string, content: string) => {
        const newDocId = `doc-report-${Date.now()}`;
        
        const newDocument = {
            id: newDocId,
            title: title,
            version: 'v1.0',
            status: 'Working',
            owner: currentUser.username,
            phase: 8, // Reports are part of execution/monitoring
        };

        handleSave(prevData => {
            const updatedDocuments = [...prevData.documents, newDocument];
            
            const updatedPhasesData = {
                ...prevData.phasesData,
                [newDocId]: {
                    content: content,
                    attachments: [],
                }
            };
            
            logAction('Add AI Report to Documents', project.name, { title });
            return {
                documents: updatedDocuments,
                phasesData: updatedPhasesData
            };
        });
    };

    return (
        <section>
            <div className="dashboard-header">
                <button onClick={onBack} className="button back-button">← Back to Projects</button>
                <h1>{projectData.name}</h1>
                <p>{projectData.discipline}</p>
            </div>
            <nav className="dashboard-nav">
                <button onClick={() => handleTabChange('Dashboard')} className={activeTab === 'Dashboard' ? 'active' : ''} disabled={!isPlanningComplete}>Dashboard</button>
                <button onClick={() => handleTabChange('Project Phases')} className={activeTab === 'Project Phases' ? 'active' : ''}>Project Phases</button>
                <button onClick={() => handleTabChange('Documents')} className={activeTab === 'Documents' ? 'active' : ''}>Documents</button>
                <button onClick={() => handleTabChange('Project Tracking')} className={activeTab === 'Project Tracking' ? 'active' : ''} disabled={!isPlanningComplete}>Project Tracking</button>
                <button onClick={() => handleTabChange('Revision Control')} className={activeTab === 'Revision Control' ? 'active' : ''} disabled={!isPlanningComplete}>Revision Control</button>
                <button onClick={() => handleTabChange('Testing')} className={activeTab === 'Testing' ? 'active' : ''}>Testing</button>
            </nav>
            {isParsingPlan && <div className="status-message loading" style={{marginBottom: '2rem'}}><div className="spinner"></div><p>Parsing project plan and populating tracking tools...</p></div>}
            
            {activeTab === 'Dashboard' && <DashboardView project={projectData} phasesData={projectData.phasesData || {}} isPlanningComplete={isPlanningComplete} projectPhases={projectPhases} onAnalyzeRisks={handleAnalyzeRisks} onGenerateSummary={handleGenerateSummary} isGeneratingReport={isGeneratingReport} />}
            {activeTab === 'Project Phases' && <ProjectPhasesView project={projectData} projectPhases={projectPhases} phasesData={projectData.phasesData || {}} documents={projectData.documents} error={error} loadingPhase={loadingPhase} handleUpdatePhaseData={handleUpdatePhaseData} handleCompletePhase={(docId) => handleUpdateDocument(docId, 'Approved')} handleGenerateContent={handleGenerateContent} handleAttachFile={handleAttachFile} handleRemoveAttachment={handleRemoveAttachment} generationMode={projectData.generationMode} onSetGenerationMode={handleSetGenerationMode} isAutoGenerating={isAutoGenerating} />}
            {activeTab === 'Documents' && <DocumentsView project={projectData} documents={projectData.documents} onUpdateDocument={handleUpdateDocument} phasesData={projectData.phasesData || {}} ai={ai} />}
            {activeTab === 'Project Tracking' && <ProjectTrackingView project={projectData} onUpdateTask={handleUpdateTask} onUpdateMilestone={handleUpdateMilestone} onUpdateTeam={handleUpdateTeam} onUpdateProject={handleSave} onTaskClick={setSelectedTask} currentUser={currentUser} />}
            {activeTab === 'Revision Control' && <RevisionControlView project={projectData} onUpdateProject={(update) => handleSave(update)} ai={ai} />}
            {activeTab === 'Testing' && <TestingView project={projectData} saveProject={saveProject} />}

            {selectedTask && (
                <TaskDetailModal 
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onSave={handleSaveTask}
                    task={selectedTask}
                    project={projectData}
                    currentUser={currentUser}
                />
            )}

            <AiReportModal 
                isOpen={aiReport.isOpen}
                onClose={() => setAiReport(prev => ({ ...prev, isOpen: false }))}
                title={aiReport.title}
                content={aiReport.content}
                onAddToDocuments={handleAddReportToDocuments}
            />
            <BackToTopButton />
        </section>
    );
};
