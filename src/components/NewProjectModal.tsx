

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Type } from "@google/genai";
import { TEMPLATES, PROMPTS } from '../constants/projectData';

export const NewProjectModal = ({ isOpen, onClose, onCreateProject, projects, onSelectProject, onRequestDelete, ai }) => {
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

  // Set the initial tab and focus when the modal opens.
  // This is separated to prevent the tab from resetting on unrelated re-renders.
  useEffect(() => {
    if (isOpen) {
        modalRef.current?.focus();
        // Default to 'select' tab if projects exist, otherwise 'create'
        setActiveTab(projects && projects.length > 0 ? 'select' : 'create');
    }
  }, [isOpen, projects]);

  // Handle the Escape key to close the modal.
  useEffect(() => {
    if (!isOpen) return; // Don't add listener if modal is closed

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
    setError(''); // Clear previous error

    // Validation checks
    if (!projectMode) {
        setError("Please select a project mode (Full Scale or Minimal Viable).");
        return;
    }
    if (!projectScope) {
        setError("Please select a project scope (Internal or Subcontracted).");
        return;
    }
    if (!teamSize) {
        setError("Please select a team size.");
        return;
    }
     if (!projectComplexity) {
        setError("Please select a project complexity.");
        return;
    }
    if (!name.trim()) {
        setError("Please enter a project name.");
        return;
    }
    if (!creationMode) {
        setError("Please choose a template option ('Use a Template' or 'Create My Own').");
        return;
    }
    if (creationMode === 'template' && !selectedTemplateId) {
        setError("Please select a project template from the list.");
        return;
    }
    if (creationMode === 'custom' && !customDiscipline.trim()) {
        setError("Please enter a custom project discipline.");
        return;
    }

    let template;
    if (creationMode === 'template') {
        template = TEMPLATES.find(t => t.id === selectedTemplateId);
        if (!template) return;
        onCreateProject({ name, template, mode: projectMode, scope: projectScope, teamSize, complexity: projectComplexity });
    } else { // Custom mode
        setIsGeneratingDocs(true);
        try {
            const prompt = PROMPTS.generateDocumentList(customDiscipline.trim(), projectScope, teamSize, projectComplexity);
            const schema = {
                type: Type.OBJECT,
                properties: {
                    documents: {
                        type: Type.ARRAY,
                        description: "A list of project documents.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "The name of the document." },
                                phase: { type: Type.NUMBER, description: "The HMAP phase number (1-9) the document belongs to." }
                            },
                            required: ['title', 'phase']
                        }
                    }
                },
                required: ['documents']
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { 
                    responseMimeType: "application/json", 
                    responseSchema: schema,
                },
            });
            
            const rawDocs = JSON.parse(response.text).documents;
            const generatedDocs = rawDocs.map((doc, i) => ({
                id: `doc-custom-${i}-${Date.now()}`,
                title: doc.title,
                version: 'v1.0',
                status: 'Working',
                owner: 'A. User',
                phase: doc.phase,
            }));
            
            template = {
                id: 'custom',
                name: 'Custom Project',
                discipline: customDiscipline.trim(),
                documents: generatedDocs
            };
            
            onCreateProject({ name, template, mode: projectMode, scope: projectScope, teamSize, complexity: projectComplexity });

        } catch (error) {
            console.error("Failed to generate custom document list:", error);
            alert("Could not generate the document list for your custom discipline. Please check the console and try again.");
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
    if (creationMode === 'custom') {
        return "The AI will generate a tailored set of project documents based on the discipline you provide.";
    }
    if (creationMode === 'template') {
        return "The discipline is determined by the selected template. Switch to 'Create My Own' to edit.";
    }
    return "Select 'Create My Own' to define a custom discipline.";
  };

  const complexityLevels = ['easy', 'typical', 'complex'];
  const complexityValue = complexityLevels.indexOf(projectComplexity);

  const handleComplexityChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setProjectComplexity(complexityLevels[value]);
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
                                    <span>{p.discipline} ({p.mode || 'fullscale'}, {p.scope || 'internal'}, {p.teamSize} team)</span>
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
                <form onSubmit={handleSubmit} id="new-project-form">
                    <div className="form-group">
                        <label>1. Select Project Mode</label>
                        <div className="mode-switch">
                            <button type="button" onClick={() => setProjectMode('fullscale')} className={projectMode === 'fullscale' ? 'active' : ''} aria-pressed={projectMode === 'fullscale'}>
                                Full Scale
                                <span>Detailed, comprehensive planning documents.</span>
                            </button>
                            <button type="button" onClick={() => setProjectMode('minimal')} className={projectMode === 'minimal' ? 'active' : ''} aria-pressed={projectMode === 'minimal'}>
                                Minimal Viable
                                <span>Concise, rapid, and cryptic planning.</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label>2. Select Project Scope</label>
                        <div className="mode-switch">
                            <button type="button" onClick={() => setProjectScope('internal')} className={projectScope === 'internal' ? 'active' : ''} aria-pressed={projectScope === 'internal'}>
                                Internal Project
                                <span>All work is performed by the internal team.</span>
                            </button>
                            <button type="button" onClick={() => setProjectScope('subcontracted')} className={projectScope === 'subcontracted' ? 'active' : ''} aria-pressed={projectScope === 'subcontracted'}>
                                Subcontracted Project
                                <span>A significant portion of work is outsourced.</span>
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>3. Select Team Size</label>
                        <div className="mode-switch" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <button type="button" onClick={() => setTeamSize('small')} className={teamSize === 'small' ? 'active' : ''} aria-pressed={teamSize === 'small'}>
                                Small
                                <span>1-3 people</span>
                            </button>
                            <button type="button" onClick={() => setTeamSize('medium')} className={teamSize === 'medium' ? 'active' : ''} aria-pressed={teamSize === 'medium'}>
                                Medium
                                <span>4-16 people</span>
                            </button>
                             <button type="button" onClick={() => setTeamSize('large')} className={teamSize === 'large' ? 'active' : ''} aria-pressed={teamSize === 'large'}>
                                Large
                                <span>16-100 people</span>
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="projectComplexitySlider">4. Set Project Complexity: <strong style={{color: 'var(--accent-color)', textTransform: 'capitalize'}}>{projectComplexity}</strong></label>
                        <input
                            id="projectComplexitySlider"
                            type="range"
                            min="0"
                            max="2"
                            step="1"
                            value={complexityValue}
                            onChange={handleComplexityChange}
                            style={{width: '100%', marginTop: '0.5rem', cursor: 'pointer'}}
                        />
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--secondary-text)', padding: '0 5px'}}>
                            <span>Easy</span>
                            <span>Typical</span>
                            <span>Complex</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="projectNameModal">5. Project Name</label>
                        <input id="projectNameModal" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    
                    <div className="form-group">
                        <label>6. Select Template Option</label>
                        <div className="mode-switch">
                            <button type="button" onClick={() => setCreationMode('template')} className={creationMode === 'template' ? 'active' : ''} aria-pressed={creationMode === 'template'}>
                                Use a Template
                                <span>Start with a pre-defined discipline and document set.</span>
                            </button>
                            <button type="button" onClick={() => setCreationMode('custom')} className={creationMode === 'custom' ? 'active' : ''} aria-pressed={creationMode === 'custom'}>
                                Create My Own
                                <span>Define your own project discipline.</span>
                            </button>
                        </div>
                    </div>

                    {creationMode === 'template' && (
                        <div className="form-group">
                            <label>7. Select a Project Template</label>
                            <div className="template-selection-grid">
                            {TEMPLATES.map(template => (
                                <div 
                                    key={template.id}
                                    className={`template-card ${selectedTemplateId === template.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedTemplateId(template.id)}
                                    tabIndex={0}
                                    role="radio"
                                    aria-checked={selectedTemplateId === template.id}
                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedTemplateId(template.id)}
                                >
                                    <h4>{template.name}</h4>
                                    <p>{template.description}</p>
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="form-group">
                        <label htmlFor="disciplineInput">Project Discipline</label>
                        <input
                            id="disciplineInput"
                            type="text"
                            value={creationMode === 'template' ? selectedTemplate?.discipline || '' : customDiscipline}
                            onChange={(e) => setCustomDiscipline(e.target.value)}
                            placeholder="e.g., Aerospace Engineering"
                            disabled={creationMode !== 'custom'}
                            required={creationMode === 'custom'}
                            style={{
                                cursor: creationMode !== 'custom' ? 'not-allowed' : 'text',
                                backgroundColor: creationMode !== 'custom' ? 'var(--background-color)' : '',
                                opacity: creationMode !== 'custom' ? 0.7 : 1,
                            }}
                        />
                         <p style={{fontSize: '0.8rem', color: 'var(--secondary-text)', marginTop: '0.5rem'}}>
                            {getDisciplineHelperText()}
                         </p>
                    </div>

                    {error && <p style={{ color: 'var(--error-color)', textAlign: 'center', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</p>}
                </form>
            </div>
        )}

        <div className="modal-actions" style={{justifyContent: 'center'}}>
            {activeTab === 'create' ? (
                <button
                    type="submit"
                    form="new-project-form"
                    className="button button-primary"
                    style={{width: '100%'}}
                    disabled={isGeneratingDocs}
                >
                    {isGeneratingDocs ? 'Generating Document List...' : 'Launch Project'}
                </button>
            ) : (
                <button type="button" className="button" onClick={onClose}>Close</button>
            )}
        </div>
      </div>
    </div>
  );
};