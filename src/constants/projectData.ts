import { TEMPLATES as allTemplates, DEFAULT_DOCUMENTS as defaultDocs } from './templates';
import { PHASES, PHASE_DOCUMENT_REQUIREMENTS, DEFAULT_SPRINTS, DEFAULT_TASKS, DEFAULT_MILESTONES } from './workflow';
import { PROMPTS } from './prompts';

// This file re-exports to maintain the original structure for dependent files.
// No logic should be added here; it's just an aggregation point.

export const TEMPLATES = allTemplates;
export const DEFAULT_DOCUMENTS = defaultDocs;
export { PHASES, PHASE_DOCUMENT_REQUIREMENTS, DEFAULT_SPRINTS, DEFAULT_TASKS, DEFAULT_MILESTONES, PROMPTS };
