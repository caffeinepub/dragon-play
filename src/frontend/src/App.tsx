import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "./hooks/useActor";

// ─── Types ───────────────────────────────────────────────────────────────────

type DragonState = "idle" | "happy" | "flying" | "fire" | "sleeping";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "fire" | "sparkle" | "smoke" | "z";
  char?: string;
}

interface Star {
  x: number;
  y: number;
  r: number;
  twinkle: number;
  speed: number;
  brightness: number;
}

interface GameState {
  dragonState: DragonState;
  dragonX: number;
  dragonY: number;
  dragonTargetX: number;
  dragonTargetY: number;
  dragonFlipX: boolean;
  stateTimer: number;
  breathTimer: number;
  blinkTimer: number;
  isBlinking: boolean;
  wingPhase: number;
  bodyBob: number;
  particles: Particle[];
  stars: Star[];
  score: number;
  happiness: number;
  energy: number;
  lastInteraction: number;
  flyPath: { x: number; y: number }[];
  flyPathIndex: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DRAGON_COLORS = {
  body: "#2d8a4e",
  bodyDark: "#1a5c33",
  scale: "#3aad62",
  belly: "#4dc47a",
  gold: "#d4a017",
  goldLight: "#f0c040",
  eyeGlow: "#ffdd44",
  eyePupil: "#ff6600",
  wing: "#1a5c33",
  wingMembrane: "#2d8a4e",
  spike: "#d4a017",
  fire1: "#ff2200",
  fire2: "#ff8800",
  fire3: "#ffdd00",
  outline: "#0d3320",
};

const FIRE_COLORS = [
  "#ff1500",
  "#ff4400",
  "#ff7700",
  "#ffaa00",
  "#ffdd00",
  "#ff6622",
];
const SPARKLE_COLORS = [
  "#ffd700",
  "#ffffff",
  "#fffacd",
  "#87ceeb",
  "#c0c0c0",
  "#f0e68c",
];

// ─── Dragon Drawing Functions ─────────────────────────────────────────────────

function drawDragon(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
  time: number,
) {
  const { dragonState, wingPhase, bodyBob, isBlinking, dragonFlipX } = gs;
  const cx = gs.dragonX;
  const cy = gs.dragonY + bodyBob;

  ctx.save();
  ctx.translate(cx, cy);
  if (dragonFlipX) ctx.scale(-1, 1);

  const flyingAlt = dragonState === "flying" ? Math.sin(time * 0.003) * 6 : 0;
  ctx.translate(0, flyingAlt);

  // Shadow
  if (dragonState !== "flying") {
    ctx.save();
    ctx.translate(20, 120);
    ctx.scale(1, 0.3);
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
    shadowGrad.addColorStop(0, "rgba(0,0,0,0.35)");
    shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadowGrad;
    ctx.fill();
    ctx.restore();
  }

  // Wings (behind body)
  drawWings(ctx, dragonState, wingPhase, time);

  // Tail
  drawTail(ctx, time);

  // Body
  drawBody(ctx);

  // Head
  drawHead(ctx, dragonState, isBlinking, time);

  // Spikes on back
  drawSpikes(ctx);

  ctx.restore();
}

function drawWings(
  ctx: CanvasRenderingContext2D,
  state: DragonState,
  phase: number,
  time: number,
) {
  const flapAmt =
    state === "flying" ? Math.sin(phase) * 50 : Math.sin(time * 0.001) * 8;
  const flapY = state === "flying" ? Math.abs(Math.sin(phase)) * 20 : 0;

  // Left wing
  ctx.save();
  ctx.translate(-30, -30);
  ctx.rotate((-0.3 + Math.sin(phase) * 0.3) * (state === "flying" ? 1 : 0.2));
  const wGrad = ctx.createLinearGradient(-80, -flapAmt, 0, flapAmt);
  wGrad.addColorStop(0, "#1a5c33cc");
  wGrad.addColorStop(1, "#2d8a4e88");
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(
    -40,
    -20 - flapAmt * 0.5,
    -100,
    -60 - flapAmt,
    -110,
    -10 - flapAmt,
  );
  ctx.bezierCurveTo(-90, 30 - flapY, -50, 50, 0, 30);
  ctx.closePath();
  ctx.fillStyle = wGrad;
  ctx.strokeStyle = DRAGON_COLORS.outline;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  // Wing veins
  ctx.strokeStyle = "#3aad6244";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-80, -20 - flapAmt * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(-60, 10 - flapAmt * 0.3);
  ctx.stroke();
  ctx.restore();

  // Right wing
  ctx.save();
  ctx.translate(60, -30);
  ctx.rotate((0.3 - Math.sin(phase) * 0.3) * (state === "flying" ? 1 : 0.2));
  const wGrad2 = ctx.createLinearGradient(80, -flapAmt, 0, flapAmt);
  wGrad2.addColorStop(0, "#1a5c33cc");
  wGrad2.addColorStop(1, "#2d8a4e88");
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(
    40,
    -20 - flapAmt * 0.5,
    100,
    -60 - flapAmt,
    110,
    -10 - flapAmt,
  );
  ctx.bezierCurveTo(90, 30 - flapY, 50, 50, 0, 30);
  ctx.closePath();
  ctx.fillStyle = wGrad2;
  ctx.strokeStyle = DRAGON_COLORS.outline;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#3aad6244";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(80, -20 - flapAmt * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(60, 10 - flapAmt * 0.3);
  ctx.stroke();
  ctx.restore();
}

function drawTail(ctx: CanvasRenderingContext2D, time: number) {
  const wave = Math.sin(time * 0.002) * 15;
  ctx.beginPath();
  ctx.moveTo(-10, 60);
  ctx.bezierCurveTo(-40, 90, -70 + wave, 110, -90 + wave * 1.5, 90);
  ctx.bezierCurveTo(-110 + wave * 2, 70, -100 + wave, 40, -80 + wave, 55);
  ctx.bezierCurveTo(-60 + wave * 0.5, 70, -30, 85, 0, 70);
  ctx.closePath();
  const tailGrad = ctx.createLinearGradient(-90, 50, 0, 80);
  tailGrad.addColorStop(0, DRAGON_COLORS.bodyDark);
  tailGrad.addColorStop(1, DRAGON_COLORS.body);
  ctx.fillStyle = tailGrad;
  ctx.strokeStyle = DRAGON_COLORS.outline;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();

  // Tail tip spike
  ctx.beginPath();
  ctx.moveTo(-90 + wave * 1.5, 85);
  ctx.lineTo(-105 + wave * 2, 72);
  ctx.lineTo(-78 + wave * 1.5, 75);
  ctx.closePath();
  ctx.fillStyle = DRAGON_COLORS.spike;
  ctx.fill();
}

function drawBody(ctx: CanvasRenderingContext2D) {
  // Main body
  const bodyGrad = ctx.createRadialGradient(-10, 0, 10, 0, 10, 80);
  bodyGrad.addColorStop(0, DRAGON_COLORS.scale);
  bodyGrad.addColorStop(0.6, DRAGON_COLORS.body);
  bodyGrad.addColorStop(1, DRAGON_COLORS.bodyDark);
  ctx.beginPath();
  ctx.ellipse(15, 30, 55, 65, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = DRAGON_COLORS.outline;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  // Belly scales
  const bellyGrad = ctx.createLinearGradient(0, -20, 0, 80);
  bellyGrad.addColorStop(0, DRAGON_COLORS.belly);
  bellyGrad.addColorStop(1, DRAGON_COLORS.body);
  ctx.beginPath();
  ctx.ellipse(20, 35, 28, 48, 0, 0, Math.PI * 2);
  ctx.fillStyle = bellyGrad;
  ctx.fill();

  // Scale pattern dots
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.beginPath();
      ctx.arc(
        -15 + col * 25 + (row % 2) * 12,
        -20 + row * 28,
        5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // Gold chest gem
  ctx.beginPath();
  ctx.arc(20, 10, 8, 0, Math.PI * 2);
  const gemGrad = ctx.createRadialGradient(17, 7, 1, 20, 10, 8);
  gemGrad.addColorStop(0, DRAGON_COLORS.goldLight);
  gemGrad.addColorStop(0.5, DRAGON_COLORS.gold);
  gemGrad.addColorStop(1, "#8b6914");
  ctx.fillStyle = gemGrad;
  ctx.fill();
  ctx.strokeStyle = DRAGON_COLORS.outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Front legs
  drawLeg(ctx, -5, 75, 25, 140, true);
  drawLeg(ctx, 35, 75, 60, 140, false);
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  left: boolean,
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(
    x1 + (left ? -15 : 15),
    y1 + 30,
    x2 + (left ? -10 : 10),
    y2 - 30,
    x2,
    y2,
  );
  ctx.strokeStyle = DRAGON_COLORS.body;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = DRAGON_COLORS.outline;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Claws
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x2 + i * 7, y2);
    ctx.lineTo(x2 + i * 10, y2 + 14);
    ctx.strokeStyle = DRAGON_COLORS.gold;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  state: DragonState,
  isBlinking: boolean,
  time: number,
) {
  // Neck
  ctx.beginPath();
  ctx.moveTo(20, -40);
  ctx.bezierCurveTo(10, -70, 40, -80, 55, -60);
  ctx.lineWidth = 24;
  ctx.strokeStyle = DRAGON_COLORS.body;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = DRAGON_COLORS.outline;
  ctx.stroke();

  // Head
  ctx.save();
  ctx.translate(60, -90);

  const headGrad = ctx.createRadialGradient(-5, -5, 5, 5, 5, 40);
  headGrad.addColorStop(0, DRAGON_COLORS.scale);
  headGrad.addColorStop(0.7, DRAGON_COLORS.body);
  headGrad.addColorStop(1, DRAGON_COLORS.bodyDark);

  ctx.beginPath();
  ctx.ellipse(5, 0, 35, 28, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = headGrad;
  ctx.strokeStyle = DRAGON_COLORS.outline;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  // Snout
  ctx.beginPath();
  ctx.ellipse(30, 8, 18, 12, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = DRAGON_COLORS.body;
  ctx.strokeStyle = DRAGON_COLORS.outline;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();

  // Nostrils
  ctx.fillStyle = DRAGON_COLORS.outline;
  ctx.beginPath();
  ctx.ellipse(36, 10, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(28, 13, 2.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fire breath glow when in fire state
  if (state === "fire") {
    ctx.save();
    const fireGlowAmt = 0.4 + Math.sin(time * 0.01) * 0.3;
    const fireGrad = ctx.createRadialGradient(40, 10, 0, 40, 10, 40);
    fireGrad.addColorStop(0, `rgba(255,180,0,${fireGlowAmt})`);
    fireGrad.addColorStop(0.5, `rgba(255,80,0,${fireGlowAmt * 0.5})`);
    fireGrad.addColorStop(1, "rgba(255,0,0,0)");
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.arc(40, 10, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Eye (left from dragon's POV)
  drawEye(ctx, -5, -8, isBlinking, state);

  // Head horn/spikes
  const hornColors = [
    DRAGON_COLORS.gold,
    DRAGON_COLORS.goldLight,
    DRAGON_COLORS.spike,
  ];
  const horns = [
    { x: -10, y: -20, angle: -0.5 },
    { x: 5, y: -26, angle: -0.3 },
    { x: 18, y: -24, angle: -0.1 },
  ];
  horns.forEach((h, i) => {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.angle);
    ctx.beginPath();
    ctx.moveTo(-4, 12);
    ctx.lineTo(4, 12);
    ctx.lineTo(0, -10 - i * 2);
    ctx.closePath();
    ctx.fillStyle = hornColors[i % 3];
    ctx.strokeStyle = DRAGON_COLORS.outline;
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // Sleeping Zs indicator on head
  if (state === "sleeping") {
    ctx.fillStyle = "rgba(180,180,255,0.9)";
    ctx.font = "bold 16px Sora, sans-serif";
    const zOffset = (time * 0.0005) % 1;
    ctx.globalAlpha = 1 - zOffset;
    ctx.fillText("Z", -5 + zOffset * 10, -30 - zOffset * 20);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  blinking: boolean,
  state: DragonState,
) {
  // Eye glow
  if (!blinking && state !== "sleeping") {
    ctx.save();
    const eyeGlow = ctx.createRadialGradient(x, y, 0, x, y, 18);
    eyeGlow.addColorStop(0, "rgba(255,220,50,0.4)");
    eyeGlow.addColorStop(1, "rgba(255,220,50,0)");
    ctx.fillStyle = eyeGlow;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // White
  ctx.beginPath();
  ctx.ellipse(x, y, 10, blinking ? 1 : 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = blinking ? DRAGON_COLORS.body : "#f8f0d0";
  ctx.strokeStyle = DRAGON_COLORS.outline;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();

  if (!blinking && state !== "sleeping") {
    // Pupil (slit)
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = DRAGON_COLORS.eyePupil;
    ctx.fill();
    // Iris glow
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 7, 0, 0, Math.PI * 2);
    const irisGrad = ctx.createRadialGradient(x, y, 1, x, y, 7);
    irisGrad.addColorStop(0, "rgba(255,220,50,0.8)");
    irisGrad.addColorStop(0.5, "rgba(255,180,0,0.4)");
    irisGrad.addColorStop(1, "rgba(255,100,0,0)");
    ctx.fillStyle = irisGrad;
    ctx.fill();
    // Shine
    ctx.beginPath();
    ctx.ellipse(x - 3, y - 3, 2, 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
  }
}

function drawSpikes(ctx: CanvasRenderingContext2D) {
  const spikes = [
    { x: 5, y: -45, size: 14 },
    { x: 0, y: -25, size: 11 },
    { x: -5, y: -5, size: 9 },
    { x: -5, y: 15, size: 7 },
    { x: -8, y: 33, size: 6 },
  ];
  for (const { x, y, size } of spikes) {
    ctx.save();
    ctx.translate(x - 30, y);
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, 0);
    ctx.lineTo(size * 0.4, 0);
    ctx.lineTo(0, -size);
    ctx.closePath();
    const spikeGrad = ctx.createLinearGradient(0, 0, 0, -size);
    spikeGrad.addColorStop(0, DRAGON_COLORS.gold);
    spikeGrad.addColorStop(1, DRAGON_COLORS.goldLight);
    ctx.fillStyle = spikeGrad;
    ctx.strokeStyle = DRAGON_COLORS.outline;
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Background Drawing ───────────────────────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stars: Star[],
  time: number,
) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#050a1a");
  sky.addColorStop(0.4, "#0a0f2e");
  sky.addColorStop(0.7, "#0d1a3a");
  sky.addColorStop(1, "#1a2a1a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Moon
  ctx.save();
  ctx.translate(w * 0.82, h * 0.12);
  const moonGrad = ctx.createRadialGradient(-5, -5, 5, 0, 0, 45);
  moonGrad.addColorStop(0, "#fffce8");
  moonGrad.addColorStop(0.7, "#f0d890");
  moonGrad.addColorStop(1, "#c8a840");
  ctx.beginPath();
  ctx.arc(0, 0, 45, 0, Math.PI * 2);
  ctx.fillStyle = moonGrad;
  ctx.fill();
  // Moon glow
  const mgGrad = ctx.createRadialGradient(0, 0, 40, 0, 0, 100);
  mgGrad.addColorStop(0, "rgba(240,216,144,0.2)");
  mgGrad.addColorStop(1, "rgba(240,216,144,0)");
  ctx.fillStyle = mgGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, Math.PI * 2);
  ctx.fill();
  // Craters
  ctx.fillStyle = "rgba(180,150,60,0.3)";
  ctx.beginPath();
  ctx.arc(-12, -8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(15, 10, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-5, 18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Stars
  for (const star of stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(time * star.speed + star.twinkle);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r * twinkle, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.4 + twinkle * 0.6 * star.brightness})`;
    ctx.fill();
  }

  // Ground
  const ground = ctx.createLinearGradient(0, h * 0.82, 0, h);
  ground.addColorStop(0, "#0d1f0d");
  ground.addColorStop(1, "#050f05");
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.82);
  // Rolling hills
  ctx.bezierCurveTo(w * 0.15, h * 0.78, w * 0.3, h * 0.85, w * 0.5, h * 0.8);
  ctx.bezierCurveTo(w * 0.65, h * 0.76, w * 0.8, h * 0.84, w, h * 0.79);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
}

// ─── Particle Drawing ─────────────────────────────────────────────────────────

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;

    if (p.type === "fire") {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.3, p.color);
      grad.addColorStop(1, "rgba(255,50,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "sparkle") {
      ctx.translate(p.x, p.y);
      ctx.rotate((Date.now() * 0.005) % (Math.PI * 2));
      // Draw 4-point star
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const innerAngle = angle + Math.PI / 4;
        if (i === 0)
          ctx.moveTo(Math.cos(angle) * p.size, Math.sin(angle) * p.size);
        else ctx.lineTo(Math.cos(angle) * p.size, Math.sin(angle) * p.size);
        ctx.lineTo(
          Math.cos(innerAngle) * p.size * 0.4,
          Math.sin(innerAngle) * p.size * 0.4,
        );
      }
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
    } else if (p.type === "z" && p.char) {
      ctx.fillStyle = "#aaaaff";
      ctx.font = `bold ${p.size * 8}px Sora, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(p.char, p.x, p.y);
    }
    ctx.restore();
  }
}

// ─── Main App Component ───────────────────────────────────────────────────────

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { actor } = useActor();

  const [happiness, setHappiness] = useState(70);
  const [energy, setEnergy] = useState(80);
  const [score, setScore] = useState(0);
  const [currentState, setCurrentState] = useState<DragonState>("idle");

  const initStars = useCallback((w: number, h: number): Star[] => {
    return Array.from({ length: 120 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.75,
      r: 0.5 + Math.random() * 2,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 2,
      brightness: 0.5 + Math.random() * 0.5,
    }));
  }, []);

  const getCanvasCenter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 400, y: 300 };
    return { x: canvas.width * 0.5, y: canvas.height * 0.58 };
  }, []);

  // Init game state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasCenter();
    gsRef.current = {
      dragonState: "idle",
      dragonX: x,
      dragonY: y,
      dragonTargetX: x,
      dragonTargetY: y,
      dragonFlipX: false,
      stateTimer: 0,
      breathTimer: 0,
      blinkTimer: 0,
      isBlinking: false,
      wingPhase: 0,
      bodyBob: 0,
      particles: [],
      stars: initStars(canvas.width, canvas.height),
      score: 0,
      happiness: 70,
      energy: 80,
      lastInteraction: Date.now(),
      flyPath: [],
      flyPathIndex: 0,
    };
  }, [initStars, getCanvasCenter]);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      if (gsRef.current) {
        gsRef.current.stars = initStars(canvas.width, canvas.height);
        const { x, y } = getCanvasCenter();
        gsRef.current.dragonX = x;
        gsRef.current.dragonY = y;
        gsRef.current.dragonTargetX = x;
        gsRef.current.dragonTargetY = y;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [initStars, getCanvasCenter]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = 0;

    const loop = (time: number) => {
      const gs = gsRef.current;
      if (!gs) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const dt = time - lastTime;
      lastTime = time;

      const w = canvas.width;
      const h = canvas.height;

      // ── Update ──
      gs.stateTimer += dt;
      gs.blinkTimer += dt;
      gs.breathTimer += dt;
      gs.wingPhase += 0.08 * (gs.dragonState === "flying" ? 3 : 1);

      // Blink
      if (gs.blinkTimer > 3000 + Math.random() * 2000) {
        gs.isBlinking = true;
        gs.blinkTimer = 0;
      }
      if (gs.isBlinking && gs.blinkTimer > 150) gs.isBlinking = false;

      // Body bob (breathing)
      gs.bodyBob = Math.sin(gs.breathTimer * 0.002) * 3;

      // Auto-decay happiness and energy
      if (gs.dragonState === "idle" && gs.stateTimer > 5000) {
        gs.happiness = Math.max(0, gs.happiness - dt * 0.003);
        gs.energy = Math.max(0, gs.energy - dt * 0.002);
      }

      // Auto-sleep if energy is low
      if (gs.energy < 15 && gs.dragonState === "idle" && gs.stateTimer > 3000) {
        gs.dragonState = "sleeping";
        gs.stateTimer = 0;
      }
      // Wake up after sleep
      if (gs.dragonState === "sleeping" && gs.stateTimer > 8000) {
        gs.energy = Math.min(100, gs.energy + 30);
        gs.dragonState = "idle";
        gs.stateTimer = 0;
      }

      // Flying movement
      if (gs.dragonState === "flying") {
        if (gs.flyPath.length > 0 && gs.flyPathIndex < gs.flyPath.length) {
          const target = gs.flyPath[gs.flyPathIndex];
          const dx = target.x - gs.dragonX;
          const dy = target.y - gs.dragonY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 8) {
            gs.flyPathIndex++;
          } else {
            const speed = 3;
            gs.dragonX += (dx / dist) * speed;
            gs.dragonY += (dy / dist) * speed;
            gs.dragonFlipX = dx < 0;
          }
        } else if (gs.stateTimer > 3000) {
          gs.dragonState = "idle";
          gs.stateTimer = 0;
          gs.dragonFlipX = false;
          const center = { x: w * 0.5, y: h * 0.58 };
          gs.dragonTargetX = center.x;
          gs.dragonTargetY = center.y;
          gs.energy = Math.max(0, gs.energy - 10);
        }
      }

      // Return to center for non-flying states
      if (gs.dragonState !== "flying") {
        const center = { x: w * 0.5, y: h * 0.58 };
        const dx = center.x - gs.dragonX;
        const dy = center.y - gs.dragonY;
        gs.dragonX += dx * 0.02;
        gs.dragonY += dy * 0.02;
      }

      // Happy bouncing
      if (gs.dragonState === "happy") {
        gs.bodyBob += Math.sin(gs.stateTimer * 0.015) * 8;
        if (gs.stateTimer > 4000) {
          gs.dragonState = "idle";
          gs.stateTimer = 0;
        }
        // Sparkle particles
        if (Math.random() < 0.15) {
          gs.particles.push({
            x: gs.dragonX + (Math.random() - 0.5) * 100,
            y: gs.dragonY + (Math.random() - 0.5) * 120,
            vx: (Math.random() - 0.5) * 3,
            vy: -1 - Math.random() * 2,
            life: 60,
            maxLife: 60,
            size: 4 + Math.random() * 6,
            color:
              SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
            type: "sparkle",
          });
        }
      }

      // Fire particles
      if (gs.dragonState === "fire") {
        const fireOriginX = gs.dragonX + (gs.dragonFlipX ? -80 : 110);
        const fireOriginY = gs.dragonY - 80;
        for (let i = 0; i < 4; i++) {
          gs.particles.push({
            x: fireOriginX + (Math.random() - 0.5) * 15,
            y: fireOriginY + (Math.random() - 0.5) * 10,
            vx: (gs.dragonFlipX ? -1 : 1) * (4 + Math.random() * 6),
            vy: (Math.random() - 0.6) * 3,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            size: 8 + Math.random() * 12,
            color: FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)],
            type: "fire",
          });
        }
        if (gs.stateTimer > 3000) {
          gs.dragonState = "idle";
          gs.stateTimer = 0;
          gs.energy = Math.max(0, gs.energy - 15);
        }
      }

      // Z particles when sleeping
      if (gs.dragonState === "sleeping" && Math.random() < 0.01) {
        gs.particles.push({
          x: gs.dragonX + 50,
          y: gs.dragonY - 100,
          vx: 0.3,
          vy: -0.8,
          life: 120,
          maxLife: 120,
          size: 1 + Math.random(),
          color: "#aaaaff",
          type: "z",
          char: Math.random() > 0.5 ? "Z" : "z",
        });
      }

      // Update particles
      gs.particles = gs.particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + (p.type === "fire" ? -0.1 : 0.02),
          life: p.life - 1,
        }))
        .filter((p) => p.life > 0);

