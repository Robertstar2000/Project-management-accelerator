


import React, { useState, useMemo, useEffect } from 'react';
import { logAction } from '../utils/logging';
import { PROMPTS } from '../constants/projectData';
import { ChangeDeploymentModal } from '../components/ChangeDeploymentModal';

const parseImpact = (impactString) => {
    const daysMatch = impactString.match(/([+-]?\s*\d+)\s*d/);
    const costMatch = impactString.match(/([+-]?\s*[\d,]+)\s*c/);
    return {
        days: daysMatch ? parseInt(daysMatch[1].replace(/\s/g, ''), 10) : 0,
        cost: costMatch ? parseInt(costMatch[1].replace(/\s|,/g, ''), 10) : 0,
    };
};

const applyImpact = (baseline, impact) => {
    const newEndDate = new Date(baseline.endDate);
    newEndDate.setDate(newEndDate.getDate() + impact.days);
    return {
        endDate: newEndDate.toISOString().split('T')[0],
        budget: baseline.budget + impact.cost,
    };
};

// Safety limits for API payload
const MAX_PAYLOAD_CHARS = 900000; // Be conservative to avoid 1MB limit.
const MAX_OUTPUT_TOKENS_ESTIMATE_CHARS = 8000 * 4; // Reserve ~32k chars for output

const truncatePrompt = (prompt: string): string => {
    const totalLimit = MAX_PAYLOAD_CHARS - MAX_OUTPUT_TOKENS_ESTIMATE_CHARS;
    if (prompt.length <= totalLimit) {
        return prompt;
    }

    console.warn('Prompt is too large, truncating from the end to fit payload limits.');
    logAction('Truncate Prompt', 'Payload Management', { originalLength: prompt.length, newLength: totalLimit });
    
    return prompt.substring(0, totalLimit) + "\n...[PROMPT TRUNCATED DUE TO PAYLOAD SIZE]...";
};

