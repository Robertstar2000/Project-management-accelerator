# Application Logic Outline

This document outlines the core logic and data flow of the Project Management Accelerator application in a human-understandable format.

---

### 1. Initialization & Setup

-   **Application Mount (`App.tsx`)**
    -   A `useEffect` hook runs to initialize the application state.
    -   **Load Persistent State from `localStorage`**
        -   Loads the list of all existing projects (`hmap-projects`).
        -   Loads the ID of the last selected project (`hmap-selected-project-id`) to resume the user's session.
    -   **Initialize AI Client (`GoogleGenAI`)**
        -   The application attempts to find an API key in the following order of priority:
            1.  **User-Provided Key:** Checks `localStorage` for a key saved by the user.
            2.  **Promotional Key:** Checks environment variables (`process.env.API_KEY`) for a pre-configured key.
        -   If a key is found and successfully initializes the AI client, the application becomes fully functional.
        -   If no valid key is found, the application enters a **disabled state**, preventing users from creating or opening projects.
    -   **Initial Render**
        -   If a project was previously selected, the `ProjectDashboard` view is rendered.
        -   Otherwise, the `LandingPage` is rendered, showing the project list or a welcome hero.

---

### 2. Project Lifecycle Management

-   **Project Creation (`NewProjectModal.tsx`)**
    -   User selects project parameters (name, mode, scope, team size, complexity).
    -   User chooses a creation path:
        -   **A) Use a Template:**
            -   The user selects a pre-defined template.
            -   A new project object is created, performing a deep copy of the document list from the chosen template.
            -   The new project is saved to the application's state and persisted in `localStorage`.
        -   **B) Create My Own (Custom):**
            -   The user provides a custom project discipline (e.g., "Naval Architecture").
            -   An AI call is made using the `PROMPTS.generateDocumentList` prompt.
            -   The AI returns a JSON object containing a list of documents tailored to that specific discipline, scope, and complexity.
            -   This AI-generated document list is used to create the new project, which is then saved to state and `localStorage`.

-   **Project Selection**
    -   The user clicks on a project card.
    -   The application's `selectedProject` state is updated.
    -   The ID of the selected project is saved to `localStorage` for session persistence.
    -   The UI re-renders to show the `ProjectDashboard` for the selected project.

-   **Project Deletion**
    -   The user initiates deletion, which opens a confirmation modal.
    -   The user must type the project name to confirm.
    -   The project is filtered out of the application state and removed from `localStorage`.

---

### 3. Core HMAP Planning Logic (`ProjectDashboard.tsx` & `ProjectPhasesView.tsx`)

This is the central workflow for planning a project. It operates in two modes: Manual and Automatic.

-   **Phase & Document Rendering**
    -   The `ProjectPhasesView` component displays a `PhaseCard` for each document in the project.
    -   The cards are sorted chronologically based on their phase number.

-   **Sequential Locking Logic (`getLockStatus`)**
    -   A document/phase is **unlocked** only if the single document *immediately preceding it* in the sorted list has a status of "Approved".
    -   The very first document in the project is always unlocked by default.
    -   This enforces the sequential HMAP workflow.

-   **Manual Workflow (User-driven)**
    1.  The user opens an unlocked `PhaseCard`.
    2.  The user can either write content manually or click "Generate Content" to invoke the AI.
    3.  After reviewing and editing, the user clicks "Mark as Complete".
    4.  This action sets the document's status to "Approved".
    5.  The state update triggers a re-render, and the `getLockStatus` logic runs again, which unlocks the next `PhaseCard` in the sequence.

-   **Automatic Workflow (`runAutomaticGeneration`)**
    1.  The user activates "Automatic" mode after the first phase is complete.
    2.  A robust, sequential `for...of` loop begins, iterating through the sorted list of documents.
    3.  **Inside the Loop (for each document):**
        -   It first checks the document's latest status from the application state.
        -   If the document is already "Approved", it is skipped.
        -   If not approved, the function `await`s the completion of `handleGenerateContent` for that document.
        -   Immediately after successful generation, it updates the document's status to "Approved".
        -   The loop then proceeds to the next document. This strict sequential process prevents race conditions and ensures each document is generated with the full context of all previously completed ones.

