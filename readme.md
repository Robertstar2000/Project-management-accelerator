# Project Management Accelerator

An AI-powered project management companion that guides you through the full lifecycle of a project using the proven **Hyper-Agile Management Process (HMAP)**. This tool automates documentation, accelerates planning, and provides clear visibility into project execution for individuals and teams.

## Core Features

-   **✨ AI-Powered Planning**: Generate comprehensive project documents, from concept proposals to detailed work breakdowns, in seconds using Google's Gemini API.
-   **🔐 Multi-User & Team-Based**: Secure user accounts ensure that projects are private. Assign roles and collaborate with your team.
-   **🧭 Structured Workflow**: Follow a clear, phase-based methodology (HMAP) that ensures all critical planning steps are completed in the right order, preventing downstream issues.
-   **📊 Comprehensive Tracking**: Visualize your project's progress with an interactive Gantt chart, Kanban board, workload heat map, and milestone tracker.
-   **💬 Collaboration Tools**: Dive into task details, leave comments, attach files, and receive automatic notifications when your work is unblocked.
-   **🎛️ Dynamic What-If Analysis**: Instantly model the impact of change requests on your budget and timeline before committing, enabling data-driven decision-making.

---

## User Operations Manual

### 1. Getting Started: Account & API Key

**User Account:**
-   The application now supports multiple users. You can **Sign Up** for a new account or **Login** to an existing one.
-   All projects you create are tied to your account. You can invite team members and transfer ownership.

**API Key:**
-   The application requires a Google Gemini API key to power its AI features.
-   Upon first launch, you will be prompted to enter an API key from the landing page.
-   You can get your free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
-   Your key is stored securely in your browser's local storage and is never sent to any server besides Google's.

### 2. My Work & Project Management

-   **My Work View**: The landing page now features a "My Work" dashboard, which automatically aggregates all tasks assigned to you across all your projects, conveniently sorted by due date.
-   **Project Creation**: Click **"Start Working"** or **"New Project"**. The project you create will be owned by you.
-   **Project List**: The main project list shows only projects that you own or are a team member of.

### 3. The Project Dashboard

The dashboard is your central hub for managing a project.

-   **Navigation**: Use the top tabs to switch between tools. Note that the `Dashboard`, `Project Tracking`, and `Revision Control` tabs are locked until the planning phases are complete.
-   **Notification Bell**: The header contains a notification bell. You will receive an alert here when a task you are assigned to becomes unblocked (meaning its prerequisite tasks have been completed).
-   **AI Quick Actions (in Dashboard View)**: Once planning is complete, you can use powerful AI actions:
    -   **Analyze Project Risks**: Generates a detailed risk assessment based on the project's current status and planning documents.
    -   **Generate Project Summary**: Creates a concise, professional status report suitable for stakeholders.
    -   Generated reports can be viewed, copied, downloaded, or saved directly to the project's `Documents Center`.

### 4. The HMAP Workflow (Project Phases View)

This is the core of the planning process. Work through each phase sequentially to build a robust project plan.

1.  **Open a Phase**: Click on a phase header to expand it. Phases are locked until the document immediately preceding it is marked as "Approved".
2.  **Generate Content**: For Phase 1, provide your high-level project goals. For subsequent phases, the AI will use the content from all previously approved documents as context to generate the next one.
3.  **Edit & Approve**: Manually edit the AI-generated content, attach supporting files, and click **"Mark as Complete"** (which sets the status to "Approved"). This unlocks the next phase.
4.  **Automated Plan Generation (Phase 7)**: In the "Develop Detailed Plans & Timeline" phase, the AI reads your approved Statement of Work (SOW) and other documents to automatically generate a complete project plan. This includes a Work Breakdown Structure (WBS), a detailed task list, and key milestones, which populate the `Project Tracking` view.

### 5. Project Tracking View

Once the plan is generated, use this view to manage execution.

-   **Task List & Timeline (Gantt)**: View tasks in a list or on a Gantt chart. Dependencies are visualized as arrows. Blocked tasks (whose prerequisites are not complete) are marked with red stripes.
-   **Task Detail Modal**: Click on any task to open a detailed view where you can:
    -   Edit the task's description.
    -   Set a **recurrence schedule** (daily, weekly, monthly).
    -   **Attach files**.
    -   **Post comments** and use `@` to mention team members.
-   **Kanban Board**: A classic Kanban view to drag and drop tasks between statuses.
-   **Workload**: A heat map showing the total number of workdays assigned to each team member per week. Use this to identify and resolve resource overallocation.
-   **Team**: Assign your team members (by name and email) to the roles that were automatically extracted from the "Resources & Skills List" document. The project owner can also transfer ownership to another team member from this screen.
-   **Milestones & Resources**: Track progress against key dates and manage non-labor costs.

### 6. Documents Center

-   Manage the status (`Working`, `Approved`, `Rejected`) of all formal project documents.
-   **Download All**: Package all your project documents into a single `.zip` file.
-   **Advanced Prompts**:
    -   **Create Project Prompt**: Generates a single, massive prompt containing the application's logic and your project's specific state. This can be used in an external AI tool to regenerate the application's source code.
    -   **Create Simulation Prompt**: Generates a prompt to run a detailed project simulation in an external AI tool, forecasting potential risks and outcomes.

### 7. Revision & Change Control

Model the impact of potential changes *before* they are approved.

-   Fill out the **Change Request** form and add **What-If Scenarios**.
-   The **Auto Impact Analysis** table will immediately show the projected budget and end date for the baseline, the change request, and each scenario, allowing for a clear, side-by-side comparison.
-   Generate an AI deployment plan and apply changes systematically.

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

-   **Eliminates "Blank Page" Problem**: Instead of spending hours writing a Concept Proposal or SOW, the AI generates a comprehensive, context-aware draft in seconds (Phase 1, 5). These drafts are written using professional, industry-standard terminology, allowing project managers to shift their focus from writing to strategy and refinement.
-   **Ensures Consistency**: The AI uses the outputs of previous phases as context for the next, ensuring a consistent thread of logic flows through the entire plan, from high-level concept to detailed task lists.
-   **Automates Tedious Breakdown**: A powerful feature is the AI-powered plan generation that occurs in **Phase 7 (Develop Detailed Plans & Timeline)**. The AI parses the natural language from the Statement of Work and other planning documents, then converts it into a structured project plan, including a Work Breakdown Structure (WBS), a detailed task list, and project milestones. This single step populates all the tools in the Project Tracking view and can save dozens of hours of manual planning.
-   **Enables Rapid Re-planning**: If a major change occurs, you can quickly regenerate subsequent planning documents with the new context, allowing for agility that is impossible with traditional methods.

By following the HMAP phases within this tool, you are guided through a best-practice planning process that is both incredibly fast and remarkably thorough, setting your project up for success from the very beginning.