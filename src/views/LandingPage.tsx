

import React from 'react';
import { Hero } from '../components/Hero';
import { ApiKeyManager } from '../components/ApiKeyManager';
import { ProjectList } from '../hmap/ProjectList';
import { MyWorkView } from '../components/MyWorkView';
import { RecentlyViewed } from '../components/RecentlyViewed';
import { Project, Task, User } from '../types';

const Instructions = () => (
    <section className="instructions-list">
        <h2>How It Works</h2>
        <ul>
            <li><strong>Sign Up & Start:</strong> Create your account and start your first project in seconds. The 'My Work' dashboard shows all tasks assigned to you across all projects, keeping you focused.</li>
            <li><strong>Define Your Project:</strong> Use the guided form to define your project's scope, discipline, and complexity. Choose from a professional template or have the AI generate a custom document list tailored to your needs.</li>
            <li><strong>Generate Your Plan with AI:</strong> Work through the HMAP phases. In Phase 1, provide your high-level goals. The AI will generate a detailed Concept Proposal, then use that context to draft every subsequent document, ensuring a cohesive plan from start to finish.</li>
            <li><strong>Execute with Clarity:</strong> Once your plan is approved, the AI automatically populates a full suite of tracking tools. Manage tasks on a Gantt chart or Kanban board, collaborate with your team via comments and attachments, and monitor team capacity with the Workload view.</li>
            <li><strong>Monitor & Adapt:</strong> The main Dashboard gives you a real-time overview of project health, risks, and financials. When changes happen, use the Revision Control tool to model their impact on your budget and timeline *before* you commit.</li>
            <li><strong>Gain AI Insights:</strong> Leverage powerful AI actions on your dashboard. Generate executive-level summaries for stakeholders or perform a deep risk analysis of your project's current state with a single click.</li>
        </ul>
    </section>
);

interface LandingPageProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    onNewProject: () => void;
    apiKeyStatus: string;
    onSetUserKey: (key: string | null) => void;
    disabled: boolean;
    onRequestDelete: (project: Project) => void;
    currentUser: User;
    onSelectTask: (project: Project, task: Task) => void;
    recentlyViewedProjects: Project[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ projects, onSelectProject, onNewProject, apiKeyStatus, onSetUserKey, disabled, onRequestDelete, currentUser, onSelectTask, recentlyViewedProjects }) => {
    return (
        <>
            {projects.length === 0 ? (
              <Hero onStart={onNewProject} disabled={disabled} />
            ) : (
                <MyWorkView 
                    projects={projects}
                    currentUser={currentUser}
                    onSelectTask={onSelectTask}
                />
            )}

            <RecentlyViewed
                projects={recentlyViewedProjects}
                onSelectProject={onSelectProject}
                disabled={disabled}
                onRequestDelete={onRequestDelete}
            />
            
            <ApiKeyManager status={apiKeyStatus} onSetKey={onSetUserKey} />
            <div className="ai-warning-box">
                Be sure to read and edit AI output to keep the project aligned with your needs. Depending on project complexity, agentic AI generation can take several minutes per step—please be patient.
            </div>
            
            <Instructions />
            
            {projects.length > 0 ? (
                <ProjectList 
                    projects={projects} 
                    onSelectProject={onSelectProject}
                    onNewProject={onNewProject}
                    disabled={disabled}
                    onRequestDelete={onRequestDelete}
                />
            ) : null}
        </>
    );
};
