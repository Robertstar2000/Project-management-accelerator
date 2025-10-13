export const DEFAULT_DOCUMENTS = [
    { id: 'doc-default-1', title: 'Concept Proposal', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 1, sequence: 1 },
    { id: 'doc-default-2', title: 'Resources & Skills List', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 2, sequence: 1 },
    { id: 'doc-default-3', title: 'SWOT Analysis', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 3, sequence: 1 },
    { id: 'doc-default-4', title: 'Kickoff Briefing', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 4, sequence: 1 },
    { id: 'doc-default-5', title: 'Statement of Work (SOW)', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5, sequence: 1 },
    { id: 'doc-default-prelim', title: 'Preliminary Design Review', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 6, sequence: 1 },
    { id: 'doc-default-7', title: 'Detailed Plans (WBS/WRS)', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7, sequence: 1 },
    { id: 'doc-default-8', title: 'Critical Review', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 8, sequence: 99 },
    { id: 'doc-default-9', title: 'Deployment Readiness Review', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 9, sequence: 1 },
];

const SOFTWARE_DEV_DOCS = [
    ...DEFAULT_DOCUMENTS,
    { id: 'doc-sw-1', title: 'Technical Design Specification', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7, sequence: 2 },
    { id: 'doc-sw-2', title: 'User Story Backlog', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 8, sequence: 1 },
];

const MARKETING_DOCS = [
    ...DEFAULT_DOCUMENTS,
    { id: 'doc-mkt-1', title: 'Creative Brief', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 1, sequence: 2 },
    { id: 'doc-mkt-2', title: 'Campaign Strategy', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5, sequence: 2 },
    { id: 'doc-mkt-3', title: 'Content Calendar', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7, sequence: 2 },
];

const PRODUCT_LAUNCH_DOCS = [
    ...DEFAULT_DOCUMENTS,
    { id: 'doc-pl-1', title: 'Market Research Report', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 1, sequence: 2 },
    { id: 'doc-pl-2', title: 'Go-to-Market Strategy', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5, sequence: 2 },
    { id: 'doc-pl-3', title: 'Sales & Support Plan', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7, sequence: 2 },
];

const RESEARCH_DEV_DOCS = [
    ...DEFAULT_DOCUMENTS,
    { id: 'doc-rd-1', title: 'Research Proposal', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 1, sequence: 2 },
    { id: 'doc-rd-2', title: 'Data Management Plan', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7, sequence: 2 },
    { id: 'doc-rd-3', title: 'Final Study Report', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 9, sequence: 2 },
];

const HR_INITIATIVE_DOCS = [
    ...DEFAULT_DOCUMENTS,
    { id: 'doc-hr-1', title: 'Policy Draft', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5, sequence: 2 },
    { id: 'doc-hr-2', title: 'Communication Plan', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 4, sequence: 2 },
    { id: 'doc-hr-3', title: 'Training Materials', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7, sequence: 2 },
];

const IT_INFRA_DOCS = [
    ...DEFAULT_DOCUMENTS,
    { id: 'doc-it-1', title: 'System Architecture Design', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5, sequence: 2 },
    { id: 'doc-it-2', title: 'Migration Plan', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7, sequence: 2 },
    { id: 'doc-it-3', title: 'Security Assessment', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 3, sequence: 2 },
];

const FILM_PROD_DOCS = [
    ...DEFAULT_DOCUMENTS,
    { id: 'doc-film-1', title: 'Script', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 1, sequence: 2 },
    { id: 'doc-film-2', title: 'Shooting Schedule', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7, sequence: 2 },
    { id: 'doc-film-3', title: 'Post-Production Plan', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 8, sequence: 1 },
];

const BOOK_PUB_DOCS = [
    ...DEFAULT_DOCUMENTS,
    { id: 'doc-book-1', title: 'Manuscript', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 1, sequence: 2 },
    { id: 'doc-book-2', title: 'Editing Schedule', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7, sequence: 2 },
    { id: 'doc-book-3', title: 'Marketing & Distribution Plan', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5, sequence: 2 },
];

const NON_PROFIT_DOCS = [
    ...DEFAULT_DOCUMENTS,
    { id: 'doc-np-1', title: 'Grant Proposal', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 1, sequence: 2 },
    { id: 'doc-np-2', title: 'Donor Outreach Plan', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5, sequence: 2 },
    { id: 'doc-np-3', title: 'Impact Report', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 9, sequence: 2 },
];

const ACADEMIC_COURSE_DOCS = [
    ...DEFAULT_DOCUMENTS,
    { id: 'doc-edu-1', title: 'Syllabus', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 1, sequence: 2 },
    { id: 'doc-edu-2', title: 'Lecture Materials', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7, sequence: 2 },
    { id: 'doc-edu-3', title: 'Assessment Plan', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 8, sequence: 1 },
];

export const TEMPLATES = [
    {
        id: 'software-dev',
        name: 'Standard Software Project',
        discipline: 'Software Development',
        documents: SOFTWARE_DEV_DOCS
    },
    {
        id: 'marketing-campaign',
        name: 'Marketing Campaign',
        discipline: 'Marketing & Communications',
        documents: MARKETING_DOCS
    },
    {
        id: 'construction',
        name: 'Construction Project',
        discipline: 'Construction & Engineering',
        documents: [
            ...DEFAULT_DOCUMENTS,
            { id: 'doc-con-1', title: 'Permit Applications', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 2, sequence: 2 },
            { id: 'doc-con-2', title: 'Bill of Materials', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5, sequence: 2 },
        ]
    },
    {
        id: 'event-planning',
        name: 'Event Planning',
        discipline: 'Event Management',
        documents: [
            ...DEFAULT_DOCUMENTS,
            { id: 'doc-evt-1', title: 'Venue Contract', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5, sequence: 2 },
            { id: 'doc-evt-2', title: 'Run of Show', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 7, sequence: 2 },
        ]
    },
    {
        id: 'product-launch',
        name: 'Product Launch',
        discipline: 'Product Management',
        documents: PRODUCT_LAUNCH_DOCS
    },
    {
        id: 'research-dev',
        name: 'R&D Project',
        discipline: 'Scientific Research',
        documents: RESEARCH_DEV_DOCS
    },
    {
        id: 'hr-initiative',
        name: 'HR Initiative',
        discipline: 'Human Resources',
        documents: HR_INITIATIVE_DOCS
    },
    {
        id: 'it-infra-upgrade',
        name: 'IT Infrastructure Upgrade',
        discipline: 'Information Technology',
        documents: IT_INFRA_DOCS
    },
    {
        id: 'film-production',
        name: 'Film Production',
        discipline: 'Film & Media',
        documents: FILM_PROD_DOCS
    },
    {
        id: 'book-publishing',
        name: 'Book Publishing',
        discipline: 'Publishing',
        documents: BOOK_PUB_DOCS
    },
    {
        id: 'non-profit-fundraiser',
        name: 'Non-Profit Fundraiser',
        discipline: 'Non-Profit Management',
        documents: NON_PROFIT_DOCS
    },
    {
        id: 'academic-course-dev',
        name: 'Academic Course Development',
        discipline: 'Education',
        documents: ACADEMIC_COURSE_DOCS
    }
];