import React from 'react';
import { Hero } from '../components/Hero';
import { ApiKeyManager } from '../components/ApiKeyManager';
import { ProjectList } from '../hmap/ProjectList';

export const LandingPage = ({ projects, onSelectProject, onNewProject, apiKeyStatus, onSetUserKey, disabled }) => {
    return (
        <>
            {projects.length === 0 ? (
              <Hero onStart={onNewProject} disabled={disabled} />
            ): null}
            <ApiKeyManager status={apiKeyStatus} onSetKey={onSetUserKey} />
            {projects.length > 0 ? (
                <ProjectList 
                    projects={projects} 
                    onSelectProject={onSelectProject}
                    onNewProject={onNewProject}
                    disabled={disabled}
                />
            ) : null}
        </>
    );
};