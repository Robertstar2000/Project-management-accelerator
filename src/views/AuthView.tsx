
import React, { useState } from 'react';
import * as authService from '../utils/authService';
import { User } from '../types';

interface AuthViewProps {
    onLogin: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isLoginView) {
                const user = authService.login(email, password);
                if (user) {
                    onLogin(user);
                } else {
                    setError('Invalid email or password.');
                }
            } else {
                const newUser = authService.register(username, email, password);
                if (newUser) {
                    const user = authService.login(email, password);
                    if (user) onLogin(user);
                } else {
                    setError('Username or email already exists.');
                }
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem' }}>
            <div className="tool-card" style={{ maxWidth: '400px', width: '100%' }}>
                <h2 className="subsection-title">{isLoginView ? 'Login' : 'Sign Up'}</h2>
                <form onSubmit={handleSubmit}>
                    {error && <p className="status-message error" style={{ marginBottom: '1rem' }}>{error}</p>}
                    {!isLoginView && (
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} required />
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="button button-primary" style={{ width: '100%', marginBottom: '1rem' }}>
                        {isLoginView ? 'Login' : 'Sign Up'}
                    </button>
                    <p style={{ textAlign: 'center', color: 'var(--secondary-text)' }}>
                        {isLoginView ? "Don't have an account?" : "Already have an account?"}
                        <button type="button" onClick={() => { setIsLoginView(!isLoginView); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit', marginLeft: '0.5rem' }}>
                            {isLoginView ? 'Sign Up' : 'Login'}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
};
