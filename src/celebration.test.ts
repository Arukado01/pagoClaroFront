// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import confetti from 'canvas-confetti';
import { celebrateOrder, stopCelebration } from './celebration';

vi.mock('canvas-confetti', () => ({
  default: Object.assign(vi.fn(() => Promise.resolve(null)), { reset: vi.fn() }),
}));

describe('order celebration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
  });

  it('launches a short effect that also delegates reduced-motion handling to the library', () => {
    celebrateOrder();

    expect(confetti).toHaveBeenCalledOnce();
    expect(confetti).toHaveBeenCalledWith(expect.objectContaining({
      disableForReducedMotion: true,
      ticks: 130,
    }));
  });

  it('does not launch when the user prefers reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });

    celebrateOrder();
    expect(confetti).not.toHaveBeenCalled();
  });

  it('stops an ongoing effect when its view is removed', () => {
    stopCelebration();
    expect(confetti.reset).toHaveBeenCalledOnce();
  });

  it('does not interrupt a successful operation if animation initialization fails', () => {
    vi.mocked(confetti).mockImplementationOnce(() => { throw new Error('Canvas unavailable'); });
    expect(() => celebrateOrder()).not.toThrow();
  });
});
