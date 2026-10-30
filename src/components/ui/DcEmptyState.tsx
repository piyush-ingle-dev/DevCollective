import React from 'react';

type DcEmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export const DcEmptyState: React.FC<DcEmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => (
  <div className={['border-2 border-dashed border-outline-variant rounded-[var(--dc-radius-card)] p-8 text-center', className].filter(Boolean).join(' ')}>
    {icon && <div className="mb-3 flex justify-center text-primary">{icon}</div>}
    <p className="font-label-mono text-xs uppercase font-bold">{title}</p>
    {description && <p className="mx-auto mt-2 max-w-sm text-xs text-on-surface-variant">{description}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);
