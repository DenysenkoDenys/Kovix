import { useState } from 'react';
import CustomSpinner from './CustomSpinner';

function LazyImage({ src, alt, placeholder, className, style, width, height, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const displaySrc = errored ? (placeholder || src) : src;

    const aspectStyle = (width && height) ? { aspectRatio: `${width} / ${height}` } : {};

    return (
    <div className={`lazy-image-wrapper ${className || ''}`} style={{ position: 'relative', overflow: 'hidden', ...style, ...aspectStyle }}>
      {!loaded && (
        <div className="lazy-image-loader">
          <CustomSpinner size="small" />
        </div>
      )}
      <img
        src={displaySrc}
        alt={alt}
        {...(width ? { width } : {})}
        {...(height ? { height } : {})}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setErrored(true);
          setLoaded(true);
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
        {...props}
      />
    </div>
  );
}

export default LazyImage;