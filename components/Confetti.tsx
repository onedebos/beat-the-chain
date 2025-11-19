"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";

export type ConfettiRef = {
  fire: () => void;
};

type ConfettiProps = {
  className?: string;
  onFire?: () => void;
};

export const Confetti = forwardRef<ConfettiRef, ConfettiProps>(({ className = "", onFire }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fireRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confetti: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    const colors = ["#38FF9C", "#0d63f8", "#ff0088", "#ffd700", "#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24"];

    const createConfetti = () => {
      for (let i = 0; i < 150; i++) {
        confetti.push({
          x: Math.random() * canvas.width,
          y: -10,
          vx: (Math.random() - 0.5) * 2, // Slower horizontal velocity
          vy: Math.random() * 1.5 + 1, // Slower vertical velocity
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 5, // Slower rotation
        });
      }
    };

    const drawConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rotation * Math.PI) / 180);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
        ctx.restore();

        c.x += c.vx;
        c.y += c.vy;
        c.rotation += c.rotationSpeed;
        c.vy += 0.05; // Slower gravity

        if (c.y > canvas.height + 10) {
          confetti.splice(i, 1);
        }
      }

      if (confetti.length > 0) {
        animationFrameRef.current = requestAnimationFrame(drawConfetti);
      }
    };

    fireRef.current = () => {
      // Clear any existing animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clear existing confetti
      confetti.length = 0;
      
      // Loop 10 times with delays between bursts
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          createConfetti();
          // Start animation loop on first burst, it will continue for all particles
          if (i === 0 && confetti.length > 0) {
            drawConfetti();
          }
        }, i * 300); // 300ms delay between each burst
      }
      if (onFire) onFire();
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onFire]);

  useImperativeHandle(ref, () => ({
    fire: () => {
      fireRef.current();
    }
  }));

  return <canvas ref={canvasRef} className={className} style={{ pointerEvents: "none" }} />;
});

Confetti.displayName = "Confetti";

