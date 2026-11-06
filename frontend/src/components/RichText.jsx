import { Fragment } from 'react';

const renderInline = (text, keyPrefix) => {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
};

/**
 * Small, safe renderer for the assistant's markdown-like responses.
 * It never injects HTML, so model output cannot execute scripts.
 */
export default function RichText({ text = '' }) {
  const lines = text.split('\n');

  return (
    <div className="rich-text">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line) return <div className="rich-space" key={index} />;
        if (line === '---') return <hr key={index} />;

        if (/^\*\*[^*]+\*\*$/.test(line)) {
          return <h5 key={index}>{line.slice(2, -2)}</h5>;
        }

        if (/^[•\-]\s+/.test(line)) {
          return (
            <div className="rich-li" key={index}>
              <span className="rich-bullet" />
              <p>{renderInline(line.replace(/^[•\-]\s+/, ''), index)}</p>
            </div>
          );
        }

        if (/^\d+\.\s+/.test(line)) {
          const [number] = line.match(/^\d+/);
          return (
            <div className="rich-li rich-numbered" key={index}>
              <span className="rich-number">{number}</span>
              <p>{renderInline(line.replace(/^\d+\.\s+/, ''), index)}</p>
            </div>
          );
        }

        return <p key={index}>{renderInline(line, index)}</p>;
      })}
    </div>
  );
}
