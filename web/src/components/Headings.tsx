import React from 'react';

interface KickerProps {
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}

export const Kicker: React.FC<KickerProps> = ({ children, light = false, className = '' }) => {
  return (
    <span className={`kicker ${light ? 'kicker-light' : ''} ${className}`.trim()}>
      {children}
    </span>
  );
};

interface SerifHeadingProps {
  level?: 1 | 2 | 3 | 4;
  text?: string;
  children?: React.ReactNode;
  light?: boolean;
  className?: string;
  size?: 'display' | 'h1' | 'h2' | 'h3';
}

export const SerifHeading: React.FC<SerifHeadingProps> = ({
  level = 2,
  text,
  children,
  light = false,
  className = '',
  size,
}) => {
  const Tag = `h${level}` as React.ElementType;
  const sizeClass = size ? `font-size-${size}` : '';
  const combinedClass = `serif-heading ${light ? 'light' : ''} ${sizeClass} ${className}`.trim();

  // If text is passed with markdown-style *italic* markers, parse them into <em>
  if (text && !children) {
    const parts = text.split(/(\*[^*]+\*)/g);
    return (
      <Tag className={combinedClass}>
        {parts.map((part, i) => {
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
          }
          return part;
        })}
      </Tag>
    );
  }

  return <Tag className={combinedClass}>{children}</Tag>;
};
