import React from 'react';

export interface DevCastLogoProps {
  /**
   * Theme mode:
   * - 'dark': Purple >>)) + Purple 'Dev' + White 'Cast' (for dark backgrounds)
   * - 'light': Purple >>)) + Purple 'Dev' + Dark Grey 'Cast' (for light backgrounds)
   * - 'auto': Reads active theme class or localStorage
   */
  theme?: 'dark' | 'light' | 'auto';
  /**
   * Variant:
   * - 'logo': Full horizontal brand lockup
   * - 'icon': Rounded squircle app icon
   * - 'glyph': Standalone purple >>)) symbol without background or text
   */
  variant?: 'logo' | 'icon' | 'glyph';
  height?: number | string;
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export function DevCastLogo({
  theme = 'auto',
  variant = 'logo',
  height = 32,
  width = 'auto',
  className = '',
  style = {},
  alt = 'DevCast',
}: DevCastLogoProps) {
  // Determine effective theme
  let effectiveTheme: 'dark' | 'light' = 'dark';
  if (theme === 'dark' || theme === 'light') {
    effectiveTheme = theme;
  } else {
    const isClientLight = typeof document !== 'undefined' && (
      document.documentElement.classList.contains('light-theme') ||
      localStorage.getItem('devcast_theme') === 'light'
    );
    effectiveTheme = isClientLight ? 'light' : 'dark';
  }

  let src = '';
  if (variant === 'glyph') {
    src = '/glyph.png';
  } else if (variant === 'icon') {
    src = effectiveTheme === 'light' ? '/icon-light.png' : '/icon-dark.png';
  } else {
    src = effectiveTheme === 'light' ? '/logo-light.png' : '/logo-dark.png';
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`devcast-brand-asset devcast-${variant} ${className}`}
      style={{
        height,
        width,
        display: 'block',
        objectFit: 'contain',
        ...style,
      }}
      loading="eager"
    />
  );
}

export default DevCastLogo;
