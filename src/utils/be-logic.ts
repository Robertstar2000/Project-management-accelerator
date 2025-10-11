
// A collection of pure functions for data parsing and transformation.
// In a production environment, these logic functions would likely reside on a backend server
// and be accessed via API endpoints.

export const parseMarkdownTable = (sectionString: string) => {
    if (!sectionString) return [];
    const lines = sectionString.trim().split('\n');
    let headerIndex = -1;
    for (let i = 0; i < lines.length - 1; i++) {
        const currentRow = lines[i];
        const nextRow = lines[i+1];
        if (currentRow.includes('|') && nextRow.match(/^[|\s-:]+$/) && nextRow.includes('-')) {
            headerIndex = i;
            break;
        }
    }
    if (headerIndex === -1) return [];
    const headerLine = lines[headerIndex];
    const dataLines = lines.slice(headerIndex + 2);
    const headers = headerLine.split('|').map(h => h.trim().toLowerCase().replace(/[()]/g, '').replace(/[\s-]+/g, '_'));
    const data = dataLines.map(row => {
        if (!row.includes('|')) return null; 
        const values = row.split('|').map(v => v.trim());
        if (values.length !== headers.length) return null;
        const obj: { [key: string]: string } = {};
        headers.forEach((header, index) => {
            if (header) {
                obj[header] = values[index];
            }
        });
        return obj;
    }).filter(Boolean);
    return data as any[];
};

export const parseImpact = (impactString) => {
    if (!impactString) return { days: 0, cost: 0 };
    const daysMatch = impactString.match(/([+-]?\s*\d+)\s*d/);
    const costMatch = impactString.match(/([+-]?\s*[\d,]+)\s*c/);
    return {
        days: daysMatch ? parseInt(daysMatch[1].replace(/\s/g, ''), 10) : 0,
        cost: costMatch ? parseInt(costMatch[1].replace(/\s|,/g, ''), 10) : 0,
    };
};

export const applyImpact = (baseline, impact) => {
    const newEndDate = new Date(baseline.endDate);
    newEndDate.setDate(newEndDate.getDate() + impact.days);
    return {
        endDate: newEndDate.toISOString().split('T')[0],
        budget: baseline.budget + impact.cost,
    };
};

export const parseResourcesFromMarkdown = (markdownText: string): string[] => {
    if (!markdownText) return [];
    const lines = markdownText.split('\n');
    const resourceSectionKeywords = ['software', 'hardware', 'partners', 'tools', 'resources'];
    const resources = new Set<string>();
    let inSection = false;

    for (const line of lines) {
        // Use a regex for more flexible heading matching (e.g., ## Resources, ### Software Tools)
        const headingMatch = line.match(/^#+\s*(.*)/);
        if (headingMatch) {
            const headingText = headingMatch[1].toLowerCase();
            inSection = resourceSectionKeywords.some(keyword => headingText.includes(keyword));
        }
        
        // If we are in a relevant section and the line is a list item
        if (inSection && line.match(/^[-*]\s+/)) {
            const resourceName = line
                .replace(/^[-*]\s+/, '') // remove bullet
                .split(/[:(]/)[0] // remove descriptions
                .replace(/\*\*/g, '') // remove bold markers
                .trim();
            if (resourceName && resourceName.toLowerCase() !== 'none') {
                resources.add(resourceName);
            }
        }
    }
    // Fallback if no sections were found but there are lists
    if (resources.size === 0) {
        lines.forEach(line => {
             if (line.match(/^[-*]\s+/)) {
                const resourceName = line.replace(/^[-*]\s+/, '').split(/[:(]/)[0].replace(/\*\*/g, '').trim();
                if (resourceName && resourceName.toLowerCase() !== 'none') resources.add(resourceName);
             }
        });
    }

    return Array.from(resources);
};

export const parseRolesFromMarkdown = (markdownText: string): string[] => {
    if (!markdownText) return [];
    const lines = markdownText.split('\n');
    const roleSectionKeywords = ['roles', 'personnel', 'team members', 'team'];
    let roleLines: string[] = [];
    let sectionStartIndex = -1;
    for (const keyword of roleSectionKeywords) {
        const headingRegex = new RegExp(`^#+\\s*.*${keyword}.*`, 'i');
        sectionStartIndex = lines.findIndex(line => headingRegex.test(line));
        if (sectionStartIndex !== -1) break;
    }
    if (sectionStartIndex !== -1) {
        let sectionEndIndex = lines.findIndex((line, i) => i > sectionStartIndex && line.match(/^#+/));
        if (sectionEndIndex === -1) sectionEndIndex = lines.length;
        roleLines = lines.slice(sectionStartIndex + 1, sectionEndIndex).filter(line => line.match(/^[-*]\s+/));
    }
    if (roleLines.length === 0) {
        let foundList = false;
        for (const line of lines) {
            if (line.match(/^[-*]\s+/)) {
                foundList = true;
                roleLines.push(line);
            } else if (foundList && line.trim() === '') break;
        }
    }
    const roles = new Set<string>();
    for (const line of roleLines) {
        const roleName = line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').split(/[:(]/)[0].trim();
        if (roleName) roles.add(roleName);
    }
    return Array.from(roles);
};
