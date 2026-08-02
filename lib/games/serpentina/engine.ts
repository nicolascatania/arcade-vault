import type { GameSnapshot } from "@/lib/games/registry";
import { FRUITS_SRC, FRUIT_ATLAS, FRUIT_KEYS } from "@/lib/games/serpentina/sprites";

export const CELL = 24;
export const COLS = 20;
export const ROWS = 20;
export const W = COLS * CELL;
export const H = ROWS * CELL;

const START_INTERVAL = 0.14;
const MIN_INTERVAL = 0.07;
const INTERVAL_STEP = 0.004;
const FRUITS_PER_LEVEL = 5;
const POINTS_PER_FRUIT = 10;

type EngineState = "playing" | "dead" | "gameover";
type Point = { x: number; y: number };

const DIRS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const randInt = (max: number) => Math.floor(Math.random() * max);

export class SerpentinaEngine {
  private ctx: CanvasRenderingContext2D;
  private img: HTMLImageElement;
  private imgReady = false;
  private keys: Record<string, boolean> = {};
  private justPressed: Record<string, boolean> = {};

  private snake: Point[] = [];
  private dir: Point = DIRS.ArrowRight;
  private queuedDir: Point = DIRS.ArrowRight;
  private food: Point = { x: 0, y: 0 };
  private foodKind = FRUIT_KEYS[0];
  private tickTimer = 0;
  private tickInterval = START_INTERVAL;

  private score = 0;
  private level = 1;
  private state: EngineState = "playing";
  private paused = false;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.img = new Image();
    this.img.onload = () => {
      this.imgReady = true;
    };
    this.img.src = FRUITS_SRC;
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
    const next = DIRS[code];
    if (!next) return;
    const opposite = next.x === -this.dir.x && next.y === -this.dir.y;
    if (!opposite) this.queuedDir = next;
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
    return { score: this.score, lives: 0, level: this.level, status: this.state };
  }

  private initGame() {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    this.snake = [
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
      { x: cx - 3, y: cy },
    ];
    this.dir = DIRS.ArrowRight;
    this.queuedDir = DIRS.ArrowRight;
    this.tickTimer = 0;
    this.tickInterval = START_INTERVAL;
    this.score = 0;
    this.level = 1;
    this.state = "playing";
    this.spawnFood();
  }

  private spawnFood() {
    let x = 0;
    let y = 0;
    let onSnake = true;
    while (onSnake) {
      x = randInt(COLS);
      y = randInt(ROWS);
      onSnake = this.snake.some((s) => s.x === x && s.y === y);
    }
    this.food = { x, y };
    this.foodKind = FRUIT_KEYS[randInt(FRUIT_KEYS.length)];
  }

  private step() {
    this.dir = this.queuedDir;
    const head = this.snake[0];
    const next: Point = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    const hitsWall = next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS;
    const hitsSelf = this.snake.some((s) => s.x === next.x && s.y === next.y);
    if (hitsWall || hitsSelf) {
      this.state = "gameover";
      return;
    }

    this.snake.unshift(next);

    if (next.x === this.food.x && next.y === this.food.y) {
      this.score += POINTS_PER_FRUIT;
      if (this.score % (POINTS_PER_FRUIT * FRUITS_PER_LEVEL) === 0) {
        this.level++;
        this.tickInterval = Math.max(MIN_INTERVAL, this.tickInterval - INTERVAL_STEP);
      }
      this.spawnFood();
    } else {
      this.snake.pop();
    }
  }

  update(dt: number) {
    if (this.paused) return;

    if (this.state === "gameover") {
      if (this.pressed("Space")) this.initGame();
      return;
    }

    this.tickTimer += dt;
    while (this.tickTimer >= this.tickInterval && this.state === "playing") {
      this.tickTimer -= this.tickInterval;
      this.step();
    }
  }

  private drawFruit(px: number, py: number) {
    if (!this.imgReady) return;
    const rect = FRUIT_ATLAS[this.foodKind];
    const pad = 3;
    this.ctx.drawImage(
      this.img,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      px + pad,
      py + pad,
      CELL - pad * 2,
      CELL - pad * 2
    );
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(0,255,136,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }
  }

  private drawSnake() {
    const ctx = this.ctx;
    this.snake.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? "#00ff88" : "rgba(0,255,136,0.75)";
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = isHead ? 10 : 4;
      const pad = 2;
      ctx.fillRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
      ctx.shadowBlur = 0;
    });
  }

  private drawHUD() {
    const ctx = this.ctx;
    ctx.fillStyle = "#00ff88";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${this.score}`, 8, 16);
    ctx.textAlign = "right";
    ctx.fillText(`NIVEL ${this.level}`, W - 8, 16);
  }

  private drawOverlay(title: string, sub: string) {
    const ctx = this.ctx;
    ctx.textAlign = "center";
    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 32px monospace";
    ctx.fillText(title, W / 2, H / 2 - 14);
    ctx.font = "14px monospace";
    ctx.fillStyle = "rgba(0,255,136,0.7)";
    ctx.fillText(sub, W / 2, H / 2 + 16);
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#031008";
    ctx.fillRect(0, 0, W, H);

    this.drawGrid();
    this.drawFruit(this.food.x * CELL, this.food.y * CELL);
    this.drawSnake();
    this.drawHUD();

    if (this.state === "gameover") {
      this.drawOverlay("GAME OVER", `PUNTAJE: ${this.score}   —   ESPACIO PARA REINICIAR`);
    }
  }
}
