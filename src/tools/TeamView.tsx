

import React, { useState, useMemo, useEffect } from 'react';
import { Project, User } from '../types';
import { parseRolesFromMarkdown } from '../utils/be-logic';

interface TeamAssignmentsViewProps {
    project: Project;
    onUpdateTeam: (newTeam: any, newOwnerId?: string) => void;
    currentUser: User;
}

export const TeamAssignmentsView: React.FC<TeamAssignmentsViewProps> = ({ project, onUpdateTeam, currentUser }) => {
    const [teamAssignments, setTeamAssignments] = useState(project.team || []);

    const extractedRoles = useMemo(() => {
        const resourceDoc = project.documents.find(d => d.title === 'Resources & Skills List');
        if (!resourceDoc || !project.phasesData || !project.phasesData[resourceDoc.id]) return [];
        return parseRolesFromMarkdown(project.phasesData[resourceDoc.id].content);
    }, [project.documents, project.phasesData]);

    useEffect(() => {
        setTeamAssignments(project.team || []);
    }, [project.team]);

    const handleAssignmentChange = (role, field, value) => {
        const existingAssignmentIndex = teamAssignments.findIndex(a => a.role === role);
        let newAssignments = [...teamAssignments];
        if (existingAssignmentIndex > -1) {
            newAssignments[existingAssignmentIndex] = { ...newAssignments[existingAssignmentIndex], [field]: value };
        } else {
            newAssignments.push({ role, name: '', email: '', [field]: value, userId: `temp-${Date.now()}` });
        }
        const filteredAssignments = newAssignments.filter(a => (a.name && a.name.trim() !== '') || (a.email && a.email.trim() !== ''));
        setTeamAssignments(filteredAssignments);
        onUpdateTeam(filteredAssignments);
    };

    const handleTransferOwnership = (newOwnerId: string) => {
        if (!window.confirm("Are you sure you want to transfer ownership of this project? This action cannot be undone.")) return;
        
        const newTeam = project.team.map(member => {
            if (member.userId === newOwnerId) return { ...member, role: 'Project Owner' };
            if (member.userId === project.ownerId) return { ...member, role: 'Team Member' };
            return member;
        });

        onUpdateTeam(newTeam, newOwnerId);
    };

    if (extractedRoles.length === 0) {
        return (
             <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Team roles will be populated here once the 'Resources & Skills List' document is generated and approved.</p>
             </div>
        )
    }

    return (
        <div>
             <p style={{color: 'var(--secondary-text)', marginBottom: '1.5rem'}}>Assign team members to roles. The project owner has full permissions.</p>
            <table className="task-list-table">
                <thead><tr><th>Role</th><th>Assigned To (Name)</th><th>Email</th><th>Actions</th></tr></thead>
                <tbody>
                    {extractedRoles.map(role => {
                        const assignment = teamAssignments.find(a => a.role === role) || { name: '', email: '' };
                        const member = project.team.find(m => m.role === role);
                        return (
                            <tr key={role} style={{cursor: 'initial'}}>
                                <td><strong>{role}</strong></td>
                                <td>
                                    <input type="text" value={assignment.name} onChange={(e) => handleAssignmentChange(role, 'name', e.target.value)} />
                                </td>
                                <td>
                                    <input type="email" value={assignment.email} onChange={(e) => handleAssignmentChange(role, 'email', e.target.value)} />
                                </td>
                                <td>
                                    {currentUser.id === project.ownerId && member && member.userId !== project.ownerId && (
                                        <button className="button button-small" onClick={() => handleTransferOwnership(member.userId)}>Make Owner</button>
                                    )}
                                    {member?.userId === project.ownerId && <span style={{color: 'var(--accent-color)'}}>Project Owner</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
