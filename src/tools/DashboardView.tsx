


import React from 'react';

const diffInDays = (date1, date2) => {
    if (!date1 || !date2) return 0;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    // Add 1 to be inclusive of start and end dates for duration calculation
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const currencyFormat = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num || 0);

export const DashboardView = ({ 
    project, phasesData, isPlanningComplete, projectPhases, 
    onAnalyzeRisks, onGenerateSummary, isGeneratingReport 
}) => {
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

    const { tasks = [], documents = [], milestones = [], resources = [], avgBurdenedLaborRate = 0, budget = 0 } = project;

    // --- METRIC CALCULATIONS ---

    // Alerts & Risk
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

    // Phase & Milestone Tracking
    const completedPhases = Object.values(phasesData).filter((p: any) => p.status === 'completed').length;
    const inProgressPhase = projectPhases.find((p, i) => {
        const isComplete = phasesData[p.id]?.status === 'completed';
        const isPrevComplete = i === 0 || phasesData[projectPhases[i - 1].id]?.status === 'completed';
        return !isComplete && isPrevComplete;
    });
    const nextMilestone = milestones
        .filter(m => m.status !== 'Completed')
        .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime())[0];

    // Financial Calculations
    const totalEstimatedLaborCost = tasks.reduce((sum, task) => {
        const duration = diffInDays(task.startDate, task.endDate);
        return sum + (duration * 8 * (avgBurdenedLaborRate || 0));
    }, 0);

    const actualLaborCostToDate = tasks.reduce((sum, task) => {
        if (task.status === 'done' || task.actualTime) {
            const duration = task.actualTime || diffInDays(task.startDate, task.endDate);
            return sum + (duration * 8 * (avgBurdenedLaborRate || 0));
        }
        return sum;
    }, 0);

    const totalEstimatedResourceCost = resources.reduce((sum, r) => sum + (r.estimate || 0), 0);
    const actualResourceCostToDate = resources.reduce((sum, r) => sum + (r.actual || 0), 0);

    const estimateAtCompletion = totalEstimatedLaborCost + totalEstimatedResourceCost;
    const costToDate = actualLaborCostToDate + actualResourceCostToDate;

    const costVariance = budget - estimateAtCompletion;
    const costVarianceClass = costVariance >= 0 ? 'green' : 'red';


    return (
        <div className="tool-grid" style={{ gridTemplateColumns: '3fr 1fr', alignItems: 'start' }}>
            <div className="tool-grid">
                <div className="tool-card">
                    <h3 className="subsection-title">Project Metrics</h3>
                    <div className="kpi-grid">
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
                    <h3 className="subsection-title">Financial Summary</h3>
                     <div className="financial-summary-grid">
                        <div className="financial-item" title="The total planned budget for the project.">
                            <span>Budget</span>
                            <span className="value">{currencyFormat(budget)}</span>
                        </div>
                        <div className="financial-item" title="Estimate at Completion (EAC): The current projected total cost for the project.">
                            <span>EAC</span>
                            <span className="value">{currencyFormat(estimateAtCompletion)}</span>
                        </div>
                        <div className="financial-item" title="Cost Variance: The difference between Budget and EAC. Negative means over budget.">
                            <span>Cost Variance</span>
                            <span className={`value ${costVarianceClass}`}>{currencyFormat(costVariance)}</span>
                        </div>
                        <div className="financial-item" title="Cost to Date: The total actual costs incurred so far.">
                            <span>Cost to Date</span>
                            <span className="value">{currencyFormat(costToDate)}</span>
                        </div>
                        <hr />
                        <div className="financial-item" title="Total estimated labor cost based on task durations and average burdened rate.">
                            <span>Est. Labor Cost</span>
                            <span className="value">{currencyFormat(totalEstimatedLaborCost)}</span>
                        </div>
                        <div className="financial-item" title="Total estimated non-labor resource costs.">
                            <span>Est. Resource Cost</span>
                            <span className="value">{currencyFormat(totalEstimatedResourceCost)}</span>
                        </div>
                    </div>
                </div>

                <div className="tool-card">
                    <h3 className="subsection-title">Quick Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                         <button className="button button-small" onClick={onAnalyzeRisks} disabled={!!isGeneratingReport}>
                            {isGeneratingReport === 'risk' ? 'Analyzing...' : 'Analyze Project Risks'}
                         </button>
                         <button className="button button-small" onClick={onGenerateSummary} disabled={!!isGeneratingReport}>
                            {isGeneratingReport === 'summary' ? 'Generating...' : 'Generate Project Summary'}
                         </button>
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