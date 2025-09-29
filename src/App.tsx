import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './views/LandingPage';
import { ProjectDashboard } from './views/ProjectDashboard';
import { NewProjectModal } from './components/NewProjectModal';
import { GlobalStyles } from './styles/GlobalStyles';
import { DEFAULT_DOCUMENTS, DEFAULT_TASKS, DEFAULT_SPRINTS, DEFAULT_MILESTONES } from './constants/projectData';

const App = () => {
  const [ai, setAi] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        return;
    }
    if (!initializeAi(key, 'user')) {
        alert('The provided API Key appears to be invalid. Please check it and try again.');
    }
  };

  useEffect(() => {
    try {
      const storedProjects = localStorage.getItem('hmap-projects');
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      }
    } catch (error) {
        console.error("Failed to load projects from localStorage:", error);
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

  const handleCreateProject = (projectData) => {
    const tasks = JSON.parse(JSON.stringify(DEFAULT_TASKS));
    const dates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
    const startDate = new Date(Math.min(...dates));
    const endDate = new Date(Math.max(...dates));
    
    const newProject = { 
        id: Date.now().toString(), 
        ...projectData,
        phasesData: {},
        documents: JSON.parse(JSON.stringify(DEFAULT_DOCUMENTS)), // Deep copy
        tasks: tasks,
        sprints: JSON.parse(JSON.stringify(DEFAULT_SPRINTS)),
        milestones: JSON.parse(JSON.stringify(DEFAULT_MILESTONES)),
        budget: 100000,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    setSelectedProject(newProject);
  };
  
  const handleSaveProject = (updatedProject) => {
    const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    if(selectedProject && selectedProject.id === updatedProject.id) {
        setSelectedProject(updatedProject);
    }
  };

  return (
    <>
        <style>{GlobalStyles}</style>
        <Header 
            onNewProject={() => setIsModalOpen(true)} 
            onHomeClick={() => setSelectedProject(null)}
            disabled={!ai}
        />
        <main>
            {selectedProject ? (
                <ProjectDashboard 
                    project={selectedProject} 
                    onBack={() => setSelectedProject(null)} 
                    ai={ai}
                    saveProject={handleSaveProject}
                />
            ) : (
                <LandingPage
                    projects={projects}
                    onSelectProject={setSelectedProject}
                    onNewProject={() => setIsModalOpen(true)}
                    apiKeyStatus={apiKeyStatus}
                    onSetUserKey={handleSetUserKey}
                    disabled={!ai}
                />
            )}
        </main>
        <NewProjectModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onCreateProject={handleCreateProject}
        />
    </>
  );
};

export default App;