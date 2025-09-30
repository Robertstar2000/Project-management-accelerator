import React, { useState, useEffect, useMemo } from 'react';

// Basic Markdown parser
const parseMarkdown = (markdownText: string) => {
    const lines = markdownText.split('\n');
    const elements = [];
    let listType = null; // 'ul' or 'ol'
    let listItems = [];

    const flushList = () => {
        if (listItems.length > 0) {
            if (listType === 'ul') {
                elements.push(<ul key={elements.length}>{listItems}</ul>);
            } else if (listType === 'ol') {
                elements.push(<ol key={elements.length}>{listItems}</ol>);
            }
            listItems = [];
            listType = null;
        }
    };

    const parseLine = (line: string) => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
        line = line.replace(/`([^`]+)`/g, '<code>$1</code>'); // Inline code
        line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'); // Links
        return { __html: line };
    };

    lines.forEach((line, index) => {
        if (line.startsWith('### ')) {
            flushList();
            elements.push(<h3 key={index} dangerouslySetInnerHTML={parseLine(line.substring(4))} />);
        } else if (line.startsWith('## ')) {
            flushList();
            elements.push(<h2 key={index} dangerouslySetInnerHTML={parseLine(line.substring(3))} />);
        } else if (line.startsWith('# ')) {
            flushList();
            elements.push(<h1 key={index} dangerouslySetInnerHTML={parseLine(line.substring(2))} />);
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            if (listType !== 'ul') {
                flushList();
                listType = 'ul';
            }
            listItems.push(<li key={index} dangerouslySetInnerHTML={parseLine(line.substring(2))} />);
        } else if (line.match(/^\d+\.\s/)) {
            if (listType !== 'ol') {
                flushList();
                listType = 'ol';
            }
            listItems.push(<li key={index} dangerouslySetInnerHTML={parseLine(line.replace(/^\d+\.\s/, ''))} />);
        } else if (line.trim() === '---') {
            flushList();
            elements.push(<hr key={index} />);
        } else if (line.trim() === '') {
            flushList();
            // We can treat blank lines as paragraph breaks if needed, but for now, just flush lists
        } else {
            flushList();
            elements.push(<p key={index} dangerouslySetInnerHTML={parseLine(line)} />);
        }
    });

    flushList(); // Flush any remaining list
    return elements;
};


interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            fetch('helpme.md')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.text();
                })
                .then(text => {
                    setContent(text);
                    setIsLoading(false);
                })
                .catch(error => {
                    console.error('Error fetching help content:', error);
                    setContent('Could not load help content. Please try again later.');
                    setIsLoading(false);
                });
        }
    }, [isOpen]);

    const parsedContent = useMemo(() => parseMarkdown(content), [content]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content help-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="help-modal-body">
                    {isLoading ? <p>Loading help...</p> : parsedContent}
                </div>
                <div className="modal-actions">
                    <button type="button" className="button button-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};
