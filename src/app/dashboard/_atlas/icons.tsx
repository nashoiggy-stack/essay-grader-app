import type { ReactElement, ReactNode, SVGProps } from "react";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  readonly size?: number;
  readonly children: ReactNode;
}

function Icon({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

type SimpleIconProps = Omit<IconProps, "children">;

export const IconArrow = (p: SimpleIconProps) => (
  <Icon {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </Icon>
);

export const IconRefresh = (p: SimpleIconProps) => (
  <Icon {...p}>
    <polyline points="20 6 20 11 15 11" />
    <path d="M20 11A8 8 0 1 0 18 18" />
  </Icon>
);

export const IconSpark = (p: SimpleIconProps) => (
  <Icon {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8" />
  </Icon>
);

export const IconUser = (p: SimpleIconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
  </Icon>
);

export const IconPen = (p: SimpleIconProps) => (
  <Icon {...p}>
    <path d="M14 4l6 6L8 22H2v-6L14 4z" />
  </Icon>
);

export const IconCalc = (p: SimpleIconProps) => (
  <Icon {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <line x1="9" y1="7" x2="15" y2="7" />
    <line x1="9" y1="12" x2="9.01" y2="12" />
    <line x1="12" y1="12" x2="12.01" y2="12" />
    <line x1="15" y1="12" x2="15.01" y2="12" />
    <line x1="9" y1="16" x2="9.01" y2="16" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
    <line x1="15" y1="16" x2="15.01" y2="16" />
  </Icon>
);

export const IconClipboard = (p: SimpleIconProps) => (
  <Icon {...p}>
    <rect x="6" y="4" width="12" height="18" rx="2" />
    <path d="M9 4v-1h6v1" />
    <line x1="9" y1="10" x2="15" y2="10" />
    <line x1="9" y1="14" x2="15" y2="14" />
    <line x1="9" y1="18" x2="13" y2="18" />
  </Icon>
);

export const IconResume = (p: SimpleIconProps) => (
  <Icon {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="13" y2="16" />
  </Icon>
);

export const IconSchool = (p: SimpleIconProps) => (
  <Icon {...p}>
    <path d="M3 10l9-5 9 5-9 5-9-5z" />
    <path d="M7 12v5c0 1 2 3 5 3s5-2 5-3v-5" />
  </Icon>
);

export const IconChart = (p: SimpleIconProps) => (
  <Icon {...p}>
    <line x1="4" y1="20" x2="20" y2="20" />
    <rect x="6" y="12" width="3" height="8" />
    <rect x="11" y="7" width="3" height="13" />
    <rect x="16" y="14" width="3" height="6" />
  </Icon>
);

export const IconCompare = (p: SimpleIconProps) => (
  <Icon {...p}>
    <path d="M8 4v16M16 4v16" />
    <polyline points="4 8 8 4 12 8" />
    <polyline points="12 16 16 20 20 16" />
  </Icon>
);

export const IconCompass = (p: SimpleIconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <polygon points="14 10 8 14 10 8 16 10" fill="currentColor" stroke="none" />
  </Icon>
);

// Graded list — three rows with a small badge mark at the top-right to
// signal "graded" / "ranked", paired with /list.
export const IconListGrade = (p: SimpleIconProps) => (
  <Icon {...p}>
    <line x1="4" y1="7" x2="14" y2="7" />
    <line x1="4" y1="12" x2="16" y2="12" />
    <line x1="4" y1="17" x2="13" y2="17" />
    <circle cx="18" cy="6" r="2.5" fill="currentColor" stroke="none" />
  </Icon>
);

export type ToolIconKey =
  | "essay"
  | "gpa"
  | "extracurriculars"
  | "resume"
  | "colleges"
  | "list"
  | "chances"
  | "compare"
  | "strategy";

export type ToolIconComponent = (p: SimpleIconProps) => ReactElement;

export const TOOL_ICON: Record<ToolIconKey, ToolIconComponent> = {
  essay: IconPen,
  gpa: IconCalc,
  extracurriculars: IconClipboard,
  resume: IconResume,
  colleges: IconSchool,
  list: IconListGrade,
  chances: IconChart,
  compare: IconCompare,
  strategy: IconCompass,
};
