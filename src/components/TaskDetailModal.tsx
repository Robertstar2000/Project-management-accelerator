
import React, { useState, useRef, useEffect } from 'react';
import { Task, Project, User, Comment, Attachment } from '../types';

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedTask: Task) => void;
    task: Task;
    project: Project;
    currentUser: User;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const MentionHighlight = ({ text }) => {
    const parts = text.split(/(@\w+)/g);
    return (
        <span>
            {parts.map((part, i) =>
                part.startsWith('@') ? (
                    <strong key={i} style={{ color: 'var(--accent-color)' }}>{part}</strong>
                ) : (
                    part
                )
            )}
        </span>
    );
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, onSave, task, project, currentUser }) => {
    const [currentTask, setCurrentTask] = useState<Task>(task);
    const [newComment, setNewComment] = useState('');
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setCurrentTask(task);
    }, [task]);

    if (!isOpen) return null;

    const handleFieldChange = (field: keyof Task, value: any) => {
        setCurrentTask(prev => ({ ...prev, [field]: value }));
    };

    const handleAddComment = () => {
        if (newComment.trim()) {
            const comment: Comment = {
                id: `comment-${Date.now()}`,
                authorId: currentUser.id,
                authorName: currentUser.username,
                timestamp: new Date().toISOString(),
                text: newComment,
            };
            handleFieldChange('comments', [...(currentTask.comments || []), comment]);
            setNewComment('');
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const fileData = await fileToBase64(file);
                const attachment: Attachment = {
                    id: `attachment-${Date.now()}`,
                    uploaderId: currentUser.id,
                    uploaderName: currentUser.username,
                    timestamp: new Date().toISOString(),
                    fileName: file.name,
                    fileData,
                    fileType: file.type,
                };
                handleFieldChange('attachments', [...(currentTask.attachments || []), attachment]);
            } catch (error) {
                console.error("Error converting file to base64:", error);
                alert("Could not attach file.");
            }
        }
    };
    
    const handleSave = () => {
        onSave(currentTask);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleSave}>
            <div className="modal-content task-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="task-detail-header">
                    <h2 id="task-detail-title">{currentTask.name}</h2>
                    <button onClick={handleSave} className="button-close" aria-label="Close">&times;</button>
                </div>

                <div className="task-detail-body">
                    <div className="task-detail-main">
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={currentTask.description || ''}
                                onChange={e => handleFieldChange('description', e.target.value)}
                                rows={4}
                                placeholder="Add a more detailed description..."
                            />
                        </div>
                        
                         <div className="form-group">
                            <label>Recurrence</label>
                            <select
                                value={currentTask.recurrence?.interval || 'none'}
                                onChange={e => handleFieldChange('recurrence', { interval: e.target.value as any })}
                                className="form-group"
                                style={{ width: 'auto', minWidth: '200px', padding: '0.5rem' }}
                            >
                                <option value="none">None</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>

                        <div className="attachments-section">
                            <h3>Attachments</h3>
                            <ul className="attachment-list">
                                {(currentTask.attachments || []).map(att => (
                                    <li key={att.id}>
                                        <a href={att.fileData} download={att.fileName}>{att.fileName}</a>
                                        <small>by {att.uploaderName} on {new Date(att.timestamp).toLocaleDateString()}</small>
                                    </li>
                                ))}
                            </ul>
                             <button onClick={() => attachmentInputRef.current?.click()} className="button button-small" style={{marginTop: '0.5rem'}}>Add Attachment</button>
                             <input type="file" ref={attachmentInputRef} onChange={handleFileChange} style={{display: 'none'}} />
                        </div>

                        <div className="comments-section">
                            <h3>Comments</h3>
                            <div className="comment-list">
                                {(currentTask.comments || []).map(comment => (
                                    <div key={comment.id} className="comment">
                                        <div className="comment-author">{comment.authorName}</div>
                                        <div className="comment-text"><MentionHighlight text={comment.text} /></div>
                                        <div className="comment-timestamp">{new Date(comment.timestamp).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="comment-form">
                                <textarea
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder="Add a comment... Use @ to mention a team member."
                                    rows={3}
                                />
                                <button onClick={handleAddComment} className="button button-primary">Post Comment</button>
                            </div>
                        </div>
                    </div>

                    <div className="task-detail-sidebar">
                        <h4>Details</h4>
                        <div className="detail-item">
                            <span>Status</span>
                            <span>{currentTask.status}</span>
                        </div>
                        <div className="detail-item">
                            <span>Assignee</span>
                            <span>{project.team.find(m => m.role === currentTask.role)?.name || 'Unassigned'}</span>
                        </div>
                         <div className="detail-item">
                            <span>Due Date</span>
                            <span>{currentTask.endDate}</span>
                        </div>
                        <div className="detail-item">
                            <span>Sprint</span>
                            <span>{project.sprints.find(s => s.id === currentTask.sprintId)?.name || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                            <span>Dependencies</span>
                            <span>{currentTask.dependsOn?.length || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="modal-actions" style={{ justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)'}}>
                    <button onClick={handleSave} className="button button-primary">Save & Close</button>
                </div>
            </div>
        </div>
    );
};