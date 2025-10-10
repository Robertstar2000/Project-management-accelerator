
import React, { useState, useEffect, useRef } from 'react';
import { User, Notification } from '../types';

interface HeaderProps {
    onNewProject: () => void;
    onHomeClick: () => void;
    disabled: boolean;
    isLandingPage: boolean;
    currentUser: User;
    onLogout: () => void;
    notifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
    onMarkAllRead: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    onNewProject, onHomeClick, disabled, isLandingPage, currentUser, onLogout, 
    notifications = [], onNotificationClick, onMarkAllRead 
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header style={{ padding: '1rem 5%', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.2rem', letterSpacing: '1px', cursor: 'pointer', fontWeight: 500 }} onClick={onHomeClick}>
                Project Management Accelerator
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {currentUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="notification-bell" title="Notifications" aria-label="Notifications" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            {isDropdownOpen && (
                                <div className="notifications-dropdown" ref={dropdownRef}>
                                    <div className="notifications-header">
                                        <h4>Notifications</h4>
                                        {unreadCount > 0 && <button className="button button-small" onClick={onMarkAllRead}>Mark all read</button>}
                                    </div>
                                    <div className="notifications-list">
                                        {notifications.length > 0 ? (
                                            notifications.map(notif => (
                                                <div key={notif.id} className={`notification-item ${!notif.read ? 'unread' : ''}`} onClick={() => onNotificationClick(notif)}>
                                                    <p>{notif.text}</p>
                                                    <small style={{color: 'var(--secondary-text)'}}>{new Date(notif.timestamp).toLocaleString()}</small>
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{padding: '1rem', textAlign: 'center', color: 'var(--secondary-text)'}}>No new notifications.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <span>{currentUser.username}</span>
                        <button onClick={onLogout} className="button button-small">Logout</button>
                    </div>
                )}
                <button onClick={onNewProject} className={isLandingPage ? "button button-primary" : "button"} disabled={disabled}>
                    {isLandingPage ? 'Start Working' : 'New Project'}
                </button>
            </div>
        </header>
    );
};
