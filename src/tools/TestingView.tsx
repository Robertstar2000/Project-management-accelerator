import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task } from '../types';
import { NewProjectModal } from '../components/NewProjectModal';
import { PhaseCard } from '../components/PhaseCard';
import { TEMPLATES, DEFAULT_DOCUMENTS, PROMPTS } from '../constants/projectData';

// --- Mock AI Service ---
// To ensure tests are fast, predictable, and don't make real API calls.
const mockAi = {
    models: {
        generateContent: async ({ contents }) => {
            await new Promise(res => setTimeout(res, 50)); // Simulate network delay
            if (contents.includes('Concept Proposal')) {
                return { text: '# Mock Concept Proposal\nThis is a test proposal.' };
            }
            if (contents.includes('compact it into a dense')) {
                 return { text: 'compacted:Mock Concept Proposal' };
            }
            if (contents.includes('Detailed Plans')) {
                return { text: `
## WBS
- 1.0 Design
  - 1.1 UI/UX
- 2.0 Development
  - 2.1 API
  - 2.2 Frontend

## Tasks
| Task Name          | Role      | Start Date (YYYY-MM-DD) | End Date (YYYY-MM-DD) | Dependencies      | Sprint   |
|--------------------|-----------|-------------------------|-----------------------|-------------------|----------|
| Design Mockups     | Designer  | 2024-01-01              | 2024-01-05            |                   | Sprint 1 |
| Develop API        | Engineer  | 2024-01-08              | 2024-01-15            | Design Mockups    | Sprint 1 |

## Milestones
| Milestone Name | Date (YYYY-MM-DD) |
|---|---|
| Design Complete  | 2024-01-05        |
| API Complete     | 2024-01-15        |
`
                };
            }
            return { text: 'mock-response' };
        }
    }
};

// --- Test Utilities ---

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
};

interface TestCase {
    name: string;
    test: () => void | Promise<void>;
}

// --- Test Definitions ---