      // Sync UI state (throttled via React's batching)
      setHappiness(Math.round(gs.happiness));
      setEnergy(Math.round(gs.energy));
      setScore(gs.score);
      setCurrentState(gs.dragonState);

      // ── Draw ──
      drawBackground(ctx, w, h, gs.stars, time);
      drawParticles(ctx, gs.particles);
      drawDragon(ctx, gs, time);

      // State label
      const stateLabels: Record<DragonState, string> = {
        idle: "",
        happy: "✨ Happy!",
        flying: "🐉 Flying!",
        fire: "🔥 Fire Breath!",
        sleeping: "💤 Sleeping...",
      };
      const label = stateLabels[gs.dragonState];
      if (label) {
        ctx.save();
        ctx.font = "bold 18px Sora, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 8;
        ctx.fillText(label, w / 2, 40);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const interact = useCallback(
    async (type: "pet" | "feed" | "fly" | "fire") => {
      const gs = gsRef.current;
      const canvas = canvasRef.current;
      if (!gs || !canvas) return;

      const now = Date.now();
      if (now - gs.lastInteraction < 500) return;
      gs.lastInteraction = now;

      const w = canvas.width;
      const h = canvas.height;

      gs.score++;
      gs.stateTimer = 0;

      if (type === "pet") {
        gs.dragonState = "happy";
        gs.happiness = Math.min(100, gs.happiness + 20);
        toast.success("Dragon loves the pets! 💕");
      } else if (type === "feed") {
        gs.dragonState = "happy";
        gs.energy = Math.min(100, gs.energy + 25);
        gs.happiness = Math.min(100, gs.happiness + 10);
        // Food particles
        for (let i = 0; i < 12; i++) {
          gs.particles.push({
            x: gs.dragonX + (Math.random() - 0.5) * 60,
            y: gs.dragonY - 40,
            vx: (Math.random() - 0.5) * 4,
            vy: -2 - Math.random() * 3,
            life: 50,
            maxLife: 50,
            size: 5 + Math.random() * 5,
            color:
              SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
            type: "sparkle",
          });
        }
        toast.success("Mmm, delicious! 🍖");
      } else if (type === "fly") {
        if (gs.energy < 20) {
          toast.error("Too tired to fly! Let me rest... 😴");
          return;
        }
        gs.dragonState = "flying";
        // Generate figure-8 flight path
        const cx = w * 0.5;
        const cy = h * 0.45;
        const path: { x: number; y: number }[] = [];
        for (let t = 0; t <= Math.PI * 4; t += 0.15) {
          path.push({
            x: cx + Math.sin(t) * w * 0.28,
            y: cy + Math.sin(t * 0.5) * h * 0.2,
          });
        }
        gs.flyPath = path;
        gs.flyPathIndex = 0;
        toast.success("Up, up and away! 🌟");
      } else if (type === "fire") {
        if (gs.energy < 10) {
          toast.error("No energy to breathe fire! 🥱");
          return;
        }
        gs.dragonState = "fire";
        toast.success("ROAAAAR! 🔥🔥🔥");
      }

      // Record to backend
      if (actor) {
        try {
          await actor.recordInteraction(BigInt(gs.score));
        } catch (_e) {
          // Silently ignore backend errors in game
        }
      }
    },
    [actor],
  );

  const stateColor: Record<DragonState, string> = {
    idle: "text-emerald-300",
    happy: "text-yellow-300",
    flying: "text-sky-300",
    fire: "text-orange-400",
    sleeping: "text-indigo-300",
  };

  const stateEmoji: Record<DragonState, string> = {
    idle: "😌",
    happy: "😄",
    flying: "🐉",
    fire: "🔥",
    sleeping: "😴",
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="flex-none px-4 py-2 flex items-center justify-between border-b border-border/40 bg-card/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <img
            src="/assets/generated/dragon-logo-transparent.dim_200x200.png"
            alt="Dragon"
            className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]"
          />
          <h1 className="font-fraunces text-xl font-bold tracking-wide text-foreground">
            <span className="text-primary">Dragon</span>
            <span className="text-secondary"> Play</span>
          </h1>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div
            data-ocid="dragon.happiness_panel"
            className="flex items-center gap-2 min-w-[130px]"
          >
            <span className="text-xs text-muted-foreground font-sora uppercase tracking-wider">
              ❤️
            </span>
            <div className="flex-1">
              <div className="flex justify-between mb-0.5">
                <span className="text-xs text-muted-foreground">Happiness</span>
                <span className="text-xs font-semibold text-primary">
                  {happiness}%
                </span>
              </div>
              <Progress value={happiness} className="h-2 [&>div]:bg-primary" />
            </div>
          </div>

          <div
            data-ocid="dragon.energy_panel"
            className="flex items-center gap-2 min-w-[130px]"
          >
            <span className="text-xs text-muted-foreground font-sora uppercase tracking-wider">
              ⚡
            </span>
            <div className="flex-1">
              <div className="flex justify-between mb-0.5">
                <span className="text-xs text-muted-foreground">Energy</span>
                <span className="text-xs font-semibold text-secondary">
                  {energy}%
                </span>
              </div>
              <Progress value={energy} className="h-2 [&>div]:bg-secondary" />
            </div>
          </div>

          <div
            data-ocid="dragon.score_panel"
            className="flex flex-col items-center px-3 py-1 rounded-md border border-accent/30 bg-accent/10"
          >
            <span className="text-xs text-muted-foreground">Score</span>
            <span className="font-fraunces text-lg font-bold text-secondary leading-tight">
              {score}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-lg">{stateEmoji[currentState]}</span>
            <span
              className={`text-xs font-semibold capitalize ${stateColor[currentState]}`}
            >
              {currentState}
            </span>
          </div>
        </div>
      </header>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          data-ocid="dragon.canvas_target"
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* Action Buttons */}
      <footer className="flex-none py-3 px-4 flex items-center justify-center gap-3 border-t border-border/40 bg-card/80 backdrop-blur-sm z-10">
        <Button
          data-ocid="dragon.pet_button"
          onClick={() => interact("pet")}
          className="btn-fantasy glow-emerald bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 hover:border-primary px-5 py-2 rounded-lg transition-all"
          variant="outline"
        >
          <span className="mr-2 text-base">🤲</span> Pet
        </Button>

