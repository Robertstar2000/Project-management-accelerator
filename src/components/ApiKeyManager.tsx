import React, { useState } from 'react';

export const ApiKeyManager = ({ status, onSetKey }) => {
  const [keyInput, setKeyInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (keyInput.trim()) {
        onSetKey(keyInput.trim());
    }
  };

  const content = {
    promo: (
      <>
        <h3>API Key Access</h3>
        <p style={{color: 'var(--success-color)'}}>A promotional API key has been automatically applied. You're all set!</p>
      </>
    ),
    user: (
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h3>API Key Access</h3>
          <p style={{color: 'var(--success-color)'}}>Your API key is saved in this browser's local storage.</p>
        </div>
        <button className="button" onClick={() => { onSetKey(null); }}>Clear Key</button>
      </div>
    ),
    none: (
      <>
        <h3>API Key Access</h3>
        <p>This application requires a Google Gemini API key to function. Your key is stored securely in your browser's local storage and is never sent to our servers.</p>
        <form onSubmit={handleSubmit} style={{display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Enter your Google Gemini API Key"
            style={{flexGrow: 1, padding: '0.75rem', backgroundColor: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--primary-text)', minWidth: '300px'}}
            aria-label="Google Gemini API Key"
            required
          />
          <button type="submit" className="button button-primary">Save Key</button>
        </form>
        <p style={{fontSize: '0.9rem', color: 'var(--secondary-text)', marginTop: '0.5rem'}}>Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.</p>
      </>
    ),
    pending: <p>Checking for API Key...</p>
  };

  return (
    <section style={{backgroundColor: 'var(--card-background)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
      {content[status]}
    </section>
  );
};
