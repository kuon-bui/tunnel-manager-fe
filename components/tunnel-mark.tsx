import type { SVGProps } from "react";

export function TunnelMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="8" fill="#17171c" />
      <path d="M7.5 24V14.5a8.5 8.5 0 0 1 17 0V24" stroke="#f38020" strokeWidth="3" strokeLinecap="round" />
      <path d="M10 19h12m-3-3 3 3-3 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
