import React from 'react';

interface MarqueeProps {
  items: string[];
  reverse?: boolean;
  className?: string;
}

export const Marquee: React.FC<MarqueeProps> = ({ items, reverse = false, className = '' }) => {
  const content = items.map((item, index) => (
    <React.Fragment key={`${item}-${index}`}>
      <span className="dc-marquee-item">{item}</span>
      <span className="dc-marquee-dot" aria-hidden="true">✦</span>
    </React.Fragment>
  ));

  return (
    <div className={`dc-marquee ${className}`} aria-label={items.join(', ')}>
      <div className={`dc-marquee-track ${reverse ? 'dc-marquee-reverse' : ''}`}>
        <div className="dc-marquee-content">{content}</div>
        <div className="dc-marquee-content" aria-hidden="true">{content}</div>
      </div>
    </div>
  );
};
