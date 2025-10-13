import { COMPLEXITY_INSTRUCTIONS, SPRINT_INSTRUCTIONS, TEAM_SIZE_INSTRUCTIONS } from './instructions';

export const PROMPTS = {
    compactContent: (contentToCompact) => `
You are an expert data compression model. Your task is to take the following project document and compact it into a dense, LLM-readable format.
The goal is to retain ALL information, specifications, numbers, lists, and key concepts, but remove all human-friendly prose, articles, and connectors.
Use abbreviations, symbols, and a JSON-like or YAML-like structure where possible. Eliminate redundancy. The output should be as short as possible without losing any data. This output will be used as context for a future LLM prompt, so it must be information-rich.

DO NOT summarize. You must retain all specific details.

Here is the document to compact:
---
${contentToCompact}
---
`,
    generateDocumentList: (discipline, scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const docCount = {
            easy: '5 to 7',
            typical: '7 to 10',
            complex: '10 to 15'
        }[complexity];
        
        return `
You are an expert project manager specializing in the "${discipline}" field.
Your task is to generate a list of ${docCount} essential project documents required to plan and execute a project in this discipline.
${TEAM_SIZE_INSTRUCTIONS.complexity[teamSize]}
${COMPLEXITY_INSTRUCTIONS[complexity]}
${scope === 'subcontracted' ? 'This is a subcontracted project. The list MUST include documents for managing the subcontractor. Specifically, you MUST include a "Request for Proposal (RFP)" and a "Draft Contract with T\'s & C\'s". All documents should clearly reflect the division of responsibilities between the internal team and the subcontractor.' : ''}
The project follows a 9-phase methodology (HMAP). You must assign each document to the most appropriate phase. The phases are:
1.  **Develop Concept Proposal**: Define scope, vision, and high-level objectives.
2.  **List Resources & Skills Needed**: Inventory of roles, skills, external partners, and tooling.
3.  **SWOT Analysis & Support Gathering**: Analyze risks, strengths, weaknesses; secure stakeholder buy-in.
4.  **Kickoff Review & Briefing**: Align team, confirm objectives, and set expectations.
5.  **Initial Planning & Statement of Work (SOW)**: Detail boundaries, deliverables, and constraints.
6.  **Preliminary Design Review**: Formal review of the SOW and initial plans.
7.  **Develop Detailed Plans & Timeline**: Create WBS, task lists, and milestones.
8.  **Sprint & Critical Design Planning**: Define sprint-level requirements and conduct final design review.
9.  **Deployment Review & Execution Start**: Final readiness check before starting work.

CRITICAL: You MUST include the following six core HMAP documents, assigned to their correct phases as specified below:
- "Concept Proposal" (must be in phase 1)
- "Resources & Skills List" (must be in phase 2)
- "SWOT Analysis" (must be in phase 3)
- "Kickoff Briefing" (must be in phase 4)
- "Statement of Work (SOW)" (must be in phase 5)
- "Detailed Plans (WBS/WRS)" (must be in phase 7)

In addition to these six, add more documents that are highly specific and standard for the "${discipline}" discipline to meet the total count of ${docCount}. For example, for "Software Development", you might add "Technical Design Specification" and "User Story Backlog". For "Construction", you might add "Permit Applications" and "Bill of Materials". Use your expert knowledge of the discipline to select the most appropriate documents.

Your final output must be a single, raw JSON object, without any surrounding text or markdown formatting. This JSON object must have a single root key named "documents" containing an array of document objects. Each document object must have exactly three keys: "title" (string), "phase" (number), and "sequence" (number). The 'sequence' key must indicate the logical order of generation for documents within the same phase, starting from 1.
`;
    },
    phase1: (name, discipline, userInput, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? 'Crucially, the proposal must differentiate between the internal project management team\'s responsibilities and the scope of work to be performed by the subcontractor.' : '';
        const teamSizeInstruction = TEAM_SIZE_INSTRUCTIONS.complexity[teamSize];
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        
        const userInputSection = userInput && userInput.trim() !== '' 
            ? `The user has provided the following initial project expectations, which you MUST expand upon and incorporate into your response:\n--- USER INPUT ---\n${userInput}\n------------------\n\n`
            : 'The user has not provided any initial input. You must generate the entire proposal from scratch based on the project name and discipline.';

        if (mode === 'minimal') {
            return `Generate a cryptic, one-sentence concept proposal for a project named "${name}" in the "${discipline}" field. ${teamSizeInstruction} ${complexityInstruction} The proposal must be specifically about "${name}". ${subcontractorInstruction} Use technical jargon and abbreviations specific to the '${discipline}' field. ${userInputSection} Output only the sentence.`;
        }
        return `You are a project manager creating a Concept Proposal for a project named "${name}", which is a project in the "${discipline}" field. ${teamSizeInstruction} ${complexityInstruction} The output must be directly and specifically about planning for "${name}". For example, if the name is "Annual Charity Gala" and the discipline is "Event Management", the proposal must be about planning a charity gala, not generic event concepts. ${subcontractorInstruction}\n\n${userInputSection}Develop a well-structured proposal with clear headings for: "Executive Summary", "Project Vision", "Scope (In-Scope & Out-of-Scope)", "High-Level Objectives", and "Key Success Metrics". The entire proposal must be framed through the lens of the "${discipline}" discipline. All examples, terminology, and recommendations must be professional, industry-standard, and specific to this field.`;
    },
    phase2: (name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? 'The list must distinguish between the internal team roles required to manage the project and the roles expected to be provided by the subcontractor. Clearly label the subcontractor resources.' : '';
        const teamSizeInstruction = TEAM_SIZE_INSTRUCTIONS.roles[teamSize];
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        if (mode === 'minimal') {
            return `You are a project manager. Your task is to generate a minimal **Resources & Skills List** for a project named "${name}" in the "${discipline}" discipline. Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\n${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} The listed roles and tools must be real and standard for the discipline; do not invent names. Use professional jargon. Be cryptic.\n\nCRITICAL FOR PARSING: Your output MUST use the following exact Markdown headings: "## Required Roles", "## Required Software", "## Required Hardware", "## External Partners". Under each heading, provide a minimal, bulleted list of 1-2 essential items, or "- None" if not applicable. Do not add any other text.`;
        }
        return `You are an expert project manager. Your task is to generate a comprehensive **Resources & Skills List** for a project named "${name}" in the "${discipline}" discipline. Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\n${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} The names for all listed resources (skills, roles, software, hardware, partners) must be standard and commonly used in the '${discipline}' industry. Do not invent names. You must use professional, industry-standard terminology.\n\nCRITICAL FOR PARSING: Structure your response using the following exact Markdown headings: "## Required Roles", "## Required Software", "## Required Hardware", "## External Partners". Under each heading, provide ONLY a simple bulleted list of names. Do not add descriptions or sub-bullets. For each role, list key skills on the same line after a colon (e.g., "- Project Manager: PMP, Agile"). If a category has no items, provide the heading followed by "- None". Your output must not contain any other text.`;
    },
    phase3: (name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? 'The analysis must consider risks and opportunities related to using a subcontractor, such as communication overhead (weakness/threat) or specialized expertise (strength/opportunity).' : '';
        const teamSizeInstruction = `Consider the implications of a ${teamSize}-sized team in your analysis (e.g., a small team might have skill gaps as a weakness, a large team might have communication overhead).`;
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        if (mode === 'minimal') {
            return `You are a project manager. Your task is to generate a **SWOT Analysis** for a project named "${name}" in the "${discipline}" discipline. Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a brief, cryptic SWOT analysis using professional jargon. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} Use bullet points with minimal text. All terminology must be specific to the '${discipline}' field.`;
        }
        return `You are an expert project manager. Your task is to generate a **SWOT Analysis** for a project named "${name}" in the "${discipline}" discipline. Use the provided high-level project context below for guidance on the project's overall scope and vision.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nNow, perform a detailed SWOT analysis (Strengths, Weaknesses, Opportunities, Threats). ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} Also, outline a strategy for gathering support and securing buy-in from key stakeholders. Your entire analysis must be framed through the lens of the "${discipline}" discipline. All terminology and examples must be professional, industry-standard, and specific to this field.`;
    },
    phase4: (name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? 'The agenda must include specific items for aligning with the subcontractor, such as reviewing the communication plan, points of contact, and deliverable acceptance criteria.' : '';
        const teamSizeInstruction = `The project team size is ${teamSize}. Tailor the agenda's formality and detail accordingly (e.g., more formal and detailed for a large team).`;
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        if (mode === 'minimal') {
            return `You are a project manager. Your task is to generate a **Kickoff Briefing** for a project named "${name}" in the "${discipline}" discipline. Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a minimal, bullet-point-only kickoff agenda. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} All terminology must be specific to the '${discipline}' field.`;
        }
        return `You are an expert project manager. Your task is to generate a **Kickoff Briefing** for a project named "${name}" in the "${discipline}" discipline. Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nCreate a detailed agenda and briefing document for a project kickoff review. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} The document should aim to align the team, confirm project objectives, and set clear expectations for deliverables and communication. The entire briefing document must use professional, industry-standard terminology, structures, and examples specific to the '${discipline}' field.`;
    },
    phase5: (name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? 'The SOW must be written from the perspective of the internal company managing the project. It must clearly define the scope of work to be performed by the subcontractor versus the work and responsibilities retained by the internal team. Use separate sections or clear headings to make this distinction.' : '';
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        const teamSizeInstruction = TEAM_SIZE_INSTRUCTIONS.complexity[teamSize] + " Reflect this scale in the detail and scope of the deliverables.";
        if (mode === 'minimal') {
            return `You are an expert project manager. Your task is to generate a **Statement of Work (SOW)** for a project named "${name}" in the "${discipline}" discipline. Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nDraft a minimal SOW. ${teamSizeInstruction} ${complexityInstruction} Use only section headings and one-line bullet points. Do not add a 'Resources' section. ${subcontractorInstruction} Be cryptic. All terminology must be specific to the '${discipline}' field.`;
        }
        return `You are an expert project manager. Your task is to generate a **Statement of Work (SOW)** for a project named "${name}" in the "${discipline}" discipline. Use the provided high-level project context below for guidance on the project's overall scope and vision. The SOW you create must be detailed and specific to the project name and discipline.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nNow, draft a detailed Statement of Work (SOW). ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} The SOW must be well-structured and use the following exact Markdown headings for its sections: "## Scope of Work", "## Deliverables", "## Acceptance Criteria", "## Project Assumptions", "## Key Constraints", and "## Exclusions (Out of Scope)". IMPORTANT: Do not include a separate section for team roles or resources; this information is defined in another document. You can refer to roles within the deliverables, but do not list the entire team or resource plan. Your entire response must be framed through the lens of the "${discipline}" discipline. All deliverables, criteria, and constraints must be professional, industry-standard, and specific to this field.`;
    },
    phase6: (name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? 'The checklist must include items to confirm the subcontractor\'s understanding and agreement with the SOW.' : '';
        const teamSizeInstruction = `The team size is ${teamSize}, so the review's formality should match (e.g., a simple check for a small team, a multi-stakeholder sign-off process for a large team).`;
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        if (mode === 'minimal') {
            return `You are a project manager. Your task is to generate a **Preliminary Review** document for a project named "${name}" in the "${discipline}" discipline. Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a 3-point checklist for a Preliminary Design Review. Title it "Preliminary Review". ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} All terminology must be specific to the '${discipline}' field.`;
        }
        return `You are an expert project manager. Your task is to generate a **Preliminary Review** document for a project named "${name}" in the "${discipline}" discipline. Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nFor the project "${name}", generate a comprehensive checklist for a Preliminary Design Review. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} The checklist should ensure the Statement of Work (SOW) is complete, realistic, and has been signed off by all key stakeholders before detailed technical planning begins. This checklist document itself will be titled "Preliminary Review". The entire checklist must use professional, industry-standard terminology, structures, and examples specific to the '${discipline}' field.`;
    },
    phase7: (name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 14);
        const projectStartDate = startDate.toLocaleDateString('en-CA'); // YYYY-MM-DD

        const wbsInstruction = complexity === 'easy' ? TEAM_SIZE_INSTRUCTIONS.wbs.small : complexity === 'complex' ? TEAM_SIZE_INSTRUCTIONS.wbs.large : TEAM_SIZE_INSTRUCTIONS.wbs.medium;
        const teamSizeInstruction = wbsInstruction;
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        const sprintInstruction = SPRINT_INSTRUCTIONS[complexity];

        const subcontractorInstruction = scope === 'subcontracted'
            ? `
This is a subcontracted project. The task list MUST include a "Subcontractor" column. Mark "Yes" in this column for tasks to be performed by the subcontractor, and "No" for internal tasks. The plan must include tasks for managing the subcontractor (e.g., "Review Subcontractor Deliverable").`
            : '';

        if (mode === 'minimal') {
            const subcontractorMinimalInstruction = scope === 'subcontracted' ? `Include a "Subcontractor" column (Yes/No).` : '';
            const subcontractorMinimalColumns = scope === 'subcontracted' ? `| Task Name | Role | Start Date | End Date | Duration (days) | Dependencies | Sprint | Subcontractor |` : `| Task Name | Role | Start Date | End Date | Duration (days) | Dependencies | Sprint |`;
            
          return `You are an expert AI project planner. Your task is to generate a minimal but parseable project plan in Markdown format.
--- HIGH-LEVEL CONTEXT ---
${context}
--------------------------
Generate a minimal project plan for "${name}".
${teamSizeInstruction}
${complexityInstruction}
- The WBS should be a bulleted list, 2 levels deep at most.
- The task list should have a maximum of 5 tasks, presented in chronological order.
- The tasks must be divided into 2 sprints and include at least one 'Review' task. Assign a relevant role to each task.
- Each sprint should last 7-14 days.
- Do not include any explanations. All terminology must be professional and standard for the '${discipline}' field. ${subcontractorMinimalInstruction}

CRITICAL INSTRUCTIONS:
- The project MUST start on or after ${projectStartDate}.
- All dates MUST be in YYYY-MM-DD format. Roles must be selected from the provided context.
- The "Tasks" table MUST include a "Duration (days)" column, calculated inclusively from start and end dates.
- The "Milestones" list MUST include at least 'Project Start', 'Sprint 1 Complete', and 'Project Completion'.

NOW, GENERATE THE MINIMAL PLAN FOR THE "${name}" PROJECT. Your output must ONLY contain the markdown for "## WBS", "## Tasks" (with the header: ${subcontractorMinimalColumns}), and "## Milestones".
`;
        }

        const subcontractorColumns = scope === 'subcontracted' ? `"Task Name", "Role", "Start Date (YYYY-MM-DD)", "End Date (YYYY-MM-DD)", "Duration (days)", "Dependencies", "Sprint", "Subcontractor"` : `"Task Name", "Role", "Start Date (YYYY-MM-DD)", "End Date (YYYY-MM-DD)", "Duration (days)", "Dependencies", "Sprint"`;

        return `You are an expert AI project planner. Your task is to generate a complete and parseable project plan in Markdown format. Adhere STRICTLY to all formatting instructions. Do not add any conversational text or explanations.
The project is named "${name}" in the "${discipline}" field. Use the high-level context below to infer deliverables and tasks.

--- HIGH-LEVEL CONTEXT ---
${context}
--------------------------

${teamSizeInstruction}
${complexityInstruction}

CRITICAL INSTRUCTIONS FOR PARSING AND CONTENT:
1.  **Project Start Date**: The entire project plan MUST begin on or after ${projectStartDate}. All task and milestone dates must be relative to this start date.
2.  **Dates**: All dates in the "Start Date" and "End Date" columns for both Tasks and Milestones MUST be in the exact "YYYY-MM-DD" format. Do not use any other format (e.g., "August 1st, 2024"). The dates MUST be valid and sequential.
3.  **Duration**: The "Tasks" table MUST include a "Duration (days)" column. This value must be correctly calculated as the number of calendar days from the Start Date to the End Date, inclusive.
4.  **Roles**: The "Role" for each task MUST be selected from the roles defined in the "Resources & Skills List" document provided in the context above. Do not invent new roles. If no specific roles are in the context, infer standard roles for the discipline.
5.  **Dependencies**: The "Dependencies" column must contain the exact "Task Name" of one or more preceding tasks, separated by commas, or be empty.
6.  **Markdown Format**: Adhere strictly to the Markdown table format for Tasks and Milestones, and a bulleted list for the WBS. A valid table MUST have a header row and a separator row (e.g., |---|---:|).
7.  **Discipline-Specific Content**: All generated content, including WBS items, tasks, and milestones, must use professional, industry-standard terminology and conventions specific to the '${discipline}' field.
8.  **Sprints**: ${sprintInstruction}
9.  **Sprint Duration**: The duration of each sprint, from the start date of its first task to the end date of its last task, MUST be between 7 and 14 days.
10. **Logical Dependencies**: A task's "Dependencies" must ONLY list tasks that appear earlier in the table.
11. **Required Milestones**: The "Milestones" table MUST include the following specific milestones, with their dates estimated logically based on the task schedule you create: 'Project Start', 'Preliminary Design Review Complete', milestones for each Sprint's completion (e.g., 'Sprint 1 Complete', 'Sprint 2 Complete'), 'Critical Design Review Complete', and 'Project Completion'. You may add other relevant milestones for the discipline as well.
12. **No Commentary**: Your entire response must consist ONLY of the "## WBS", "## Tasks", and "## Milestones" sections. Do not include any introductory or concluding sentences.

The task list MUST include several formal review tasks, such as "Sprint Plan Review" and "Critical Design Review", at appropriate points in the timeline. All dates must be sequential and logical. ${subcontractorInstruction}

NOW, GENERATE THE PLAN FOR THE "${name}" PROJECT.

## WBS
Create a Work Breakdown Structure as a multi-level bulleted list. The tasks in the WBS should be presented in chronological order.

## Tasks
Create a detailed task list in a Markdown table with the columns: ${subcontractorColumns}. The tasks must be in chronological order.

## Milestones
Create a list of key milestones in a Markdown table with the columns: "Milestone Name", "Date (YYYY-MM-DD)".
`;
    },
    phase8_sprintRequirements: (name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? 'These requirements must clearly distinguish between tasks for the internal team and deliverables expected from the subcontractor.' : '';
        const teamSizeInstruction = `The project team size is ${teamSize}. Scale the detail of requirements accordingly.`;
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        if (mode === 'minimal') {
            return `You are a project manager. Your task is to generate a **Sprint Requirements** document (or **User Story Backlog**) for project "${name}". Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a minimal, bullet-point list of sprint requirements. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} Use 2-3 bullet points total. All terminology must be specific to the '${discipline}' field.`;
        }
        return `You are a project manager. Your task is to generate a **Sprint Requirements** document (or **User Story Backlog**) for project "${name}". Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a detailed set of requirements and task lists for all planned sprints. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} The entire document must use professional, industry-standard terminology, structures, and examples specific to the '${discipline}' field.`;
    },
    phase8_sprintPlanReview: (name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? 'The checklist must include items to verify subcontractor tasks are properly defined and aligned with the SOW.' : '';
        const teamSizeInstruction = `The project team size is ${teamSize}. Scale the rigor of the review checklist accordingly.`;
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        if (mode === 'minimal') {
            return `You are a project manager. Your task is to generate a **Sprint Plan Review** document for project "${name}". Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a minimal, 3-point checklist for a "Sprint Plan Review". ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} All terminology must be specific to the '${discipline}' field.`;
        }
        return `You are a project manager. Your task is to generate a **Sprint Plan Review** document for project "${name}". Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a checklist for conducting a peer review of each sprint plan. This is a formal review document titled "Sprint Plan Review". ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} The entire checklist must use professional, industry-standard terminology, structures, and examples specific to the '${discipline}' field.`;
    },
    phase8_criticalReview: (name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? 'The checklist must include a final alignment check with the subcontractor before execution begins.' : '';
        const teamSizeInstruction = `The project team size is ${teamSize}. Scale the rigor of the review checklist accordingly.`;
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        if (mode === 'minimal') {
            return `You are a project manager. Your task is to generate a **Critical Review** document for project "${name}". Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a minimal, 3-point checklist for a "Critical Review". The checklist must include a check for team assignments. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} All terminology must be specific to the '${discipline}' field.`;
        }
        return `You are a project manager. Your task is to generate a **Critical Review** document for project "${name}". Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a final, high-level checklist titled "Critical Review". This formal review document should ensure all sprint plans are cohesive, all dependencies are resolved, and the project is ready for full-scale execution. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} CRITICAL: This checklist must include a bullet point to "- **Team Assignments:** Confirm all project roles have been assigned a team member in the 'Project Tracking > Team' view." The entire document must use professional, industry-standard terminology, structures, and examples specific to the '${discipline}' field.`;
    },
    phase8_generic: (docTitle, name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? `Ensure the content reflects the subcontracted nature of the project where relevant.` : '';
        const teamSizeInstruction = `The project team size is ${teamSize}. Scale the detail and complexity of the document's content to match.`;
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        if (mode === 'minimal') {
            return `You are a project manager. Your task is to generate content for a document titled **"${docTitle}"** for project "${name}". Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a minimal, cryptic, one-paragraph summary. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} Use professional jargon specific to the '${discipline}' field.`;
        }
        return `You are an expert project manager for the "${discipline}" field. Your task is to generate content for a document titled **"${docTitle}"** for the project "${name}".
Analyze the document title and the provided project context to infer the document's purpose and generate appropriate, professional content. Structure the document with clear Markdown headings.
This document is part of Phase 8: Sprint & Critical Design Planning.

--- HIGH-LEVEL CONTEXT ---
${context}
--------------------------

${teamSizeInstruction}
${complexityInstruction}
${subcontractorInstruction}
Your response must be entirely tailored to the "${discipline}" discipline. All content must use professional, industry-standard terminology, structures, and examples specific to this field.`;
    },
    genericDocumentPrompt: (docTitle, phase, name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? `Ensure the content reflects the subcontracted nature of the project where relevant.` : '';
        const teamSizeInstruction = `The project team size is ${teamSize}. Scale the detail and complexity of the document's content to match.`;
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        const contextSection = context && context.trim() !== ''
            ? `--- HIGH-LEVEL CONTEXT ---\n${context}\n--------------------------\n\n`
            : 'There is no preceding context. Generate this document from scratch based on its title and the project parameters.\n\n';

        if (mode === 'minimal') {
            return `You are a project manager. Your task is to generate content for a document titled **"${docTitle}"** for project "${name}". Use the provided high-level project context for guidance.\n\n${contextSection}Generate a minimal, cryptic, one-paragraph summary. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} Use professional jargon specific to the '${discipline}' field.`;
        }
        return `You are an expert project manager for the "${discipline}" field. Your task is to generate content for a document titled **"${docTitle}"** for the project "${name}".
Analyze the document title and the provided project context to infer the document's purpose and generate appropriate, professional content. Structure the document with clear Markdown headings.
This document is part of Phase ${phase} of the project.

${contextSection}
${teamSizeInstruction}
${complexityInstruction}
${subcontractorInstruction}
Your response must be entirely tailored to the "${discipline}" discipline. All content must use professional, industry-standard terminology, structures, and examples specific to this field.`;
    },
    phase9: (name, discipline, context, mode = 'fullscale', scope = 'internal', teamSize = 'medium', complexity = 'typical') => {
        const subcontractorInstruction = scope === 'subcontracted' ? 'The checklist must include a final sign-off from the subcontractor for their portion of the work.' : '';
        const teamSizeInstruction = `The team size is ${teamSize}, so the checklist should reflect the appropriate number of stakeholders for sign-off.`;
        const complexityInstruction = COMPLEXITY_INSTRUCTIONS[complexity];
        if (mode === 'minimal') {
            return `You are a project manager. Your task is to generate a **Deployment Readiness Review** document for project "${name}". Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a 3-point Deployment Readiness checklist and a concluding "init tracking" statement. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} This is a formal review document. All terminology must be specific to the '${discipline}' field.`;
        }
        return `You are a project manager. Your task is to generate a **Deployment Readiness Review** document for project "${name}". Use the provided high-level project context for guidance.\n\n--- HIGH-LEVEL CONTEXT ---\n${context}\n-------------------------\n\nGenerate a Deployment Readiness Review checklist. ${teamSizeInstruction} ${complexityInstruction} ${subcontractorInstruction} This document should confirm that all development is complete, testing has been passed, and all stakeholders have approved the launch. Finally, add a concluding statement that the project tracking tool should now be initialized with all data from the planning phases, marking the official start of the execution phase. This is a formal review document. The entire document must use professional, industry-standard terminology, structures, and examples specific to the '${discipline}' field.`;
    },
    estimateChangeImpact: (projectName, discipline, totalBudget, changeRequest) => `
You are a project management cost and schedule estimation AI for a project named "${projectName}" in the "${discipline}" field. The total project budget is ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBudget)}.

A change request has been submitted:
- Title: "${changeRequest.title}"
- Reason: "${changeRequest.reason}"

Based on this information, estimate the impact on the project's schedule (in full business days) and budget (in USD).
- Consider the complexity and potential for rework implied by the change request.
- The cost should be a reasonable fraction of the total project budget, reflecting the change's scope.
- Provide your response as a JSON object matching the required schema. Do not provide any explanation or surrounding text.
`,
    changeDeploymentPlan: (projectName, discipline, changeRequest, tasks, documents) => `
As an expert project manager for the project "${projectName}" in the "${discipline}" field, a change request has been submitted.
Change Request Title: "${changeRequest.title}"
Reason: "${changeRequest.reason}"
Estimated Impact: "${changeRequest.impactStr}"

Current Project State:
- There are ${tasks.length} tasks in the current plan.
- Key documents include: ${documents.map(d => d.title).join(', ')}.

Generate a Change Deployment Plan. You must use professional, industry-standard terminology specific to the '${discipline}' field throughout the plan. Use the following strict Markdown format. Do not include any other text, explanations, or introductory sentences.

## Impact Analysis
- **Estimated Delay:** [Provide a quantitative estimate, e.g., 5-7 business days]
- **Disruption Impact:** [Describe the potential disruption to the team or ongoing work, e.g., High - requires pausing Sprint 2 tasks]

## Affected Documents
[A bulleted list of document titles that require manual updates based on this change.]

## Task Modifications
[A list of task changes. Each line must start with 'ADD:', 'DELETE:', or 'EDIT:'. For 'ADD' and 'EDIT', provide task details in parentheses like this: (Start: YYYY-MM-DD, End: YYYY-MM-DD, Sprint: Sprint Name, Depends On: Task Name). For 'DELETE', just list the task name.]
`,
    analyzeRisks: (projectDataSummary, keyDocumentsContext) => `
You are an expert project risk analyst with deep experience in the "${projectDataSummary.discipline}" field. Your task is to analyze the provided project data and identify the top 3 most critical risks to the project's success.

First, review the context from the key planning documents to understand the project's original intent and scope.
--- KEY PLANNING DOCUMENTS ---
${keyDocumentsContext}
----------------------------

Next, analyze the following JSON object which represents the project's CURRENT state. Pay close attention to overdue tasks, dependencies, unassigned roles, and budget status.
--- CURRENT PROJECT STATE ---
${JSON.stringify(projectDataSummary, null, 2)}
-----------------------------

Based on your analysis of both the plan and the current state, generate a concise risk report. Your response MUST use the following Markdown format. Do not include any introductory or concluding text.

### 1. [Risk Title 1]
- **Impact:** [Describe the potential negative outcome if this risk is realized. Be specific, e.g., "High - Could cause a 2-week slip in the final delivery date and a $10,000 budget overrun."]
- **Mitigation:** [Suggest a concrete, actionable strategy to reduce the likelihood or impact of this risk. e.g., "Immediately assign a dedicated QA resource to the 'Integration Testing' task and schedule daily check-ins."]

### 2. [Risk Title 2]
- **Impact:** [Description]
- **Mitigation:** [Suggestion]

### 3. [Risk Title 3]
- **Impact:** [Description]
- **Mitigation:** [Suggestion]
`,
    generateStatusSummary: (projectDataSummary, keyDocumentsContext) => `
You are a senior project manager writing a weekly status update for executive stakeholders. Your task is to generate a professional, concise summary based on the provided project data. The project is named "${projectDataSummary.name}".

First, review the context from the key planning documents to understand the project's high-level goals.
--- KEY PLANNING DOCUMENTS ---
${keyDocumentsContext}
----------------------------

Next, analyze the following JSON object which represents the project's CURRENT state.
--- CURRENT PROJECT STATE ---
${JSON.stringify(projectDataSummary, null, 2)}
-----------------------------

Now, generate the status report. Your response must be in Markdown format and contain ONLY the following sections. Do not add any extra commentary.

## Project Status Summary: ${new Date().toLocaleDateString()}

### Overall Status
*(Provide a 1-2 sentence summary of the project's health. Start with a color indicator: (Green), (Amber), or (Red).)*

### Key Accomplishments (Last 7 Days)
*(List 3-5 major tasks or milestones that were completed recently. Use a bulleted list.)*

### Upcoming Priorities (Next 7-14 Days)
*(List the next 3-5 critical tasks or milestones the team is focused on. Use a bulleted list.)*

### Budget Update
*(Provide a brief summary of the financial status, mentioning the budget, Estimate at Completion (EAC), and any variance.)*

### Risks & Blockers
*(Briefly describe the top 1-2 risks or issues currently impacting the project. If there are none, state "No major blockers at this time.")*
`
};