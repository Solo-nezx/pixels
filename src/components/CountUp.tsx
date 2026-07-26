import React, { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

interface CountUpProps {
  value: number;
  /** Seconds. */
  duration?: number;
  suffix?: string;
  className?: string;
}

/**
 * Counts from 0 up to `value` on mount — the "hero figure" treatment that makes
 * profile stats feel alive. Honours prefers-reduced-motion by rendering the
 * final value immediately.
 */
export const CountUp: React.FC<CountUpProps> = ({ value, duration = 1.1, suffix = '', className }) => {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return (
    <span className={className}>
      {display.toLocaleString()}{suffix}
    </span>
  );
};
