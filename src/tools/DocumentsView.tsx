
import React, { useRef, useState } from 'react';
import JSZip from 'jszip';
import { GoogleGenAI } from "@google/genai";
import { DocumentViewerModal } from '../components/DocumentViewerModal';

const getStatusChipClass = (status) => {
    switch (status) {
        case 'Approved': return 'chip-green';
        case 'Working': return 'chip-amber';
        case 'Rejected': return 'chip-red';
        case 'Failed': return 'chip-red';
        default: return '';
    }
};

export const DocumentsView = ({ project, documents, onUpdateDocument, phasesData, ai }) => {
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [viewingDocument, setViewingDocument] = useState<{title: string, content: string} | null>(null);

    const handleViewDocument = (doc) => {
        const content = phasesData[doc.id]?.content || 'This document has no content yet. Please generate it in the Project Phases view.';
        setViewingDocument({ title: doc.title, content });
    };

    const handleUploadClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        uploadInputRef.current?.click();
    };
    
    const handleCreateProjectPrompt = async () => {
        setIsGenerating('project');
        try {
            const response = await fetch('readme-logic.md');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const readmeLogicMd = await response.text();

            const firstDoc = project.documents.find(d => d.phase === 1 && d.sequence === 1);
            const wbsDoc = project.documents.find(d => d.title.toLowerCase().includes('detailed plans'));
    
            const firstDocContext = firstDoc && phasesData[firstDoc.id]?.compactedContent 
                ? phasesData[firstDoc.id].compactedContent
                : 'Not available. Please generate and approve the Concept Proposal.';
            const wbsDocContext = wbsDoc && phasesData[wbsDoc.id]?.compactedContent
                ? phasesData[wbsDoc.id].compactedContent
                : 'Not available. Please generate and approve the Detailed Plans document.';

            const projectContext = `
This application should be pre-loaded with the following project context.

--- KEY CONTEXT: CONCEPT PROPOSAL (COMPACTED) ---
${firstDocContext}
---

--- KEY CONTEXT: WORK BREAKDOWN STRUCTURE (COMPACTED) ---
${wbsDocContext}
---
`;

            const prompt = `
**Objective:** Generate the complete source code for a single-page web application called "Project Management Accelerator".

**Core Technologies:**
- **Frontend:** React with TypeScript (using JSX syntax in .tsx files).
- **AI Integration:** Google Gemini API via the \`@google/genai\` library.
- **Styling:** A global CSS-in-JS string. No separate CSS files.
- **Build:** No build step. Use an \`index.html\` with an ES module import map for dependencies like React and \`@google/genai\`.
- **Persistence:** Use browser \`localStorage\` to save projects and user settings.

**Application Concept:**
The application is an AI-powered project management tool based on the "Hyper-Agile Management Process (HMAP)". It guides users through a sequential planning process, using AI to generate project documents. Once planning is complete, it populates a suite of project tracking tools (Gantt, Kanban, etc.).

**High-Level Application Logic:**
Follow this detailed logic outline to structure the application's data flow and state management:
--- LOGIC OUTLINE ---
${readmeLogicMd}
---

**File Structure:**
Create a standard React file structure including components, views, constants, and utils folders to house the various parts of the application as described in the logic outline.

**Implementation Details & Initial State:**
- Implement all components and logic as described in the outline.
- The application state should be initialized based on the following specific project context. All its data (documents, tasks, phases) should be derived from this context.

**Initial Project Context:**
${projectContext}

**Final Output:**
Provide the complete, independent source code for each required file. Do not include explanations, just the raw file content for each path.
`;

            const textToDownload = prompt;
            
            const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-project-generation-prompt.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("Error creating project prompt:", error);
            alert("Could not create the project prompt. See console for details.");
        } finally {
            setIsGenerating(null);
        }
    };

    const handleCreateSimulationPrompt = async () => {
        setIsGenerating('simulation');
        try {
            const firstDoc = project.documents.find(d => d.phase === 1 && d.sequence === 1);
            const wbsDoc = project.documents.find(d => d.title.toLowerCase().includes('detailed plans'));
    
            let context = '';
            if (firstDoc && phasesData[firstDoc.id]?.compactedContent) {
                context += `--- Document: ${firstDoc.title} (Compacted) ---\n${phasesData[firstDoc.id].compactedContent}\n\n`;
            } else {
                context += `--- Document: ${firstDoc.title} (Compacted) ---\nNot available. Please generate and approve this document.\n\n`;
            }

            if (wbsDoc && phasesData[wbsDoc.id]?.compactedContent) {
                context += `--- Document: ${wbsDoc.title} (Compacted) ---\n${phasesData[wbsDoc.id].compactedContent}\n\n`;
            } else {
                 context += `--- Document: ${wbsDoc.title} (Compacted) ---\nNot available. Please generate and approve this document.\n\n`;
            }

            const projectDataSummary = {
                name: project.name,
                discipline: project.discipline,
                mode: project.mode,
                scope: project.scope,
                teamSize: project.teamSize,
                complexity: project.complexity,
                startDate: project.startDate,
                endDate: project.endDate,
                budget: project.budget,
                tasks: project.tasks?.map(t => ({ name: t.name, status: t.status, startDate: t.startDate, endDate: t.endDate, dependsOn: t.dependsOn, role: t.role })),
                milestones: project.milestones,
                team: project.team
            };

            const prompt = `
**Objective:** Act as an expert project management simulation engine. Your task is to analyze the provided project data and predict its future execution, identifying potential risks and providing actionable recommendations.

**Role:** You are a seasoned project manager with deep expertise in risk analysis, timeline forecasting, and team dynamics for the "${project.discipline}" industry.

---

## Project Data Summary:

\`\`\`json
${JSON.stringify(projectDataSummary, null, 2)}
\`\`\`

---

## Key Planning Documents Context (Compacted):

${context.trim()}

---

## Simulation Directives:

Based on all the provided data, perform the following analysis and generate a report.

1.  **Project Trajectory Forecast:**
    -   Provide a narrative simulation of the project's execution from its current state to completion.
    -   Identify which tasks or sprints are most likely to face delays.
    -   Predict a new, more realistic completion date and final budget based on potential issues.

2.  **Risk Identification & Analysis:**
    -   Identify the top 3-5 major risks to this project's success.
    -   For each risk, describe its potential impact (e.g., "High risk of scope creep from undefined user stories in the SOW, potentially causing a 2-week delay in Sprint 2").
    -   Consider risks related to dependencies, team skill gaps (based on roles vs. tasks), ambitious timelines, and complexity.

3.  **Actionable Recommendations:**
    -   Provide a list of specific, actionable recommendations to mitigate the identified risks.
    -   For each recommendation, explain how it would improve the project's outcome. (e.g., "Recommendation: Immediately schedule a 2-day workshop with stakeholders to refine user stories for Sprint 2. This will clarify requirements and reduce rework.").

**Output Format:**
Present your findings in a clear, structured report using Markdown. Use the following headings:
-   \`# Project Simulation Report for ${project.name}\`
-   \`## 1. Forecasted Trajectory\`
-   \`## 2. Key Risk Analysis\`
-   \`## 3. Strategic Recommendations\`
`;
            
            const textToDownload = prompt;
            
            const blob = new Blob([textToDownload], { type: 'text/markdown;charset=utf-8' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-simulation-prompt.md`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("Error creating project simulation prompt:", error);
            alert("Could not create the project simulation prompt. See console for details.");
        } finally {
            setIsGenerating(null);
        }
    };

    const handleDownloadAll = async () => {
        if (!documents || documents.length === 0) {
            alert("No documents to download.");
            return;
        }

        const zip = new JSZip();

        documents.forEach(doc => {
            const content = phasesData[doc.id]?.content;
            const compactedContent = phasesData[doc.id]?.compactedContent;
            
            if (content) {
                const folderName = `Phase ${doc.phase}`;
                const sanitizedTitle = doc.title.replace(/[\\/:"*?<>|]/g, '');
                const fileName = `${sanitizedTitle}.md`;
                zip.folder(folderName).file(fileName, content);
                
                if (compactedContent) {
                    const compactedFileName = `${sanitizedTitle}.compacted.md`;
                    zip.folder(folderName).file(compactedFileName, compactedContent);
                }
            }
        });

        try {
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(zipBlob);
            link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-documents.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Failed to create zip file:", error);
            alert("An error occurred while creating the zip file.");
        }
    };

    return (
        <>
            <div className="tool-card">
                <h2 className="subsection-title">Documents Center</h2>
                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
                    <button className="button" onClick={handleCreateProjectPrompt} disabled={!!isGenerating}>
                        {isGenerating === 'project' ? (
                            <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                <div className="spinner" style={{width: '1em', height: '1em', borderWidth: '2px'}}></div>
                                <span>Generating...</span>
                            </span>
                        ) : 'Create Project Prompt'}
                    </button>
                    <button className="button" onClick={handleCreateSimulationPrompt} disabled={!!isGenerating}>
                        {isGenerating === 'simulation' ? (
                            <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                <div className="spinner" style={{width: '1em', height: '1em', borderWidth: '2px'}}></div>
                                <span>Generating...</span>
                            </span>
                        ) : 'Create Simulation Prompt'}
                    </button>
                    <button className="button" onClick={handleDownloadAll} disabled={!!isGenerating}>Download All as .zip</button>
                </div>
                <table className="document-table">
                    <thead><tr><th>Title</th><th>Version</th><th>Status</th><th>Owner</th><th>Phase</th><th>Actions</th></tr></thead>
                    <tbody>
                        {documents && documents.map(doc => (
                            <tr key={doc.id}>
                                <td>{doc.title}</td>
                                <td>{doc.version}</td>
                                <td>
                                    <select 
                                        value={doc.status} 
                                        onChange={(e) => onUpdateDocument(doc.id, e.target.value)}
                                        className={`document-status-select ${getStatusChipClass(doc.status)}`}
                                        aria-label={`Status for ${doc.title}`}
                                    >
                                        <option value="Working">Working</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Rejected">Rejected</option>
                                        <option value="Failed">Failed</option>
                                    </select>
                                </td>
                                <td>{doc.owner}</td>
                                <td>{doc.phase}</td>
                                <td>
                                    <button className="button button-small" onClick={() => handleViewDocument(doc)}>View</button>
                                </td>
                            </tr>
                        ))}
                        {(!documents || documents.length === 0) && (
                            <tr><td colSpan={6} style={{textAlign: 'center'}}>No documents found for this project.</td></tr>
                        )}
                    </tbody>
                </table>
                <div className="upload-dropzone" onClick={() => uploadInputRef.current?.click()}>
                    <p>Drag & drop files to upload</p>
                    <a href="#" onClick={handleUploadClick} style={{textDecoration: 'underline', color: 'var(--accent-color)'}}>
                        Open Upload Dialogue
                    </a>
                </div>
                <input type="file" ref={uploadInputRef} style={{ display: 'none' }} multiple />
            </div>

            <DocumentViewerModal 
                isOpen={!!viewingDocument}
                onClose={() => setViewingDocument(null)}
                title={viewingDocument?.title || ''}
                content={viewingDocument?.content || ''}
            />
        </>
    );
};
