import type { GameSnapshot } from "@/lib/games/registry";

export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const BOARD_W = COLS * BLOCK; // 300
export const BOARD_H = ROWS * BLOCK; // 600
export const PANEL_W = 160;
export const W = BOARD_W + PANEL_W; // 460
export const H = BOARD_H; // 600

const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
] as const;

const PIECES: (number[][] | null)[] = [
  null,
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 2], [2, 2]], // O
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]], // S
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]], // Z
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]], // J
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]], // L
  [[8, 8, 8], [8, 0, 8], [8, 8, 8]], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

type Piece = { type: number; shape: number[][]; x: number; y: number };
type EngineState = "playing" | "gameover";

function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = (PIECES[type] as number[][]).map((row) => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

export class TetrisEngine {
  private ctx: CanvasRenderingContext2D;

  private board!: number[][];
  private current!: Piece;
  private next!: Piece;
  private score = 0;
  private lines = 0;
  private level = 1;
  private dropAccum = 0;
  private dropInterval = 1000;
  private paused = false;
  private state: EngineState = "playing";

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
    if (code === "KeyP") {
      if (this.state !== "gameover") this.paused = !this.paused;
      return;
    }
    if (this.state === "gameover") {
      if (code === "Space") this.initGame();
      return;
    }
    if (this.paused) return;
    switch (code) {
      case "ArrowLeft":
        if (!this.collide(this.current.shape, this.current.x - 1, this.current.y)) this.current.x--;
        break;
      case "ArrowRight":
        if (!this.collide(this.current.shape, this.current.x + 1, this.current.y)) this.current.x++;
        break;
      case "ArrowDown":
        this.softDrop();
        break;
      case "ArrowUp":
        this.tryRotate();
        break;
      case "Space":
        this.hardDrop();
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- el original no usa keyup: cada movimiento se dispara por evento de keydown
  handleKeyup(_code: string) {}

  getSnapshot(): GameSnapshot {
    return { score: this.score, lives: 0, level: this.level, status: this.state };
  }

  private initGame() {
    this.board = createBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 1000;
    this.dropAccum = 0;
    this.paused = false;
    this.state = "playing";
    this.next = randomPiece();
    this.spawn();
  }

  private collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && this.board[ny][nx]) return true;
      }
    }
    return false;
  }

  private tryRotate() {
    const rotated = rotateCW(this.current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!this.collide(rotated, this.current.x + kick, this.current.y)) {
        this.current.shape = rotated;
        this.current.x += kick;
        return;
      }
    }
  }

  private merge() {
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c]) this.board[this.current.y + r][this.current.x + c] = this.current.shape[r][c];
  }

  private clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((v) => v !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      this.lines += cleared;
      this.score += (LINE_SCORES[cleared] || 0) * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 90);
    }
  }

  private ghostY(): number {
    let gy = this.current.y;
    while (!this.collide(this.current.shape, this.current.x, gy + 1)) gy++;
    return gy;
  }

  private hardDrop() {
    const gy = this.ghostY();
    this.score += (gy - this.current.y) * 2;
    this.current.y = gy;
    this.lockPiece();
  }

  private softDrop() {
    if (!this.collide(this.current.shape, this.current.x, this.current.y + 1)) {
      this.current.y++;
      this.score += 1;
    } else {
      this.lockPiece();
    }
  }

  private lockPiece() {
    this.merge();
    this.clearLines();
    this.spawn();
  }

  private spawn() {
    this.current = this.next;
    this.next = randomPiece();
    if (this.collide(this.current.shape, this.current.x, this.current.y)) {
      this.state = "gameover";
    }
  }

  update(dt: number) {
    if (this.paused || this.state === "gameover") return;
    this.dropAccum += dt * 1000;
    if (this.dropAccum >= this.dropInterval) {
      this.dropAccum = 0;
      if (!this.collide(this.current.shape, this.current.x, this.current.y + 1)) {
        this.current.y++;
      } else {
        this.lockPiece();
      }
    }
  }

  private drawBlock(x: number, y: number, colorIndex: number, size: number, alpha = 1) {
    if (!colorIndex) return;
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS[colorIndex] as string;
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    ctx.globalAlpha = 1;
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
  }

  private drawBoard() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    this.drawGrid();

    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.drawBlock(c, r, this.board[r][c], BLOCK);

    const gy = this.ghostY();
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c]) this.drawBlock(this.current.x + c, gy + r, this.current.shape[r][c], BLOCK, 0.2);

    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        this.drawBlock(this.current.x + c, this.current.y + r, this.current.shape[r][c], BLOCK);

    ctx.restore();
  }

  private drawPanel() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(BOARD_W, 0);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, PANEL_W, BOARD_H);

    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE", 16, 30);
    ctx.font = "bold 20px monospace";
    ctx.fillText(this.score.toLocaleString(), 16, 54);

    ctx.font = "12px monospace";
    ctx.fillText("LINES", 16, 96);
    ctx.font = "bold 20px monospace";
    ctx.fillText(String(this.lines), 16, 120);

    ctx.font = "12px monospace";
    ctx.fillText("LEVEL", 16, 162);
    ctx.font = "bold 20px monospace";
    ctx.fillText(String(this.level), 16, 186);

    ctx.font = "12px monospace";
    ctx.fillText("NEXT", 16, 228);
    const NB = 24;
    const shape = this.next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    ctx.save();
    ctx.translate(16, 244);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        ctx.globalAlpha = 1;
        ctx.fillStyle = COLORS[shape[r][c]] as string;
        ctx.fillRect((offX + c) * NB + 1, (offY + r) * NB + 1, NB - 2, NB - 2);
      }
    ctx.restore();

    if (this.paused) {
      ctx.fillStyle = "#ffd54f";
      ctx.font = "bold 14px monospace";
      ctx.fillText("PAUSA", 16, 360);
    }

    ctx.restore();
  }

  draw() {
    this.drawBoard();
    this.drawPanel();

    if (this.state === "gameover") {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px monospace";
      ctx.fillText("GAME OVER", BOARD_W / 2, BOARD_H / 2 - 18);
      ctx.font = "14px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(`PUNTAJE: ${this.score}`, BOARD_W / 2, BOARD_H / 2 + 12);
      ctx.fillText("ESPACIO PARA REINICIAR", BOARD_W / 2, BOARD_H / 2 + 34);
      ctx.restore();
    }
  }
}
