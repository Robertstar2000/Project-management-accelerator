
export interface User {
    id: string;
    username: string;
    email: string;
    password?: string;
}

export interface TeamMember {
    userId: string;
    role: string;
    name: string;
    email: string;
}

export interface Comment {
    id:string;
    authorId: string;
    authorName: string;
    timestamp: string;
    text: string;
}

export interface Attachment {
    id: string;
    uploaderId: string;
    uploaderName: string;
    timestamp: string;
    fileName: string;
    fileData: string; // base64
    fileType: string;
}

export interface Task {
    id: string;
    name: string;
    description?: string;
    role: string | null;
    startDate: string;
    endDate: string;
    sprintId: string;
    status: 'todo' | 'inprogress' | 'review' | 'done';
    isSubcontracted: boolean;
    dependsOn: string[];
    actualTime: number | null;
    actualCost: number | null;
    actualEndDate: string | null;
    comments: Comment[];
    attachments: Attachment[];
    recurrence?: {
        interval: 'none' | 'daily' | 'weekly' | 'monthly';
    };
}

export interface Notification {
    id: string;
    timestamp: string;
    recipientId: string;
    text: string;
    read: boolean;
    taskId: string;
}

export interface Milestone {
    id: string;
    name: string;
    plannedDate: string;
    actualDate?: string | null;
    status: 'Planned' | 'Completed';
}

export interface Sprint {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
}

export interface Project {
    id: string;
    name: string;
    discipline: string;
    mode: 'fullscale' | 'minimal';
    scope: 'internal' | 'subcontracted';
    teamSize: 'small' | 'medium' | 'large';
    complexity: 'easy' | 'typical' | 'complex';
    ownerId: string;
    team: TeamMember[];
    documents: any[];
    tasks: Task[];
    sprints: Sprint[];
    milestones: Milestone[];
    resources: any[];
    avgBurdenedLaborRate: number;
    budget: number;
    startDate: string;
    endDate: string;
    changeRequest: any;
    scenarios: any[];
    phasesData: any;
    generationMode: 'manual' | 'automatic';
    notifications: Notification[];
}