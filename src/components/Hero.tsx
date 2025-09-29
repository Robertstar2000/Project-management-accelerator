import React from 'react';
import { RainbowText } from './RainbowText';

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
  </section>
);
