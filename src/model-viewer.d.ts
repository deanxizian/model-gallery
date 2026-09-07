import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { ModelViewerElement } from '@google/model-viewer';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<
        HTMLAttributes<ModelViewerElement>,
        ModelViewerElement
      > & {
        src?: string;
        alt?: string;
        poster?: string;
        'camera-controls'?: boolean;
        'camera-orbit'?: string;
        'auto-rotate'?: boolean;
        'auto-rotate-delay'?: string;
        'rotation-per-second'?: string;
        'shadow-intensity'?: string;
        'shadow-softness'?: string;
        'environment-image'?: string;
        exposure?: string;
        'interaction-prompt'?: string;
        'touch-action'?: string;
        'min-camera-orbit'?: string;
        'max-camera-orbit'?: string;
        'field-of-view'?: string;
        loading?: string;
      };
    }
  }
}
