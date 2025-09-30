import React from 'react';
import { RainbowText } from './RainbowText';

const Feature = ({ icon, title, description }) => (
  <div className="feature-card">
    <div className="icon">{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

export const Hero = ({ onStart, disabled }) => (
  <section style={{ textAlign: 'center', padding: '4rem 1rem' }}>
    <h1 className="section-title" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>Project Management Accelerator</h1>
    <p style={{ fontSize: '1.2rem', color: 'var(--secondary-text)', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
      An AI-powered companion that guides you through the full lifecycle of a project using proven HMAP methodologies.
    </p>
    <button onClick={onStart} className="button button-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.2rem', marginBottom: '1.5rem' }} disabled={disabled}>
      Start New Project
    </button>
    <p style={{ fontSize: '0.9rem', color: 'var(--secondary-text)'}}>
      This application created by <RainbowText text="MIFECO" /> a Mars Technology Institute (MTI) affiliate.
    </p>

    <div className="features-container">
      <h2 className="features-title">A Unified Platform for Project Success</h2>
      <div className="feature-grid">
        <Feature 
          icon="✨" 
          title="AI-Powered Planning"
          description="Generate comprehensive project documents, from concept proposals to detailed work breakdowns, in seconds."
        />
        <Feature 
          icon="🧭" 
          title="Structured Workflow"
          description="Follow a clear, phase-based methodology that ensures all critical planning steps are completed in the right order."
        />
        <Feature 
          icon="📊" 
          title="Comprehensive Tracking"
          description="Visualize your project's progress with Gantt charts, Kanban boards, and milestone tracking."
        />
        <Feature 
          icon="🎛️" 
          title="Dynamic What-If Analysis"
          description="Instantly model the impact of change requests on your budget and timeline before committing."
        />
      </div>
    </div>
  </section>
);
