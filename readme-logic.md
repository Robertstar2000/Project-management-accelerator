# Application Logic Outline

This document outlines the core logic, data flow, and architecture of the Project Management Accelerator application. It also includes a roadmap for potential future improvements.

---

### 1. Initialization & State Management

-   **Application Mount (`App.tsx`)**
    -   A primary `useEffect` hook initializes the application upon loading.
    -   **Authentication (`authService.ts`)**: The application is user-aware. It checks `localStorage` for an active user session (`hmap-session`). If none exists, it renders the `AuthView`, blocking access. The `authService` handles user registration and login, persisting user data in `localStorage` (`hmap-users`) and creating a default user on the very first run.
    -   **State Loading**: Once a user is authenticated, the app loads all projects (`hmap-projects`) from `localStorage`. A `useMemo` hook filters this list to show only projects owned by or shared with the current user.
    -   **Session Resumption**: The ID of the last selected project (`hmap-selected-project-id`) is loaded to restore the user's session, automatically opening the last project they were working on.
    -   **AI Client Initialization**: The Gemini API key is initialized in a specific order of priority: 1) A user-provided key from `localStorage` (`hmap-gemini-key`), 2) A promotional key from environment variables (`process.env.API_KEY`). If no key is found, AI-dependent features are disabled.
    -   **Cross-Tab Syncing (`syncService.ts`)**: A `BroadcastChannel` is established to ensure state consistency across multiple browser tabs for the same user. When a change is made in one tab (e.g., updating a project), a message is broadcast, prompting other tabs to reload their state from `localStorage`.

---

### 2. Project Lifecycle & Data Persistence

-   **Project Creation (`NewProjectModal.tsx`)**
    -   New projects are assigned an `ownerId` corresponding to the logged-in user. The owner is also added as the first member of the project's `team`.
    -   The creation logic enforces HMAP standards by ensuring mandatory documents (SOW, Resources List, etc.) are always included. It also dynamically adds documents like an RFP and Contract if the "subcontracted" scope is chosen.
-   **State Persistence (`App.tsx`)**
    -   The application uses a "top-down" state management approach. The primary state (the array of all projects) lives in the `App` component.
    -   The `saveProjectsToStorage` function is the single point of truth for writing to `localStorage`. Any component that needs to update the global state does so via prop-drilled functions (`saveProject`, `handleSave`, etc.) that ultimately call this function.
    -   After saving, `notifyUpdate()` is called to trigger the `BroadcastChannel` for tab synchronization.

---

### 3. Core HMAP Workflow

This is the central planning process, primarily managed by `ProjectDashboard.tsx` and `ProjectPhasesView.tsx`.

-   **Sequential Locking (`getLockStatus` in `ProjectPhasesView.tsx`)**
    -   This function is the gatekeeper of the HMAP process. It ensures a document is **unlocked** only if the single document *immediately preceding it* in the chronologically sorted list has its status set to "Approved". This strictly enforces the sequential methodology.
-   **Manual Workflow**
    -   The user opens an unlocked `PhaseCard`, provides input, uses the AI to generate content, edits the result, and marks it "Approved". This action updates the document's status, which in turn unlocks the next document in the sequence.
-   **Automatic Workflow (`runAutomaticGeneration` in `ProjectDashboard.tsx`)**
    -   This is an `async` `for...of` loop that iterates through the sorted documents.
    -   **Context Integrity**: To ensure each step has the correct context, the loop uses a local, in-memory copy of the project state (`projectForLoop`). After each document is successfully generated, it updates both the main application state (via `handleSave`) for UI reactivity and its own local copy. This guarantees the *next* document in the loop receives the most up-to-date context from the one just created.
    -   **Rate Limiting**: A three-second delay is intentionally introduced between each document generation to prevent API rate-limiting errors (HTTP 429), which is crucial for free-tier keys.

---

### 4. AI Generation Engine

The AI logic in `ProjectDashboard.tsx` is designed for resilience, quality, and performance.

-   **Resilient API Calls (`withRetry`)**
    -   All Gemini API calls are wrapped in a `withRetry` helper function. It automatically retries a failed API call up to two times with exponential backoff, gracefully handling transient network issues or temporary server-side errors (e.g., HTTP 500).
-   **Optimized Context Gathering (`getRelevantContext`)**
    -   To generate high-quality outputs while respecting token limits, the context for the AI is built with a clear priority:
        1.  **Foundational Context (Highest Priority):** The compacted content of the project's **first document** (e.g., "Concept Proposal") is always included.
        2.  **Sequential Context (Lower Priority):** The compacted content of the **immediately preceding approved document** is included.
    -   **Intelligent Truncation (`truncatePrompt`)**: Before sending, the prompt's total character count is checked. If it exceeds the safety limit, the prompt is truncated from the end. This is a safeguard against API errors for very large projects.
