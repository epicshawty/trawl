import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { cn, isMac } from '@/lib/utils';

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="trawl-logo" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#trawl-logo)" opacity="0.16" />
      <rect x="1" y="1" width="30" height="30" rx="9" stroke="url(#trawl-logo)" strokeWidth="1.2" opacity="0.55" />
      <path
        d="M8 9h16l-1.6 6.4a7 7 0 0 1-6.8 5.3h-.2a7 7 0 0 1-6.8-5.3L8 9Z"
        stroke="url(#trawl-logo)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M16 12v9.5m0 0-3-3m3 3 3-3" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ControlButton({
  onClick,
  children,
  danger,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'no-drag grid h-8 w-11 place-items-center text-fg-dim transition-colors duration-150',
        danger ? 'hover:bg-rose hover:text-white' : 'hover:bg-white/10 hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

export function TitleBar({ subtitle }: { subtitle?: string }) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (isMac) return;
    void window.trawl.window.isMaximized().then(setMaximized);
    return window.trawl.window.onMaximizeChange(setMaximized);
  }, []);

  return (
    <header className="drag-region relative z-20 flex h-11 shrink-0 items-center border-b border-line/70 bg-ink/40 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 pl-4">
        <Logo size={20} />
        <span className="text-[12.5px] font-semibold tracking-[0.02em] text-fg">Trawl</span>
        {subtitle ? (
          <>
            <span className="text-fg-dim/50">/</span>
            <span className="text-[12px] text-fg-dim">{subtitle}</span>
          </>
        ) : null}
      </div>

      <div className="flex-1" />

      {!isMac ? (
        <div className="flex items-center">
          <ControlButton label="Minimize" onClick={() => window.trawl.window.minimize()}>
            <Minus className="size-4" />
          </ControlButton>
          <ControlButton
            label={maximized ? 'Restore' : 'Maximize'}
            onClick={() => window.trawl.window.toggleMaximize()}
          >
            {maximized ? <Copy className="size-3.5 -scale-x-100" /> : <Square className="size-3" />}
          </ControlButton>
          <ControlButton label="Close" danger onClick={() => window.trawl.window.close()}>
            <X className="size-4" />
          </ControlButton>
        </div>
      ) : (
        <div className="h-11 w-20" />
      )}
    </header>
  );
}
