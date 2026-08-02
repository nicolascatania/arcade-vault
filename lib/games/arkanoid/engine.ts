import type { GameSnapshot } from "@/lib/games/registry";

export const W = 800;
export const H = 600;

const PADDLE_SPEED = 400;
const PADDLE_W = 81;
const PADDLE_H = 14;
const PADDLE_Y = 560;
const BALL_SIZE = 16;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const EXPLOSION_DURATION = 150;

type BlockColor = "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

const COLOR_HEX: Record<BlockColor, string> = {
  red: "#ff3b3b",
  yellow: "#f5ff00",
  cyan: "#00f5ff",
  magenta: "#ff006e",
  hotpink: "#ff4fd8",
  green: "#00ff88",
  gray: "#8a8a8a",
};

interface LevelBlock {
  col: number;
  row: number;
  color: BlockColor;
}

interface Level {
  speed: number;
  blocks: LevelBlock[];
}

function buildLevels(): Level[] {
  const rowColors1: BlockColor[] = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
  const rowColors2: BlockColor[] = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
  const rowColors4: BlockColor[] = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

  const l1: LevelBlock[] = [];
  for (let row = 0; row < 6; row++) for (let col = 0; col < 10; col++) l1.push({ col, row, color: rowColors1[row] });

  const l2: LevelBlock[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++) l2.push({ col, row, color: rowColors2[row] });

  const l3: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0) l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) if (!gaps4[row].includes(col)) l4.push({ col, row, color: rowColors4[row] });

  const l5: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross) l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
}

const LEVELS = buildLevels();

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
}

type EngineState = "playing" | "gameover";

export class ArkanoidEngine {
  private ctx: CanvasRenderingContext2D;
  private keys: Record<string, boolean> = {};
  private justPressed: Record<string, boolean> = {};

  private paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  private ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
  private blocks: Block[] = [];
  private explosions: Explosion[] = [];
  private lives = 3;
  private score = 0;
  private level = 1;
  private won = false;
  private state: EngineState = "playing";
  private paused = false;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  init() {
    this.initGame();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  end() {
    if (this.state === "gameover") return;
    this.state = "gameover";
  }

  handleKeydown(code: string) {
    if (!this.keys[code]) this.justPressed[code] = true;
    this.keys[code] = true;
  }

  handleKeyup(code: string) {
    this.keys[code] = false;
  }

  private pressed(code: string): boolean {
    const val = !!this.justPressed[code];
    this.justPressed[code] = false;
    return val;
  }

  getSnapshot(): GameSnapshot {
    return { score: this.score, lives: this.lives, level: this.level, status: this.state };
  }

  private initGame() {
    this.paddle.x = (W - this.paddle.w) / 2;
    this.lives = 3;
    this.score = 0;
    this.won = false;
    this.state = "playing";
    this.loadLevel(1);
  }

  private loadLevel(n: number) {
    this.level = n;
    const level = LEVELS[n - 1];
    this.blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    this.explosions = [];
    this.initBall(level.speed);
  }

  private initBall(speed: number) {
    this.ball.x = this.paddle.x + (this.paddle.w - this.ball.w) / 2;
    this.ball.y = this.paddle.y - this.ball.h;
    this.ball.vx = BASE_BALL_VX * speed;
    this.ball.vy = BASE_BALL_VY * speed;
  }

  private collideAABB(block: Block): boolean {
    const ball = this.ball;
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  update(dt: number) {
    if (this.paused) return;

    if (this.state === "gameover") {
      if (this.pressed("Space")) this.initGame();
      return;
    }

    const paddle = this.paddle;
    const ball = this.ball;

    if (this.keys["ArrowLeft"]) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (this.keys["ArrowRight"]) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }

    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }

    for (const block of this.blocks) {
      if (!block.alive) continue;
      if (this.collideAABB(block)) {
        block.alive = false;
        this.explosions.push({ x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, elapsed: 0 });
        this.score += 10;
        ball.vy = -ball.vy;
        if (this.blocks.every((b) => !b.alive)) {
          if (this.level < 5) {
            this.loadLevel(this.level + 1);
          } else {
            this.won = true;
            this.state = "gameover";
          }
        }
        break;
      }
    }

    for (const exp of this.explosions) exp.elapsed += dt * 1000;
    this.explosions = this.explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    if (ball.y > H) {
      this.lives--;
      if (this.lives <= 0) {
        this.lives = 0;
        this.state = "gameover";
      } else {
        this.initBall(LEVELS[this.level - 1].speed);
      }
    }
  }

  private drawOverlay(message: string) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 46px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, W / 2, H / 2);
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    for (const block of this.blocks) {
      if (!block.alive) continue;
      ctx.fillStyle = COLOR_HEX[block.color];
      ctx.fillRect(block.x + 1, block.y + 1, block.w - 2, block.h - 2);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(block.x + 1, block.y + 1, block.w - 2, 4);
    }

    for (const exp of this.explosions) {
      const alpha = 1 - exp.elapsed / EXPLOSION_DURATION;
      ctx.globalAlpha = Math.max(alpha, 0);
      ctx.fillStyle = COLOR_HEX[exp.color];
      ctx.fillRect(exp.x, exp.y, exp.w, exp.h);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#fff";
    ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);

    ctx.beginPath();
    ctx.arc(this.ball.x + this.ball.w / 2, this.ball.y + this.ball.h / 2, this.ball.w / 2, 0, Math.PI * 2);
    ctx.fill();

    if (this.state === "playing") {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Score: " + this.score, 10, 10);
      ctx.textAlign = "center";
      ctx.fillText("Nivel: " + this.level, W / 2, 10);
      const ballSize = 16;
      const ballSpacing = 4;
      for (let i = 0; i < this.lives; i++) {
        const bx = W - 10 - (this.lives - i) * (ballSize + ballSpacing);
        ctx.beginPath();
        ctx.arc(bx + ballSize / 2, 10 + ballSize / 2, ballSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.state === "gameover") {
      this.drawOverlay(this.won ? "¡COMPLETASTE EL JUEGO!" : "GAME OVER");
    }
  }
}
