import React, { useState, useEffect, useRef } from 'react';
import { DISCIPLINES } from '../constants/projectData';

export const NewProjectModal = ({ isOpen, onClose, onCreateProject, projects, onSelectProject, onRequestDelete }) => {
  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState(DISCIPLINES[0]);
  const [activeTab, setActiveTab] = useState('create');
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
        modalRef.current?.focus();
        // Default to 'select' tab if projects exist, otherwise 'create'
        setActiveTab(projects && projects.length > 0 ? 'select' : 'create');
    }
    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            onClose();
        }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, projects]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateProject({ name, discipline });
      onClose(); // Close after creation
      setName('');
      setDiscipline(DISCIPLINES[0]);
    }
  };

  const handleSelect = (project) => {
    onSelectProject(project);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content project-manager-modal" onClick={(e) => e.stopPropagation()} ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Projects</h2>
        
        <div className="modal-tabs">
            <button onClick={() => setActiveTab('select')} className={activeTab === 'select' ? 'active' : ''}>
                Active Projects
            </button>
            <button onClick={() => setActiveTab('create')} className={activeTab === 'create' ? 'active' : ''}>
                Create New
            </button>
        </div>

        {activeTab === 'select' && (
            <div className="project-list-section">
                {projects && projects.length > 0 ? (
                    <ul className="project-selection-list">
                        {projects.map(p => (
                            <li key={p.id}>
                                <div className="project-info">
                                    <strong>{p.name}</strong>
                                    <span>{p.discipline}</span>
                                </div>
                                <div className="project-actions">
                                    <button className="button button-small" onClick={() => handleSelect(p)}>Select</button>
                                    <button className="button button-small button-danger" onClick={() => onRequestDelete(p)}>Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p style={{textAlign: 'center', color: 'var(--secondary-text)', padding: '2rem 0'}}>
                        You have no active projects. Click the "Create New" tab to get started.
                    </p>
                )}
            </div>
        )}

        {activeTab === 'create' && (
            <div className="create-project-section">
                <h3>Create a New Project</h3>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="projectNameModal">Project Name</label>
                    <input
                      id="projectNameModal"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="projectDisciplineModal">Discipline</label>
                    <select
                      id="projectDisciplineModal"
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value)}
                    >
                      {DISCIPLINES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <button type="submit" className="button button-primary" style={{width: '100%'}}>Create Project</button>
                  </div>
                </form>
            </div>
        )}

        <div className="modal-actions" style={{justifyContent: 'center'}}>
          <button type="button" className="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};