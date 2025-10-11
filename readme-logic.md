# Application Logic Outline

This document outlines the core logic and data flow of the Project Management Accelerator application in a human-understandable format.

---

### 1. Initialization & User Authentication

-   **Application Mount (`App.tsx`)**
    -   A primary `useEffect` hook initializes the application.
    -   **Authentication (`authService.ts`)**
        -   It first checks `localStorage` for an active user session (`hmap-session`).
        -   If no session exists, it renders the `AuthView` component, blocking access to the rest of the app.
        -   The `authService` handles user registration and login, storing user data (including mock passwords for this demo) in `localStorage` (`hmap-users`). A default user is created on the very first application run.
    -   **State Loading & Syncing**
        -   Once a user is authenticated, it loads the list of all projects (`hmap-projects`) and the ID of the last selected project (`hmap-selected-project-id`) from `localStorage`.
        -   It initializes a `BroadcastChannel` (`syncService.ts`) to listen for updates, ensuring that if the user has the app open in multiple tabs, changes made in one tab (e.g., creating a project) are reflected in the others.
    -   **AI Client Initialization**
        -   The application attempts to find and initialize the Gemini API key in the following order:
            1.  **User-Provided Key:** Checks `localStorage` for a key saved by the user (`hmap-gemini-key`).
            2.  **Promotional Key:** Checks environment variables (`process.env.API_KEY`).
        -   If no valid key is found, the app enters a disabled state where projects cannot be created or opened.
    -   **Initial Render**
        -   Based on the loaded state, it renders the appropriate view: `LandingPage` if no project is selected, or `ProjectDashboard` to resume the user's last session.

---

### 2. Project Lifecycle & Data Management

-   **Project Creation (`NewProjectModal.tsx`)**
    -   When a new project is created, it is automatically assigned an `ownerId` corresponding to the current logged-in user. The owner is also added as the first member of the project's `team`.
    -   The creation logic ensures that mandatory HMAP documents (like SOW, Resources List) are always included, and adds subcontracting-specific documents (RFP, Contract) if that scope is selected.
-   **Project Filtering**
    -   On the landing page, the project list is filtered to show only projects where the `currentUser` is either the `ownerId` or is listed in the `team` array.
-   **State Persistence (`App.tsx`)**
    -   All major state changes (creating, updating, or deleting a project) are saved to `localStorage` via the `saveProjectsToStorage` function.
    -   After saving, it calls `notifyUpdate()` to trigger the `BroadcastChannel` and sync other open tabs.

---

### 3. Core HMAP Planning Logic

This is the central workflow for planning a project, located primarily in `ProjectDashboard.tsx` and `ProjectPhasesView.tsx`.

-   **Sequential Locking (`getLockStatus` in `ProjectPhasesView.tsx`)**
    -   A document/phase is **unlocked** only if the single document *immediately preceding it* in the chronologically sorted list has its status set to "Approved". This strictly enforces the sequential HMAP methodology.
-   **Manual Workflow**
    -   The user opens an unlocked `PhaseCard`, provides input or generates content with AI, edits it, and marks it as "Approved". This unlocks the next document.
-   **Automatic Workflow (`runAutomaticGeneration` in `ProjectDashboard.tsx`)**
    -   This is a robust, sequential `for...of` loop that iterates through the sorted documents.
    -   **Context Integrity:** It uses a local copy of the project state (`projectForLoop`) for context gathering. After each document is successfully generated, it updates both the main application state (for UI reactivity) and its own local copy to ensure the *next* document in the loop gets the most up-to-date context.
    -   **Rate Limiting:** A one-second delay is intentionally introduced between each document generation to prevent API rate-limiting errors (HTTP 429).

---

### 4. AI Content Generation & Error Handling

The AI generation logic in `ProjectDashboard.tsx` is designed for resilience and quality.

-   **Resilient API Calls (`withRetry`)**
    -   All critical AI generation calls are wrapped in a `withRetry` helper function. This function automatically retries a failed API call up to two times with exponential backoff, gracefully handling transient network or server-side issues (HTTP 500).
