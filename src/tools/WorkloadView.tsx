

import React, { useMemo } from 'react';
import { Project } from '../types';
import { parseRolesFromMarkdown } from '../utils/be-logic';

// Helper to get the start of a week (Sunday)
const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Normalize time
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
};

// Helper to get week ranges for the project duration
const getProjectWeeks = (startDateStr: string, endDateStr: string): Date[] => {
    const weeks: Date[] = [];
    if (!startDateStr || !endDateStr) return weeks;

    let current = getStartOfWeek(new Date(startDateStr));
    const end = new Date(endDateStr);

    while (current <= end) {
        weeks.push(new Date(current));
        current.setDate(current.getDate() + 7);
    }
    return weeks;
};

const getWorkloadColor = (days: number): string => {
    if (days > 4) return 'var(--status-red)'; // Heavy workload
    if (days >= 3) return 'var(--status-amber)'; // Medium workload
    if (days > 0) return 'var(--status-green)'; // Light workload
    return 'transparent'; // No work
};

interface WorkloadViewProps {
    project: Project;
}

export const WorkloadView: React.FC<WorkloadViewProps> = ({ project }) => {
    const { team, tasks, startDate, endDate, documents, phasesData } = project;
    
    const extractedRoles = useMemo(() => {
        const resourceDoc = documents.find(d => d.title === 'Resources & Skills List');
        if (!resourceDoc || !phasesData || !phasesData[resourceDoc.id]?.content) return [];
        return parseRolesFromMarkdown(phasesData[resourceDoc.id].content);
    }, [documents, phasesData]);

    if (!tasks || tasks.length === 0) {
        return <p>Workload view will be available once tasks are generated.</p>;
    }

    if (extractedRoles.length === 0) {
        return <p>Workload view requires roles to be defined in the 'Resources & Skills List' document.</p>;
    }

    const projectWeeks = getProjectWeeks(startDate, endDate);
    
    const workloadData = extractedRoles.map(role => {
        const member = team.find(m => m.role === role);
        const roleTasks = tasks.filter(task => task.role === role);
        
        const weeklyWorkload = projectWeeks.map(weekStart => {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            let totalDaysInWeek = 0;
            const tasksInWeek = [];
            
            roleTasks.forEach(task => {
                const taskStart = new Date(task.startDate);
                const taskEnd = new Date(task.endDate);
                taskStart.setHours(0, 0, 0, 0);
                taskEnd.setHours(0, 0, 0, 0);

                // Check for overlap between task and week
                if (taskStart <= weekEnd && taskEnd >= weekStart) {
                    tasksInWeek.push(task);
                    
                    // Calculate days of this task within this week
                    const overlapStart = new Date(Math.max(taskStart.getTime(), weekStart.getTime()));
                    const overlapEnd = new Date(Math.min(taskEnd.getTime(), weekEnd.getTime()));
                    
                    const durationInMillis = overlapEnd.getTime() - overlapStart.getTime();
                    const days = Math.round(durationInMillis / (1000 * 60 * 60 * 24)) + 1;
                    totalDaysInWeek += days;
                }
            });
            
            return { tasks: tasksInWeek, totalDays: totalDaysInWeek };
        });
        
        return {
            role,
            member,
            weeklyWorkload,
        };
    });

    return (
        <div style={{ overflowX: 'auto' }}>
            <p style={{color: 'var(--secondary-text)', marginBottom: '1.5rem'}}>
                View task distribution across project roles by week. Each cell shows the total days of work assigned. Colors indicate workload intensity (Green: light, Amber: medium, Red: heavy).
            </p>
            <table className="task-list-table workload-table">
                <thead>
                    <tr>
                        <th style={{ minWidth: '250px', position: 'sticky', left: 0, background: 'var(--card-background)', zIndex: 1 }}>Role (Team Member)</th>
                        {projectWeeks.map(week => (
                            <th key={week.toISOString()} style={{ minWidth: '120px', textAlign: 'center' }}>
                                Week of {week.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {workloadData.map(({ role, member, weeklyWorkload }) => (
                        <tr key={role} style={{cursor: 'initial'}}>
                            <td style={{ position: 'sticky', left: 0, background: 'var(--card-background)', zIndex: 1, fontWeight: 'bold' }}>
                                {role} ({member?.name || 'Unassigned'})
                            </td>
                            {weeklyWorkload.map((weekData, index) => {
                                const title = weekData.tasks.length > 0
                                    ? weekData.tasks.map(t => `- ${t.name} (${new Date(t.startDate).toLocaleDateString()} - ${new Date(t.endDate).toLocaleDateString()})`).join('\n')
                                    : 'No tasks assigned this week';
                                return (
                                    <td 
                                        key={index}
                                        title={title}
                                        style={{
                                            textAlign: 'center',
                                            backgroundColor: getWorkloadColor(weekData.totalDays),
                                            color: weekData.totalDays > 0 ? 'var(--background-color)' : 'inherit',
                                            fontWeight: 'bold',
                                            fontSize: '1.1rem'
                                        }}
                                    >
                                        {weekData.totalDays > 0 ? `${weekData.totalDays}d` : '-'}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <style>{`
                .workload-table th, .workload-table td {
                    border: 1px solid var(--border-color);
                }
                .workload-table td[title]:hover {
                    cursor: help;
                }
            `}</style>
        </div>
    );
};
