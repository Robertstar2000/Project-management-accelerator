


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
                setActiveTab('Project Phases');
            }
        }
    }, [project.id, isPlanningComplete, handleTabChange]);

    const handleUpdatePhaseData = useCallback(async (docId: string, content: string, compactedContent: string | null = undefined) => {
        return await handleSave(prevData => {
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
    }, [handleSave]);

    const handleUpdateDocument = useCallback(async (docId: string, status: string) => {
        const updatedDocs = projectData.documents.map(d => 
            d.id === docId ? { ...d, status } : d
        );
        return await handleSave({ documents: updatedDocs });
    }, [projectData.documents, handleSave]);
    
    const handleCompletePhase = useCallback(async (docId: string) => {
        return handleUpdateDocument(docId, 'Approved');
    }, [handleUpdateDocument]);

    const handleGenerateContent = useCallback(async (docId: string, userInput: string) => {
        setLoadingPhase({ docId, step: 'generating' });
        setError('');
        logAction('Generate Content Start', docId, { docId });
        let updatedProject = projectData;
    
        try {
            const docToGenerate = projectData.documents.find(d => d.id === docId);
            if (!docToGenerate) throw new Error("Document not found");
    
            const context = getRelevantContext(docToGenerate, projectData.documents, projectData.phasesData);
            const promptFn = getPromptFunction(docToGenerate.title, docToGenerate.phase);
            
            let promptText;
            if (promptFn === PROMPTS.phase8_generic) {
                promptText = promptFn(docToGenerate.title, projectData.name, projectData.discipline, context, projectData.mode, projectData.scope, projectData.teamSize, projectData.complexity);
            } else if (promptFn === PROMPTS.phase1) {
                promptText = promptFn(projectData.name, projectData.discipline, userInput, projectData.mode, projectData.scope, projectData.teamSize, projectData.complexity);
            } else {
                 promptText = promptFn(projectData.name, projectData.discipline, context, projectData.mode, projectData.scope, projectData.teamSize, projectData.complexity);
            }
            
            const prompt = truncatePrompt(promptText);
    
            const generateCall = () => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            const result: GenerateContentResponse = await withRetry(generateCall);
            const newContent = result.text;
            
            updatedProject = await handleUpdatePhaseData(docId, newContent);
            logAction('Generate Content Success', docId, { docId });
    
            if (updatedProject.generationMode === 'manual') {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            setLoadingPhase({ docId, step: 'compacting' });
            
            const compactPrompt = PROMPTS.compactContent(newContent);
            const compactCall = () => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: compactPrompt });
            const compactResult: GenerateContentResponse = await withRetry(compactCall);
            const compactedContent = compactResult.text;
    
            updatedProject = await handleUpdatePhaseData(docId, newContent, compactedContent);
            logAction('Compact Content Success', docId, { docId });
            
            return { success: true, updatedProject };
    
        } catch (err: any) {
            console.error("Failed to generate content:", err);
            const docTitle = projectData.documents.find(d => d.id === docId)?.title || 'the document';
            setError(`Failed to generate content for ${docTitle}. ${err.message}`);
            logAction('Generate Content Failure', docId, { docId, error: err.message });
            
            updatedProject = await handleUpdateDocument(docId, 'Failed');
            return { success: false, updatedProject };
        } finally {
            setLoadingPhase({ docId: null, step: null });
        }
    }, [ai, projectData, handleUpdatePhaseData, handleUpdateDocument]);

    const runAutomaticGeneration = useCallback(async () => {
        if (isAutoGenerating) return;
        setIsAutoGenerating(true);
        setError('');
        logAction('Automatic Generation Start', project.name, {});
    
        const projectDataRef = useRef(projectData);
        projectDataRef.current = projectData;

        const sortedDocs = [...projectDataRef.current.documents].sort((a, b) => {
            if (a.phase !== b.phase) return a.phase - b.phase;
            return a.title.localeCompare(b.title);
        });
    
        try {
            for (const doc of sortedDocs) {
                const currentDocFromRef = projectDataRef.current.documents.find(d => d.id === doc.id);
    
                if (currentDocFromRef && currentDocFromRef.status === 'Approved') {
                    continue;
                }
    
                const { success, updatedProject: projectAfterGen } = await handleGenerateContent(doc.id, projectDataRef.current.phasesData[doc.id]?.content || '');
                projectDataRef.current = projectAfterGen; // Update ref after generation
    
                if (!success) {
                    throw new Error(`Generation failed for "${doc.title}". Halting automatic process.`);
                }
    
                const projectAfterComplete = await handleCompletePhase(doc.id);
                projectDataRef.current = projectAfterComplete; // Update ref after approval
            }
            logAction('Automatic Generation Success', project.name, {});
            alert('Automatic document generation complete! Please review the generated documents.');
        } catch (err: any) {
            console.error("Automatic generation failed:", err);
            setError(err.message);
            logAction('Automatic Generation Failure', project.name, { error: err.message });
            alert(err.message);
        } finally {
            setIsAutoGenerating(false);
        }
    }, [isAutoGenerating, project.name, projectData, handleGenerateContent, handleCompletePhase]);

    const handleSetGenerationMode = useCallback((mode: 'manual' | 'automatic') => {
        handleSave({ generationMode: mode });
        if (mode === 'automatic' && !isAutoGenerating) {
            runAutomaticGeneration();
        }
    }, [handleSave, isAutoGenerating, runAutomaticGeneration]);

    const handleAttachFile = useCallback(async (docId: string, fileData: { name: string; data: string; }) => {
        await handleSave(prevData => {
            const newPhasesData = { ...prevData.phasesData };
            const currentData = newPhasesData[docId] || { content: '', attachments: [] };
            currentData.attachments = [...(currentData.attachments || []), fileData];
            newPhasesData[docId] = currentData;
            return { phasesData: newPhasesData };
        });
    }, [handleSave]);

    const handleRemoveAttachment = useCallback(async (docId: string, fileName: string) => {
        await handleSave(prevData => {
            const newPhasesData = { ...prevData.phasesData };
            const currentData = newPhasesData[docId];
            if (currentData) {
                currentData.attachments = currentData.attachments.filter(f => f.name !== fileName);
                newPhasesData[docId] = currentData;
            }
            return { phasesData: newPhasesData };
        });
    }, [handleSave]);

    const handleUpdateTask = useCallback((taskId, updatedTaskData) => {
        const updatedTasks = projectData.tasks.map(t => t.id === taskId ? { ...t, ...updatedTaskData } : t);
        handleSave({ tasks: updatedTasks });
    }, [projectData.tasks, handleSave]);
    
    const handleUpdateMilestone = useCallback((milestoneId, updatedMilestoneData) => {
        const updatedMilestones = projectData.milestones.map(m =>
            m.id === milestoneId ? { ...m, ...updatedMilestoneData } : m
        );
        handleSave({ milestones: updatedMilestones });
    }, [projectData.milestones, handleSave]);

    const handleUpdateTeam = useCallback((newTeam) => {
        handleSave({ team: newTeam });
    }, [handleSave]);

    const parseAndPopulateProjectPlan = useCallback(async () => {
        const planDocument = projectData.documents.find(d => d.title === 'Detailed Plans (WBS/WRS)');
        const planContent = planDocument ? projectData.phasesData?.[planDocument.id]?.content : undefined;
        
        if (!planContent) return;
    
        setIsParsingPlan(true);
        logAction('Parse Project Plan', project.name, { planContentLength: planContent.length });
        
        try {
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

                    const startDate = isValidDateString(t.start_date_yyyy_mm_dd) ? t.start_date_yyyy_mm_dd : projectData.startDate;
                    const endDate = isValidDateString(t.end_date_yyyy_mm_dd) ? t.end_date_yyyy_mm_dd : startDate;

                    if (!isValidDateString(t.start_date_yyyy_mm_dd)) console.warn(`Invalid start date for task "${t.task_name}".`);
                    if (!isValidDateString(t.end_date_yyyy_mm_dd)) console.warn(`Invalid end date for task "${t.task_name}".`);

                    const task = {
                        id: taskId, name: t.task_name, role: t.role || null, startDate, endDate,
                        sprintId: project.sprints.find(s => s.name === t.sprint)?.id || project.sprints[0]?.id,
                        status: 'todo', isSubcontracted: t.subcontractor?.toLowerCase() === 'yes',
                        dependsOn: t.dependencies ? t.dependencies.split(',').map(d => d.trim()) : [],
                        actualTime: null, actualCost: null, actualEndDate: null,
                    };
                    taskNameMap.set(task.name, taskId);
                    return task;
                });
    
                parsedTasks.forEach(task => {
                    task.dependsOn = task.dependsOn.map(depName => taskNameMap.get(depName)).filter(Boolean);
                });
            }
    
            if (milestonesSection) {
                const rawMilestones = parseMarkdownTable(milestonesSection);
                parsedMilestones = rawMilestones.map((m, index) => {
                    const milestoneDate = isValidDateString(m.date_yyyy_mm_dd) ? m.date_yyyy_mm_dd : projectData.startDate;
                    if (!isValidDateString(m.date_yyyy_mm_dd)) console.warn(`Invalid date for milestone "${m.milestone_name}".`);
                    return {
                        id: `milestone-${Date.now()}-${index}`, name: m.milestone_name, plannedDate: milestoneDate,
                        status: 'Not Started', actualStartDate: null, actualCompletedDate: null,
                    };
                });
            }
            
            if (parsedTasks.length > 0) {
                const lastTask = parsedTasks.reduce((latest, current) => new Date(latest.endDate) > new Date(current.endDate) ? latest : current);
                await handleSave({ tasks: parsedTasks, milestones: parsedMilestones, endDate: lastTask.endDate });
                logAction('Parse Project Plan Success', project.name, { taskCount: parsedTasks.length, milestoneCount: parsedMilestones.length });
                alert('Project plan successfully parsed and populated in the "Project Tracking" tab.');
            } else {
                 throw new Error("No tasks were found in the document.");
            }
    
        } catch (e: any) {
            console.error("Failed to parse project plan:", e);
            logAction('Parse Project Plan Failure', project.name, { error: e.message });
            alert("Error: Could not parse the project plan. Please check the document's formatting.");
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
                    generationMode={projectData.generationMode}
                    onSetGenerationMode={handleSetGenerationMode}
                    isAutoGenerating={isAutoGenerating}
                />;
            case 'Documents':
                return <DocumentsView project={projectData} documents={projectData.documents} onUpdateDocument={handleUpdateDocument} phasesData={projectData.phasesData || {}} ai={ai} />;
            case 'Project Tracking':
                return <ProjectTrackingView 
                    project={projectData}
                    tasks={projectData.tasks || []}
                    sprints={projectData.sprints || []}
                    milestones={projectData.milestones || []}
                    projectStartDate={projectData.startDate}
                    projectEndDate={projectData.endDate}
                    onUpdateTask={handleUpdateTask}
                    onUpdateMilestone={handleUpdateMilestone}
                    onUpdateTeam={handleUpdateTeam}
                />;
            case 'Revision Control':
                return <RevisionControlView project={projectData} onUpdateProject={(update) => handleSave(update)} ai={ai} />;
            default:
                return null;
        }
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
            </nav>
            {isParsingPlan && <div className="status-message loading" style={{marginBottom: '2rem'}}><div className="spinner"></div><p>Parsing project plan and populating tracking tools...</p></div>}
            {renderActiveTab()}
            <BackToTopButton />
        </section>
    );
};
