import React from 'react';

// This parser is basic and for demonstration purposes.
// For production, a more robust library like 'react-markdown' would be better.
export const parseMarkdown = (markdownText: string): React.ReactNode[] => {
    if (!markdownText) return [];
    const lines = markdownText.split('\n');
    const elements: React.ReactNode[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            if (listType === 'ul') {
                elements.push(React.createElement('ul', { key: `list-${elements.length}` }, listItems));
            } else if (listType === 'ol') {
                elements.push(React.createElement('ol', { key: `list-${elements.length}` }, listItems));
            }
            listItems = [];
            listType = null;
        }
    };

    const parseLineToHtml = (line: string) => {
        // Basic escaping to prevent raw HTML injection
        line = line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        
        // Markdown conversions
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
        line = line.replace(/`([^`]+)`/g, '<code>$1</code>'); // Inline code
        line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'); // Links
        return { __html: line };
    };

    lines.forEach((line, index) => {
        const key = `md-${index}`;
        if (line.startsWith('### ')) {
            flushList();
            elements.push(React.createElement('h3', { key, dangerouslySetInnerHTML: parseLineToHtml(line.substring(4)) }));
        } else if (line.startsWith('## ')) {
            flushList();
            elements.push(React.createElement('h2', { key, dangerouslySetInnerHTML: parseLineToHtml(line.substring(3)) }));
        } else if (line.startsWith('# ')) {
            flushList();
            elements.push(React.createElement('h1', { key, dangerouslySetInnerHTML: parseLineToHtml(line.substring(2)) }));
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            if (listType !== 'ul') {
                flushList();
                listType = 'ul';
            }
            listItems.push(React.createElement('li', { key, dangerouslySetInnerHTML: parseLineToHtml(line.substring(2)) }));
        } else if (line.match(/^\d+\.\s/)) {
            if (listType !== 'ol') {
                flushList();
                listType = 'ol';
            }
            listItems.push(React.createElement('li', { key, dangerouslySetInnerHTML: parseLineToHtml(line.replace(/^\d+\.\s/, '')) }));
        } else if (line.trim() === '---') {
            flushList();
            elements.push(React.createElement('hr', { key }));
        } else if (line.trim() !== '') {
            flushList();
            elements.push(React.createElement('p', { key, dangerouslySetInnerHTML: parseLineToHtml(line) }));
        }
    });

    flushList();
    return elements;
};