import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

/**
 * Thin React wrapper around `lottie-web` for inline Lottie/Bodymovin
 * animations. Used by empty-state placeholders across MIH forms
 * (e.g. HistoryTimeline → Blood Pressure Monitor, HistoryListForm →
 * Disease History) so every illustration site shares the same
 * mount/cleanup contract:
 *
 *   • `animationData` is the parsed JSON object — pass via Vite JSON
 *     import (`import data from '@/assets/illustrations/foo.json'`)
 *     so the animation is bundled and renders synchronously on mount.
 *     Avoids the race we hit with `path:` (lottie creates the SVG
 *     container immediately but leaves it empty until fetch resolves;
 *     under HMR the cleanup can fire before fetch completes).
 *   • `size` controls the square viewport in CSS pixels (default 112,
 *     matching Material Symbols medium icon).
 *   • `loop` / `autoplay` default to true for ambient empty-state loops.
 *   • Renderer is fixed to `svg` (vector, retintable, crisp at any DPR).
 *   • `aria-hidden` so screen readers skip the decorative illustration
 *     — the surrounding `<p>` text already conveys meaning.
 */
const LottieIllustration = ({
  animationData,
  size = 112,
  loop = true,
  autoplay = true,
  className = '',
  style,
  ariaLabel,
}) => {
  const hostRef = useRef(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !animationData) return undefined;
    const anim = lottie.loadAnimation({
      container: host,
      renderer: 'svg',
      loop,
      autoplay,
      animationData,
      rendererSettings: {
        /* Keep the source artboard centred within our square box —
           works for any source aspect ratio (1080×1080, 500×500, …). */
        preserveAspectRatio: 'xMidYMid meet',
      },
    });
    return () => anim.destroy();
  }, [animationData, loop, autoplay]);

  return (
    <div
      ref={hostRef}
      className={className}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      style={{
        width: size,
        height: size,
        lineHeight: 0,
        ...style,
      }}
    />
  );
};

export default LottieIllustration;
