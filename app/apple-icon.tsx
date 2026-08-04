import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <svg width="180" height="180" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#17171c" />
      <path d="M7.5 24V14.5a8.5 8.5 0 0 1 17 0V24" fill="none" stroke="#f38020" strokeWidth="3" strokeLinecap="round" />
      <path d="M10 19h12m-3-3 3 3-3 3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>,
    size,
  );
}
