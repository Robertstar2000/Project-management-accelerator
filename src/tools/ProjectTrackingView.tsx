import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';

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

const statusDescriptions = {
    todo: 'To Do: Task has not been started.',
    inprogress: 'In Progress: Task is actively being worked on.',
    review: 'In Review: Work is complete and awaiting approval.',
    done: 'Done: Task is fully complete and approved.',
};

const TaskListView = ({ tasks, onUpdateTask }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [dateErrors, setDateErrors] = useState({});
    const taskRefs = useRef({});

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => 
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [tasks, searchQuery]);
    
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
        if (!taskToUpdate) return;

        // Create a temporary object with the potential new value for validation
        const tempUpdatedTask = { ...taskToUpdate, [field]: value };
        let validationError = null;

        // Date validation logic
        if (field === 'endDate' && tempUpdatedTask.startDate && value) {
            if (new Date(value) < new Date(tempUpdatedTask.startDate)) {
                validationError = 'End date cannot be before start date.';
            }
        }
        if (field === 'startDate' && tempUpdatedTask.endDate && value) {
            if (new Date(value) > new Date(tempUpdatedTask.endDate)) {
                validationError = 'Start date cannot be after end date.';
            }
        }
        if (field === 'actualEndDate' && tempUpdatedTask.startDate && value) {
            if (new Date(value) < new Date(tempUpdatedTask.startDate)) {
                validationError = 'Actual end date cannot be before start date.';
            }
        }

        if (validationError) {
            setDateErrors(prev => ({
                ...prev,
                [taskId]: { ...prev[taskId], [field]: validationError }
            }));
            // Do not proceed with update
            return;
        }
        
        // Clear any previous error for this field if validation passes
        setDateErrors(prev => {
            const newErrorsForTask = { ...prev[taskId] };
            delete newErrorsForTask[field];
            return { ...prev, [taskId]: newErrorsForTask };
        });

        // If validation passes, proceed with the update
        let updatedTask = { ...taskToUpdate, [field]: value };
    
        // Auto-set actual end date when task is marked as done
        if (field === 'status' && value === 'done' && !updatedTask.actualEndDate) {
            updatedTask.actualEndDate = new Date().toISOString().split('T')[0];
        }
    
        // Handle empty values for numeric/date fields
        const isNumeric = ['actualTime', 'actualCost'].includes(field);
        if (isNumeric) {
            updatedTask[field] = value === '' ? null : Number(value);
        } else if (['actualEndDate', 'startDate', 'endDate'].includes(field)) {
            updatedTask[field] = value === '' ? null : value;
        }
    
        onUpdateTask(taskId, updatedTask);
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
                        <th>Subcontractor Task</th>
                        <th>Dependencies</th>
                        <th>Status</th>
                        <th>Planned Start Date</th>
                        <th>Planned Due Date</th>
                        <th>Actual Due Date</th>
                        <th>Actual Time (days)</th>
                        <th>Actual Cost ($)</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredTasks.map(task => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); // Normalize to start of day
                        const isOverdue = task.status !== 'done' && new Date(task.endDate) < today;

                        return (
                            <tr 
                                key={task.id} 
                                // FIX: The ref callback must not return a value. Encapsulating the assignment in curly braces ensures it returns undefined.
                                ref={el => { taskRefs.current[task.id] = el; }}
                                className={isOverdue ? 'task-row-overdue' : ''}
                                title={isOverdue ? `Overdue: Planned due date was ${task.endDate}` : ''}
                            >
                                <td>{task.name}</td>
                                <td>{task.isSubcontracted ? 'Yes' : 'No'}</td>
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
                                        type="date"
                                        value={task.startDate ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'startDate', e.target.value)}
                                        aria-label={`Planned start date for ${task.name}`}
                                    />
                                    {dateErrors[task.id]?.startDate && <div className="task-date-error">{dateErrors[task.id].startDate}</div>}
                                </td>
                                <td>
                                    <input
                                        type="date"
                                        value={task.endDate ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'endDate', e.target.value)}
                                        aria-label={`Planned due date for ${task.name}`}
                                    />
                                    {dateErrors[task.id]?.endDate && <div className="task-date-error">{dateErrors[task.id].endDate}</div>}
                                </td>
                                <td>
                                    <input
                                        type="date"
                                        value={task.actualEndDate ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'actualEndDate', e.target.value)}
                                        aria-label={`Actual due date for ${task.name}`}
                                    />
                                     {dateErrors[task.id]?.actualEndDate && <div className="task-date-error">{dateErrors[task.id].actualEndDate}</div>}
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
                        );
                    })}
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

                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isOverdue = task.status !== 'done' && new Date(task.endDate) < today;
                            const statusDesc = statusDescriptions[task.status] || 'Unknown Status';
                            let title = isBlocked 
                                ? 'This task is blocked by an incomplete dependency.' 
                                : `${task.name}\nStatus: ${statusDesc}${isOverdue ? '\nOVERDUE' : ''}`;
                            if (task.isSubcontracted) {
                                title += '\n(Subcontractor Task)';
                            }

                            return (
                                <div className="gantt-task-row" key={task.id} style={{gridTemplateColumns: `repeat(${totalDays}, 1fr)`}}>
                                    <div 
                                        // FIX: The ref callback must not return a value. Using a more robust callback that adds/removes the element from the map on mount/unmount.
                                        ref={el => { el ? taskBarRefs.current.set(task.id, el) : taskBarRefs.current.delete(task.id); }}
                                        className={`gantt-task-bar task-bar-${task.status} ${isBlocked ? 'blocked' : ''} ${isOverdue ? 'overdue' : ''} ${task.isSubcontracted ? 'subcontracted' : ''}`}
                                        style={{ gridColumn: `${startOffset} / span ${duration}` }}
                                        title={title}
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
                    {tasks.filter(t => t.status === statusKey).map(task => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); // Normalize to start of day
                        const isOverdue = task.status !== 'done' && new Date(task.endDate) < today;
                        const cardTitle = `${statusDescriptions[task.status]}${isOverdue ? '\nOVERDUE' : ''}${task.isSubcontracted ? '\n(Subcontractor Task)' : ''}`;

                        return (
                            <div className={`kanban-card ${task.status} ${isOverdue ? 'overdue' : ''}`} key={task.id} title={cardTitle}>
                                {task.isSubcontracted && <span className="subcontractor-label">SUB</span>}
                                <p>{task.name}</p>
                                {task.endDate && <small>Due: {new Date(task.endDate).toLocaleDateString()}</small>}
                            </div>
                        );
                    })}
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
        return localStorage.getItem(`hantt-tracking-view-${project.id}`) || 'Timeline';
    });

    const handleSetView = (newView) => {
        setView(newView);
        localStorage.setItem(`hantt-tracking-view-${project.id}`, newView);
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
