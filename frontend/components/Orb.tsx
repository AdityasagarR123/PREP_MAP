"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { companyHref, hueFor } from "@/lib/format";

const FALLBACK = [
  "TCS", "Infosys", "Wipro", "Accenture", "Cognizant", "Capgemini", "HCLTech", "Deloitte", "ZS Associates",
  "ION Group", "Oracle", "Adobe", "Blinkit", "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix",
];

interface P3 {
  x: number;
  y: number;
  z: number;
}

function fibonacciSphere(n: number): P3[] {
  const pts: P3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = phi * i;
    pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r });
  }
  return pts;
}

/**
 * A rotating 3D "map" of companies drawn on a canvas (no WebGL library).
 * Drag to spin, click a name to open that company. Decorative for screen
 * readers — the quick-start picker next to it is the accessible path.
 */
export default function Orb({ companies }: { companies?: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const names = companies && companies.length ? companies : FALLBACK;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const family = getComputedStyle(canvas).fontFamily || "system-ui, sans-serif";
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const labels = fibonacciSphere(names.length).map((p, i) => ({ ...p, name: names[i], hue: hueFor(names[i]) }));
    const dust = fibonacciSphere(260);

    // Edges between nearby labels for a "constellation" look
    const edges: [number, number][] = [];
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        if (d < 0.78) edges.push([i, j]);
      }
    }

    let w = 0;
    let h = 0;
    let dpr = 1;
    let rotY = 0.4;
    let rotX = -0.25;
    let velY = reduce ? 0 : 0.0035;
    let velX = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let downX = 0;
    let downY = 0;
    let hover = -1;
    let raf = 0;
    let projected: { sx: number; sy: number; z: number; i: number; left: boolean }[] = [];

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rotate(p: P3): P3 {
      const cy = Math.cos(rotY);
      const sy = Math.sin(rotY);
      const cx = Math.cos(rotX);
      const sx = Math.sin(rotX);
      const x1 = p.x * cy - p.z * sy;
      const z1 = p.x * sy + p.z * cy;
      const y2 = p.y * cx - z1 * sx;
      const z2 = p.y * sx + z1 * cx;
      return { x: x1, y: y2, z: z2 };
    }

    function project(p: P3) {
      const R = Math.min(w, h) * 0.36;
      const persp = 2.6 / (2.6 - p.z);
      return { sx: w / 2 + p.x * R * persp, sy: h / 2 + p.y * R * persp, s: persp };
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.36;

      // Sphere body
      const g = ctx!.createRadialGradient(w / 2 - R * 0.35, h / 2 - R * 0.35, R * 0.1, w / 2, h / 2, R * 1.1);
      g.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      g.addColorStop(0.6, "rgba(239, 237, 252, 0.7)");
      g.addColorStop(1, "rgba(226, 222, 250, 0.0)");
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(w / 2, h / 2, R * 1.05, 0, Math.PI * 2);
      ctx!.fill();

      // Latitude rings
      ctx!.lineWidth = 1;
      for (let k = -2; k <= 2; k++) {
        const lat = (k / 3) * (Math.PI / 2);
        ctx!.beginPath();
        for (let s = 0; s <= 64; s++) {
          const lon = (s / 64) * Math.PI * 2;
          const p = rotate({ x: Math.cos(lat) * Math.cos(lon), y: Math.sin(lat), z: Math.cos(lat) * Math.sin(lon) });
          const q = project(p);
          if (s === 0) ctx!.moveTo(q.sx, q.sy);
          else ctx!.lineTo(q.sx, q.sy);
        }
        ctx!.strokeStyle = "rgba(55, 42, 172, 0.08)";
        ctx!.stroke();
      }

      // Dust
      for (const d of dust) {
        const p = rotate(d);
        const q = project(p);
        const a = 0.12 + (p.z + 1) * 0.22;
        ctx!.fillStyle = `rgba(55, 42, 172, ${a * 0.55})`;
        ctx!.beginPath();
        ctx!.arc(q.sx, q.sy, 0.6 + (p.z + 1) * 0.6, 0, Math.PI * 2);
        ctx!.fill();
      }

      const rot = labels.map((l) => rotate(l));
      const proj = rot.map((p) => project(p));

      // Edges
      for (const [i, j] of edges) {
        const za = rot[i].z;
        const zb = rot[j].z;
        const a = Math.max(0, ((za + zb) / 2 + 1) / 2) * 0.35;
        ctx!.strokeStyle = `rgba(109, 93, 252, ${a * 0.8})`;
        ctx!.beginPath();
        ctx!.moveTo(proj[i].sx, proj[i].sy);
        ctx!.lineTo(proj[j].sx, proj[j].sy);
        ctx!.stroke();
      }

      // Labels, back to front
      const order = labels.map((_, i) => i).sort((a, b) => rot[a].z - rot[b].z);
      projected = [];
      for (const i of order) {
        const p = rot[i];
        const q = proj[i];
        const depth = (p.z + 1) / 2; // 0 back .. 1 front
        const isHover = i === hover;
        const alpha = 0.18 + depth * 0.82;
        const hue = labels[i].hue;

        ctx!.beginPath();
        ctx!.arc(q.sx, q.sy, (2 + depth * 3) * (isHover ? 1.6 : 1), 0, Math.PI * 2);
        ctx!.fillStyle = isHover ? `rgba(55, 42, 172, 1)` : `hsla(${hue}, 60%, 52%, ${alpha})`;
        ctx!.shadowColor = `rgba(55, 42, 172, ${depth * 0.35})`;
        ctx!.shadowBlur = 12 * depth;
        ctx!.fill();
        ctx!.shadowBlur = 0;

        const fs = Math.round((10 + depth * 5) * (isHover ? 1.15 : 1));
        ctx!.font = `${depth > 0.6 ? 600 : 500} ${fs}px ${family}`;
        ctx!.fillStyle = isHover ? `rgba(55, 42, 172, 1)` : `rgba(22, 22, 29, ${alpha * 0.92})`;
        // Labels on the right half go to the left of their dot so they never clip.
        const leftSide = q.sx > w * 0.62;
        ctx!.textAlign = leftSide ? "right" : "left";
        ctx!.textBaseline = "middle";
        ctx!.fillText(labels[i].name, q.sx + (leftSide ? -8 : 8), q.sy);

        if (p.z > -0.1) projected.push({ sx: q.sx, sy: q.sy, z: p.z, i, left: leftSide });
      }
    }

    function frame() {
      if (!dragging) {
        rotY += velY;
        rotX += velX;
        velX *= 0.95;
        if (!reduce) velY += (0.0035 - velY) * 0.02;
        rotX += (-0.25 - rotX) * 0.01;
      }
      draw();
      raf = requestAnimationFrame(frame);
    }

    function pickAt(x: number, y: number) {
      let best = -1;
      let bestD = 28;
      for (const p of projected) {
        const d = Math.hypot(p.sx - x, p.sy - y);
        // labels extend to the right of the dot
        const onText = p.left ? x < p.sx && x > p.sx - 110 : x > p.sx && x < p.sx + 110;
        const dl = onText && Math.abs(y - p.sy) < 10 ? 0 : d;
        if (dl < bestD) {
          bestD = dl;
          best = p.i;
        }
      }
      return best;
    }

    function local(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function onDown(e: PointerEvent) {
      dragging = true;
      const { x, y } = local(e);
      lastX = downX = x;
      lastY = downY = y;
      canvas!.setPointerCapture(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      const { x, y } = local(e);
      if (dragging) {
        const dx = x - lastX;
        const dy = y - lastY;
        rotY += dx * 0.008;
        rotX += dy * 0.008;
        velY = dx * 0.008;
        velX = dy * 0.004;
        lastX = x;
        lastY = y;
      } else {
        hover = pickAt(x, y);
        canvas!.style.cursor = hover >= 0 ? "pointer" : "grab";
      }
    }
    function onUp(e: PointerEvent) {
      const { x, y } = local(e);
      const wasClick = Math.hypot(x - downX, y - downY) < 5;
      dragging = false;
      if (wasClick) {
        const i = pickAt(x, y);
        if (i >= 0) router.push(companyHref(labels[i].name));
      }
    }
    function onLeave() {
      hover = -1;
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [names, router]);

  return (
    <div className="orb-wrap">
      <div className="orb-glow" />
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
