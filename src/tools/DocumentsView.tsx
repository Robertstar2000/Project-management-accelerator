import React, { useRef } from 'react';
import JSZip from 'jszip';

const getStatusChipClass = (status) => {
    switch (status) {
        case 'Approved': return 'chip-green';
        case 'Working': return 'chip-amber';
        case 'Rejected': return 'chip-red';
        case 'Failed': return 'chip-red';
        default: return '';
    }
};

const README_LOGIC_MD = `
# Application Logic Outline

This document outlines the core logic and data flow of the Project Management Accelerator application in a human-understandable format.

---

### 1. Initialization & Setup

-   **Application Mount (\`App.tsx\`)**
    -   A \`useEffect\` hook runs to initialize the application state.
    -   **Load Persistent State from \`localStorage\`**
        -   Loads the list of all existing projects (\`hmap-projects\`).
        -   Loads the ID of the last selected project (\`hmap-selected-project-id\`) to resume the user's session.
    -   **Initialize AI Client (\`GoogleGenAI\`)**
        -   The application attempts to find an API key in the following order of priority:
            1.  **User-Provided Key:** Checks \`localStorage\` for a key saved by the user.
            2.  **Promotional Key:** Checks environment variables (\`process.env.API_KEY\`) for a pre-configured key.
        -   If a key is found and successfully initializes the AI client, the application becomes fully functional.
        -   If no valid key is found, the application enters a **disabled state**, preventing users from creating or opening projects.
    -   **Initial Render**
        -   If a project was previously selected, the \`ProjectDashboard\` view is rendered.
        -   Otherwise, the \`LandingPage\` is rendered, showing the project list or a welcome hero.

---

### 2. Project Lifecycle Management

-   **Project Creation (\`NewProjectModal.tsx\`)**
    -   User selects project parameters (name, mode, scope, team size, complexity).
    -   User chooses a creation path:
        -   **A) Use a Template:**
            -   The user selects a pre-defined template.
            -   A new project object is created, performing a deep copy of the document list from the chosen template.
            -   The new project is saved to the application's state and persisted in \`localStorage\`.
        -   **B) Create My Own (Custom):**
            -   The user provides a custom project discipline (e.g., "Naval Architecture").
            -   An AI call is made using the \`PROMPTS.generateDocumentList\` prompt.
            -   The AI returns a JSON object containing a list of documents tailored to that specific discipline, scope, and complexity.
            -   This AI-generated document list is used to create the new project, which is then saved to state and \`localStorage\`.

-   **Project Selection**
    -   The user clicks on a project card.
    -   The application's \`selectedProject\` state is updated.
    -   The ID of the selected project is saved to \`localStorage\` for session persistence.
    -   The UI re-renders to show the \`ProjectDashboard\` for the selected project.

-   **Project Deletion**
    -   The user initiates deletion, which opens a confirmation modal.
    -   The user must type the project name to confirm.
    -   The project is filtered out of the application state and removed from \`localStorage\`.

---

### 3. Core HMAP Planning Logic (\`ProjectDashboard.tsx\` & \`ProjectPhasesView.tsx\`)

This is the central workflow for planning a project. It operates in two modes: Manual and Automatic.

-   **Phase & Document Rendering**
    -   The \`ProjectPhasesView\` component displays a \`PhaseCard\` for each document in the project.
    -   The cards are sorted chronologically based on their phase number.

-   **Sequential Locking Logic (\`getLockStatus\`)**
    -   A document/phase is **unlocked** only if the single document *immediately preceding it* in the sorted list has a status of "Approved".
    -   The very first document in the project is always unlocked by default.
    -   This enforces the sequential HMAP workflow.

-   **Manual Workflow (User-driven)**
    1.  The user opens an unlocked \`PhaseCard\`.
    2.  The user can either write content manually or click "Generate Content" to invoke the AI.
    3.  After reviewing and editing, the user clicks "Mark as Complete".
    4.  This action sets the document's status to "Approved".
    5.  The state update triggers a re-render, and the \`getLockStatus\` logic runs again, which unlocks the next \`PhaseCard\` in the sequence.

-   **Automatic Workflow (\`runAutomaticGeneration\`)**
    1.  The user activates "Automatic" mode after the first phase is complete.
    2.  A robust, sequential \`for...of\` loop begins, iterating through the sorted list of documents.
    3.  **Inside the Loop (for each document):**
        -   It first checks the document's latest status from the application state.
        -   If the document is already "Approved", it is skipped.
        -   If not approved, the function \`await\`s the completion of \`handleGenerateContent\` for that document.
        -   Immediately after successful generation, it updates the document's status to "Approved".
        -   The loop then proceeds to the next document. This strict sequential process prevents race conditions and ensures each document is generated with the full context of all previously completed ones.

---

### 4. AI Content Generation (\`handleGenerateContent\` in \`ProjectDashboard.tsx\`)

This is the AI-powered core of the application.

-   **Context Gathering (\`getRelevantContext\`)**
    -   Before generating content, the function gathers context.
    -   It finds all documents that precede the current one in the sorted list and have a status of "Approved".
    -   It concatenates the content of these approved documents into a single string. This content is pulled from the dense, compacted summaries of each document to ensure efficiency.
    -   This context is crucial for ensuring the AI generates cohesive and logically consistent documents.

-   **Prompt Selection & Assembly**
    -   Based on the document's title and phase, it selects the appropriate prompt template from the \`PROMPTS\` object using a flexible, keyword-based matching system.
    -   It injects the project's parameters (name, discipline, etc.) and the gathered context into the prompt template.

-   **API Call**
    -   It sends the final, assembled prompt to the Gemini API (\`ai.models.generateContent\`). The call is wrapped in a retry mechanism to handle transient errors.

-   **Content Compaction**
    -   After successfully generating the human-readable content for any document, a *second* AI call is made using the \`PROMPTS.compactContent\` prompt.
    -   This creates a dense, information-rich summary of the document. This compacted version is then stored and used for all future context gathering, improving AI signal-to-noise ratio and keeping API payloads small.

-   **State Update**
    -   The generated content and its compacted version are saved to the project's state.

---

### 5. Plan Parsing & Population (\`parseAndPopulateProjectPlan\` in \`ProjectDashboard.tsx\`)

This logic bridge the gap between AI-driven planning and the tracking tools.

-   **Trigger**
    -   A \`useEffect\` hook monitors the project's documents. When it detects that the "Detailed Plans (WBS/WRS)" document's status changes to "Approved", this function is called.
-   **Parsing**
    -   It retrieves the markdown content generated for the plan document.
    -   It finds the \`## Tasks\` and \`## Milestones\` sections.
    -   It uses a \`parseMarkdownTable\` helper to convert the markdown tables into arrays of JavaScript objects.
-   **Data Processing**
    -   It assigns unique IDs to each task and milestone.
    -   It resolves task dependencies, mapping task names (e.g., "API Design") to their newly created unique IDs.
-   **State Update**
    -   The new \`tasks\` and \`milestones\` arrays are saved to the project's state. This automatically populates the Gantt chart, Kanban board, and other tools in the "Project Tracking" view.
`;


