

import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './views/LandingPage';
import { ProjectDashboard } from './views/ProjectDashboard';
import { NewProjectModal } from './components/NewProjectModal';
import { DeleteProjectConfirmationModal } from './components/DeleteProjectConfirmationModal';
import { HelpModal } from './components/HelpModal';
import { GlobalStyles } from './styles/GlobalStyles';
import { DEFAULT_SPRINTS, TEMPLATES, DEFAULT_DOCUMENTS } from './constants/projectData';
import { logAction } from './utils/logging';
import { AuthView } from './views/AuthView';
import * as authService from './utils/authService';
import { subscribeToUpdates, notifyUpdate } from './utils/syncService';
// FIX: Import Notification type to satisfy HeaderProps.
import { Project, Task, Notification } from './types';

const App = () => {
  const [ai, setAi] = useState<GoogleGenAI | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState('pending');
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [appKey, setAppKey] = useState(0); // Used to force re-renders on sync
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

  const userProjects = useMemo(() => {
    if (!projects || !currentUser) return [];
    return projects.filter(p => p.ownerId === currentUser.id || p.team?.some(member => member.userId === currentUser.id));
  }, [projects, currentUser]);
  
  const recentlyViewedProjects = useMemo(() => {
    if (!projects || recentlyViewedIds.length === 0) return [];
    const userProjectIds = new Set(userProjects.map(p => p.id));
    return recentlyViewedIds
        .map(id => projects.find(p => p.id === id))
        .filter((p): p is Project => !!p && userProjectIds.has(p.id));
  }, [projects, userProjects, recentlyViewedIds]);

  const reloadStateFromStorage = () => {
    logAction('Sync Update', 'BroadcastChannel', { message: 'Forcing state reload from localStorage' });
    const storedProjects = localStorage.getItem('hmap-projects');
    if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
    }
    const selectedProjectId = localStorage.getItem('hmap-selected-project-id');
    if (selectedProjectId && selectedProject && selectedProjectId === selectedProject.id) {
        const updatedSelectedProject = JSON.parse(storedProjects).find(p => p.id === selectedProjectId);
        if (updatedSelectedProject) {
            setSelectedProject(updatedSelectedProject);
        }
    }
    setAppKey(prev => prev + 1); // Force update
  };

  useEffect(() => {
    const unsubscribe = subscribeToUpdates(reloadStateFromStorage);
    return () => unsubscribe();
  }, [selectedProject]);


  const initializeAi = (key, source) => {
    try {
      const genAI = new GoogleGenAI({ apiKey: key });
      setAi(genAI);
      setApiKeyStatus(source);
      if (source === 'user') {
        localStorage.setItem('hmap-gemini-key', key);
      }
      return true;
    } catch (error: any) {
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
    try {
      const storedProjects = localStorage.getItem('hmap-projects');
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      } else {
        localStorage.setItem('hmap-projects', JSON.stringify([]));
      }
      const storedRecentIds = localStorage.getItem('hmap-recently-viewed');
      if (storedRecentIds) {
          setRecentlyViewedIds(JSON.parse(storedRecentIds));
      }
    } catch (error: any) {
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

  useEffect(() => {
    const selectedProjectId = localStorage.getItem('hmap-selected-project-id');
    
    if (currentUser && selectedProjectId && projects.length > 0) {
        const projectToSelect = projects.find(p => p.id === selectedProjectId);
        
        if (projectToSelect) {
            const isOwnerOrMember = projectToSelect.ownerId === currentUser.id || 
                                  projectToSelect.team?.some(member => member.userId === currentUser.id);
            if (isOwnerOrMember) {
                setSelectedProject(projectToSelect);
            } else {
                setSelectedProject(null);
                localStorage.removeItem('hmap-selected-project-id');
            }
        } else {
            localStorage.removeItem('hmap-selected-project-id');
        }
    } else if (!currentUser) {
        setSelectedProject(null);
    }
  }, [currentUser, projects]);
  
  const saveProjectsToStorage = (updatedProjects) => {
    try {
      localStorage.setItem('hmap-projects', JSON.stringify(updatedProjects));
      notifyUpdate();
// FIX: Corrected catch block variable name to resolve 'Cannot find name' error, which was likely a red herring from a larger structural issue.
    } catch (e: any) {
      console.error("Failed to save projects to localStorage:", e);
    }
  };

  const handleCreateProject = ({ name, template, mode, scope, teamSize, complexity }) => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 44);
    
    const projectDocuments = JSON.parse(JSON.stringify(template.documents || DEFAULT_DOCUMENTS));
    
    const mandatoryDocs = [
        { title: 'Statement of Work (SOW)', phase: 5, sequence: 1 },
        { title: 'Resources & Skills List', phase: 2, sequence: 1 },
        { title: 'Detailed Plans (WBS/WRS)', phase: 7, sequence: 1 }
    ];

    mandatoryDocs.forEach(mandatoryDoc => {
        const simpleTitle = mandatoryDoc.title.replace(/\s\(.*\)/, '');
        const hasDoc = projectDocuments.some(doc => doc.title.includes(simpleTitle));
        
        if (!hasDoc) {
            projectDocuments.push({
                id: `doc-mandatory-${Date.now()}-${mandatoryDoc.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                title: mandatoryDoc.title, version: 'v1.0', status: 'Working', owner: 'A. User', phase: mandatoryDoc.phase,
                sequence: mandatoryDoc.sequence,
            });
        }
    });

    if (scope === 'subcontracted') {
        const hasRFP = projectDocuments.some(doc => doc.title.toLowerCase().includes('request for proposal') || doc.title.toLowerCase().includes('rfp'));
        if (!hasRFP) {
            projectDocuments.push({
                id: `doc-subco-${Date.now()}-rfp`, title: 'Request for Proposal (RFP)', version: 'v1.0', status: 'Working', owner: 'A. User', phase: 2, sequence: 50,
            });
        }
        
        const hasContract = projectDocuments.some(doc => doc.title.toLowerCase().includes('contract') || doc.title.toLowerCase().includes('agreement'));
        if (!hasContract) {
             projectDocuments.push({
                id: `doc-subco-${Date.now()}-contract`, title: "Draft Contract with T's & C's", version: 'v1.0', status: 'Working', owner: 'A. User', phase: 5, sequence: 50,
            });
        }
    }
    
    const newProject: Project = { 
        id: Date.now().toString(), name, mode, scope, generationMode: 'manual', teamSize, complexity: complexity || 'typical', discipline: template.discipline,
        ownerId: currentUser.id,
        phasesData: {},
        team: [{ userId: currentUser.id, role: 'Project Owner', name: currentUser.username, email: currentUser.email }],
        documents: projectDocuments, tasks: [], sprints: JSON.parse(JSON.stringify(DEFAULT_SPRINTS)), milestones: [], resources: [],
        avgBurdenedLaborRate: 125, budget: 100000,
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        changeRequest: { title: 'Add new login provider', reason: 'User request for SSO', impactStr: '+15d +5000c' },
        scenarios: [
            { id: 1, name: 'A: Use contractors', impactStr: '+10d +8000c' },
            { id: 2, name: 'B: Defer feature', impactStr: '+0d +0c' },
        ],
        notifications: [],
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    sessionStorage.setItem('hmap-new-project-id', newProject.id);
    handleSelectProject(newProject);
    handleModalOpen(false);
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
        const MAX_RECENT = 4;
        const updatedRecentIds = [
            project.id,
            ...recentlyViewedIds.filter(id => id !== project.id)
        ].slice(0, MAX_RECENT);
        
        setRecentlyViewedIds(updatedRecentIds);
        localStorage.setItem('hmap-recently-viewed', JSON.stringify(updatedRecentIds));
    } else {
        localStorage.removeItem('hmap-selected-project-id');
    }
  };

  const handleSelectTask = (project: Project, task: Task) => {
    logAction('Select Task from My Work', task.name, { projectId: project.id, taskId: task.id });
    handleSelectProject(project);
    sessionStorage.setItem('hmap-open-task-on-load', task.id);
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
    handleModalOpen(false);
  };

  const handleConfirmDeletion = () => {
    if (!projectToDelete) return;
    logAction('Confirm Delete Project', projectToDelete.name, { projectId: projectToDelete.id });
    const updatedProjects = projects.filter(p => p.id !== projectToDelete.id);
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    cleanupProjectData(projectToDelete.id);
    const updatedRecentIds = recentlyViewedIds.filter(id => id !== projectToDelete.id);
    setRecentlyViewedIds(updatedRecentIds);
    localStorage.setItem('hmap-recently-viewed', JSON.stringify(updatedRecentIds));
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

  // FIX: Add notification handlers to pass to Header component.
  const handleNotificationClick = (notification: Notification) => {
    if (!selectedProject) return;

    logAction('Click Notification', notification.text, { notificationId: notification.id });
    
    const updatedNotifications = selectedProject.notifications.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
    );
    
    const updatedProject = { ...selectedProject, notifications: updatedNotifications };
    handleSaveProject(updatedProject); 

    const task = selectedProject.tasks.find(t => t.id === notification.taskId);
    if (task) {
        sessionStorage.setItem('hmap-open-task-on-load', notification.taskId);
        setAppKey(prev => prev + 1);
    }
  };

  const handleMarkAllRead = () => {
    if (!selectedProject) return;
    
    logAction('Mark All Notifications Read', 'User Action', { projectId: selectedProject.id });
    
    const updatedNotifications = selectedProject.notifications.map(n => ({ ...n, read: true }));
    const updatedProject = { ...selectedProject, notifications: updatedNotifications };
    handleSaveProject(updatedProject);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setSelectedProject(null);
    localStorage.removeItem('hmap-selected-project-id');
  };

  return (
    <>
        <style>{GlobalStyles}</style>

        {!currentUser ? (
            <AuthView onLogin={(user) => setCurrentUser(user)} />
        ) : (
            <>
                <Header 
                    onNewProject={handleNewProjectRequest} 
                    onHomeClick={() => handleSelectProject(null)}
                    disabled={!ai}
                    isLandingPage={!selectedProject}
                    currentUser={currentUser}
                    onLogout={handleLogout}
                    notifications={selectedProject?.notifications || []}
                    onNotificationClick={handleNotificationClick}
                    onMarkAllRead={handleMarkAllRead}
                />
                <main>
                    {selectedProject ? (
                        <ProjectDashboard 
                            project={selectedProject} 
                            onBack={() => handleSelectProject(null)} 
                            ai={ai}
                            saveProject={handleSaveProject}
                            currentUser={currentUser}
                            key={appKey}
                        />
                    ) : (
                        <LandingPage
                            projects={userProjects}
                            onSelectProject={handleSelectProject}
                            onNewProject={handleNewProjectRequest}
                            apiKeyStatus={apiKeyStatus}
                            onSetUserKey={handleSetUserKey}
                            disabled={!ai}
                            onRequestDelete={handleRequestDeleteProject}
                            currentUser={currentUser}
                            onSelectTask={handleSelectTask}
                            recentlyViewedProjects={recentlyViewedProjects}
                        />
                    )}
                </main>
                <NewProjectModal 
                    isOpen={isModalOpen} 
                    onClose={() => handleModalOpen(false)} 
                    onCreateProject={handleCreateProject}
                    projects={userProjects}
                    onSelectProject={handleSelectProject}
                    onRequestDelete={handleRequestDeleteProject}
                    ai={ai}
                    currentUser={currentUser}
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
            </>
        )}
        
        <button className="help-fab" onClick={() => handleToggleHelpModal(true)} aria-label="Open Help">?</button>
        <HelpModal isOpen={isHelpModalOpen} onClose={() => handleToggleHelpModal(false)} />
    </>
  );
};

export default App;