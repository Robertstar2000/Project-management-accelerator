

import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './views/LandingPage';
import { ProjectDashboard } from './views/ProjectDashboard';
import { NewProjectModal } from './components/NewProjectModal';
import { DeleteProjectConfirmationModal } from './components/DeleteProjectConfirmationModal';
import { HelpModal } from './components/HelpModal';
import { GlobalStyles } from './styles/GlobalStyles';
import { DEFAULT_SPRINTS, TEMPLATES, DEFAULT_DOCUMENTS } from './constants/projectData';
import { logAction } from './utils/logging';

const App = () => {
  const [ai, setAi] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState('pending');

  const initializeAi = (key, source) => {
    try {
      const genAI = new GoogleGenAI({ apiKey: key });
      setAi(genAI);
      setApiKeyStatus(source);
      if (source === 'user') {
        localStorage.setItem('hmap-gemini-key', key);
      }
      return true;
    } catch (error) {
      console.error(`Failed to initialize GoogleGenAI from ${source}:`, error);
      return false;
    }
  };
  
  const handleSetUserKey = (key) => {
    if (key === null) { 
        setAi(null);
        localStorage.removeItem('hmap-gemini-key');
        setApiKeyStatus('none');
        logAction('Clear API Key', 'User Action', { apiKeyStatus: 'none' });
        return;
    }
    if (initializeAi(key, 'user')) {
        logAction('Set API Key', 'User Action', { apiKeyStatus: 'user' });
    } else {
        alert('The provided API Key appears to be invalid. Please check it and try again.');
    }
  };

  useEffect(() => {
    let loadedProjects = [];
    try {
      const storedProjects = localStorage.getItem('hmap-projects');
      if (storedProjects) {
        loadedProjects = JSON.parse(storedProjects);
        setProjects(loadedProjects);
      }

      const selectedProjectId = localStorage.getItem('hmap-selected-project-id');
      if (selectedProjectId) {
          const projectToSelect = loadedProjects.find(p => p.id === selectedProjectId);
          if (projectToSelect) {
              setSelectedProject(projectToSelect);
          }
      }

    } catch (error) {
        console.error("Failed to load data from localStorage:", error);
        setProjects([]);
    }
  
    const userKey = localStorage.getItem('hmap-gemini-key');
    if (userKey) {
      if (initializeAi(userKey, 'user')) return;
      else localStorage.removeItem('hmap-gemini-key');
    }
    
    if (process.env.API_KEY) {
      if (initializeAi(process.env.API_KEY, 'promo')) return;
    }
    
    setApiKeyStatus('none');
  }, []);
  
  const saveProjectsToStorage = (updatedProjects) => {
    try {
      localStorage.setItem('hmap-projects', JSON.stringify(updatedProjects));
    } catch (error) {
      console.error("Failed to save projects to localStorage:", error);
    }
  };

  const handleCreateProject = ({ name, template, mode, scope }) => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 44); // Default end date, will be updated by plan parsing
    
    const newProject = { 
        id: Date.now().toString(), 
        name,
        mode, // 'fullscale' or 'minimal'
        scope, // 'internal' or 'subcontracted'
        discipline: template.discipline,
        phasesData: {},
        documents: JSON.parse(JSON.stringify(template.documents || DEFAULT_DOCUMENTS)), // Deep copy from template
        tasks: [],
        sprints: JSON.parse(JSON.stringify(DEFAULT_SPRINTS)), // Keep sprints for initial UI structure
        milestones: [],
        budget: 100000,
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        changeRequest: { title: 'Add new login provider', reason: 'User request for SSO', impactStr: '+15d +5000c' },
        scenarios: [
            { id: 1, name: 'A: Use contractors', impactStr: '+10d +8000c' },
            { id: 2, name: 'B: Defer feature', impactStr: '+0d +0c' },
        ],
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    // Set a session flag to indicate this is a new project for smart navigation.
    sessionStorage.setItem('hmap-new-project-id', newProject.id);
    handleSelectProject(newProject);
    logAction('Create Project', newProject.name, { newProject, allProjects: updatedProjects });
  };
  
  const handleSaveProject = (updatedProject) => {
    const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    if(selectedProject && selectedProject.id === updatedProject.id) {
        setSelectedProject(updatedProject);
    }
    logAction('Save Project', updatedProject.name, { updatedProject });
  };
  
  const handleSelectProject = (project) => {
    logAction('Select Project', project ? project.name : 'Home', { projectId: project ? project.id : null });
    setSelectedProject(project);
    if (project) {
        localStorage.setItem('hmap-selected-project-id', project.id);
    } else {
        localStorage.removeItem('hmap-selected-project-id');
    }
  };

  const handleModalOpen = (isOpen) => {
    logAction('Toggle New Project Modal', 'Modal', { isOpen });
    setIsModalOpen(isOpen);
  };

  const cleanupProjectData = (projectId) => {
    localStorage.removeItem('hmap-selected-project-id');
    localStorage.removeItem(`hmap-active-tab-${projectId}`);
    localStorage.removeItem(`hmap-open-phases-${projectId}`);
    localStorage.removeItem(`hmap-tracking-view-${projectId}`);
    logAction('Cleanup Project Data', 'localStorage', { projectId });
  };

  const handleNewProjectRequest = () => {
    logAction('Open Project Manager', 'User Action', {});
    handleModalOpen(true);
  };

  const handleRequestDeleteProject = (project) => {
    logAction('Request Project Deletion', project.name, { projectId: project.id });
    setProjectToDelete(project);
    setIsDeleteConfirmationOpen(true);
    handleModalOpen(false); // Close the projects modal
  };

  const handleConfirmDeletion = () => {
    if (!projectToDelete) return;

    logAction('Confirm Delete Project', projectToDelete.name, { projectId: projectToDelete.id });

    const updatedProjects = projects.filter(p => p.id !== projectToDelete.id);
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    
    cleanupProjectData(projectToDelete.id);
    
    if (selectedProject && selectedProject.id === projectToDelete.id) {
        setSelectedProject(null);
    }

    setProjectToDelete(null);
    setIsDeleteConfirmationOpen(false);
  };


  const handleToggleHelpModal = (isOpen: boolean) => {
      logAction('Toggle Help Modal', 'UI Action', { isOpen });
      setIsHelpModalOpen(isOpen);
  };

  return (
    <>
        <style>{GlobalStyles}</style>
        <Header 
            onNewProject={handleNewProjectRequest} 
            onHomeClick={() => handleSelectProject(null)}
            disabled={!ai}
            isLandingPage={!selectedProject}
        />
        <main>
            {selectedProject ? (
                <ProjectDashboard 
                    project={selectedProject} 
                    onBack={() => handleSelectProject(null)} 
                    ai={ai}
                    saveProject={handleSaveProject}
                />
            ) : (
                <LandingPage
                    projects={projects}
                    onSelectProject={handleSelectProject}
                    onNewProject={handleNewProjectRequest}
                    apiKeyStatus={apiKeyStatus}
                    onSetUserKey={handleSetUserKey}
                    disabled={!ai}
                />
            )}
        </main>
        <NewProjectModal 
            isOpen={isModalOpen} 
            onClose={() => handleModalOpen(false)} 
            onCreateProject={handleCreateProject}
            projects={projects}
            onSelectProject={handleSelectProject}
            onRequestDelete={handleRequestDeleteProject}
            ai={ai}
        />
        {projectToDelete && (
          <DeleteProjectConfirmationModal
              isOpen={isDeleteConfirmationOpen}
              onClose={() => {
                  logAction('Cancel Project Deletion', projectToDelete.name, { projectId: projectToDelete.id });
                  setIsDeleteConfirmationOpen(false);
                  setProjectToDelete(null);
              }}
              onConfirm={handleConfirmDeletion}
              projectName={projectToDelete.name}
          />
        )}
        <button className="help-fab" onClick={() => handleToggleHelpModal(true)} aria-label="Open Help">?</button>
        <HelpModal isOpen={isHelpModalOpen} onClose={() => handleToggleHelpModal(false)} />
    </>
  );
};

export default App;