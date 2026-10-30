import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const PROCESSING_LOTTIE = 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie';

export const SystemSignal: React.FC = () => (
  <div className="w-16 h-16 border-2 border-outline-variant bg-dc-mint flex items-center justify-center overflow-hidden" aria-label="System processing signal">
    <DotLottieReact
      src={PROCESSING_LOTTIE}
      autoplay
      loop
      style={{ width: '100%', height: '100%' }}
    />
  </div>
);
