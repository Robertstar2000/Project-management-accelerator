import React, { useState, useEffect, useRef } from 'react';
import { DISCIPLINES } from '../constants/projectData';

export const NewProjectModal = ({ isOpen, onClose, onCreateProject }) => {
  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState(DISCIPLINES[0]);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
        modalRef.current?.focus();
    }
    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            onClose();
        }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateProject({ name, discipline });
      onClose();
      setName('');
      setDiscipline(DISCIPLINES[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Create New Project</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="projectName">Project Name</label>
            <input
              id="projectName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="projectDiscipline">Discipline</label>
            <select
              id="projectDiscipline"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
            >
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
};