-   **Optimized Context Gathering (`getRelevantContext`)**
    -   To ensure high-quality, relevant outputs while managing token limits, the AI context is built in a specific, prioritized order:
        -   **Highest Priority:** The full, compacted content of the project's **very first document** (e.g., "Concept Proposal") is always included to provide foundational context.
        -   **Lowest Priority:** The compacted content of the **immediately preceding approved document** is included to provide step-by-step context.
    -   **Intelligent Truncation:** If the combined context exceeds the API's payload limit, the system *only* truncates the lowest priority context (the preceding document), ensuring the foundational context is never lost.
-   **Content Compaction**
    -   After every successful document generation, a *second, separate AI call* is made using the `PROMPTS.compactContent` prompt. This creates a dense, information-rich summary of the new document, which is then stored and used for all future context-gathering steps. This significantly reduces token usage and improves the signal-to-noise ratio for the AI.

---

### 5. Plan Parsing & Tracking Tool Population

This logic, found in `ProjectDashboard.tsx`, bridges the gap from planning to execution.

-   **Trigger (`useEffect` hook)**
    -   A `useEffect` hook monitors the project's documents. It triggers when the state changes from "not all documents approved" to "all documents approved" for the first time.
    -   It will only run if the project's `tasks` and `milestones` arrays are empty, preventing it from re-running unnecessarily.
-   **Parsing (`parseAndPopulateProjectPlan`)**
    -   It retrieves the markdown content from the "Detailed Plans (WBS/WRS)" document.
    -   Using a `parseMarkdownTable` helper, it converts the `## Tasks` and `## Milestones` tables into arrays of structured JavaScript objects.
-   **Data Processing & State Update**
    -   It assigns unique IDs, resolves task dependencies by mapping names to IDs, and assigns tasks to sprints.
    -   The resulting `tasks` and `milestones` arrays are saved to the project state, which automatically populates all the tools in the "Project Tracking" view (Gantt, Kanban, etc.).

---

### 6. Multi-User & Collaboration Features

-   **Team Management (`TeamView.tsx`)**
    -   Team roles are dynamically extracted by parsing the AI-generated "Resources & Skills List" document.
    -   The project owner can assign users (by name and email) to these roles. The owner can also transfer project ownership to another team member.
-   **Task Collaboration (`TaskDetailModal.tsx`)**
    -   Users can add comments and attach files to any task.
    -   When a recurring task is marked "done", a new task for the next interval is automatically created.
-   **Notifications (`ProjectDashboard.tsx`)**
    -   When a task is completed, the system checks for any tasks that depended on it.
    -   If a dependent task is now fully unblocked, a notification is created for the user assigned to that task's role. The `Header` component displays the unread count.

---

### 7. Advanced AI & Reporting Features

-   **Dashboard AI Actions (`ProjectDashboard.tsx`)**
    -   The "Analyze Project Risks" and "Generate Project Summary" buttons collect a summary of the current project state (overdue tasks, milestones, budget) and key document contexts.
    -   They use specialized prompts (`PROMPTS.analyzeRisks`, `PROMPTS.generateStatusSummary`) to create detailed reports.
    -   Results are shown in a modal and can be saved as a new formal document in the "Documents Center".
-   **Advanced Prompt Generation (`DocumentsView.tsx`)**
    -   **Create Project Prompt:** This feature generates a single, massive prompt containing the application's entire frontend logic (from `readme-logic.md`) and the project's complete current state as a JSON object. This allows a developer to use an external LLM to regenerate or modify the application's source code with the specific project pre-loaded.
    -   **Create Simulation Prompt:** This generates a detailed prompt for an external LLM to run a predictive simulation of the project's future, forecasting risks and outcomes based on its current trajectory.

---

### 8. Testing & Validation

-   The application includes a self-contained test suite (`TestingView.tsx`) to ensure code quality and prevent regressions.
-   **Unit Tests:** Verify small, pure functions like utility parsers (`parseImpact`, `parseRolesFromMarkdown`) and logic helpers (`getLockStatus`).
-   **Integration Tests:** Check the interaction between logical components, such as the AI context gathering mechanism.
-   **Functional Tests:** Validate end-to-end user flows in a simulated environment, such as creating a project, generating the first document, and parsing the final project plan.
-   Tests are run against a mock AI service to ensure speed, predictability, and isolation from network dependencies.
