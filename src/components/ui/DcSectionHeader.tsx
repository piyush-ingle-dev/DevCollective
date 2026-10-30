import React from 'react';

type DcSectionHeaderProps = {
  eyebrow: string;
  title: string;
  trailing?: React.ReactNode;
  className?: string;
};

export const DcSectionHeader: React.FC<DcSectionHeaderProps> = ({
  eyebrow,
  title,
  trailing,
  className = '',
}) => (
  <div className={['dc-dashboard-section-heading', className].filter(Boolean).join(' ')}>
    <div>
      <p className="dc-dashboard-section-label">{eyebrow}</p>
      <h3 className="dc-dashboard-section-title">{title}</h3>
    </div>
    {trailing}
  </div>
);
