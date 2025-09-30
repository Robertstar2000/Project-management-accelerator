# Project Management Accelerator Help

## User Operations Manual

### 1. Getting Started: API Key

The application requires a Google Gemini API key to power its AI features.

-   Upon first launch, you will be prompted to enter an API key.
-   You can get your free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
-   Your key is stored securely in your browser's local storage and is never sent to any server besides Google's.
-   Once a valid key is saved, you can create and manage projects.

### 2. Creating a New Project

1.  Click the **"New Project"** or **"Start New Project"** button.
2.  In the modal, provide a **Project Name** and select the relevant **Discipline**. The discipline helps the AI tailor its responses to your specific industry.
3.  Click **"Create Project"**. You will be taken directly to the Project Dashboard.

### 3. The Project Dashboard

The dashboard is your central hub for managing a selected project.

-   **Navigation**: Use the top navigation tabs (`Dashboard`, `Project Phases`, `Project Tracking`, etc.) to switch between different management tools.
-   **Dashboard View**: Get a high-level overview of project metrics, phase progress, workstreams, and alerts.
-   **Back to Projects**: Use the `← Back to Projects` button to return to the landing page with your project list.

### 4. The HMAP Workflow (Project Phases View)

This is the core of the planning process. Work through each phase sequentially to build a robust project plan.

1.  **Open a Phase**: Click on a phase header to expand it. Phases are locked until the previous phase is marked as complete.
2.  **Generate Content**: Click the **"Generate Content"** button. The AI will use the project's name, discipline, and content from all previous phases to generate the required document for the current phase.
3.  **Edit & Save**: You can manually edit the AI-generated content in the text area and click **"Save"**.
4.  **Mark as Complete**: Once you are satisfied with the content, click **"Mark as Complete"**. This will finalize the phase and unlock the next one.
5.  **AI Task Breakdown (Phase 6)**: In the "Develop Detailed Plans (WBS/WRS)" phase, after generating the main content, a special button appears: **"Break Down Tasks with AI"**. Clicking this will read your Statement of Work (from Phase 5) and automatically generate a detailed task list, which will populate the Project Tracking view.

### 5. Project Tracking View

Once tasks are generated, use this tool to manage execution.

-   **Timeline (Gantt Chart)**: A visual representation of your project schedule. Task bars are color-coded by status.
-   **Task List**: View all tasks in a table format. This is where you can **define dependencies**. For each task, use the multi-select dropdown to choose which other tasks must be completed first.
-   **Dependency Visualization**: In the Gantt chart, dependencies are shown as lines connecting tasks. If a task's prerequisite is not complete, its bar will be visually marked as **"blocked"** (red stripes), preventing out-of-sequence work.
-   **Kanban Board**: A classic Kanban view to track tasks across statuses: To Do, In Progress, In Review, and Done.
-   **Milestones**: A view of your key project milestones, their due dates, and their health status.

### 6. Documents Center

Manage the status of the formal documents generated during the HMAP phases.

-   Use the dropdown in the "Status" column to change a document's state from `Working` to `Approved` or `Rejected`.
-   **Important**: Certain project phases cannot begin until their required documents are marked as **"Approved"**.

### 7. Revision & Change Control

Model the impact of potential changes before they are approved.

1.  Fill out the **Change Request** form with a title, reason, and estimated impact (e.g., `+10d +5000c` for 10 days and $5,000 cost).
2.  The **Auto Impact Analysis** table will immediately show you the new projected budget and end date.
3.  Add **What-If Scenarios** to compare alternative approaches to the change. The table will update to show the impact of each scenario side-by-side.

---

## Tutorial: The AI-Accelerated HMAP

This tool is built on the **Hyper-Agile Management Process (HMAP)**, a methodology inspired by the rapid, iterative, and first-principles approach used at companies like SpaceX. Its goal is to move from concept to execution as quickly as possible while maintaining rigor and alignment.

**Core HMAP Principles:**

-   **Extreme Speed**: Compress the planning cycle from months to days or hours.
-   **Iterative Planning**: Build the project plan layer by layer, with each phase informing the next. Don't plan everything in perfect detail from day one.
-   **Automated Rigor**: Use templates and automation to ensure no steps are skipped.
-   **Clear Ownership & Responsibility**: Force early definition of roles and responsibilities (WRS/RACI).
-   **Proactive Analysis**: Analyze risks (SWOT) and change impacts *before* they derail the project.

**How AI Accelerates HMAP:**

The Project Management Accelerator uses AI as a powerful co-pilot to supercharge the HMAP workflow.

-   **Eliminates "Blank Page" Problem**: Instead of spending hours writing a Concept Proposal or SOW, the AI generates a comprehensive, context-aware draft in seconds (Phase 1, 5). This allows project managers to shift their focus from writing to strategy and refinement.
-   **Ensures Consistency**: The AI uses the outputs of previous phases as context for the next, ensuring a consistent thread of logic flows through the entire plan, from high-level concept to detailed task lists.
-   **Automates Tedious Breakdown**: The most powerful feature is the AI-powered task generation (Phase 6). The AI parses the natural language of the SOW and converts it into a structured Work Breakdown Structure (WBS)—a list of tasks with duration estimates. This single step can save dozens of hours of manual planning.
-   **Enables Rapid Re-planning**: If a major change occurs, you can quickly regenerate subsequent planning documents with the new context, allowing for agility that is impossible with traditional methods.

By following the HMAP phases within this tool, you are guided through a best-practice planning process that is both incredibly fast and remarkably thorough, setting your project up for success from the very beginning.
