import React from 'react';
import { PHASES } from '../constants/projectData';

export const DashboardView = ({ project, phasesData }) => {
    // FIX: Explicitly type 'p' as 'any' to resolve 'unknown' type from Object.values(), allowing property access.
    const completedPhases = Object.values(phasesData).filter((p: any) => p.status === 'completed').length;
    const inProgressPhase = PHASES.find((p, i) => {
        const isComplete = phasesData[p.id]?.status === 'completed';
        const isPrevComplete = i === 0 || phasesData[PHASES[i - 1].id]?.status === 'completed';
        return !isComplete && isPrevComplete;
    });

    const nextMilestone = project.milestones?.find(m => new Date(m.date) >= new Date());

    return (
        <div className="tool-grid" style={{ gridTemplateColumns: '3fr 1fr', alignItems: 'start' }}>
            <div className="tool-grid">
                <div className="tool-card">
                    <h3 className="subsection-title">Key Performance Indicators</h3>
                    <div className="kpi-grid">
                        <div className="kpi-card"><h4>Budget</h4><p className="value green">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.budget || 0)}</p></div>
                        <div className="kpi-card"><h4>End Date</h4><p className="value" style={{ fontSize: '1.5rem' }}>{project.endDate}</p></div>
                        <div className="kpi-card"><h4>Scope Changes</h4><p className="value amber">2 Open</p></div>
                        <div className="kpi-card"><h4>Risk Exposure</h4><p className="value red">High</p></div>
                        <div className="kpi-card"><h4>Next Milestone</h4><p className="value" style={{ fontSize: '1.5rem' }}>{nextMilestone ? new Date(nextMilestone.date).toLocaleDateString() : 'N/A'}</p></div>
                    </div>
                </div>
                <div className="tool-card">
                    <h3 className="subsection-title">Phase Tracker</h3>
                    <div className="phase-tracker">
                        {PHASES.map((phase, i) => (
                            <div 
                                key={phase.id} 
                                className={`phase-tracker-segment ${phasesData[phase.id]?.status === 'completed' ? 'completed' : phase.id === inProgressPhase?.id ? 'inprogress' : ''}`}
                                title={phase.title}
                            />
                        ))}
                    </div>
                </div>
                <div className="tool-card">
                    <h3 className="subsection-title">Workstreams</h3>
                    {project.sprints?.map(sprint => (
                        <div className="swimlane" key={sprint.id}>
                            <h4>{sprint.name}</h4>
                            <div className="swimlane-content">
                                {project.tasks?.filter(t => t.sprintId === sprint.id).map(task => (
                                    <div className="task-card" key={task.id}>{task.name}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="tool-grid">
                <div className="tool-card">
                    <h3 className="subsection-title">Alerts</h3>
                    <ul>
                        <li>2 Overdue tasks</li>
                        <li>1 Blocked item</li>
                        <li>3 Pending approvals</li>
                    </ul>
                </div>
                <div className="tool-card">
                    <h3 className="subsection-title">Quick Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button className="button button-small">Log Risk</button>
                        <button className="button button-small">Add Task</button>
                        <button className="button button-small">Upload Doc</button>
                        <button className="button button-small">Raise Change</button>
                    </div>
                </div>
            </div>
        </div>
    )
};