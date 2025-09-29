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
  { id: 'phase6', title: 'Develop Detailed Plans (WBS/WRS)', description: 'Create Work Breakdown Structure and Work Responsibility Structure.' },
  { id: 'phase7', title: 'Design Timeline', description: 'Set milestones, tasks, sprints, and progress reviews.' },
  { id: 'phase8', title: 'Create Requirements & Task Lists', description: 'Define requirements for each sprint with review checklists.' },
  { id: 'phase9', title: 'Execution Start', description: 'Initialize tracking tool with data from phases 6 & 7.' },
];

export const DEFAULT_DOCUMENTS = [
  { id: 'doc1', title: 'Concept Proposal', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 1 },
  { id: 'doc2', title: 'Resources & Skills List', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 2 },
  { id: 'doc3', title: 'SWOT Analysis', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 3 },
  { id: 'doc4', title: 'Kickoff Briefing', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 4 },
  { id: 'doc5', title: 'Statement of Work (SOW)', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5 },
  { id: 'doc6', title: 'Detailed Plans (WBS/WRS)', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 6 },
  { id: 'doc7', title: 'Project Timeline', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7 },
  { id: 'doc8', title: 'Sprint Requirements', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 8 },
];

export const PHASE_DOCUMENT_REQUIREMENTS = {
  phase2: ['Concept Proposal'],
  phase3: ['Resources & Skills List'],
  phase4: ['SWOT Analysis'],
  phase5: ['Kickoff Briefing'],
  phase6: ['Statement of Work (SOW)'],
  phase7: ['Detailed Plans (WBS/WRS)'],
  phase8: ['Project Timeline'],
  phase9: ['Sprint Requirements'],
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

export const DEFAULT_TASKS = [
    { id: 'task1', sprintId: 'sprint1', name: 'Setup Project Environment', startDate: getDate(0), endDate: getDate(2), status: 'done' },
    { id: 'task2', sprintId: 'sprint1', name: 'Design Database Schema', startDate: getDate(1), endDate: getDate(4), status: 'done' },
    { id: 'task3', sprintId: 'sprint1', name: 'Develop User Auth API', startDate: getDate(5), endDate: getDate(10), status: 'inprogress' },
    { id: 'task4', sprintId: 'sprint2', name: 'Implement Dashboard UI', startDate: getDate(15), endDate: getDate(22), status: 'todo' },
    { id: 'task5', sprintId: 'sprint2', name: 'Implement Project Creation', startDate: getDate(23), endDate: getDate(28), status: 'todo' },
    { id: 'task6', sprintId: 'sprint3', name: 'Conduct User Acceptance Testing', startDate: getDate(30), endDate: getDate(37), status: 'todo' },
    { id: 'task7', sprintId: 'sprint3', name: 'Deploy to Staging', startDate: getDate(38), endDate: getDate(40), status: 'review' },
];

export const DEFAULT_MILESTONES = [
    { id: 'm1', name: 'Alpha Release', date: getDate(29), health: 'On Track', dependency: 'task5' },
    { id: 'm2', name: 'Beta Release', date: getDate(44), health: 'At Risk', dependency: 'task7' },
    { id: 'm3', name: 'GA Launch', date: getDate(60), health: 'On Track', dependency: null },
];

export const PROMPTS = {
    phase1: (name, discipline) => `For a project named "${name}" in "${discipline}", develop a Concept Proposal. Define its scope, vision, and high-level objectives. Be thorough and clear.`,
    phase2: (name, discipline) => `For a project named "${name}" in "${discipline}", create a comprehensive list of all necessary resources and skills. Include required roles, specific technical/creative skills, potential external partners or vendors, and necessary software/hardware tooling.`,
    phase3: (name, discipline, context) => `Based on the project "${name}" (${discipline}) and its concept proposal:\n\n${context}\n\nPerform a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats). Also, outline a strategy for gathering support and securing buy-in from key stakeholders.`,
    phase4: (name, discipline) => `Create a detailed agenda and briefing document for a project kickoff review for "${name}" (${discipline}). The document should aim to align the team, confirm project objectives, and set clear expectations for deliverables and communication.`,
    phase5: (name, discipline, context) => `Based on the project "${name}" (${discipline}) and its preceding documentation:\n\n${context}\n\nDraft an Initial Plan and a Statement of Work (SOW). This should detail project boundaries, specific deliverables, assumptions, and constraints.`,
    phase6: (name, discipline) => `Develop a detailed project plan for "${name}" (${discipline}). Create a Work Breakdown Structure (WBS) that breaks the project into smaller, manageable components, and a Work Responsibility Structure (WRS) or RACI matrix to assign roles to tasks. Use bullet points or numbered lists for tasks.`,
    phase7: (name, discipline, context) => `Based on the detailed plans for "${name}" (${discipline}):\n\n${context}\n\nDesign a project timeline. Identify key milestones, break down work into tasks or sprints, and schedule periodic progress reviews. Use bullet points or numbered lists for timeline items.`,
    phase8: (name, discipline) => `For the project "${name}" (${discipline}), create a set of requirements and task lists for the first two sprints. Include a checklist for a peer review process for each major task.`,
    phase9: (name, discipline) => `Based on the project "${name}" (${discipline}), write a summary document that confirms the project is ready for execution. State that the project tracking tool should now be initialized with all data from the planning phases (WBS, timeline, tasks). This marks the official start of the execution phase.`,
};