export const DocumentsView = ({ project, documents, onUpdateDocument, phasesData }) => {
    const uploadInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        uploadInputRef.current?.click();
    };
    
    const handleCreateProjectPrompt = () => {
        const projectDataString = JSON.stringify(project, null, 2);
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
${README_LOGIC_MD}
---

**File Structure:**
Create a standard React file structure including components, views, constants, and utils folders to house the various parts of the application as described in the logic outline.

**Implementation Details & Initial State:**
- Implement all components and logic as described in the outline.
- The application state should be initialized to display the dashboard for the following specific project. All its data (documents, tasks, phases) should be pre-loaded.

**Initial Project State (JSON):**
\`\`\`json
${projectDataString}
\`\`\`

**Final Output:**
Provide the complete, independent source code for each required file. Do not include explanations, just the raw file content for each path.
`;
        console.log(prompt);
        alert('The prompt to create the entire project has been generated and logged to the browser console.');
    };

    const handleCreateSimulationPrompt = () => {
        const keyDocuments = ['Concept Proposal', 'Statement of Work (SOW)', 'Resources & Skills List', 'Detailed Plans (WBS/WRS)'];
        let context = '';

        keyDocuments.forEach(title => {
            const doc = project.documents.find(d => d.title === title);
            if (doc && phasesData[doc.id]?.content) {
                context += `--- Document: ${title} ---\n${phasesData[doc.id].content}\n\n`;
            }
        });

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

## Key Planning Documents Context:

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

        console.log(prompt);
        alert('The prompt to create a project simulation has been generated and logged to the browser console.');
    };

    const handleDownloadAll = async () => {
        if (!documents || documents.length === 0) {
            alert("No documents to download.");
            return;
        }

        const zip = new JSZip();

        documents.forEach(doc => {
            const content = phasesData[doc.id]?.content;
            if (content) {
                const folderName = `Phase ${doc.phase}`;
                // Sanitize filename to remove characters that are invalid in filenames
                const fileName = `${doc.title.replace(/[\\/:"*?<>|]/g, '')}.md`;
                zip.folder(folderName).file(fileName, content);
            }
        });

        try {
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(zipBlob);
            // Sanitize project name for use in filename
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
        <div className="tool-card">
            <h2 className="subsection-title">Documents Center</h2>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
                <button className="button" onClick={handleCreateProjectPrompt}>Create Project Prompt</button>
                <button className="button" onClick={handleCreateSimulationPrompt}>Create Simulation Prompt</button>
                <button className="button" onClick={handleDownloadAll}>Download All as .zip</button>
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
                            <td><a href="#">View</a> | <a href="#">History</a></td>
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
    );
};
