
export const TEAM_SIZE_INSTRUCTIONS = {
    complexity: {
        small: 'The project team is small (1-3 people).',
        medium: 'The project team is medium-sized (4-16 people).',
        large: 'The project team is large (16+ people).'
    },
    roles: {
        small: 'For a small team, list 2-3 essential roles.',
        medium: 'For a medium team, list 4-6 key roles.',
        large: 'For a large team, list 7-10 specialized roles.'
    },
    wbs: {
        small: 'The WBS should be simple, with 2-3 top-level items and 2 levels deep at most.',
        medium: 'The WBS should be moderately detailed, with 4-5 top-level items and up to 3 levels deep.',
        large: 'The WBS should be comprehensive, with 6+ top-level items and potentially 4 levels deep.'
    }
};

export const COMPLEXITY_INSTRUCTIONS = {
    easy: 'The project is considered easy with well-defined requirements and low risk.',
    typical: 'The project has a typical level of complexity with some undefined elements and moderate risk.',
    complex: 'The project is complex, with significant ambiguity, high risk, and many moving parts.'
};

export const SPRINT_INSTRUCTIONS = {
    easy: 'Break down the tasks into 2-3 sprints.',
    typical: 'Break down the tasks into 3-5 sprints.',
    complex: 'Break down the tasks into 5-8 sprints.'
};
