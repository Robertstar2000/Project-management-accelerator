

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Type } from "@google/genai";
import { TEMPLATES, PROMPTS } from '../constants/projectData';
import { Project } from '../types';

export const NewProjectModal = ({ isOpen, onClose, onCreateProject, projects, onSelectProject, onRequestDelete, ai, currentUser }) => {
  const [name, setName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [projectMode, setProjectMode] = useState(null); // 'fullscale' or 'minimal'
  const [projectScope, setProjectScope] = useState(null); // 'internal' or 'subcontracted'
  const [teamSize, setTeamSize] = useState(null); // 'small', 'medium', or 'large'
  const [projectComplexity, setProjectComplexity] = useState('typical'); // 'easy', 'typical', 'complex'
  const [activeTab, setActiveTab] = useState('create');
  const [creationMode, setCreationMode] = useState(null); // 'template' or 'custom'
  const [customDiscipline, setCustomDiscipline] = useState('');
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef(null);
  
  const selectedTemplate = useMemo(() => TEMPLATES.find(t => t.id === selectedTemplateId), [selectedTemplateId]);

  const userProjects: Project[] = projects;

  useEffect(() => {
    if (isOpen) {
        modalRef.current?.focus();
        setActiveTab(userProjects && userProjects.length > 0 ? 'select' : 'create');
    }
  }, [isOpen, userProjects]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            onClose();
        }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const resetAndClose = () => {
      onClose();
      setName('');
      setSelectedTemplateId(null);
      setProjectMode(null);
      setProjectScope(null);
      setTeamSize(null);
      setProjectComplexity('typical');
      setCreationMode(null);
      setCustomDiscipline('');
      setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!projectMode) { setError("Please select a project mode (Full Scale or Minimal Viable)."); return; }
    if (!projectScope) { setError("Please select a project scope (Internal or Subcontracted)."); return; }
    if (!teamSize) { setError("Please select a team size."); return; }
     if (!projectComplexity) { setError("Please select a project complexity."); return; }
    if (!name.trim()) { setError("Please enter a project name."); return; }
    if (!creationMode) { setError("Please choose a template option ('Use a Template' or 'Create My Own')."); return; }
    if (creationMode === 'template' && !selectedTemplateId) { setError("Please select a project template from the list."); return; }
    if (creationMode === 'custom' && !customDiscipline.trim()) { setError("Please enter a custom project type."); return; }

    let template;
    if (creationMode === 'template') {
        template = TEMPLATES.find(t => t.id === selectedTemplateId);
        if (!template) return;
        onCreateProject({ name, template, mode: projectMode, scope: projectScope, teamSize, complexity: projectComplexity });
    } else {
        setIsGeneratingDocs(true);
        try {
            const prompt = PROMPTS.generateDocumentList(customDiscipline.trim(), projectScope, teamSize, projectComplexity);
            const schema = {
                type: Type.OBJECT, properties: { documents: {
                        type: Type.ARRAY, description: "A list of project documents.", items: { type: Type.OBJECT, properties: {
                                title: { type: Type.STRING, description: "The name of the document." },
                                phase: { type: Type.NUMBER, description: "The HMAP phase number (1-9) the document belongs to." }
                            }, required: ['title', 'phase']
                        }
                    }
                }, required: ['documents']
            };
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: schema },
            });
            const rawDocs = JSON.parse(response.text).documents;
            const generatedDocs = rawDocs.map((doc, i) => ({
                id: `doc-custom-${i}-${Date.now()}`, title: doc.title, version: 'v1.0', status: 'Working', owner: 'A. User', phase: doc.phase,
            }));
            template = { id: 'custom', name: 'Custom Project', discipline: customDiscipline.trim(), documents: generatedDocs };
            onCreateProject({ name, template, mode: projectMode, scope: projectScope, teamSize, complexity: projectComplexity });
        } catch (error) {
            console.error("Failed to generate custom document list:", error);
            alert("Could not generate the document list for your custom project type. Please check the console and try again.");
        } finally {
            setIsGeneratingDocs(false);
        }
    }
  };

  const handleSelect = (project) => {
    onSelectProject(project);
    onClose();
  };
  
  const getDisciplineHelperText = () => {
    if (creationMode === 'custom') { return "The AI will generate a tailored set of project documents based on the project type you provide."; }
    if (creationMode === 'template') { return "The project type is determined by the selected template. Switch to 'Create My Own' to edit."; }
    return "Select 'Create My Own' to define a custom project type.";
  };

  const complexityLevels = ['easy', 'typical', 'complex'];
  const complexityValue = complexityLevels.indexOf(projectComplexity);
  const handleComplexityChange = (e) => setProjectComplexity(complexityLevels[parseInt(e.target.value, 10)]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content project-manager-modal" onClick={(e) => e.stopPropagation()} ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Projects</h2>
        <div className="modal-tabs">
            <button onClick={() => setActiveTab('select')} className={activeTab === 'select' ? 'active' : ''}>Active Projects</button>
            <button onClick={() => setActiveTab('create')} className={activeTab === 'create' ? 'active' : ''}>Create New</button>
        </div>
        {activeTab === 'select' && (
            <div className="project-list-section">
                {userProjects.length > 0 ? (
                    <ul className="project-selection-list">
                        {userProjects.map(p => (
                            <li key={p.id}>
                                <div className="project-info">
                                    <strong>{p.name}</strong>
                                    <span>{p.discipline} ({p.mode || 'fullscale'}, {p.scope || 'internal'}, {p.teamSize} team)</span>
                                </div>
                                <div className="project-actions">
                                    <button onClick={() => handleSelect(p)} className="button button-small" disabled={!ai}>Open</button>
                                    <button onClick={(e) => { e.stopPropagation(); onRequestDelete(p); }} className="button button-small button-danger" disabled={!ai}>Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="no-projects" style={{padding: '2rem', textAlign: 'center'}}>
                        <p>No active projects. Click 'Create New' to start one.</p>
                    </div>
                )}
            </div>
        )}
        {activeTab === 'create' && (
          <div className="create-project-section">
            <form onSubmit={handleSubmit}>
              <h3>1. Project Mode</h3>
              <div className="form-group mode-switch">
                  <button type="button" onClick={() => setProjectMode('fullscale')} className={projectMode === 'fullscale' ? 'active' : ''} aria-pressed={projectMode === 'fullscale'}>Full Scale<span>Standard HMAP for formal projects</span></button>
                  <button type="button" onClick={() => setProjectMode('minimal')} className={projectMode === 'minimal' ? 'active' : ''} aria-pressed={projectMode === 'minimal'}>Minimal Viable<span>Cryptic one-liners for quick tests</span></button>
              </div>
              
              <h3>2. Project Scope</h3>
              <div className="form-group mode-switch">
                  <button type="button" onClick={() => setProjectScope('internal')} className={projectScope === 'internal' ? 'active' : ''} aria-pressed={projectScope === 'internal'}>Internal<span>Project managed & executed by your team</span></button>
                  <button type="button" onClick={() => setProjectScope('subcontracted')} className={projectScope === 'subcontracted' ? 'active' : ''} aria-pressed={projectScope === 'subcontracted'}>Subcontracted<span>Parts of the project are outsourced</span></button>
              </div>

              <h3>3. Team & Complexity</h3>
               <div className="form-group mode-switch" style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
                  <button type="button" onClick={() => setTeamSize('small')} className={teamSize === 'small' ? 'active' : ''} aria-pressed={teamSize === 'small'}>Small<span>1-3 People</span></button>
                  <button type="button" onClick={() => setTeamSize('medium')} className={teamSize === 'medium' ? 'active' : ''} aria-pressed={teamSize === 'medium'}>Medium<span>4-16 People</span></button>
                  <button type="button" onClick={() => setTeamSize('large')} className={teamSize === 'large' ? 'active' : ''} aria-pressed={teamSize === 'large'}>Large<span>16+ People</span></button>
              </div>
              <div className="form-group">
                <label htmlFor="complexity-slider">Project Complexity: <strong style={{color: 'var(--primary-text)', textTransform: 'capitalize'}}>{projectComplexity}</strong></label>
                <input id="complexity-slider" type="range" min="0" max="2" value={complexityValue} onChange={handleComplexityChange} style={{width: '100%', accentColor: 'var(--accent-color)'}}/>
              </div>

              <h3>4. Project Details</h3>
              <div className="form-group">
                <label htmlFor="projectName">Project Name</label>
                <input id="projectName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Q3 Marketing Campaign" />
              </div>

              <h3>5. Discipline (Template)</h3>
              <div className="form-group mode-switch">
                  <button type="button" onClick={() => setCreationMode('template')} className={creationMode === 'template' ? 'active' : ''}>Use a Template</button>
                  <button type="button" onClick={() => setCreationMode('custom')} className={creationMode === 'custom' ? 'active' : ''}>Create My Own</button>
              </div>

              {creationMode === 'template' && (
                  <div className="form-group">
                      <div className="template-selection-grid">
                        {TEMPLATES.map(template => (
                          <div key={template.id} className={`template-card ${selectedTemplateId === template.id ? 'selected' : ''}`} onClick={() => setSelectedTemplateId(template.id)}>
                            <h4>{template.name}</h4>
                            <p>{template.discipline}</p>
                          </div>
                        ))}
                      </div>
                  </div>
              )}

              {creationMode === 'custom' && (
                <div className="form-group">
                    <label htmlFor="custom-discipline">Custom Project Type</label>
                    <input id="custom-discipline" type="text" value={customDiscipline} onChange={(e) => setCustomDiscipline(e.target.value)} placeholder="e.g., Naval Architecture" />
                </div>
              )}
              
               <p style={{fontSize: '0.8rem', color: 'var(--secondary-text)', marginTop: '-1rem', marginBottom: '1.5rem', paddingLeft: '0.25rem'}}>{getDisciplineHelperText()}</p>
              
              {error && <p className="status-message error">{error}</p>}
              
              <div className="modal-actions" style={{ marginTop: '1rem', padding: '0' }}>
                <button type="button" className="button" onClick={resetAndClose}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={isGeneratingDocs}>
                  {isGeneratingDocs ? 'Generating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
