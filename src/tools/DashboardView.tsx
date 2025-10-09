
import React from 'react';

export const DashboardView = ({ project, phasesData, isPlanningComplete, projectPhases }) => {
    if (!isPlanningComplete) {
        return (
            <div className="tool-card" style={{ textAlign: 'center', padding: '4rem' }}>
                <h3 className="subsection-title">Dashboard Locked</h3>
                <p style={{ color: 'var(--secondary-text)', maxWidth: '600px', margin: '0 auto' }}>
                    Dashboard metrics will become available once all planning phases are complete and all required documents have been moved to "Approved" status in the Documents tab.
                </p>
            </div>
        );
    }

    const { tasks = [], documents = [], milestones = [] } = project;

    // Calculate dynamic metrics
    const overdueTasks = tasks.filter(t => t.status !== 'done' && new Date(t.endDate) < new Date()).length;
    
    const blockedTasks = tasks.filter(task => 
        task.status !== 'done' && 
        task.dependsOn?.some(depId => {
            const prereq = tasks.find(t => t.id === depId);
            return prereq && prereq.status !== 'done';
        })
    ).length;

    const pendingApprovals = documents.filter(d => ['Working', 'Rejected'].includes(d.status)).length;
    
    const openScopeChanges = documents.filter(d => d.title.toLowerCase().includes('change request') && d.status !== 'Approved').length;
    
    let riskExposure = 'Low';
    if (overdueTasks > 5) riskExposure = 'High';
    else if (overdueTasks > 0) riskExposure = 'Medium';
    
    const riskExposureClass = riskExposure === 'High' ? 'red' : riskExposure === 'Medium' ? 'amber' : 'green';

    // FIX: Explicitly type 'p' as 'any' to resolve 'unknown' type from Object.values(), allowing property access.
    const completedPhases = Object.values(phasesData).filter((p: any) => p.status === 'completed').length;
    const inProgressPhase = projectPhases.find((p, i) => {
        const isComplete = phasesData[p.id]?.status === 'completed';
        const isPrevComplete = i === 0 || phasesData[projectPhases[i - 1].id]?.status === 'completed';
        return !isComplete && isPrevComplete;
    });

    const nextMilestone = milestones
        .filter(m => m.status !== 'Completed')
        .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime())[0];


    return (
        <div className="tool-grid" style={{ gridTemplateColumns: '3fr 1fr', alignItems: 'start' }}>
            <div className="tool-grid">
                <div className="tool-card">
                    <h3 className="subsection-title">Project Metrics</h3>
                    <div className="kpi-grid">
                        <div className="kpi-card"><h4>Budget</h4><p className="value green">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.budget || 0)}</p></div>
                        <div className="kpi-card"><h4>End Date</h4><p className="value" style={{ fontSize: '1.5rem' }}>{project.endDate}</p></div>
                        <div className="kpi-card"><h4>Scope Changes</h4><p className={`value ${openScopeChanges > 0 ? 'amber' : ''}`}>{openScopeChanges} Open</p></div>
                        <div className="kpi-card"><h4>Risk Exposure</h4><p className={`value ${riskExposureClass}`}>{riskExposure}</p></div>
                        <div className="kpi-card">
                            <h4>Next Milestone</h4>
                            <p className="value" style={{ fontSize: nextMilestone?.name.length > 15 ? '1.2rem' : '1.5rem' }}>
                                {nextMilestone ? `${nextMilestone.name} (${new Date(nextMilestone.plannedDate).toLocaleDateString()})` : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="tool-card">
                    <h3 className="subsection-title">Phase Tracker</h3>
                    <div className="phase-tracker">
                        {projectPhases.map((phase, i) => (
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
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <li style={{ color: overdueTasks > 0 ? 'var(--status-red)' : 'inherit' }}>{overdueTasks} Overdue tasks</li>
                        <li style={{ color: blockedTasks > 0 ? 'var(--status-amber)' : 'inherit' }}>{blockedTasks} Blocked item(s)</li>
                        <li style={{ color: pendingApprovals > 0 ? 'var(--status-amber)' : 'inherit' }}>{pendingApprovals} Pending approvals</li>
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
