import { useEffect, useRef, useCallback } from "react";

type AnimDirection = "up" | "left" | "right" | "scale" | "fade";

/**
 * Tiny scroll-reveal hook using IntersectionObserver.
 * Returns a ref callback — attach it to any element that should
 * animate into view when it enters the viewport.
 *
 * Elements get the CSS class `scroll-reveal` (hidden by default),
 * then `data-revealed` + `data-anim` when they appear.
 *
 * Respects `prefers-reduced-motion: reduce`.
 */
export function useScrollReveal(direction: AnimDirection = "up", threshold = 0.1) {
  const elements = useRef<Set<HTMLElement>>(new Set());
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Skip for users who prefer reduced motion
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            if (reduced) {
              // Just make it visible instantly
              el.style.opacity = "1";
            } else {
              el.setAttribute("data-revealed", "");
            }
            observer.current?.unobserve(el);
          }
        });
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );

    // Observe any elements already registered
    elements.current.forEach((el) => observer.current?.observe(el));

    return () => {
      observer.current?.disconnect();
    };
  }, [threshold]);

  const ref = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      el.classList.add("scroll-reveal");
      el.setAttribute("data-anim", direction);
      elements.current.add(el);
      observer.current?.observe(el);
    },
    [direction],
  );

  return ref;
}
