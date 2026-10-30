import React from 'react';

type DcCardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  tone?: 'default' | 'blue' | 'mint' | 'yellow' | 'lavender' | 'pink';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
};

export const DcCard: React.FC<DcCardProps> = ({
  children,
  className = '',
  interactive = false,
  tone = 'default',
  shadow = 'none',
  ...props
}) => {
  const toneClasses = { default: '', blue: 'bg-dc-blue', mint: 'bg-dc-mint', yellow: 'bg-dc-yellow', lavender: 'bg-dc-lavender', pink: 'bg-dc-pink' } as const;
  const shadowClasses = { none: '', sm: 'dc-shadow-sm', md: 'dc-shadow-md', lg: 'dc-shadow-lg' } as const;
  return (
  <div
    className={[
      'border-2 border-outline-variant bg-surface rounded-[var(--dc-radius-card)]',
      toneClasses[tone],
      shadowClasses[shadow],
      interactive ? 'transition-transform duration-180 hover:-translate-x-0.5 hover:-translate-y-0.5' : '',
      className,
    ].filter(Boolean).join(' ')}
    {...props}
  >
    {children}
  </div>
  );
};
