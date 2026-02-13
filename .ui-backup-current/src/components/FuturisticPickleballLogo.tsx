export const FuturisticPickleballLogo = () => {
  return (
    <div className="brand-mark" aria-label="Pickleball app logo" role="img">
      <svg viewBox="0 0 72 72" className="brand-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="chipSurface" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f1f33" />
            <stop offset="100%" stopColor="#0a1424" />
          </linearGradient>
          <radialGradient id="ballCore" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#9cf6ff" />
            <stop offset="60%" stopColor="#30d4ed" />
            <stop offset="100%" stopColor="#0d93bb" />
          </radialGradient>
          <linearGradient id="neonStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7ef8ff" />
            <stop offset="100%" stopColor="#23e1d4" />
          </linearGradient>
          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform="translate(4,7)">
          <rect x="0" y="0" width="62" height="62" rx="18" fill="url(#chipSurface)" />
          <rect x="0.6" y="0.6" width="60.8" height="60.8" rx="17.4" fill="none" stroke="#2b4868" />
          <path d="M8 50 C18 32, 42 30, 54 14" stroke="url(#neonStroke)" strokeWidth="1.6" fill="none" opacity="0.9" />
          <path d="M10 54 C21 36, 45 34, 58 18" stroke="#5ce8ff" strokeWidth="0.8" fill="none" opacity="0.6" />

          <g transform="translate(10,10)" filter="url(#softGlow)">
            <circle cx="21" cy="21" r="17.5" fill="url(#ballCore)" />
            <circle cx="21" cy="21" r="18.2" fill="none" stroke="url(#neonStroke)" strokeWidth="1.2" />
            <circle cx="14" cy="13" r="2.4" fill="#0c617d" opacity="0.72" />
            <circle cx="27.2" cy="12.2" r="2.3" fill="#0c617d" opacity="0.72" />
            <circle cx="9.8" cy="21.2" r="2.2" fill="#0c617d" opacity="0.72" />
            <circle cx="21" cy="21.2" r="2.45" fill="#0c617d" opacity="0.72" />
            <circle cx="32.2" cy="21" r="2.15" fill="#0c617d" opacity="0.72" />
            <circle cx="14.3" cy="29.8" r="2.25" fill="#0c617d" opacity="0.72" />
            <circle cx="27.3" cy="29.3" r="2.3" fill="#0c617d" opacity="0.72" />
            <ellipse cx="15.5" cy="9.5" rx="7" ry="3.2" fill="#dbfeff" opacity="0.2" />
          </g>
        </g>

      </svg>
    </div>
  );
};
