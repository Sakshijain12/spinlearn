const paths = {
  brain: "M12 5a3 3 0 0 0-5-2 4 4 0 0 0-3 6 4 4 0 0 0 0 7 4 4 0 0 0 3 5 3 3 0 0 0 5-2V5Zm0 0a3 3 0 0 1 5-2 4 4 0 0 1 3 6 4 4 0 0 1 0 7 4 4 0 0 1-3 5 3 3 0 0 1-5-2M7 7c0 2 1 3 3 3M17 7c0 2-1 3-3 3M6 15c2-1 4 0 4 2M18 15c-2-1-4 0-4 2",
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  library: "M3 3h5v18H3V3Zm7 0h4v18h-4V3Zm7 1 4-1 3 17-4 1-3-17ZM4 7h3M11 7h2",
  chart: "M3 13h5v8H3v-8Zm7-10h5v18h-5V3Zm7 6h5v12h-5V9Z",
  flame: "M13 2c1 6-4 6-3 11 1-1 3-2 4-4 2 2 5 5 4 8a6 6 0 0 1-12 0c-1-4 2-6 3-9 0 3 2 3 2 1 1-2 1-5 2-7Z",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2",
  bookmark: "M6 3h12v19l-6-4-6 4V3Z",
  check: "m5 12 4 4L19 6",
  search: "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-2 6 6 6",
  right: "M4 12h16m-6-6 6 6-6 6",
  left: "M20 12H4m6-6-6 6 6 6",
  external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
  rotate: "M20 7a9 9 0 0 0-15-2L2 8m0-6v6h6M4 17a9 9 0 0 0 15 2l3-3m0 6v-6h-6",
  close: "m6 6 12 12M6 18 18 6",
  chevron: "m9 5 7 7-7 7",
  copy: "M8 8h13v13H8V8ZM16 8V3H3v13h5",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  info: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 11v6M12 7h.01",
  layers: "m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2",
  logout: "M9 3H4v18h5M9 12h12m-5-5 5 5-5 5",
};

export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: keyof typeof paths;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  );
}
