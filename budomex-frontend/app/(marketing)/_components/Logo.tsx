type Props = {
  variant?: "default" | "reversed";
  className?: string;
};

export default function Logo({ variant = "default", className }: Props) {
  const isReversed = variant === "reversed";
  const wordmarkColor = isReversed ? "#FBF9F5" : "#1B3A5C";
  const accentColor = "#B33A2A";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 56"
      className={`logo-mark ${className ?? ""}`}
      role="img"
      aria-label="Budomex"
    >
      <g>
        <rect x="6" y="22" width="40" height="26" fill={wordmarkColor} />
        <polygon points="6,22 26,4 46,22" fill={accentColor} />
        <polygon
          points="16,22 26,12 36,22 30,22 26,18 22,22"
          fill={isReversed ? "#1B3A5C" : "#FBF9F5"}
        />
      </g>
      <text
        x="58"
        y="40"
        fontFamily="Archivo, system-ui, sans-serif"
        fontSize="26"
        fontWeight="900"
        letterSpacing="0.04em"
        fill={wordmarkColor}
      >
        BUDOMEX
      </text>
    </svg>
  );
}
