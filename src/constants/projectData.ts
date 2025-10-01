export const DISCIPLINES = [
  "Software Development", "Construction & Engineering", "Healthcare", "Information Technology (IT)", 
  "Aerospace & Defense", "Financial Services", "Marketing & Advertising", "Pharmaceuticals",
  "Manufacturing", "Telecommunications", "Energy & Utilities", "Government & Public Sector",
  "Event Management", "Consulting", "Research & Development", "Automotive",
  "Logistics & Supply Chain", "Education", "Retail", "Biotechnology",
  "Legal Services", "Non-Profit Organizations", "Real Estate Development", "Media & Entertainment",
  "Gaming Industry", "Hospitality & Tourism", "Human Resources", "Product Management",
  "UX/UI Design", "Data Science"
];

export const PHASES = [
  { id: 'phase1', title: 'Develop Concept Proposal', description: 'Define scope, vision, and high-level objectives.' },
  { id: 'phase2', title: 'List Resources & Skills Needed', description: 'Inventory of roles, skills, external partners, and tooling.' },
  { id: 'phase3', title: 'SWOT Analysis & Support Gathering', description: 'Analyze risks, strengths, weaknesses; secure stakeholder buy-in.' },
  { id: 'phase4', title: 'Kickoff Review & Briefing', description: 'Align team, confirm objectives, and set expectations.' },
  { id: 'phase5', title: 'Initial Planning & Statement of Work (SOW)', description: 'Detail boundaries, deliverables, and constraints.' },
  { id: 'phase6', title: 'Preliminary Design Review', description: 'Formal review of the SOW and initial plans before detailed planning.' },
  { id: 'phase7', title: 'Develop Detailed Plans & Timeline', description: 'Create WBS, task lists with dates, and milestones.' },
  { id: 'phase8', title: 'Sprint & Critical Design Planning', description: 'Define sprint-level requirements and conduct final design review.' },
  { id: 'phase9', title: 'Deployment Review & Execution Start', description: 'Final readiness check before initializing tracking tools and starting work.' },
];

export const DEFAULT_DOCUMENTS = [
  { id: 'doc1', title: 'Concept Proposal', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 1 },
  { id: 'doc2', title: 'Resources & Skills List', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 2 },
  { id: 'doc3', title: 'SWOT Analysis', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 3 },
  { id: 'doc4', title: 'Kickoff Briefing', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 4 },
  { id: 'doc5', title: 'Statement of Work (SOW)', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5 },
  { id: 'doc_prelim_review', title: 'Preliminary Review', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 6 },
  { id: 'doc6', title: 'Detailed Plans (WBS/WRS)', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7 },
  { id: 'doc7', title: 'Project Timeline', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7 },
  { id: 'doc8', title: 'Sprint Requirements', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 8 },
  { id: 'doc_sprint_review', title: 'Sprint Plan Review', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 8 },
  { id: 'doc_critical_review', title: 'Critical Review', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 8 },
  { id: 'doc_deployment_review', title: 'Deployment Review', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 9 },
];


export const PHASE_DOCUMENT_REQUIREMENTS = {
  phase2: ['Concept Proposal'],
  phase3: ['Resources & Skills List'],
  phase4: ['SWOT Analysis'],
  phase5: ['Kickoff Briefing'],
  phase6: ['Statement of Work (SOW)'],
  phase7: ['Preliminary Review'],
  phase8: ['Detailed Plans (WBS/WRS)', 'Project Timeline'],
  phase9: ['Sprint Requirements', 'Sprint Plan Review', 'Critical Review'],
};

const today = new Date();
const getDate = (offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return date.toISOString().split('T')[0];
};

export const DEFAULT_SPRINTS = [
    { id: 'sprint1', name: 'Sprint 1: Foundation & API', startDate: getDate(0), endDate: getDate(14) },
    { id: 'sprint2', name: 'Sprint 2: Core Features', startDate: getDate(15), endDate: getDate(29) },
    { id: 'sprint3', name: 'Sprint 3: UI & User Testing', startDate: getDate(30), endDate: getDate(44) },
];

// Tasks and Milestones now start empty and are populated by parsing approved documents.
export const DEFAULT_TASKS = [];
export const DEFAULT_MILESTONES = [];

