import { DevCastLogo } from './DevCastLogo';

export interface BrandMarkProps {
  size?: number;
  theme?: 'dark' | 'light' | 'auto';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * DevCast Brand Mark — uses the new app squircle icon with purple >>)) glyph
 * matching Gemini_Generated_Image_pbtgnepbtgnepbtg.png.
 */
export function BrandMark({ size = 36, theme = 'auto', className = '', style = {} }: BrandMarkProps) {
  return (
    <DevCastLogo
      variant="icon"
      theme={theme}
      height={size}
      width={size}
      className={className}
      style={{
        borderRadius: 8,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export default BrandMark;
