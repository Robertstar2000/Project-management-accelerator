
import React, { useMemo } from 'react';
import { Project, User, Task } from '../types';

interface MyWorkViewProps {
    projects: Project[];
    currentUser: User;
    onSelectTask: (project: Project, task: Task) => void;
}

interface AssignedTask extends Task {
    projectName: string;
    projectId: string;
}

export const MyWorkView: React.FC<MyWorkViewProps> = ({ projects, currentUser, onSelectTask }) => {
    const myTasks = useMemo<AssignedTask[]>(() => {
        if (!projects || !currentUser) return [];

        const allAssignedTasks: AssignedTask[] = [];

        projects.forEach(project => {
            const userInProject = project.team?.find(member => member.userId === currentUser.id);
            if (userInProject) {
                const userRoles = project.team
                    .filter(member => member.userId === currentUser.id)
                    .map(member => member.role);
                
                if (userRoles.length > 0) {
                    const tasksForUser = project.tasks?.filter(task => 
                        task.status !== 'done' && task.role && userRoles.includes(task.role)
                    );

                    if (tasksForUser) {
                        tasksForUser.forEach(task => {
                            allAssignedTasks.push({
                                ...task,
                                projectName: project.name,
                                projectId: project.id,
                            });
                        });
                    }
                }
            }
        });

        return allAssignedTasks.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    }, [projects, currentUser]);

    const handleTaskClick = (task: AssignedTask) => {
        const project = projects.find(p => p.id === task.projectId);
        if (project) {
            onSelectTask(project, task);
        }
    };

    if (myTasks.length === 0) {
        return null;
    }

    return (
        <section className="tool-card">
            <h2 className="subsection-title">My Work</h2>
            <p style={{ color: 'var(--secondary-text)', marginTop: '-1rem', marginBottom: '1.5rem' }}>
                All tasks assigned to you across all projects, sorted by due date.
            </p>
            <table className="task-list-table">
                <thead>
                    <tr>
                        <th>Task Name</th>
                        <th>Project</th>
                        <th>Status</th>
                        <th>Due Date</th>
                    </tr>
                </thead>
                <tbody>
                    {myTasks.map(task => {
                         const isOverdue = new Date(task.endDate) < new Date();
                         return (
                            <tr key={task.id} onClick={() => handleTaskClick(task)} className={isOverdue ? 'task-row-overdue' : ''} style={{cursor: 'pointer'}}>
                                <td>{task.name}</td>
                                <td>{task.projectName}</td>
                                <td>{task.status}</td>
                                <td>{task.endDate}</td>
                            </tr>
                         );
                    })}
                </tbody>
            </table>
        </section>
    );
};