-   **Content Compaction**
    -   After every successful document generation, a **second, separate AI call** is made using `PROMPTS.compactContent`. This creates a dense, information-rich summary of the new document. This compacted version is then stored and used for all future context-gathering steps, significantly reducing token usage and improving the signal-to-noise ratio for the AI.

---

### 5. Plan Parsing & Execution Phase

This logic in `ProjectDashboard.tsx` bridges the gap from planning to execution.

-   **Trigger (`useEffect` hook)**
    -   A `useEffect` hook continuously compares the previous and current state of the project's documents. It triggers only once, at the exact moment the final required document's status changes to "Approved".
    -   It runs only if the project's `tasks` array is empty, preventing it from overwriting an existing plan.
-   **Parsing (`parseAndPopulateProjectPlan`)**
    -   It retrieves the markdown content from the "Detailed Plans (WBS/WRS)" document.
    -   Using a `parseMarkdownTable` helper, it converts the `## Tasks` and `## Milestones` tables into structured JavaScript objects.
-   **Data Population**
    -   It assigns unique IDs, resolves task dependencies by mapping string names to newly created IDs, and assigns tasks to sprints.
    -   The resulting `tasks` and `milestones` arrays are saved to the project state, which automatically populates all tools in the "Project Tracking" view (Gantt, Kanban, etc.).

---

### 6. Multi-User & Collaboration Features

-   **Team Management (`TeamView.tsx`)**
    -   Team roles are dynamically parsed from the AI-generated "Resources & Skills List" document.
    -   The project owner can assign users to roles and transfer project ownership.
-   **Task Collaboration (`TaskDetailModal.tsx`)**
    -   Users can add comments (with `@` mentions) and attach files.
    -   When a recurring task is completed, a new instance for the next interval is automatically created.
-   **Notifications (`ProjectDashboard.tsx` -> `handleUpdateTask`)**
    -   When a task is marked "done", the system checks for any tasks that depended on it.
    -   If a dependent task is now fully unblocked, a notification is created for the user assigned to that task's role. The `Header` component displays the unread count.

---

### 7. Potential Improvements & Future Architecture

This section outlines a strategic roadmap for scaling the application beyond its current prototype stage.

-   **State Management**
    -   **Problem:** The current "prop-drilling" approach is becoming complex. State changes deep in the component tree require callbacks passed through many layers.
    -   **Solution:** Introduce a centralized state management library like **Zustand** or **Redux Toolkit**. This would create a global store for projects and the current user, allowing any component to access and update state directly, simplifying components and improving maintainability.

-   **Backend & Database**
    -   **Problem:** `localStorage` is not a scalable or secure solution for a true multi-user application. It doesn't support real-time collaboration or data sharing between different users.
    -   **Solution:** Migrate to a proper backend-as-a-service (**Firebase** or **Supabase**) or a custom backend (e.g., **Node.js/Express**).
        -   **Authentication:** Replace the mock `authService` with a robust provider like Firebase Authentication.
        -   **Database:** Use a cloud database like **Firestore** or **PostgreSQL** to store user and project data. This is the foundation for all real-time features.

-   **Real-time Collaboration**
    -   **Problem:** The current `BroadcastChannel` only syncs tabs for the *same user* on the *same machine*. It cannot show User A the changes User B is making.
    -   **Solution:** Leverage the chosen backend's real-time capabilities.
        -   With **Firestore**, use its real-time listeners (`onSnapshot`) to automatically push updates to all connected clients.
        -   With a custom backend, implement **WebSockets** to broadcast changes to all members of a project. This would enable features like live document editing and seeing tasks move on the Kanban board in real-time.

-   **Performance Optimization**
    -   **Problem:** The Gantt chart and other list-based views currently render all their items at once, which can cause lag on very large projects with hundreds of tasks.
    -   **Solution:** Implement **UI virtualization** (windowing) using libraries like `react-window` or `tanstack-virtual`. This technique only renders the items currently visible in the viewport, drastically improving performance for large datasets.
    -   **Web Workers:** For CPU-intensive tasks like parsing a very large project plan or handling large file uploads, move the logic to a **Web Worker**. This would prevent the main UI thread from freezing, ensuring the application remains responsive.

-   **Code Architecture**
    -   **Problem:** API logic is currently mixed within component files (e.g., `ProjectDashboard.tsx`).
    -   **Solution:** Create a dedicated **API service layer**. All functions that interact with the Gemini API or a future backend should be abstracted into a separate module (e.g., `src/services/apiService.ts`). This improves separation of concerns and makes the code easier to test and maintain.