export const RevisionControlView = ({ project, onUpdateProject, ai }) => {
    const { changeRequest: cr, scenarios, name, discipline, tasks, documents, budget, endDate } = project;
    const [newScenario, setNewScenario] = useState({ name: '', impactStr: '' });
    const [deploymentPlan, setDeploymentPlan] = useState('');
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);
    const [error, setError] = useState('');

    const handleCrChange = (newCrData) => {
        onUpdateProject({ changeRequest: newCrData });
        logAction('Update Change Request', name, newCrData);
    };

    const handleScenariosChange = (newScenarios) => {
        onUpdateProject({ scenarios: newScenarios });
        logAction('Update Scenarios', name, newScenarios);
    };

    const handleAddScenario = (e) => {
        e.preventDefault();
        if (newScenario.name && newScenario.impactStr) {
            const updatedScenarios = [...scenarios, { id: Date.now(), ...newScenario }];
            handleScenariosChange(updatedScenarios);
            setNewScenario({ name: '', impactStr: '' });
        }
    };
    
    const handleGeneratePlan = async () => {
        if (!cr.title || !cr.reason) {
            alert("Please provide a title and reason for the change request before generating a plan.");
            return;
        }
        setIsGeneratingPlan(true);
        setError('');
        try {
            const promptFn = PROMPTS.changeDeploymentPlan;
            const promptText = promptFn(name, discipline, cr, tasks, documents);
            const prompt = truncatePrompt(promptText);
            logAction('Generate Change Plan', name, { promptLength: prompt.length });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    maxOutputTokens: 7900,
                    thinkingConfig: { thinkingBudget: 1000 },
                }
            });

            setDeploymentPlan(response.text);
            logAction('Generate Change Plan Success', name, { plan: response.text });
        } catch (err) {
            console.error("API Error generating deployment plan:", err);
            setError("Failed to generate the deployment plan. Please check the console and try again.");
            logAction('Generate Change Plan Failure', name, { error: err.message });
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const baseline = useMemo(() => ({
        budget: budget,
        endDate: endDate,
    }), [budget, endDate]);
    
    const crImpact = useMemo(() => parseImpact(cr.impactStr), [cr.impactStr]);
    const crResult = useMemo(() => applyImpact(baseline, crImpact), [baseline, crImpact]);

    const scenarioResults = useMemo(() => scenarios.map(s => ({
        ...s,
        impact: parseImpact(s.impactStr),
        result: applyImpact(baseline, parseImpact(s.impactStr))
    })), [scenarios, baseline]);

    const currencyFormat = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
    
    const ImpactCell = ({ value, base }) => {
        const diff = value - base;
        const className = diff > 0 ? 'impact-positive' : diff < 0 ? 'impact-negative' : '';
        const sign = diff > 0 ? '+' : '';
        return <>{currencyFormat(value)} {diff !== 0 && <span className={className}>({sign}{currencyFormat(diff)})</span>}</>
    };

    const handleSaveChange = () => {
        if (!cr.title) {
            alert("Please provide a title for the change request before saving.");
            return;
        }

        const changeDocContent = `
# Change Request: ${cr.title}

## Reason for Change
${cr.reason}

## Estimated Impact
- **Time:** ${crImpact.days > 0 ? '+' : ''}${crImpact.days} days
- **Cost:** ${crImpact.cost > 0 ? '+' : ''}${currencyFormat(crImpact.cost)}

## What-If Scenarios Analysis

| Metric   | Baseline              | CR Impact             | ${scenarios.map(s => s.name).join(' | ')} |
|----------|-----------------------|-----------------------|${scenarios.map(() => '-----------------------').join('|')}
| End Date | ${baseline.endDate}   | ${crResult.endDate}   | ${scenarioResults.map(s => s.result.endDate).join(' | ')} |
| Budget   | ${currencyFormat(baseline.budget)} | ${currencyFormat(crResult.budget)} | ${scenarioResults.map(s => currencyFormat(s.result.budget)).join(' | ')} |
`;

        const newDoc = {
            id: `doc-cr-${Date.now()}`,
            title: `Change Request: ${cr.title}`,
            version: 'v1.0',
            status: 'Working',
            owner: 'A. User',
            phase: 8, // Associate with Sprint/Critical Design Planning
            content: changeDocContent.trim(),
        };

        const updatedDocuments = [...documents, newDoc];
        onUpdateProject({ documents: updatedDocuments });

        logAction('Save Change Request as Document', name, { document: newDoc });
        alert(`Document "${newDoc.title}" has been created and added to the Documents Center for approval.`);
    };

    return (
        <div className="tool-card">
            <h2 className="subsection-title">Revision & Change Control</h2>
            <div className="tool-grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
                <div>
                    <h4>Submit Change Request</h4>
                    <form>
                        <div className="form-group"><label>Title</label><input type="text" value={cr.title} onChange={e => handleCrChange({...cr, title: e.target.value})} /></div>
                        <div className="form-group"><label>Reason for Change</label><textarea rows={3} value={cr.reason} onChange={e => handleCrChange({...cr, reason: e.target.value})}></textarea></div>
                        <div className="form-group"><label>Impact (e.g. +15d +5000c)</label><input type="text" value={cr.impactStr} onChange={e => handleCrChange({...cr, impactStr: e.target.value})} /></div>
                    </form>
                    
                    <h4 style={{marginTop: '2rem'}}>What-If Scenarios</h4>
                    <form onSubmit={handleAddScenario} style={{display: 'flex', gap: '1rem'}}>
                         <input type="text" placeholder="Scenario Name" value={newScenario.name} onChange={e => setNewScenario({...newScenario, name: e.target.value})} style={{flex: 1}}/>
                         <input type="text" placeholder="+10d -2000c" value={newScenario.impactStr} onChange={e => setNewScenario({...newScenario, impactStr: e.target.value})} style={{flex: 1}}/>
                         <button type="submit" className="button button-small">Add</button>
                    </form>
                </div>
                <div>
                    <h4>Auto Impact Analysis for "{cr.title}"</h4>
                    <table className="impact-table">
                        <thead>
                            <tr>
                                <th>Metric</th>
                                <th>Baseline</th>
                                <th>CR Impact</th>
                                {scenarioResults.map(s => <th key={s.id}>{s.name}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>End Date</td>
                                <td>{baseline.endDate}</td>
                                <td>{crResult.endDate} <span className={crImpact.days > 0 ? 'impact-positive' : ''}>{crImpact.days !== 0 && `(${crImpact.days > 0 ? '+':''}${crImpact.days}d)`}</span></td>
                                {scenarioResults.map(s => <td key={s.id}>{s.result.endDate} <span className={s.impact.days > 0 ? 'impact-positive' : ''}>{s.impact.days !== 0 && `(${s.impact.days > 0 ? '+':''}${s.impact.days}d)`}</span></td>)}
                            </tr>
                             <tr>
                                <td>Budget</td>
                                <td>{currencyFormat(baseline.budget)}</td>
                                <td><ImpactCell value={crResult.budget} base={baseline.budget} /></td>
                                {scenarioResults.map(s => <td key={s.id}><ImpactCell value={s.result.budget} base={baseline.budget} /></td>)}
                            </tr>
                        </tbody>
                    </table>
                     <div style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                        <button className="button" onClick={handleSaveChange}>Save Change</button>
                        <button className="button button-primary">Submit for Approval</button>
                    </div>
                </div>
            </div>
            
            <div style={{borderTop: '1px solid var(--border-color)', marginTop: '2rem', paddingTop: '2rem'}}>
                <h3 className="subsection-title">Change Deployment</h3>
                <div className="form-group">
                    <label htmlFor="deploymentPlan">AI-Generated Deployment Plan</label>
                    <textarea 
                        id="deploymentPlan"
                        rows={12}
                        value={isGeneratingPlan ? 'Generating plan...' : deploymentPlan}
                        onChange={(e) => setDeploymentPlan(e.target.value)}
                        placeholder="Click 'Generate Deployment Plan' to create a step-by-step plan to implement this change."
                        readOnly={isGeneratingPlan}
                    />
                </div>
                {error && <p className="status-message error">{error}</p>}
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button className="button" onClick={handleGeneratePlan} disabled={isGeneratingPlan}>
                        {isGeneratingPlan ? 'Generating...' : (deploymentPlan ? 'Regenerate Plan' : 'Generate Deployment Plan')}
                    </button>
                    <button className="button button-primary" onClick={() => setIsDeploying(true)} disabled={!deploymentPlan || isGeneratingPlan}>
                        Deploy Change...
                    </button>
                </div>
            </div>

            <ChangeDeploymentModal
                isOpen={isDeploying}
                onClose={() => setIsDeploying(false)}
                deploymentPlan={deploymentPlan}
                project={project}
                onUpdateProject={onUpdateProject}
            />
        </div>
    );
};