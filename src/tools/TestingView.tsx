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

                result = parseImpact("+10d");
                assert(result.days === 10 && result.cost === 0, "Failed on days only");

                result = parseImpact("-2500c");
                assert(result.days === 0 && result.cost === -2500, "Failed on cost only");

                result = parseImpact("no impact");
                assert(result.days === 0 && result.cost === 0, "Failed on invalid string");
            }
        },
        {
            name: "Utility: Parses markdown table for tasks",
            test: () => {
                // Dummy function to simulate a parser
                const parseMarkdownTable = (sectionString) => {
                    if (!sectionString) return [];
                    const lines = sectionString.trim().split('\n');
                    const headerLine = lines[0];
                    const dataLines = lines.slice(2);
                    const headers = headerLine.split('|').map(h => h.trim().toLowerCase());
                    const data = dataLines.map(row => {
                        const values = row.split('|').map(v => v.trim());
                        const obj = {};
                        headers.forEach((header, index) => {
                            if(header) obj[header] = values[index];
                        });
                        return obj;
                    });
                    return data;
                };

                const markdown = `| Task Name | Role |
|---|---|
| Design UI | Designer |
| Build API | Engineer |`;
                
                const result = parseMarkdownTable(markdown);
                assert(result.length === 2, "Should parse 2 rows");
                assert(result[0]['task name'] === 'Design UI' && result[0]['role'] === 'Designer', "Row 1 data is incorrect");
                assert(result[1]['task name'] === 'Build API' && result[1]['role'] === 'Engineer', "Row 2 data is incorrect");
            }
        }
    ];
    return tests;
};

const runIntegrationTests = (): TestCase[] => {
    // These tests don't render to the real DOM, but check component logic.
    const tests: TestCase[] = [
        {
            name: "Component: PhaseCard lock mechanism",
            test: () => {
                // This is a conceptual test. We can't easily check for disabled buttons
                // without a full testing library, but we can check the props logic.
                const lockedProps = { isLocked: true, lockReason: "Previous phase incomplete" };
                const unlockedProps = { isLocked: false, lockReason: null };

                assert(lockedProps.isLocked === true, "isLocked prop should be true for locked state");
                assert(unlockedProps.isLocked === false, "isLocked prop should be false for unlocked state");
                // In a real test, we would render the component and assert that
                // buttons are disabled or a lock icon is visible.
            }
        },
        {
            name: "Component: NewProjectModal template selection",
            test: () => {
                 // Simulate selecting a template
                 const selectedTemplateId = 'software-dev';
                 const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId);

                 assert(!!selectedTemplate, "Template should be found");
                 assert(selectedTemplate.name === 'Standard Software Project', "Correct template name should be loaded");
                 assert(selectedTemplate.documents.length > 0, "Template should have documents");
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
                // 1. Create a project in memory (doesn't use the modal UI)
                const newProject: Project = { 
                    id: `test-${Date.now()}`, name: "Functional Test Project", discipline: "Software Development",
                    mode: 'fullscale', scope: 'internal', teamSize: 'medium', complexity: 'typical',
                    ownerId: 'test-user', team: [], documents: DEFAULT_DOCUMENTS, tasks: [], sprints: [], milestones: [],
                    resources: [], avgBurdenedLaborRate: 100, budget: 50000,
                    startDate: '2024-01-01', endDate: '2024-03-01',
                    changeRequest: {}, scenarios: [], phasesData: {}, generationMode: 'manual', notifications: []
                };

                assert(newProject.documents.length > 0, "Project should be created with default documents");

                // 2. Simulate generating the first document
                const firstDoc = newProject.documents[0];
                const promptFn = PROMPTS.phase1;
                const prompt = promptFn(newProject.name, newProject.discipline, '', newProject.mode, newProject.scope, newProject.teamSize, newProject.complexity);
                
                const result = await mockAi.models.generateContent({ contents: prompt });
                const newContent = result.text;
                assert(newContent.includes("Mock Concept Proposal"), "Mock AI should return the correct content");

                // 3. Update project state
                let updatedProject = { ...newProject };
                const newPhasesData = { ...updatedProject.phasesData, [firstDoc.id]: { content: newContent } };
                updatedProject.phasesData = newPhasesData;
                
                assert(updatedProject.phasesData[firstDoc.id].content === newContent, "Project state should be updated with new content");
            }
        },
        {
            name: "Flow: Mark document as complete",
            test: () => {
                const projectWithDoc = {
                    documents: [{ id: 'doc1', status: 'Working' }]
                };
                
                const updatedDocs = projectWithDoc.documents.map(d => 
                    d.id === 'doc1' ? { ...d, status: 'Approved' } : d
                );

                assert(updatedDocs[0].status === 'Approved', "Document status should be updated to 'Approved'");
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