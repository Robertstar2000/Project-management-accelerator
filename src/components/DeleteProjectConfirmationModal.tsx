import React, { useState, useEffect, useRef } from 'react';

interface DeleteProjectConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    projectName: string;
}

export const DeleteProjectConfirmationModal: React.FC<DeleteProjectConfirmationModalProps> = ({ isOpen, onClose, onConfirm, projectName }) => {
    const [confirmationInput, setConfirmationInput] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isConfirmed = confirmationInput === projectName;

    useEffect(() => {
        if (isOpen) {
            setConfirmationInput('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
                <h2 id="delete-modal-title" style={{ color: 'var(--error-color)' }}>Warning: Project Deletion</h2>
                <p className="modal-warning-text">
                    You are about to permanently delete the project "<strong>{projectName}</strong>". All of its associated data will be lost. This action cannot be undone.
                </p>
                <p style={{ color: 'var(--secondary-text)', marginBottom: '1.5rem' }}>
                    To proceed, please type the project name below to confirm.
                </p>
                <div className="form-group">
                    <label htmlFor="deleteConfirmationInput">Project Name</label>
                    <input
                        id="deleteConfirmationInput"
                        ref={inputRef}
                        type="text"
                        value={confirmationInput}
                        onChange={(e) => setConfirmationInput(e.target.value)}
                        placeholder={projectName}
                        autoComplete="off"
                    />
                </div>
                <div className="modal-actions">
                    <button type="button" className="button" onClick={onClose}>Cancel</button>
                    <button
                        type="button"
                        className="button button-danger"
                        onClick={onConfirm}
                        disabled={!isConfirmed}
                    >
                        Delete Entire Project
                    </button>
                </div>
            </div>
        </div>
    );
};
