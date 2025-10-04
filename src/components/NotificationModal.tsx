import React from 'react';

interface Notification {
    recipientName: string;
    recipientEmail: string;
    taskName: string;
}

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: () => void;
    notification: Notification | null;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, onSend, notification }) => {
    if (!isOpen || !notification) return null;

    const { recipientName, recipientEmail, taskName } = notification;

    const emailSubject = `Your next task is ready to start: ${taskName}`;
    const emailBody = `Hi ${recipientName},\n\nThe prerequisite tasks for your assigned task, "${taskName}", have been completed.\n\nYou can now begin your work on this task.\n\nBest regards,\nProject Management Accelerator`;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{maxWidth: '600px'}} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="notification-modal-title">
                <h2 id="notification-modal-title">Task Notification Ready</h2>
                <p style={{color: 'var(--secondary-text)', marginBottom: '1.5rem'}}>An automated notification has been drafted for the next team member.</p>
                
                <div className="email-draft" style={{background: 'var(--background-color)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-color)'}}>
                    <p><strong>To:</strong> {recipientName} &lt;{recipientEmail}&gt;</p>
                    <p><strong>Subject:</strong> {emailSubject}</p>
                    <hr style={{border: 0, borderTop: '1px solid var(--border-color)', margin: '1rem 0'}} />
                    <textarea 
                        readOnly 
                        style={{width: '100%', minHeight: '150px', background: 'transparent', border: 'none', color: 'var(--primary-text)', resize: 'none', fontFamily: 'inherit', fontSize: '1rem', lineHeight: '1.6'}}
                        value={emailBody}
                        aria-label="Email body"
                    />
                </div>

                <div className="modal-actions">
                    <button type="button" className="button" onClick={onClose}>Cancel</button>
                    <button type="button" className="button button-primary" onClick={onSend}>Send Notification</button>
                </div>
            </div>
        </div>
    );
};