const runUnitTests = (): TestCase[] => {
    const tests: TestCase[] = [
        {
            name: "Utility: Parses impact string correctly",
            test: () => {
                // Dummy function to simulate the one in RevisionControlView
                const parseImpact = (impactString) => {
                    const daysMatch = impactString.match(/([+-]?\s*\d+)\s*d/);
                    const costMatch = impactString.match(/([+-]?\s*[\d,]+)\s*c/);
                    return {
                        days: daysMatch ? parseInt(daysMatch[1].replace(/\s/g, ''), 10) : 0,
                        cost: costMatch ? parseInt(costMatch[1].replace(/\s|,/g, ''), 10) : 0,
                    };
                };

                let result = parseImpact("+15d +5000c");
                assert(result.days === 15 && result.cost === 5000, "Failed on positive values");

                result = parseImpact("-7d -1,000c");
                assert(result.days === -7 && result.cost === -1000, "Failed on negative values with comma");
            }
        },
        {
            name: "Utility: Parses roles from markdown",
            test: () => {
                const parseRolesFromMarkdown = (markdownText: string): string[] => {
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
                
                const markdown = `## Required Roles\n- **Project Manager**: PMP\n- Lead Engineer (Backend)\n* UI/UX Designer`;
                const roles = parseRolesFromMarkdown(markdown);
                assert(roles.length === 3, "Should find 3 roles from heading");
                assert(roles.includes('Project Manager') && roles.includes('Lead Engineer') && roles.includes('UI/UX Designer'), "Should parse all role names correctly from heading");
                
                const markdown2 = `This document lists our team.\n- Admin\n- Tester\n\nThat is all.`;
                const roles2 = parseRolesFromMarkdown(markdown2);
                assert(roles2.length === 2, "Should find 2 roles from simple list");
                assert(roles2.includes('Admin') && roles2.includes('Tester'), "Should parse roles from simple list");
            }
        },
        {
            name: "HMAP: Correctly determines lock status of phases",
            test: () => {
                const getLockStatus = (docId, projectPhases, documents) => {
                    const docIndex = projectPhases.findIndex(p => p.id === docId);
                    if (docIndex === -1) return { isLocked: true, lockReason: 'Document not found.' };
                    if (docIndex === 0) return { isLocked: false, lockReason: null };
                    const prevDocInSequence = projectPhases[docIndex - 1];
                    const prevDocData = documents.find(d => d.id === prevDocInSequence.id);
                    if (prevDocData && prevDocData.status !== 'Approved') {
                        return { isLocked: true, lockReason: `Requires "${prevDocData.title}" to be approved first.` };
                    }
                    return { isLocked: false, lockReason: null };
                };
                
                const projectPhases = [{id: 'doc1'}, {id: 'doc2'}, {id: 'doc3'}];
                const documents = [
                    { id: 'doc1', title: 'Doc 1', status: 'Approved' },
                    { id: 'doc2', title: 'Doc 2', status: 'Working' },
                    { id: 'doc3', title: 'Doc 3', status: 'Working' },
                ];
                
                assert(getLockStatus('doc1', projectPhases, documents).isLocked === false, "First doc should be unlocked");
                assert(getLockStatus('doc2', projectPhases, documents).isLocked === false, "Second doc should be unlocked if first is approved");
                assert(getLockStatus('doc3', projectPhases, documents).isLocked === true, "Third doc should be locked if second is not approved");
            }
        },
    ];
    return tests;
};

const runIntegrationTests = (): TestCase[] => {
    const tests: TestCase[] = [
        {
            name: "AI: Gathers correct document context for generation",
            test: () => {
                const getRelevantContext = (docToGenerate, allDocuments, allPhasesData) => {
                    const sortedDocuments = [...allDocuments].sort((a, b) => 
                        a.phase - b.phase || 
                        (a.sequence || 1) - (b.sequence || 1) || 
                        a.title.localeCompare(b.title)
                    );
                    const currentIndex = sortedDocuments.findIndex(d => d.id === docToGenerate.id);
                    const firstDoc = sortedDocuments[0];
                    const firstDocPhaseData = firstDoc ? allPhasesData[firstDoc.id] : null;
                    const firstDocContext = (firstDoc && firstDoc.status === 'Approved' && firstDocPhaseData?.compactedContent)
                        ? { doc: firstDoc, content: firstDocPhaseData.compactedContent }
                        : null;
                    const prevDoc = currentIndex > 0 ? sortedDocuments[currentIndex - 1] : null;
                    const prevDocPhaseData = prevDoc ? allPhasesData[prevDoc.id] : null;
                    const prevDocContext = (prevDoc && prevDoc.status === 'Approved' && prevDocPhaseData?.compactedContent)
                        ? { doc: prevDoc, content: prevDocPhaseData.compactedContent }
                        : null;
                    return { firstDocContext, prevDocContext };
                };
                
                const docs = [
                    { id: 'doc1', title: 'Concept', phase: 1, sequence: 1, status: 'Approved' },
                    { id: 'doc2', title: 'Resources', phase: 2, sequence: 1, status: 'Approved' },
                    { id: 'doc3', title: 'SOW', phase: 5, sequence: 1, status: 'Working' },
                ];
                const phasesData = {
                    'doc1': { compactedContent: 'compacted concept' },
                    'doc2': { compactedContent: 'compacted resources' },
                };
                
                let context = getRelevantContext(docs[2], docs, phasesData);
                assert(context.firstDocContext.content === 'compacted concept', "Should include first doc context");
                assert(context.prevDocContext.content === 'compacted resources', "Should include previous doc context");

                context = getRelevantContext(docs[1], docs, phasesData);
                assert(context.firstDocContext.content === 'compacted concept', "For doc2, first doc context should still be from doc1");
                assert(context.prevDocContext.content === 'compacted concept', "For doc2, prev doc context should be from doc1");
                assert(context.prevDocContext.doc.id === context.firstDocContext.doc.id, "Prev doc should be the same as first doc");
            }
        }
    ];
    return tests;
};

const runFunctionalTests = (project, saveProject): TestCase[] => {
    const tests: TestCase[] = [
        {
            name: "Flow: Create Project and Generate First Document",
            test: async () => {
                const newProject: Project = { 
                    id: `test-${Date.now()}`, name: "Functional Test Project", discipline: "Software Development",
                    mode: 'fullscale', scope: 'internal', teamSize: 'medium', complexity: 'typical',
                    ownerId: 'test-user', team: [], documents: DEFAULT_DOCUMENTS, tasks: [], sprints: [], milestones: [],
                    resources: [], avgBurdenedLaborRate: 100, budget: 50000,
                    startDate: '2024-01-01', endDate: '2024-03-01',
                    changeRequest: {}, scenarios: [], phasesData: {}, generationMode: 'manual', notifications: []
                };
                assert(newProject.documents.length > 0, "Project should be created with default documents");
                const firstDoc = newProject.documents[0];
                const promptFn = PROMPTS.phase1;
                const prompt = promptFn(newProject.name, newProject.discipline, '', newProject.mode, newProject.scope, newProject.teamSize, newProject.complexity);
                
                const result = await mockAi.models.generateContent({ contents: prompt });
                assert(result.text.includes("Mock Concept Proposal"), "Mock AI should return the correct content");
            }
        },
        {
            name: "Flow: Parses detailed plan and populates tasks/milestones",
            test: async () => {
                const planContent = await mockAi.models.generateContent({contents: 'Detailed Plans'});

                const parseMarkdownTable = (sectionString: string) => {
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
                        const obj: { [key:string]: string } = {};
                        headers.forEach((header, index) => {
                            if (header) {
                                obj[header] = values[index];
                            }
                        });
                        return obj;
                    }).filter(Boolean);
                    return data as any[];
                };
                
                const tasksText = planContent.text.split('## Tasks')[1].split('## Milestones')[0];
                const parsedTasks = parseMarkdownTable(tasksText);
                assert(parsedTasks.length === 2, "Should parse 2 tasks from plan");
                assert(parsedTasks[1]['dependencies'] === 'Design Mockups', "Should correctly parse dependencies");
                assert('start_date_yyyy_mm_dd' in parsedTasks[0], "Should correctly parse date header");

                const milestonesText = planContent.text.split('## Milestones')[1];
                const parsedMilestones = parseMarkdownTable(milestonesText);
                assert(parsedMilestones.length === 2, "Should parse 2 milestones");
                assert('date_yyyy_mm_dd' in parsedMilestones[0], "Should correctly parse milestone date header");
            }
        }
    ];
    return tests;
};


