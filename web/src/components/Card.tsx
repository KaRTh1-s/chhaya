import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'beige' | 'dark' | 'white';
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'beige',
  className = '',
  style,
}) => {
  const variantClass = variant === 'dark' ? 'card-dark' : variant === 'white' ? 'card-white' : '';
  return (
    <div className={`card ${variantClass} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
};
