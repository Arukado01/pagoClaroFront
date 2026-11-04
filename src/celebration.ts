import confetti from 'canvas-confetti';

/** Celebrate only after the server has confirmed the order. */
export function celebrateOrder(): void {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  try {
    void confetti({
      particleCount: 75,
      spread: 65,
      startVelocity: 32,
      ticks: 130,
      origin: { x: 0.5, y: 0.65 },
      colors: ['#78bd98', '#d9a761', '#e8ede8'],
      disableForReducedMotion: true,
      zIndex: 120,
    })?.catch(() => {});
  } catch {
    // A visual effect must never interfere with a successfully created order.
  }
}

/** Stop the effect if the hosting view is removed while it is playing. */
export function stopCelebration(): void {
  confetti.reset();
}
