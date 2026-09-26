import { ImageOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { t } from '@/shared/copy/es-CO';

import styles from './ProductImage.module.css';

export interface ProductImageProps {
  src: string;
  alt: string;
  /** The page's main image: loaded first, never lazily. */
  priority?: boolean;
  /** A thumbnail: the placeholder shows its icon only, with no room for words. */
  compact?: boolean;
  className?: string;
}

/**
 * A product photo in a fixed square, so the layout never moves while it loads.
 * The square shows a neutral background until the image arrives, and a
 * placeholder if it cannot load, for instance a signed URL that has expired.
 */
export const ProductImage = ({
  src,
  alt,
  priority = false,
  compact = false,
  className,
}: ProductImageProps): ReactNode => {
  // Remembering which URL failed, rather than a flag, means a fresh signed URL
  // from a refetch is tried again without an effect to reset anything.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const frameClass = [styles.frame, className].filter(Boolean).join(' ');

  if (failedSrc === src) {
    return (
      <div className={`${frameClass} ${styles.fallback}`} role="img" aria-label={alt}>
        <ImageOff aria-hidden className={styles.fallbackIcon} />
        {compact ? null : (
          <span className={styles.fallbackText}>{t('product.imageUnavailable')}</span>
        )}
      </div>
    );
  }

  return (
    <div className={frameClass}>
      <img
        className={styles.image}
        src={src}
        alt={alt}
        width={800}
        height={800}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => setFailedSrc(src)}
      />
    </div>
  );
};
