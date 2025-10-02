import React from 'react';
import { RainbowText } from './RainbowText';

export const Hero = ({ onStart, disabled }) => (
  <section style={{ textAlign: 'center', padding: '4rem 1rem' }}>
    <h1 className="section-title" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>Project Management Accelerator</h1>
    <p style={{ fontSize: '1.2rem', color: 'var(--secondary-text)', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
      An AI-powered companion that guides you through the full lifecycle of a project using proven HMAP methodologies.
    </p>
    <button onClick={onStart} className="button button-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.2rem', marginBottom: '1.5rem' }} disabled={disabled}>
      Start Working
    </button>
    <p style={{ fontSize: '0.9rem', color: 'var(--secondary-text)', marginBottom: '5rem'}}>
      This application created by <RainbowText text="MIFECO" /> a Mars Technology Institute (MTI) affiliate.
    </p>
    
    <div className="feature-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
      <div className="feature-card">
        <div className="icon" aria-hidden="true">✨</div>
        <h3>AI-Powered Planning</h3>
        <p>Leverage Gemini to instantly create context-aware project documentation. The AI uses outputs from previous phases to inform the next, ensuring a cohesive plan from initial concept proposals to detailed Work Breakdown Structures.</p>
      </div>
      <div className="feature-card">
        <div className="icon" aria-hidden="true">🧭</div>
        <h3>Structured Workflow</h3>
        <p>Navigate project planning with the Hyper-Agile Management Process (HMAP). This phase-based approach locks subsequent steps until prerequisites are met, ensuring a robust and logical plan that prevents downstream errors.</p>
      </div>
      <div className="feature-card">
        <div className="icon" aria-hidden="true">📊</div>
        <h3>Integrated Tracking</h3>
        <p>Transition seamlessly from planning to execution. Your approved AI-generated project plan automatically populates interactive Gantt charts, Kanban boards, and milestone trackers, providing instant visibility into project progress.</p>
      </div>
      <div className="feature-card">
        <div className="icon" aria-hidden="true">🎛️</div>
        <h3>Dynamic What-If Analysis</h3>
        <p>De-risk project changes with a powerful simulation tool. Input a change request and any number of 'what-if' scenarios to see an immediate, side-by-side comparison of their impact on your project's budget and end date.</p>
      </div>
    </div>
  </section>
);