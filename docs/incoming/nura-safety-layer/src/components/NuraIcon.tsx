// Approved icon: two speech bubbles fused into a shield with the Nura flame
// centered — the fire in the house of gathering.
export function NuraIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M32 4 L56 14 V30 C56 46 46 56 32 60 C18 56 8 46 8 30 V14 Z"
        fill="url(#nuraShield)"
        opacity="0.9"
      />
      <path
        d="M22 24c0-4 3.5-7 8-7s8 3 8 7c0 3-2 5.5-5 6.6l1 4.4-4.4-2.2c-4.4-.3-7.6-3.4-7.6-8.8z"
        fill="#0b0b12"
        opacity="0.35"
      />
      <path
        d="M32 20c-2.5 3-4 5.4-4 7.8 0 2.4 1.8 4.2 4 4.2s4-1.8 4-4.2c0-.9-.3-1.7-.7-2.5.1 1-.3 1.9-1 2.4.2-1.6-.5-3.3-2.3-7.7z"
        fill="#ffb347"
      />
      <defs>
        <linearGradient id="nuraShield" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#7c2d12" />
        </linearGradient>
      </defs>
    </svg>
  );
}
