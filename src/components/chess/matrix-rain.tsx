"use client";

import { useEffect, useRef } from "react";

/**
 * Blue "liquid matrix" falling-code background (HTML5 Canvas).
 * Digits + chess glyphs rain down behind the whole site.
 */
export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let columns = 0;
    let drops: number[] = [];
    let speeds: number[] = [];
    const FONT = 15;
    const GLYPHS = "01シçミΞ32二7Σ8ラ0ア1ム9ナ4日5ウ6光".split("");
    const CHESS = ["♞", "♜", "♛", "♟", "♝", "♚", "♞", "♜"];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.ceil(width / (FONT + 3));
      drops = Array.from({ length: columns }, () => Math.random() * -60);
      speeds = Array.from({ length: columns }, () => 0.35 + Math.random() * 0.75);
      ctx.fillStyle = "#04070f";
      ctx.fillRect(0, 0, width, height);
    };

    const drawFrame = (t: number) => {
      raf = requestAnimationFrame(drawFrame);
      if (t - last < 45) return; // ~22fps for that terminal feel
      last = t;

      // translucent navy veil → glowing trails
      ctx.fillStyle = "rgba(4, 7, 15, 0.14)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${FONT}px "Geist Mono", ui-monospace, monospace`;

      for (let i = 0; i < columns; i++) {
        const x = i * (FONT + 3);
        const y = drops[i] * FONT;

        const roll = Math.random();
        let glyph: string;
        let color: string;
        if (roll > 0.985) {
          glyph = CHESS[Math.floor(Math.random() * CHESS.length)];
          color = "rgba(125, 211, 252, 0.9)"; // sky piece glyph
        } else if (roll > 0.93) {
          glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          color = "rgba(147, 197, 253, 0.95)"; // bright head
        } else {
          glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          color = "rgba(59, 110, 201, 0.55)"; // deep blue body
        }
        ctx.fillStyle = color;
        ctx.fillText(glyph, x, y);

        drops[i] += speeds[i];
        if (y > height && Math.random() > 0.985) drops[i] = Math.random() * -30;
      }
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduced) {
      // static star-field of glyphs, no animation
      ctx.fillStyle = "#04070f";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${FONT}px ui-monospace, monospace`;
      for (let n = 0; n < 400; n++) {
        ctx.fillStyle = `rgba(59,110,201,${0.08 + Math.random() * 0.25})`;
        ctx.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], Math.random() * width, Math.random() * height);
      }
    } else {
      raf = requestAnimationFrame(drawFrame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-60"
    />
  );
}
