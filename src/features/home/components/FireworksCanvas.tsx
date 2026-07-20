"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  decay: number;
  gravity: number;
  friction: number;
}

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  exploded: boolean;
}

const COLOR_PALETTES = [
  "#FF5E7E", // Pink
  "#FFD166", // Gold / Yellow
  "#A0E7D2", // Mint / Cyan
  "#9B7CC3", // Purple
  "#FF9A9E", // Pastel Pink
  "#00F0FF", // Neon Blue
  "#FF85A1", // Candy Pink
  "#FFFFFF", // White Star
];

export default function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const rockets: Rocket[] = [];
    const particles: Particle[] = [];

    // 花火を打ち上げる関数
    const launchRocket = (startX?: number, targetYPos?: number) => {
      const x = startX !== undefined ? startX : Math.random() * (width * 0.8) + width * 0.1;
      const targetY = targetYPos !== undefined ? targetYPos : Math.random() * (height * 0.4) + height * 0.15;
      const color = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
      const speed = 8 + Math.random() * 4;

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.3; // ほぼ真上
      rockets.push({
        x,
        y: height,
        targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        exploded: false,
      });
    };

    // 爆発エフェクトを生成
    const createExplosion = (x: number, y: number, color: string) => {
      const particleCount = 45 + Math.floor(Math.random() * 30);
      const isSpecialShape = Math.random() < 0.3; // 30%の確率でハート型などのスペシャル形状

      for (let i = 0; i < particleCount; i++) {
        let vx = 0;
        let vy = 0;
        const speed = 2 + Math.random() * 5;

        if (isSpecialShape && i % 2 === 0) {
          // ハート型の弾道
          const t = (i / particleCount) * Math.PI * 2;
          vx = 16 * Math.pow(Math.sin(t), 3) * 0.18;
          vy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.18;
        } else {
          // 通常の円状爆発
          const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
        }

        particles.push({
          x,
          y,
          vx,
          vy,
          alpha: 1,
          color,
          size: 2 + Math.random() * 2.5,
          decay: 0.012 + Math.random() * 0.015,
          gravity: 0.06 + Math.random() * 0.03,
          friction: 0.96,
        });
      }
    };

    let frameCount = 0;

    // メインアニメーションループ
    const render = () => {
      frameCount++;

      // キャンバスを薄く黒で上書きして残像を残す
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "lighter";

      // 一定フレームごとに自動打ち上げ (約30~45フレーム毎)
      if (frameCount % 35 === 0 || Math.random() < 0.03) {
        launchRocket();
      }

      // ロケットの更新と描画
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;

        // 軌跡を描画
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = r.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // ターゲット高度に到達したら爆発
        if (r.y <= r.targetY || r.vy >= 0) {
          createExplosion(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      // 火花パーティクルの更新と描画
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // 初期打ち上げ
    launchRocket(width * 0.3);
    setTimeout(() => launchRocket(width * 0.7), 200);

    render();

    // クリックで任意の場所に花火を打ち上げるインタラクション
    const handleCanvasClick = (e: MouseEvent) => {
      launchRocket(e.clientX, e.clientY);
    };

    canvas.addEventListener("click", handleCanvasClick);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("click", handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9998,
      }}
    />
  );
}
