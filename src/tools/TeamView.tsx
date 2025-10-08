import React, { useState, useMemo, useEffect } from 'react';

const parseRolesFromMarkdown = (markdownText: string): string[] => {
    if (!markdownText) return [];

    const lines = markdownText.split('\n');
    const roleSectionKeywords = ['roles', 'personnel', 'team members', 'team'];
    let roleLines: string[] = [];
    
    // Pass 1: Find a specific section heading (e.g., "## Roles") and extract its bulleted list.
    let sectionStartIndex = -1;
    for (const keyword of roleSectionKeywords) {
        const headingRegex = new RegExp(`^#+\\s*.*${keyword}.*`, 'i');
        sectionStartIndex = lines.findIndex(line => headingRegex.test(line));
        if (sectionStartIndex !== -1) break;
    }

    if (sectionStartIndex !== -1) {
        let sectionEndIndex = lines.findIndex((line, i) => i > sectionStartIndex && line.match(/^#+/));
        if (sectionEndIndex === -1) sectionEndIndex = lines.length;
        
        const sectionContent = lines.slice(sectionStartIndex + 1, sectionEndIndex);
        roleLines = sectionContent.filter(line => line.match(/^[-*]\s+/));
    }
    
    // Pass 2 (Fallback): If no specific section was found, or it was empty, find the first bulleted list in the document.
    if (roleLines.length === 0) {
        let foundList = false;
        for (const line of lines) {
            if (line.match(/^[-*]\s+/)) {
                foundList = true;
                roleLines.push(line);
            } else if (foundList && line.trim() === '') {
                // Assume the first blank line after a list signifies the end of that list.
                break;
            }
        }
    }

    const roles = new Set<string>();
    for (const line of roleLines) {
        const roleName = line
            .replace(/^[-*]\s+/, '') // Remove bullet point
            .replace(/\*\*/g, '')      // Remove bolding asterisks
            .split(/[:(]/)[0]         // Split at ':' or '(' to isolate the role name
            .trim();
        if (roleName) roles.add(roleName);
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