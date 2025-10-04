import React, { useState, useMemo, useEffect } from 'react';

const parseRolesFromMarkdown = (markdownText) => {
    if (!markdownText) return [];
    const lines = markdownText.split('\n');
    const roles = new Set<string>();
    let inRolesSection = false;
    let foundAnyList = false;

    // First pass: look for a specific "Roles" section
    for (const line of lines) {
        if (line.match(/^#+\s*Roles/i)) {
            inRolesSection = true;
            continue;
        }
        if (line.match(/^#+\s*/) && inRolesSection) {
            inRolesSection = false; // We've hit the next section
            break;
        }
        if (inRolesSection && line.match(/^[-*]\s+/)) {
            const roleName = line.replace(/^[-*]\s+/, '').split(/[:(]/)[0].trim();
            if (roleName) roles.add(roleName);
        }
    }
    
    // If we found a specific section and it has roles, we're done.
    if (roles.size > 0) return Array.from(roles);

    // Second pass (fallback): grab the first bulleted list we find.
    for (const line of lines) {
        if (line.match(/^[-*]\s+/)) {
            foundAnyList = true;
            const roleName = line.replace(/^[-*]\s+/, '').split(/[:(]/)[0].trim();
            if (roleName) roles.add(roleName);
        } else if (foundAnyList && line.trim() === '') {
            // If we've found a list and then a blank line, assume that list is over.
            break;
        }
    }

    return Array.from(roles);
};


export const TeamView = ({ project, onUpdateTeam }) => {
    const [teamAssignments, setTeamAssignments] = useState(project.team || []);

    const extractedRoles = useMemo(() => {
        const resourceDoc = project.documents.find(d => d.title === 'Resources & Skills List');
        if (!resourceDoc || !project.phasesData || !project.phasesData[resourceDoc.id]) {
            return [];
        }
        const content = project.phasesData[resourceDoc.id].content;
        return parseRolesFromMarkdown(content);
    }, [project.documents, project.phasesData]);

    useEffect(() => {
        // Sync state if project prop changes
        setTeamAssignments(project.team || []);
    }, [project.team]);

    const handleAssignmentChange = (role, field, value) => {
        const existingAssignmentIndex = teamAssignments.findIndex(a => a.role === role);
        let newAssignments = [...teamAssignments];

        if (existingAssignmentIndex > -1) {
            newAssignments[existingAssignmentIndex] = { ...newAssignments[existingAssignmentIndex], [field]: value };
        } else {
            newAssignments.push({ role, name: '', email: '', [field]: value });
        }
        
        // Create a new array, filtering out any assignments that are now completely empty
        const filteredAssignments = newAssignments.filter(a => (a.name && a.name.trim() !== '') || (a.email && a.email.trim() !== ''));
        
        setTeamAssignments(filteredAssignments);
        onUpdateTeam(filteredAssignments);
    };
    
    if (extractedRoles.length === 0) {
        return (
             <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Team roles will be populated here once the 'Resources & Skills List' document is generated and approved.</p>
                <p style={{color: 'var(--secondary-text)', fontSize: '0.9rem'}}>Please complete Phase 2 in the "Project Phases" tab.</p>
            </div>
        )
    }

    return (
        <div>
             <p style={{color: 'var(--secondary-text)', marginBottom: '1.5rem'}}>Assign team members to the roles defined in your project's "Resources & Skills List" document.</p>
            <table className="task-list-table">
                <thead>
                    <tr>
                        <th>Role</th>
                        <th>Assigned To (Name)</th>
                        <th>Email Address</th>
                    </tr>
                </thead>
                <tbody>
                    {extractedRoles.map(role => {
                        const assignment = teamAssignments.find(a => a.role === role) || { name: '', email: '' };
                        return (
                            <tr key={role}>
                                <td><strong>{role}</strong></td>
                                <td>
                                    <input
                                        type="text"
                                        placeholder="Enter name..."
                                        value={assignment.name}
                                        onChange={(e) => handleAssignmentChange(role, 'name', e.target.value)}
                                        aria-label={`Name for role ${role}`}
                                        style={{ width: '100%', background: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--primary-text)', padding: '0.75rem' }}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="email"
                                        placeholder="Enter email..."
                                        value={assignment.email}
                                        onChange={(e) => handleAssignmentChange(role, 'email', e.target.value)}
                                        aria-label={`Email for role ${role}`}
                                        style={{ width: '100%', background: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--primary-text)', padding: '0.75rem' }}
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
