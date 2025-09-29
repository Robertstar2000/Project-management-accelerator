import React, { useState, useMemo } from 'react';

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

export const RevisionControlView = ({ projectMetrics }) => {
    const [cr, setCr] = useState({ title: 'Add new login provider', reason: 'User request for SSO', impactStr: '+15d +5000c' });
    const [scenarios, setScenarios] = useState([
        { id: 1, name: 'A: Use contractors', impactStr: '+10d +8000c' },
        { id: 2, name: 'B: Defer feature', impactStr: '+0d +0c' },
    ]);
    const [newScenario, setNewScenario] = useState({ name: '', impactStr: '' });

    const baseline = useMemo(() => projectMetrics, [projectMetrics]);
    
    const crImpact = useMemo(() => parseImpact(cr.impactStr), [cr.impactStr]);
    const crResult = useMemo(() => applyImpact(baseline, crImpact), [baseline, crImpact]);

    const scenarioResults = useMemo(() => scenarios.map(s => ({
        ...s,
        impact: parseImpact(s.impactStr),
        result: applyImpact(baseline, parseImpact(s.impactStr))
    })), [scenarios, baseline]);

    const handleAddScenario = (e) => {
        e.preventDefault();
        if (newScenario.name && newScenario.impactStr) {
            setScenarios([...scenarios, { id: Date.now(), ...newScenario }]);
            setNewScenario({ name: '', impactStr: '' });
        }
    };
    
    const currencyFormat = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
    
    const ImpactCell = ({ value, base }) => {
        const diff = value - base;
        const className = diff > 0 ? 'impact-positive' : diff < 0 ? 'impact-negative' : '';
        const sign = diff > 0 ? '+' : '';
        return <>{currencyFormat(value)} {diff !== 0 && <span className={className}>({sign}{currencyFormat(diff)})</span>}</>
    };

    return (
        <div className="tool-card">
            <h2 className="subsection-title">Revision & Change Control</h2>
            <div className="tool-grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
                <div>
                    <h4>Submit Change Request</h4>
                    <form>
                        <div className="form-group"><label>Title</label><input type="text" value={cr.title} onChange={e => setCr({...cr, title: e.target.value})} /></div>
                        <div className="form-group"><label>Reason for Change</label><textarea rows={3} value={cr.reason} onChange={e => setCr({...cr, reason: e.target.value})}></textarea></div>
                        <div className="form-group"><label>Impact (e.g. +15d +5000c)</label><input type="text" value={cr.impactStr} onChange={e => setCr({...cr, impactStr: e.target.value})} /></div>
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
                        <button className="button">Save Analysis</button>
                        <button className="button button-primary">Submit for Approval</button>
                    </div>
                </div>
            </div>
        </div>
    );
};