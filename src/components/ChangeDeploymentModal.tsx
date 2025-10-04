import React, { useState, useEffect, useMemo } from 'react';
import { logAction } from '../utils/logging';

const parseDeploymentPlan = (plan, allTasks, allSprints) => {
    if (!plan) return { affectedDocs: [], taskChanges: [] };

    const sections = plan.split('## ');
    const docsSection = sections.find(s => s.toLowerCase().startsWith('affected documents'));
    const tasksSection = sections.find(s => s.toLowerCase().startsWith('task modifications'));

    const affectedDocs = docsSection
        ? docsSection.split('\n').slice(1).map(line => line.replace(/[-*]\s*/, '').trim()).filter(Boolean)
        : [];

    const taskChanges = [];
    if (tasksSection) {
        const lines = tasksSection.split('\n').slice(1).filter(Boolean);
        lines.forEach(line => {
            const actionMatch = line.match(/^(ADD|DELETE|EDIT):/);
            if (!actionMatch) return;

            const action = actionMatch[1];
            const restOfLine = line.substring(actionMatch[0].length).trim();
            let target, details: any = {};

            if (action === 'DELETE') {
                target = restOfLine;
            } else { 
                const partsMatch = restOfLine.match(/(.*?)\s*\((.*)\)/);
                if (partsMatch) {
                    target = partsMatch[1].trim();
                    const detailsStr = partsMatch[2];
                    details = Object.fromEntries(
                        detailsStr.split(',').map(part => {
                            const [key, ...value] = part.split(':');
                            return [key.trim(), value.join(':').trim()];
                        })
                    );
                } else {
                    target = restOfLine;
                }
            }
            
            if (details['Depends On']) {
                const depTask = allTasks.find(t => t.name === details['Depends On']);
                if (depTask) details.dependsOnId = depTask.id;
            }
            
            if (details['Sprint']) {
                const sprint = allSprints.find(s => s.name === details['Sprint']);
                if (sprint) details.sprintId = sprint.id;
            }

            taskChanges.push({ action, target, details });
        });
    }

    return { affectedDocs, taskChanges };
};

export const ChangeDeploymentModal = ({ isOpen, onClose, deploymentPlan, project, onUpdateProject }) => {
    const [steps, setSteps] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            const { affectedDocs, taskChanges } = parseDeploymentPlan(deploymentPlan, project.tasks, project.sprints);
            const docSteps = affectedDocs.map(doc => ({ type: 'document', target: doc }));
            const parsedSteps = taskChanges.map(change => ({ type: 'task', ...change }));
            
            const initialSteps = docSteps.length > 0
                ? [{ type: 'docs_summary', docs: docSteps.map(d => d.target) }, ...parsedSteps]
                : parsedSteps;
                
            setSteps(initialSteps);
            setCurrentStepIndex(0);
        }
    }, [isOpen, deploymentPlan, project.tasks]);

    const handleApply = () => {
        const step = steps[currentStepIndex];
        let updatedTasks = [...project.tasks];

        if (step.type === 'task') {
            switch (step.action) {
                case 'ADD':
                    updatedTasks.push({
                        id: `task-${Date.now()}`,
                        name: step.target,
                        startDate: step.details['Start'] || new Date().toISOString().split('T')[0],
                        endDate: step.details['End'] || new Date().toISOString().split('T')[0],
                        sprintId: step.details.sprintId || project.sprints[0]?.id,
                        status: 'todo',
                        dependsOn: step.details.dependsOnId ? [step.details.dependsOnId] : [],
                        actualTime: null,
                        actualCost: null,
                    });
                    break;
                case 'DELETE':
                    updatedTasks = updatedTasks.filter(t => t.name !== step.target);
                    break;
                case 'EDIT':
                    const taskIndex = updatedTasks.findIndex(t => t.name === step.target);
                    if (taskIndex > -1) {
                        if (step.details['End']) updatedTasks[taskIndex].endDate = step.details['End'];
                        if (step.details.sprintId) updatedTasks[taskIndex].sprintId = step.details.sprintId;
                        if (step.details.dependsOnId) {
                            if (!updatedTasks[taskIndex].dependsOn.includes(step.details.dependsOnId)) {
                                updatedTasks[taskIndex].dependsOn.push(step.details.dependsOnId);
                            }
                        }
                    }
                    break;
            }
             onUpdateProject({ tasks: updatedTasks });
        }
        
        logAction('Deploy Change Step', `Step ${currentStepIndex + 1}`, { step, project });

        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            onClose(); 
        }
    };
    
    const renderStep = () => {
        if (steps.length === 0) return <p>No actionable steps found in the deployment plan.</p>;
        const step = steps[currentStepIndex];

        if (step.type === 'docs_summary') {
            return (
                <div className="deployment-step">
                    <h4>Manual Action: Update Documents</h4>
                    <p>The following documents were identified for manual updates. Please review them after this deployment process is complete.</p>
                    <ul>{step.docs.map(d => <li key={d}>{d}</li>)}</ul>
                </div>
            );
        }

        if (step.type === 'task') {
            const actionClass = step.action.toLowerCase();
            return (
                <div className="deployment-step">
                    <h4><span className={`deployment-step-action ${actionClass}`}>{step.action}</span> Task</h4>
                    <p>You are about to <strong className={actionClass}>{step.action.toLowerCase()}</strong> the following task:</p>
                    <p className="deployment-step-target">{step.target}</p>
                    {Object.keys(step.details).length > 0 && (
                        <div className="deployment-step-details">
                            {Object.entries(step.details).map(([key, value]) => (
                                <p key={key}><strong>{key}:</strong> {value as string}</p>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };
    
    if (!isOpen) return null;

    const totalActionableSteps = steps.filter(s => s.type !== 'docs_summary').length;
    const currentActionableStep = steps.slice(0, currentStepIndex + 1).filter(s => s.type !== 'docs_summary').length;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content change-deployment-modal" onClick={e => e.stopPropagation()}>
                <h2>Deploying Change</h2>
                {totalActionableSteps > 0 && (
                    <p className="deployment-progress">
                        Applying Task Modifications: Step {currentActionableStep} of {totalActionableSteps}
                    </p>
                )}
                {renderStep()}
                <div className="modal-actions">
                    <button type="button" className="button" onClick={onClose}>Cancel</button>
                    <button type="button" className="button button-primary" onClick={handleApply}>
                        {currentStepIndex === steps.length - 1 ? 'Finish Deployment' : 'Apply & Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};
