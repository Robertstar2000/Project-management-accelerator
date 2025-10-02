import React, { useRef } from 'react';

const getStatusChipClass = (status) => {
    switch (status) {
        case 'Approved': return 'chip-green';
        case 'Working': return 'chip-amber';
        case 'Rejected': return 'chip-red';
        default: return '';
    }
};

export const DocumentsView = ({ documents, onUpdateDocument }) => {
    const uploadInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        uploadInputRef.current?.click();
    };
    
    return (
        <div className="tool-card">
            <h2 className="subsection-title">Documents Center</h2>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem'}}>
                <button className="button">Download All as .zip</button>
            </div>
            <table className="document-table">
                <thead><tr><th>Title</th><th>Version</th><th>Status</th><th>Owner</th><th>Phase</th><th>Actions</th></tr></thead>
                <tbody>
                    {documents && documents.map(doc => (
                        <tr key={doc.id}>
                            <td>{doc.title}</td>
                            <td>{doc.version}</td>
                            <td>
                                <select 
                                    value={doc.status} 
                                    onChange={(e) => onUpdateDocument(doc.id, e.target.value)}
                                    className={`document-status-select ${getStatusChipClass(doc.status)}`}
                                    aria-label={`Status for ${doc.title}`}
                                >
                                    <option value="Working">Working</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </td>
                            <td>{doc.owner}</td>
                            <td>{doc.phase}</td>
                            <td><a href="#">View</a> | <a href="#">History</a></td>
                        </tr>
                    ))}
                    {(!documents || documents.length === 0) && (
                        <tr><td colSpan={6} style={{textAlign: 'center'}}>No documents found for this project.</td></tr>
                    )}
                </tbody>
            </table>
            <div className="upload-dropzone" onClick={() => uploadInputRef.current?.click()}>
                <p>Drag & drop files to upload</p>
                <a href="#" onClick={handleUploadClick} style={{textDecoration: 'underline', color: 'var(--accent-color)'}}>
                    Open Upload Dialogue
                </a>
            </div>
            <input type="file" ref={uploadInputRef} style={{ display: 'none' }} multiple />
        </div>
    );
};