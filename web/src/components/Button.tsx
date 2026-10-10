import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
  as?: 'button' | 'a';
  href?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  as = 'button',
  href,
  target,
  rel,
  children,
  className = '',
  ...props
}) => {
  const combinedClassName = `btn btn-${variant} ${className}`.trim();

  if (as === 'a' && href) {
    return (
      <a href={href} className={combinedClassName} target={target} rel={rel}>
        {children}
      </a>
    );
  }

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
};
