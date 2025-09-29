import React, { useState } from 'react';

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
    // FIX: Use getTime() for explicit date subtraction to satisfy TypeScript's type checker.
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

const GanttChart = ({ tasks, sprints, projectStartDate, projectEndDate }) => {
    if (!tasks || !sprints) return <p>No task data available for Gantt chart.</p>;

    const totalDays = diffInDays(projectStartDate, projectEndDate) + 1;
    const dateArray = Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(projectStartDate);
        date.setDate(date.getDate() + i);
        return date;
    });

    return (
        <div className="gantt-container">
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
                            return (
                                <div className="gantt-task-row" key={task.id} style={{gridTemplateColumns: `repeat(${totalDays}, 1fr)`}}>
                                    <div 
                                        className={`gantt-task-bar task-bar-${task.status}`}
                                        style={{ gridColumn: `${startOffset} / span ${duration}` }}
                                    >
                                        {task.name}
                                    </div>
                                </div>
                            )
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};


export const ProjectTrackingView = ({ tasks, sprints, milestones, projectStartDate, projectEndDate }) => {
    const [view, setView] = useState('Timeline');

    const kanbanColumns = {
        todo: 'To Do',
        inprogress: 'In Progress',
        review: 'In Review',
        done: 'Done'
    };

    return (
        <div className="tool-card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                <h2 className="subsection-title" style={{marginBottom: 0}}>Project Tracking</h2>
                <p>Baseline v1 vs. Current v1 <span style={{color: 'var(--status-green)'}}>(+0% Drift)</span></p>
            </div>
            <div className="tracking-view-tabs">
                <button className={`button ${view === 'Timeline' ? 'button-primary' : ''}`} onClick={() => setView('Timeline')}>Timeline (Gantt)</button>
                <button className={`button ${view === 'Kanban' ? 'button-primary' : ''}`} onClick={() => setView('Kanban')}>Kanban</button>
                <button className={`button ${view === 'Milestones' ? 'button-primary' : ''}`} onClick={() => setView('Milestones')}>Milestones</button>
            </div>
            {view === 'Timeline' && (
                <GanttChart tasks={tasks} sprints={sprints} projectStartDate={projectStartDate} projectEndDate={projectEndDate} />
            )}
            {view === 'Kanban' && (
                <div className="kanban-board">
                    {Object.keys(kanbanColumns).map(statusKey => (
                        <div className="kanban-column" key={statusKey}>
                            <h4>{kanbanColumns[statusKey]}</h4>
                            {tasks && tasks.filter(t => t.status === statusKey).map(task => (
                                <div key={task.id} className={`kanban-card ${task.status}`}>{task.name}</div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
            {view === 'Milestones' && (
                <table className="milestones-table">
                    <thead>
                        <tr><th>Milestone</th><th>Date</th><th>Health</th><th>Dependency</th></tr>
                    </thead>
                    <tbody>
                        {milestones && milestones.map(m => (
                            <tr key={m.id}>
                                <td>{m.name}</td>
                                <td>{new Date(m.date).toLocaleDateString()}</td>
                                <td><span className={`chip ${getHealthChipClass(m.health)}`}>{m.health}</span></td>
                                <td>{tasks.find(t => t.id === m.dependency)?.name || 'N/A'}</td>
                            </tr>
                        ))}
                         {(!milestones || milestones.length === 0) && (
                            <tr><td colSpan={4} style={{textAlign: 'center'}}>No milestones defined for this project.</td></tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};