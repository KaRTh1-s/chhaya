import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'beige' | 'dark' | 'white';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'beige',
  className = '',
  style,
  onClick,
}) => {
  const variantClass = variant === 'dark' ? 'card-dark' : variant === 'white' ? 'card-white' : '';
  return (
    <div className={`card ${variantClass} ${className}`.trim()} style={style} onClick={onClick}>
      {children}
    </div>
  );
};