---

### 4. AI Content Generation (`handleGenerateContent` in `ProjectDashboard.tsx`)

This is the AI-powered core of the application.

-   **Context Gathering (`getRelevantContext`)**
    -   Before generating content, the function gathers context.
    -   It finds all documents that precede the current one in the sorted list and have a status of "Approved".
    -   It concatenates the content of these approved documents into a single string. This content is pulled from the dense, compacted summaries of each document to ensure efficiency.
    -   This context is crucial for ensuring the AI generates cohesive and logically consistent documents.

-   **Prompt Selection & Assembly**
    -   Based on the document's title and phase, it selects the appropriate prompt template from the `PROMPTS` object using a flexible, keyword-based matching system.
    -   It injects the project's parameters (name, discipline, etc.) and the gathered context into the prompt template.

-   **API Call**
    -   It sends the final, assembled prompt to the Gemini API (`ai.models.generateContent`). The call is wrapped in a retry mechanism to handle transient errors.

-   **Content Compaction**
    -   After successfully generating the human-readable content for any document, a *second* AI call is made using the `PROMPTS.compactContent` prompt.
    -   This creates a dense, information-rich summary of the document. This compacted version is then stored and used for all future context gathering, improving AI signal-to-noise ratio and keeping API payloads small.

-   **State Update**
    -   The generated content and its compacted version are saved to the project's state.

---

### 5. Plan Parsing & Population (`parseAndPopulateProjectPlan` in `ProjectDashboard.tsx`)

This logic bridge the gap between AI-driven planning and the tracking tools.

-   **Trigger**
    -   A `useEffect` hook monitors the project's documents. When it detects that the "Detailed Plans (WBS/WRS)" document's status changes to "Approved", this function is called.
-   **Parsing**
    -   It retrieves the markdown content generated for the plan document.
    -   It finds the `## Tasks` and `## Milestones` sections.
    -   It uses a `parseMarkdownTable` helper to convert the markdown tables into arrays of JavaScript objects.
-   **Data Processing**
    -   It assigns unique IDs to each task and milestone.
    -   It resolves task dependencies, mapping task names (e.g., "API Design") to their newly created unique IDs.
-   **State Update**
    -   The new `tasks` and `milestones` arrays are saved to the project's state. This automatically populates the Gantt chart, Kanban board, and other tools in the "Project Tracking" view.

---

### Implemented Solutions & Architectural Notes

-   **Robust Prompt Selection:** The application now uses a keyword-based mapping system to select AI prompts. This allows for more flexibility with custom document titles (e.g., "Risk Analysis" will correctly trigger the "SWOT Analysis" prompt), making the system more resilient to variations in user-generated project templates.

-   **Resilient API Communication:** All critical AI API calls are wrapped in an automatic retry mechanism with exponential backoff. This handles transient network or server errors gracefully. During automatic generation, if an API call permanently fails after all retries, the corresponding document is marked as "Failed" in the UI, and the process is safely halted, allowing the user to manually intervene without losing progress.

-   **Optimized AI Context Management:** To prevent errors from exceeding the API's context window and to improve signal quality, the application now generates a dense, compacted summary for *every* document upon its creation. These compacted summaries are used as the context for all subsequent AI generation steps, ensuring the AI has a rich, token-efficient history of the project plan.

-   **Architectural Note: State Management:** The entire project object is passed down as a prop through many components. On every minor update, large parts of the UI may re-render unnecessarily. For a production application, adopting a more granular state management solution like Zustand, Redux, or React's `useReducer` with Context would lead to better performance and more maintainable code.
