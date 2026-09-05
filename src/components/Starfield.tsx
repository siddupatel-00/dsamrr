"use client";

import React, { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  isSparkle: boolean;
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let stars: Star[] = [];

    const initStars = (width: number, height: number) => {
      const count = Math.floor((width * height) / 3000);
      const newStars: Star[] = [];

      const colors = [
        "rgba(255, 255, 255,",
        "rgba(240, 245, 255,",
        "rgba(220, 235, 255,",
        "rgba(255, 245, 230,",
        "rgba(200, 230, 255,",
      ];

      for (let i = 0; i < count; i++) {
        const isSparkle = i < 16;
        const radius = isSparkle
          ? Math.random() * 1.2 + 1.8
          : Math.random() < 0.25
          ? Math.random() * 0.8 + 1.1
          : Math.random() * 0.6 + 0.45;

        const colorBase = colors[Math.floor(Math.random() * colors.length)];

        newStars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius,
          baseAlpha: isSparkle ? 0.95 : Math.random() * 0.6 + 0.35,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinklePhase: Math.random() * Math.PI * 2,
          color: colorBase,
          isSparkle,
        });
      }

      stars = newStars;
    };

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      initStars(width, height);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Deep space cosmic background gradient
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        100,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.8
      );
      bgGrad.addColorStop(0, "#05070e");
      bgGrad.addColorStop(0.6, "#020307");
      bgGrad.addColorStop(1, "#000103");

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Render stars
      for (const star of stars) {
        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = Math.min(
          1,
          Math.max(
            0.15,
            star.baseAlpha + Math.sin(star.twinklePhase) * 0.3
          )
        );

        ctx.fillStyle = `${star.color}${currentAlpha})`;

        if (star.isSparkle) {
          // Glow halo
          const glow = ctx.createRadialGradient(
            star.x,
            star.y,
            0,
            star.x,
            star.y,
            star.radius * 6
          );
          glow.addColorStop(0, `${star.color}${currentAlpha * 0.9})`);
          glow.addColorStop(0.3, `${star.color}${currentAlpha * 0.3})`);
          glow.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 6, 0, Math.PI * 2);
          ctx.fill();

          // Core dot
          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fill();

          // 4-point cross flare spikes
          ctx.strokeStyle = `rgba(255, 255, 255, ${currentAlpha * 0.85})`;
          ctx.lineWidth = 0.75;
          const flareLen = star.radius * 5;

          ctx.beginPath();
          ctx.moveTo(star.x - flareLen, star.y);
          ctx.lineTo(star.x + flareLen, star.y);
          ctx.moveTo(star.x, star.y - flareLen);
          ctx.lineTo(star.x, star.y + flareLen);
          ctx.stroke();
        } else {
          // Normal star dot
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