        <Button
          data-ocid="dragon.feed_button"
          onClick={() => interact("feed")}
          className="btn-fantasy glow-gold bg-secondary/20 hover:bg-secondary/40 text-secondary border border-secondary/50 hover:border-secondary px-5 py-2 rounded-lg transition-all"
          variant="outline"
        >
          <span className="mr-2 text-base">🍖</span> Feed
        </Button>

        <Button
          data-ocid="dragon.fly_button"
          onClick={() => interact("fly")}
          disabled={energy < 20}
          className="btn-fantasy bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 border border-sky-500/50 hover:border-sky-400 px-5 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          variant="outline"
        >
          <span className="mr-2 text-base">🌟</span> Fly
        </Button>

        <Button
          data-ocid="dragon.fire_button"
          onClick={() => interact("fire")}
          disabled={energy < 10}
          className="btn-fantasy glow-fire bg-destructive/20 hover:bg-destructive/40 text-orange-400 border border-destructive/50 hover:border-destructive px-5 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          variant="outline"
        >
          <span className="mr-2 text-base">🔥</span> Fire!
        </Button>
      </footer>

      {/* Footer */}
      <div className="text-center py-1 text-xs text-muted-foreground bg-background/80">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          caffeine.ai
        </a>
      </div>
    </div>
  );
}
