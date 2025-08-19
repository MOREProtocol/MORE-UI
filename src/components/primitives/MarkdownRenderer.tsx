import { Box, useTheme } from '@mui/material';
import React, { useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
}

// Lightweight markdown to HTML converter for trusted markdown content
function convertMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  // Normalize line endings
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const htmlParts: string[] = [];
  let inList = false;

  const inline = (text: string) => {
    let t = text;
    // Images ![alt](src)
    t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
    // Links [text](href)
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>');
    // Bold **text**
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1<\/strong>');
    // Italic _text_ or *text*
    t = t.replace(/(?:^|[^*])\*([^*]+)\*(?!\*)/g, (m, p1) => m.replace(`*${p1}*`, `<em>${p1}<\/em>`));
    t = t.replace(/_([^_]+)_/g, '<em>$1<\/em>');
    return t;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = inline(headingMatch[2]);
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      htmlParts.push(`<h${level}>${text}<\/h${level}>`);
      continue;
    }

    // Normalize bullets that start with • to '- '
    const normalizedLine = line.replace(/^•\s+/, '- ').replace(/^\*\s+/, '- ');
    if (/^-\s+/.test(normalizedLine)) {
      if (!inList) {
        htmlParts.push('<ul>');
        inList = true;
      }
      htmlParts.push(`<li>${inline(normalizedLine.replace(/^-\s+/, ''))}<\/li>`);
      continue;
    }

    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }

    htmlParts.push(`<p>${inline(line)}<\/p>`);
  }

  if (inList) {
    htmlParts.push('</ul>');
  }

  return htmlParts.join('\n');
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const theme = useTheme();
  const html = useMemo(() => convertMarkdownToHtml(content), [content]);

  return (
    <Box
      className="markdown-body"
      sx={{
        '& h1': { ...theme.typography.h4, margin: '16px 0', color: 'primary.main' },
        '& h2': { ...theme.typography.h5, margin: '14px 0', color: 'primary.main' },
        '& h3': { ...theme.typography.h6, margin: '12px 0' },
        '& p': { ...theme.typography.secondary14, margin: '10px 0', color: 'text.primary' },
        '& ul': { paddingLeft: '20px', margin: '8px 0' },
        '& li': { ...theme.typography.secondary14, margin: '6px 0', color: 'text.primary' },
        '& a': { color: 'primary.main', textDecoration: 'underline' },
        '& img': { maxWidth: '100%', borderRadius: 2, margin: '8px 0' },
        '& strong': { fontWeight: 700 },
        '& em': { fontStyle: 'italic' },
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownRenderer;


