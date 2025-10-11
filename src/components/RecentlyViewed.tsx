
import React from 'react';
import { Project } from '../types';

interface RecentlyViewedProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    disabled: boolean;
    onRequestDelete: (project: Project) => void;
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ projects, onSelectProject, disabled, onRequestDelete }) => {
    if (!projects || projects.length === 0) {
        return null;
    }

    const handleSelect = (project: Project) => {
        if (disabled) {
            alert('Please provide an API Key before opening a project.');
            return;
        }
        onSelectProject(project);
    };
    
    const handleDelete = (e, project) => {
        e.stopPropagation();
        if (disabled) return;
        onRequestDelete(project);
    };

    return (
        <section>
            <h2 className="subsection-title">Recently Viewed</h2>
            <div className="project-grid">
                {projects.map((p) => (
                    <div key={p.id} className="project-card-container">
                        <div
                            className="project-card"
                            onClick={() => handleSelect(p)}
                            role="button"
                            tabIndex={disabled ? -1 : 0}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect(p)}
                            aria-disabled={disabled}
                        >
                            <h3>{p.name}</h3>
                            <p>{p.discipline}</p>
                        </div>
                        <button 
                          className="button button-danger button-small delete-project-button"
                          onClick={(e) => handleDelete(e, p)}
                          disabled={disabled}
                          aria-label={`Delete project ${p.name}`}
                        >
                          Delete
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
};
