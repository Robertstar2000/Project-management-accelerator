import React from 'react';

export const Header = ({ onNewProject, onHomeClick, disabled }) => (
  <header style={{ padding: '1rem 5%', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <h1 style={{ fontSize: '1.2rem', letterSpacing: '1px', cursor: 'pointer', fontWeight: 500 }} onClick={onHomeClick}>
      Project Management Accelerator
    </h1>
    <button onClick={onNewProject} className="button" disabled={disabled}>New Project</button>
  </header>
);
