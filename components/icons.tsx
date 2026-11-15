// Simple line icons (stroke = currentColor) used instead of emojis in the dashboard navigation.
import type { SVGProps } from "react";

const PATHS = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></>,
  rotation: <><path d="M20 12a8 8 0 0 1-13.7 5.6" /><path d="M4 12a8 8 0 0 1 13.7-5.6" /><path d="M18 2.5v4h-4" /><path d="M6 21.5v-4h4" /></>,
  sprout: <><path d="M12 21v-9" /><path d="M12 12c0-4 2.5-7 8-7 0 4.5-3 7-8 7Z" /><path d="M12 14c0-3.2-2-5.5-7-5.5 0 3.6 2.5 5.5 7 5.5Z" /></>,
  weather: <><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 11.1 3.5 3.5 0 0 0 7 18Z" /><path d="M9 21l1-2M13 21l1-2" /></>,
  drop: <><path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" /><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  map: <><path d="m9 4-6 2.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5L9 4Z" /><path d="M9 4v13.5M15 6.5V20" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-4 w-4", ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden {...rest}>
      {PATHS[name]}
    </svg>
  );
}
