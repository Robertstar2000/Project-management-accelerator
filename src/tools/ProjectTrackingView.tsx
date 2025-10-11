


import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { TeamAssignmentsView } from './TeamView';
import { Project, Task, User, Milestone, Sprint } from '../types';
import { WorkloadView } from './WorkloadView';

const parseResourcesFromMarkdown = (markdownText: string): string[] => {
    if (!markdownText) return [];
    const lines = markdownText.split('\n');
    const resourceSectionKeywords = ['software', 'hardware', 'partners', 'tools'];
    let resourceLines: string[] = [];
    let inSection = false;
    for (const line of lines) {
        if (line.match(/^##\s/)) { // A heading marks a new section
            inSection = resourceSectionKeywords.some(keyword => line.toLowerCase().includes(keyword));
        }
        if (inSection && line.match(/^[-*]\s+/)) {
            resourceLines.push(line);
        }
    }
    return resourceLines.map(line => line.replace(/^[-*]\s+/, '').split(/[:(]/)[0].trim()).filter(Boolean);
};

const ResourcesView = ({ project, onUpdateProject }) => {
    const [resources, setResources] = useState(project.resources || []);

    const extractedResources = useMemo(() => {
        const resourceDoc = project.documents.find(d => d.title === 'Resources & Skills List');
        if (!resourceDoc || !project.phasesData || !project.phasesData[resourceDoc.id]) return [];
        return parseResourcesFromMarkdown(project.phasesData[resourceDoc.id].content);
    }, [project.documents, project.phasesData]);

    useEffect(() => {
        const newResources = [...(project.resources || [])];
        const existingResourceNames = new Set(newResources.map(r => r.name));
        
        extractedResources.forEach(name => {
            if (!existingResourceNames.has(name)) {
                newResources.push({ name, estimate: 0, actual: 0 });
            }
        });
        // This check prevents an infinite loop by only setting state if there's a change.
        if (newResources.length !== (project.resources || []).length) {
            setResources(newResources);
        }
    }, [extractedResources, project.resources]);

    const handleUpdate = (index, field, value) => {
        const newResources = [...resources];
        newResources[index] = { ...newResources[index], [field]: value };
        setResources(newResources);
    };

    const handleSave = () => {
        onUpdateProject({ resources });
    };

    return (
        <div>
            <p style={{color: 'var(--secondary-text)', marginBottom: '1.5rem'}}>Track estimated vs. actual costs for non-labor resources. The list is auto-populated from the 'Resources & Skills List' document.</p>
            <table className="task-list-table">
                <thead><tr><th>Resource Name</th><th>Estimated Cost</th><th>Actual Cost</th></tr></thead>
                <tbody>
                    {resources.map((resource, index) => (
                        <tr key={index}>
                            <td><input type="text" value={resource.name} onChange={(e) => handleUpdate(index, 'name', e.target.value)} /></td>
                            <td><input type="number" value={resource.estimate || ''} onChange={(e) => handleUpdate(index, 'estimate', parseFloat(e.target.value))} /></td>
                            <td><input type="number" value={resource.actual || ''} onChange={(e) => handleUpdate(index, 'actual', parseFloat(e.target.value))} /></td>
                        </tr>
                    ))}
                     {resources.length === 0 && (
                        <tr>
                            <td colSpan={3} style={{ textAlign: 'center', color: 'var(--secondary-text)' }}>
                                Resources will be listed here after the 'Resources & Skills List' document is generated.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            <button onClick={handleSave} className="button" style={{marginTop: '1rem'}}>Save Resource Costs</button>
        </div>
    );
};


const TaskListView = ({ tasks, team, onTaskClick }) => {
    if (!tasks || tasks.length === 0) return <p>Tasks will be populated here once planning is complete.</p>;
    
    return (
        <table className="task-list-table">
            <thead>
                <tr><th>Task Name</th><th>Assigned To</th><th>Status</th><th>Due Date</th></tr>
            </thead>
            <tbody>
                {tasks.map(task => {
                    const isOverdue = task.status !== 'done' && new Date(task.endDate) < new Date();
                    return (
                        <tr key={task.id} onClick={() => onTaskClick(task)} className={isOverdue ? 'task-row-overdue' : ''}>
                            <td>
                                {task.name}
                                {task.recurrence?.interval && task.recurrence.interval !== 'none' && (
                                    <span title={`Recurs ${task.recurrence.interval}`} style={{ marginLeft: '8px', cursor: 'default' }}>🔄</span>
                                )}
                            </td>
                            <td>{team.find(member => member.role === task.role)?.name || 'Unassigned'}</td>
                            <td>{task.status}</td>
                            <td>{task.endDate}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

interface GanttChartProps {
    tasks: Task[];
    sprints: Sprint[];
    projectStartDate: string;
    projectEndDate: string;
    onTaskClick: (task: Task) => void;
}

interface DependencyLine {
    id: string;
    path: string;
    arrow: string;
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, sprints, projectStartDate, projectEndDate, onTaskClick }) => {
    if (!tasks || !sprints || tasks.length === 0) return <p>Timeline will be populated here once tasks are generated.</p>;
    const containerRef = useRef<HTMLDivElement>(null);
    const taskBarRefs = useRef(new Map());
    const [dependencyLines, setDependencyLines] = useState<DependencyLine[]>([]);
    const diffInDays = (d1, d2) => Math.round((new Date(d2).getTime() - new Date(d1).getTime()) / (1000 * 3600 * 24));
    
    const totalDays = Math.max(1, diffInDays(projectStartDate, projectEndDate) + 1);
    const dateArray = Array.from({ length: totalDays }, (_, i) => new Date(new Date(projectStartDate).setDate(new Date(projectStartDate).getDate() + i)));
    
    const tasksWithRowIndex = useMemo(() => {
        let taskIndexCounter = 0;
        return sprints.map((sprint: Sprint): { sprint: Sprint, tasks: (Task & { rowIndex: number })[] } => {
            const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
            const sprintTasksWithIndex = sprintTasks.map(task => ({
                ...task,
                rowIndex: taskIndexCounter++
            }));
            return { sprint, tasks: sprintTasksWithIndex };
        });
    }, [tasks, sprints]);
    
    const totalRows = tasks.length;

    useLayoutEffect(() => {
        const lines: DependencyLine[] = [];
        const taskMap = new Map<string, Task>(tasks.map(t => [t.id, t]));
        for (const task of tasks) {
            if (task.dependsOn) {
                for (const depId of task.dependsOn) {
                    const prereqTask = taskMap.get(depId);
                    if (prereqTask) {
                        const fromEl = taskBarRefs.current.get(prereqTask.id);
                        const toEl = taskBarRefs.current.get(task.id);
                        if (fromEl && toEl && containerRef.current) {
                            const containerRect = containerRef.current.getBoundingClientRect();
                            const fromRect = fromEl.getBoundingClientRect();
                            const toRect = toEl.getBoundingClientRect();

                            const fromX = fromRect.right - containerRect.left + containerRef.current.scrollLeft;
                            const fromY = fromRect.top - containerRect.top + fromRect.height / 2;
                            const toX = toRect.left - containerRect.left + containerRef.current.scrollLeft;
                            const toY = toRect.top - containerRect.top + toRect.height / 2;
                            
                            lines.push({
                                id: `${prereqTask.id}-${task.id}`,
                                path: `M ${fromX} ${fromY} L ${toX - 8} ${toY}`,
                                arrow: `M ${toX - 8} ${toY - 4} L ${toX} ${toY} L ${toX - 8} ${toY + 4} Z`,
                            });
                        }
                    }
                }
            }
        }
        setDependencyLines(lines);
    }, [tasksWithRowIndex, projectStartDate, projectEndDate, tasks]);

    return (
        <div className="gantt-container" ref={containerRef}>
            <div className="gantt-grid" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(40px, 1fr))`, gridAutoRows: '30px', gap: '5px 0' }}>
                 {dateArray.map(date => (
                    <div key={date.toISOString()} className="gantt-date" style={{ gridRow: 1 }}>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                ))}
                
                {tasksWithRowIndex.flatMap(({ sprint, tasks: sprintTasks }, sprintIndex) => [
                    <div key={sprint.id} className="gantt-sprint-label" style={{ gridColumn: `1 / span ${totalDays}`, gridRow: (sprintTasks[0]?.rowIndex ?? 0) + 2, background: 'none', fontWeight: 'normal', color: 'var(--secondary-text)' }}>{sprint.name}</div>,
                    ...sprintTasks.map((task: Task & { rowIndex: number }) => {
                         const startOffset = diffInDays(projectStartDate, task.startDate);
                         const duration = diffInDays(task.startDate, task.endDate) + 1;
                         const isOverdue = task.status !== 'done' && new Date(task.endDate) < new Date();
                         const isBlocked = task.dependsOn?.some(depId => tasks.find(t => t.id === depId)?.status !== 'done');
                         
                         if (startOffset < 0 || startOffset >= totalDays) return null;

                         return (
                             <div
                                 key={task.id}
                                 // FIX: Use a callback ref that handles element mounting and unmounting to avoid returning a value from the ref function, which is not allowed.
                                 ref={el => {
                                     if (el) {
                                         taskBarRefs.current.set(task.id, el);
                                     } else {
                                         taskBarRefs.current.delete(task.id);
                                     }
                                 }}
                                 className={`gantt-task-bar task-bar-${task.status} ${isOverdue ? 'overdue' : ''} ${isBlocked ? 'blocked' : ''} ${task.isSubcontracted ? 'subcontracted' : ''}`}
                                 style={{
                                     gridRow: task.rowIndex + 2,
                                     gridColumn: `${startOffset + 1} / span ${Math.max(1, duration)}`,
                                 }}
                                 onClick={() => onTaskClick(task)}
                                 title={`${task.name} (${task.status})`}
                             >
                                 {task.name}
                                 {task.recurrence?.interval && task.recurrence.interval !== 'none' && (
                                     <span title={`Recurs ${task.recurrence.interval}`} style={{ marginLeft: '8px', cursor: 'default' }}>🔄</span>
                                 )}
                             </div>
                         );
                    })
                ])}
            </div>
             <svg className="gantt-dependency-svg" style={{ height: (totalRows + 1) * 35 }}>
                {dependencyLines.map(line => (
                    <g key={line.id}>
                        <path d={line.path} className="gantt-dependency-line" />
                        <path d={line.arrow} className="gantt-dependency-arrow" />
                    </g>
                ))}
            </svg>
        </div>
    );
};

const KanbanBoard = ({ tasks, onUpdateTask, onTaskClick }) => {
    if (!tasks || tasks.length === 0) return <p>Kanban board will be populated here once tasks are generated.</p>;
    const statuses: Task['status'][] = ['todo', 'inprogress', 'review', 'done'];

    const handleStatusChange = (e, task, currentStatus) => {
        e.stopPropagation(); // prevent opening modal
        const newStatus = e.target.value;
        onUpdateTask(task.id, { status: newStatus }, currentStatus);
    };

    return (
        <div className="kanban-board">
            {statuses.map(status => (
                <div key={status} className="kanban-column">
                    <h4>{status.toUpperCase()}</h4>
                    {tasks.filter(t => t.status === status).map(task => {
                        const isOverdue = task.status !== 'done' && new Date(task.endDate) < new Date();
                        return (
                             <div key={task.id} className={`kanban-card ${status} ${isOverdue ? 'overdue' : ''}`} onClick={() => onTaskClick(task)}>
                                {task.isSubcontracted && <span className="subcontractor-label">Sub</span>}
                                <p>{task.name}</p>
                                <select 
                                    value={task.status} 
                                    onChange={(e) => handleStatusChange(e, task, status)} 
                                    className="kanban-status-select"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                             </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

const MilestonesView = ({ milestones, tasks, onUpdateMilestone }) => {
    if (!milestones || milestones.length === 0) return <p>Milestones will be populated here once planning is complete.</p>;

    const getMilestoneHealth = (milestone) => {
        const relevantTasks = tasks.filter(t => new Date(t.endDate) <= new Date(milestone.plannedDate));
        if (relevantTasks.length === 0) return { status: 'On Track', color: 'var(--status-green)' };
        const overdueTasks = relevantTasks.filter(t => t.status !== 'done' && new Date(t.endDate) < new Date());
        if (new Date(milestone.plannedDate) < new Date()) return { status: 'Overdue', color: 'var(--status-red)' };
        if (overdueTasks.length > 0) return { status: 'At Risk', color: 'var(--status-amber)' };
        return { status: 'On Track', color: 'var(--status-green)' };
    };

    return (
        <table className="milestones-table">
            <thead>
                <tr><th>Milestone Name</th><th>Planned Date</th><th>Actual Date</th><th>Status</th><th>Health</th></tr>
            </thead>
            <tbody>
                {milestones.map(m => {
                    const health = getMilestoneHealth(m);
                    return (
                        <tr key={m.id}>
                            <td>{m.name}</td>
                            <td className={m.actualDate ? 'milestone-planned-date' : ''}>{m.plannedDate}</td>
                            <td>
                                <input 
                                    type="date" 
                                    value={m.actualDate || ''} 
                                    onChange={e => onUpdateMilestone(m.id, { actualDate: e.target.value, status: e.target.value ? 'Completed' : 'Planned' })} 
                                />
                            </td>
                            <td>
                                <select value={m.status || 'Planned'} onChange={e => onUpdateMilestone(m.id, { status: e.target.value })}>
                                    <option>Planned</option>
                                    <option>Completed</option>
                                </select>
                            </td>
                            <td style={{ color: health.color, fontWeight: 'bold' }}>{health.status}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

interface ProjectTrackingViewProps {
    project: Project;
    onUpdateTask: (taskId: string, updatedTaskData: Partial<Task>, previousStatus: string) => void;
    onUpdateMilestone: (milestoneId: string, updatedMilestoneData: Partial<Milestone>) => void;
    onUpdateTeam: (newTeam: any, newOwnerId?: string) => void;
    onUpdateProject: (update: Partial<Project>) => void;
    onTaskClick: (task: Task) => void;
    currentUser: User;
}

export const ProjectTrackingView: React.FC<ProjectTrackingViewProps> = ({ project, onUpdateTask, onUpdateMilestone, onUpdateTeam, onUpdateProject, onTaskClick, currentUser }) => {
    const [trackingView, setTrackingView] = useState('Timeline');

    useEffect(() => {
        const savedView = localStorage.getItem(`hmap-tracking-view-${project.id}`);
        if (savedView) setTrackingView(savedView);
    }, [project.id]);

    const handleViewChange = (view) => {
        setTrackingView(view);
        localStorage.setItem(`hmap-tracking-view-${project.id}`, view);
    };

    const views = {
        'Timeline': <GanttChart tasks={project.tasks} sprints={project.sprints} projectStartDate={project.startDate} projectEndDate={project.endDate} onTaskClick={onTaskClick} />,
        'Task List': <TaskListView tasks={project.tasks} team={project.team} onTaskClick={onTaskClick} />,
        'Kanban Board': <KanbanBoard tasks={project.tasks} onUpdateTask={onUpdateTask} onTaskClick={onTaskClick} />,
        'Workload': <WorkloadView project={project} />,
        'Milestones': <MilestonesView milestones={project.milestones} tasks={project.tasks} onUpdateMilestone={onUpdateMilestone} />,
        'Team': <TeamAssignmentsView project={project} onUpdateTeam={onUpdateTeam} currentUser={currentUser} />,
        'Resources': <ResourcesView project={project} onUpdateProject={onUpdateProject} />,
    };
    
    const viewOrder = ['Timeline', 'Task List', 'Kanban Board', 'Workload', 'Milestones', 'Team', 'Resources'];

    return (
        <div className="tool-card">
            <div className="tracking-view-tabs">
                {viewOrder.map(viewName => (
                    <button
                        key={viewName}
                        onClick={() => handleViewChange(viewName)}
                        className={`button ${trackingView === viewName ? 'button-primary' : ''}`}
                    >
                        {viewName}
                    </button>
                ))}
            </div>
            <div>
                {views[trackingView]}
            </div>
        </div>
    );
};