type TestStatus = 'pending' | 'running' | 'passed' | 'failed';

interface TestResult {
    name: string;
    status: TestStatus;
    error?: string;
}

const getInitialResults = (project, saveProject) => {
    const testSuites: Record<string, TestCase[]> = {
        "Unit Tests": runUnitTests(),
        "Integration Tests": runIntegrationTests(),
        "Functional Tests": runFunctionalTests(project, saveProject),
    };
    const initial: Record<string, TestResult[]> = {};
    for (const suiteName in testSuites) {
        if (Object.prototype.hasOwnProperty.call(testSuites, suiteName)) {
            initial[suiteName] = testSuites[suiteName].map(t => ({ name: t.name, status: 'pending' as TestStatus }));
        }
    }
    return initial;
};

export const TestingView = ({ project, saveProject }) => {
    const [results, setResults] = useState<Record<string, TestResult[]>>(() => getInitialResults(project, saveProject));
    const [isRunning, setIsRunning] = useState(false);

    const runTests = useCallback(async () => {
        setIsRunning(true);
    
        const testSuites: Record<string, TestCase[]> = {
            "Unit Tests": runUnitTests(),
            "Integration Tests": runIntegrationTests(),
            "Functional Tests": runFunctionalTests(project, saveProject),
        };
        
        setResults(getInitialResults(project, saveProject)); // Reset to pending
    
        for (const suiteName in testSuites) {
            const tests = testSuites[suiteName];
            for (let i = 0; i < tests.length; i++) {
                // Set to running
                setResults(prevResults => {
                    const newResults = { ...prevResults };
                    newResults[suiteName][i] = { ...newResults[suiteName][i], status: 'running' };
                    return newResults;
                });
    
                await new Promise(res => setTimeout(res, 50)); // Allow UI to update
    
                try {
                    await tests[i].test();
                    // Set to passed
                    setResults(prevResults => {
                        const newResults = { ...prevResults };
                        newResults[suiteName][i] = { ...newResults[suiteName][i], status: 'passed', error: undefined };
                        return newResults;
                    });
                } catch (e: any) {
                    // Set to failed
                     setResults(prevResults => {
                        const newResults = { ...prevResults };
                        newResults[suiteName][i] = { ...newResults[suiteName][i], status: 'failed', error: e.message };
                        return newResults;
                    });
                }
            }
        }
    
        setIsRunning(false);
    }, [project, saveProject]);

    return (
        <div className="tool-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="subsection-title" style={{margin: 0}}>Application Test Suite</h2>
                <button onClick={runTests} disabled={isRunning} className="button button-primary">
                    {isRunning ? 'Running...' : 'Run All Tests'}
                </button>
            </div>

            {Object.entries(results).map(([suiteName, testResults]) => (
                <div key={suiteName} style={{ marginBottom: '2rem' }}>
                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>{suiteName}</h3>
                    <ul style={{ listStyle: 'none' }}>
                        {Array.isArray(testResults) && testResults.map((result, index) => (
                            <li key={index} style={{ padding: '0.75rem', borderBottom: '1px solid var(--background-color)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '1rem',
                                        backgroundColor: {
                                            passed: 'var(--success-color)',
                                            failed: 'var(--error-color)',
                                            running: 'var(--inprogress-color)',
                                            pending: 'var(--locked-color)',
                                        }[result.status],
                                        color: 'var(--background-color)',
                                        fontWeight: 'bold'
                                    }}>
                                        {result.status === 'passed' && '✓'}
                                        {result.status === 'failed' && '✗'}
                                        {result.status === 'running' && <div className="spinner" style={{width: '12px', height: '12px', borderWidth: '2px'}}></div>}
                                    </span>
                                    <span>{result.name}</span>
                                </div>
                                {result.status === 'failed' && (
                                    <pre style={{ 
                                        backgroundColor: 'var(--background-color)', 
                                        color: 'var(--error-color)',
                                        padding: '0.5rem', 
                                        borderRadius: '4px',
                                        marginTop: '0.5rem',
                                        marginLeft: 'calc(20px + 1rem)',
                                        fontSize: '0.8rem',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {result.error}
                                    </pre>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};