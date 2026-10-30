import React from 'react';

type DcButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'pastel';
};

const variantClasses = {
  primary: 'bg-primary text-on-primary',
  secondary: 'bg-surface text-on-surface',
  ghost: 'bg-transparent text-on-surface',
  pastel: 'bg-dc-mint text-on-primary',
};

export const DcButton: React.FC<DcButtonProps> = ({
  children,
  className = '',
  variant = 'secondary',
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={[
      'inline-flex items-center justify-center gap-2 border-2 border-outline-variant rounded-[var(--dc-radius-control)] px-4 py-3 font-label-mono text-[10px] uppercase font-bold',
      'transition-transform duration-180 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5',
      variantClasses[variant],
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </button>
);
