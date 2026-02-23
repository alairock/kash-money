import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export const Tooltip = ({ content, children }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [position, setPosition] = useState({ top: 0, left: 0, arrowLeft: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const contentWhitespaceClass = content.includes('\n') ? 'whitespace-pre-line' : 'whitespace-nowrap';

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const updatePlacement = () => {
      const container = containerRef.current;
      const tooltip = tooltipRef.current;

      if (!container || !tooltip) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 8;

      const spaceAbove = containerRect.top - gap;
      const spaceBelow = window.innerHeight - containerRect.bottom - gap;
      const showBelow = spaceAbove < tooltipRect.height && spaceBelow > spaceAbove;
      const nextPlacement: 'top' | 'bottom' = showBelow ? 'bottom' : 'top';
      setPlacement(nextPlacement);

      const centeredLeft = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
      const clampedLeft = Math.max(
        viewportPadding,
        Math.min(centeredLeft, window.innerWidth - viewportPadding - tooltipRect.width),
      );

      const top =
        nextPlacement === 'top'
          ? containerRect.top - tooltipRect.height - gap
          : containerRect.bottom + gap;

      const arrowLeft = containerRect.left + containerRect.width / 2 - clampedLeft;

      setPosition({
        top: Math.max(viewportPadding, top),
        left: clampedLeft,
        arrowLeft: Math.max(12, Math.min(tooltipRect.width - 12, arrowLeft)),
      });
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);

    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isVisible, content]);

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div
          ref={tooltipRef}
          className={`pointer-events-none fixed z-50 w-max min-w-[11rem] max-w-[calc(100vw-1rem)] rounded-lg border border-white/10 bg-black/90 px-4 py-2 text-sm font-semibold text-white shadow-lg animate-fade-in sm:min-w-[16rem] ${contentWhitespaceClass}`}
          style={{ top: position.top, left: position.left }}
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute ${
              placement === 'top' ? 'top-full -mt-1' : 'bottom-full -mb-1'
            }`}
            style={{ left: position.arrowLeft }}
          >
            <div
              className={`h-2 w-2 rotate-45 bg-black/90 ${
                placement === 'top' ? 'border-r border-b border-white/10' : 'border-l border-t border-white/10'
              }`}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};