export const PROMPTS = {
    phase1: (name, discipline) => `For a project named "${name}" in "${discipline}", develop a Concept Proposal. Define its scope, vision, and high-level objectives. Be thorough and clear.`,
    phase2: (name, discipline) => `For a project named "${name}" in "${discipline}", create a simple, comprehensive bulleted list of all necessary resources and skills. Include required roles, specific technical/creative skills, potential external partners or vendors, and necessary software/hardware tooling.`,
    phase3: (name, discipline, context) => `Based on the project "${name}" (${discipline}) and its concept proposal:\n\n${context}\n\nPerform a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats). Also, outline a strategy for gathering support and securing buy-in from key stakeholders.`,
    phase4: (name, discipline) => `Create a detailed agenda and briefing document for a project kickoff review for "${name}" (${discipline}). The document should aim to align the team, confirm project objectives, and set clear expectations for deliverables and communication.`,
    phase5: (name, discipline, context) => `Based on the project "${name}" (${discipline}) and its preceding documentation:\n\n${context}\n\nDraft an Initial Plan and a Statement of Work (SOW). This should detail project boundaries, specific deliverables, assumptions, and constraints.`,
    phase6: (name, discipline) => `For the project "${name}" (${discipline}), generate a comprehensive checklist for a Preliminary Design Review. The checklist should ensure the Statement of Work (SOW) is complete, realistic, and has been signed off by all key stakeholders before detailed technical planning begins.`,
    phase7: (name, discipline, context) => `Act as an expert project manager for a project named "${name}" in the "${discipline}" field. Based on the following Statement of Work (SOW):\n\n${context}\n\nGenerate the project plan using the following strict Markdown format. Do not include any other text, explanations, or introductory sentences.

## WBS
Create a Work Breakdown Structure as a multi-level bulleted list.

## Tasks
Create a detailed task list in a Markdown table with the following columns: "Task Name", "Start Date (YYYY-MM-DD)", "End Date (YYYY-MM-DD)", "Dependencies", "Sprint". The "Dependencies" column should contain the exact "Task Name" of any preceding tasks.

## Milestones
Create a list of key milestones in a Markdown table with the following columns: "Milestone Name", "Date (YYYY-MM-DD)".
`,
    phase8: (name, discipline) => `For the project "${name}" (${discipline}), generate the content for the following three documents in order, using clear headings for each:
1.  **Sprint Requirements:** A detailed set of requirements and task lists for all planned sprints.
2.  **Sprint Plan Review:** A checklist for conducting a peer review of each sprint plan.
3.  **Critical Review:** A final, high-level checklist to ensure all sprint plans are cohesive, all dependencies are resolved, and the project is ready for full-scale execution.`,
    phase9: (name, discipline) => `For the project "${name}" (${discipline}), generate a Deployment Readiness Review checklist. This document should confirm that all development is complete, testing has been passed, and all stakeholders have approved the launch. Finally, add a concluding statement that the project tracking tool should now be initialized with all data from the planning phases, marking the official start of the execution phase.`,
    changeDeploymentPlan: (projectName, changeRequest, tasks, documents) => `
As an expert project manager for the project "${projectName}", a change request has been submitted.
Change Request Title: "${changeRequest.title}"
Reason: "${changeRequest.reason}"
Estimated Impact: "${changeRequest.impactStr}"

Current Project State:
- There are ${tasks.length} tasks in the current plan.
- Key documents include: ${documents.map(d => d.title).join(', ')}.

Generate a Change Deployment Plan. Use the following strict Markdown format. Do not include any other text, explanations, or introductory sentences.

## Impact Analysis
- **Estimated Delay:** [Provide a quantitative estimate, e.g., 5-7 business days]
- **Disruption Impact:** [Describe the potential disruption to the team or ongoing work, e.g., High - requires pausing Sprint 2 tasks]

## Affected Documents
[A bulleted list of document titles that require manual updates based on this change.]

## Task Modifications
[A list of task changes. Each line must start with 'ADD:', 'DELETE:', or 'EDIT:'. For 'ADD' and 'EDIT', provide task details in parentheses like this: (Start: YYYY-MM-DD, End: YYYY-MM-DD, Sprint: Sprint Name, Depends On: Task Name). For 'DELETE', just list the task name.]
`
};