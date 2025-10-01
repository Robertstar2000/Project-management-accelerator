import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';

const getHealthChipClass = (health) => {
    switch (health) {
        case 'On Track': return 'chip-green';
        case 'At Risk': return 'chip-amber';
        case 'Delayed': return 'chip-red';
        default: return '';
    }
};

const diffInDays = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

const TaskListView = ({ tasks, onUpdateTask }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const taskRefs = useRef({});

    const filteredTasks = tasks.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    useEffect(() => {
        // Scroll to the first incomplete task
        const firstIncompleteTask = tasks.find(t => t.status !== 'done');
        if (firstIncompleteTask) {
            const element = taskRefs.current[firstIncompleteTask.id];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [tasks]);


    if (!tasks || tasks.length === 0) {
        return <p>Tasks will be populated here once the 'Detailed Plans (WBS/WRS)' and 'Project Timeline' documents are approved.</p>;
    }

    const handleFieldChange = (taskId, field, value) => {
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (taskToUpdate) {
            const isNumeric = ['actualTime', 'actualCost'].includes(field);
            onUpdateTask(taskId, { ...taskToUpdate, [field]: isNumeric ? (value === '' ? null : Number(value)) : value });
        }
    };

    return (
        <div>
            <div className="form-group" style={{ maxWidth: '400px', marginBottom: '1rem' }}>
                <input
                    type="text"
                    placeholder="Search for a task..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search tasks"
                />
            </div>
            <table className="task-list-table">
                <thead>
                    <tr>
                        <th>Task Name</th>
                        <th>Dependencies</th>
                        <th>Status</th>
                        <th>Actual Time (days)</th>
                        <th>Actual Cost ($)</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredTasks.map(task => (
                        <tr key={task.id} ref={el => taskRefs.current[task.id] = el}>
                            <td>{task.name}</td>
                            <td>
                                <select
                                    multiple
                                    value={task.dependsOn || []}
                                    onChange={(e) => {
                                        const selectedIds = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                                        handleFieldChange(task.id, 'dependsOn', selectedIds);
                                    }}
                                    className="dependency-select"
                                    aria-label={`Dependencies for ${task.name}`}
                                >
                                    {tasks.filter(t => t.id !== task.id).map(depTask => (
                                        <option key={depTask.id} value={depTask.id}>
                                            {depTask.name}
                                        </option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <select 
                                    value={task.status} 
                                    onChange={(e) => handleFieldChange(task.id, 'status', e.target.value)}
                                    aria-label={`Status for ${task.name}`}
                                >
                                    <option value="todo">To Do</option>
                                    <option value="inprogress">In Progress</option>
                                    <option value="review">In Review</option>
                                    <option value="done">Done</option>
                                </select>
                            </td>
                            <td>
                                <input 
                                    type="number" 
                                    value={task.actualTime ?? ''}
                                    onChange={(e) => handleFieldChange(task.id, 'actualTime', e.target.value)}
                                    placeholder="e.g. 5"
                                    style={{maxWidth: '100px'}}
                                    aria-label={`Actual time for ${task.name}`}
                                />
                            </td>
                            <td>
                                <input 
                                    type="number" 
                                    value={task.actualCost ?? ''}
                                    onChange={(e) => handleFieldChange(task.id, 'actualCost', e.target.value)}
                                    placeholder="e.g. 1500"
                                    style={{maxWidth: '120px'}}
                                    aria-label={`Actual cost for ${task.name}`}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const GanttChart = ({ tasks, sprints, projectStartDate, projectEndDate }) => {
    if (!tasks || !sprints || tasks.length === 0) return <p>Timeline will be populated here once tasks are generated and approved.</p>;

    const containerRef = useRef<HTMLDivElement>(null);
    const taskBarRefs = useRef(new Map());
    const [dependencyLines, setDependencyLines] = useState([]);
    
    const totalDays = Math.max(1, diffInDays(projectStartDate, projectEndDate) + 1);
    const dateArray = Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(projectStartDate);
        date.setDate(date.getDate() + i);
        return date;
    });

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const lines = [];

        tasks.forEach(task => {
            if (task.dependsOn?.length) {
                const currentTaskEl = taskBarRefs.current.get(task.id);
                if (!currentTaskEl) return;
                
                const currRect = currentTaskEl.getBoundingClientRect();

                task.dependsOn.forEach(depId => {
                    const prerequisiteTaskEl = taskBarRefs.current.get(depId);
                    if (!prerequisiteTaskEl) return;

                    const preRect = prerequisiteTaskEl.getBoundingClientRect();
                    
                    const startX = preRect.right - containerRect.left + containerRef.current.scrollLeft;
                    const startY = preRect.top + preRect.height / 2 - containerRect.top;
                    const endX = currRect.left - containerRect.left + containerRef.current.scrollLeft;
                    const endY = currRect.top + currRect.height / 2 - containerRect.top;

                    const midX = endX - 10;
                    const path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;

                    lines.push({ id: `${depId}-${task.id}`, path });
                });
            }
        });
        setDependencyLines(lines);
    }, [tasks, projectStartDate, projectEndDate]);

    return (
        <div className="gantt-container" ref={containerRef}>
            <div className="gantt-grid" style={{ gridTemplateColumns: `150px repeat(${totalDays}, 1fr)`}}>
                <div style={{gridColumn: '1 / 2'}}></div> {/* Spacer */}
                <div className="gantt-header" style={{gridTemplateColumns: `repeat(${totalDays}, 1fr)`}}>
                    {dateArray.map(date => (
                        <div key={date.toISOString()} className="gantt-date" title={date.toLocaleDateString()}>
                            {date.getDate() === 1 ? date.toLocaleString('default', { month: 'short' }) : date.getDate()}
                        </div>
                    ))}
                </div>
                
                {sprints.map(sprint => (
                    <React.Fragment key={sprint.id}>
                        <div className="gantt-sprint-label">{sprint.name}</div>
                        {tasks.filter(t => t.sprintId === sprint.id).map(task => {
                            const startOffset = diffInDays(projectStartDate, task.startDate) + 1;
                            const duration = diffInDays(task.startDate, task.endDate) + 1;
                            const isBlocked = task.dependsOn?.some(depId => {
                                const prereq = tasks.find(t => t.id === depId);
                                return prereq && prereq.status !== 'done';
                            });

                            return (
                                <div className="gantt-task-row" key={task.id} style={{gridTemplateColumns: `repeat(${totalDays}, 1fr)`}}>
                                    <div 
                                        ref={el => taskBarRefs.current.set(task.id, el)}
                                        className={`gantt-task-bar task-bar-${task.status} ${isBlocked ? 'blocked' : ''}`}
                                        style={{ gridColumn: `${startOffset} / span ${duration}` }}
                                        title={isBlocked ? 'This task is blocked by an incomplete dependency.' : task.name}
                                    >
                                        {task.name}
                                    </div>
                                </div>
                            )
                        })}
                    </React.Fragment>
                ))}
            </div>
             <svg className="gantt-dependency-svg">
                <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" className="gantt-dependency-arrow" />
                    </marker>
                </defs>
                {dependencyLines.map(line => (
                    <path key={line.id} d={line.path} className="gantt-dependency-line" markerEnd="url(#arrow)" />
                ))}
            </svg>
        </div>
    );
};

const KanbanView = ({ tasks }) => {
    if (!tasks || tasks.length === 0) {
        return <p>Kanban board will be populated here once tasks are generated and approved.</p>;
    }
    const columns = {
        todo: 'To Do',
        inprogress: 'In Progress',
        review: 'In Review',
        done: 'Done',
    };
    return (
        <div className="kanban-board">
            {Object.entries(columns).map(([statusKey, statusName]) => (
                <div className="kanban-column" key={statusKey}>
                    <h4>{statusName}</h4>
                    {tasks.filter(t => t.status === statusKey).map(task => (
                        <div className={`kanban-card ${task.status}`} key={task.id}>
                            {task.name}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

const MilestonesView = ({ milestones }) => {
    if (!milestones || milestones.length === 0) {
        return <p>Milestones will be populated here once the 'Project Timeline' document is approved.</p>;
    }
    return (
        <table className="milestones-table">
            <thead><tr><th>Milestone</th><th>Due Date</th><th>Health</th><th>Dependency</th></tr></thead>
            <tbody>
                {milestones.map(m => (
                    <tr key={m.id}>
                        <td>{m.name}</td>
                        <td>{new Date(m.date).toLocaleDateString()}</td>
                        <td><span className={`chip ${getHealthChipClass(m.health)}`}>{m.health}</span></td>
                        <td>{m.dependency || 'N/A'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export const ProjectTrackingView = ({ project, tasks, sprints, milestones, projectStartDate, projectEndDate, onUpdateTask }) => {
    const [view, setView] = useState(() => {
        return localStorage.getItem(`hmap-tracking-view-${project.id}`) || 'Timeline';
    });

    const handleSetView = (newView) => {
        setView(newView);
        localStorage.setItem(`hmap-tracking-view-${project.id}`, newView);
    };

    const renderView = () => {
        switch (view) {
            case 'Timeline':
                return <GanttChart tasks={tasks} sprints={sprints} projectStartDate={projectStartDate} projectEndDate={projectEndDate} />;
            case 'Task List':
                return <TaskListView tasks={tasks} onUpdateTask={onUpdateTask} />;
            case 'Kanban':
                return <KanbanView tasks={tasks} />;
            case 'Milestones':
                return <MilestonesView milestones={milestones} />;
            default:
                return <GanttChart tasks={tasks} sprints={sprints} projectStartDate={projectStartDate} projectEndDate={projectEndDate} />;
        }
    };

    return (
        <div className="tool-card">
            <h2 className="subsection-title">Project Tracking</h2>
            <div className="tracking-view-tabs">
                <button onClick={() => handleSetView('Timeline')} className={view === 'Timeline' ? 'button button-primary' : 'button'}>Timeline</button>
                <button onClick={() => handleSetView('Task List')} className={view === 'Task List' ? 'button button-primary' : 'button'}>Task List</button>
                <button onClick={() => handleSetView('Kanban')} className={view === 'Kanban' ? 'button button-primary' : 'button'}>Kanban Board</button>
                <button onClick={() => handleSetView('Milestones')} className={view === 'Milestones' ? 'button button-primary' : 'button'}>Milestones</button>
            </div>
            {renderView()}
        </div>
    );
};
