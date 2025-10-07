import React, { useState, useMemo, useEffect } from 'react';

const parseRolesFromMarkdown = (markdownText: string): string[] => {
    if (!markdownText) return [];
    const lines = markdownText.split('\n');
    const roles = new Set<string>();
    let inRolesSection = false;

    // --- First Pass: Find a specific section heading for roles ---
    // This is more robust and looks for common variations of role/personnel headings.
    const roleSectionRegex = /^#+\s*(team|required|project)?\s*(roles|personnel|team members)/i;

    for (const line of lines) {
        // If we find a heading that matches, start capturing roles.
        if (roleSectionRegex.test(line)) {
            inRolesSection = true;
            continue;
        }

        // If we were in a roles section and hit another heading, stop.
        if (inRolesSection && line.match(/^#+\s*/)) {
            inRolesSection = false;
            break; // Stop looking, we've found and parsed our section.
        }

        // If we are in the roles section, extract list items.
        if (inRolesSection && line.match(/^[-*]\s+/)) {
            // Improved extraction to handle markdown (like bolding) and extra text.
            const roleName = line
                .replace(/^[-*]\s+/, '') // Remove bullet point
                .replace(/\*\*/g, '')      // Remove bolding asterisks
                .split(/[:(]/)[0]         // Split at ':' or '(' to isolate the role name
                .trim();
            if (roleName) roles.add(roleName);
        }
    }

    // If the first pass found roles under a specific heading, return them.
    if (roles.size > 0) {
        return Array.from(roles);
    }

    // --- Second Pass (Fallback): Find the first bulleted list as a last resort ---
    // This is kept for backward compatibility if the AI omits a clear heading.
    let foundAnyList = false;
    for (const line of lines) {
        if (line.match(/^[-*]\s+/)) {
            foundAnyList = true; // We've entered a list
            const roleName = line
                .replace(/^[-*]\s+/, '')
                .replace(/\*\*/g, '')
                .split(/[:(]/)[0]
                .trim();
            if (roleName) roles.add(roleName);
        } else if (foundAnyList && line.trim() === '') {
            // If we've found a list and then a blank line, assume that list is over and stop.
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