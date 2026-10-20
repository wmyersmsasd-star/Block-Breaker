// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 10;
const BRICK_ROWS = 5;
const BRICK_WIDTH = 68;
const BRICK_HEIGHT = 22;
const BRICK_GAP = 6;     // empty space between bricks
const BRICKS_TOP = 74;   // how far down the first row starts
const BRICK_COLORS = [
  "#ff4d8d",
  "#ffb703",
  "#4ecdc4",
  "#7bdff2",
  "#9b5de5",
  "#7cf29a",
  "#ff7b54",
  "#ffd166"
];

// Builds the list of bricks. Each brick is an object with an
// x, y, width, and height.
function makeBricks(level = 1) {
  const list = [];
  const rows = Math.min(BRICK_ROWS + Math.floor((level - 1) / 3), 6);
  const pattern = (level - 1) % 4;

  // Center the whole block of bricks on the screen.
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BRICK_COLUMNS; col++) {
      const distanceFromCenter = Math.abs(col - (BRICK_COLUMNS - 1) / 2)
        + Math.abs(row - (rows - 1) / 2);
      const included = pattern === 0
        || (pattern === 1 && (row + col) % 2 === 0)
        || (pattern === 2 && distanceFromCenter <= (rows + 1) / 2)
        || (pattern === 3 && col % 4 !== 1);
      if (!included) {
        continue;
      }

      const colorIndex = (row + level - 1) % BRICK_COLORS.length;
      const hits = level >= 3 && row < Math.min(2, Math.floor((level - 1) / 2)) ? 2 : 1;
      list.push({
        x: left + col * (BRICK_WIDTH + BRICK_GAP),
        y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color: BRICK_COLORS[colorIndex],
        hits
      });
    }
  }

  return list;
}

// Draws every brick in the list.
function drawBricks() {
  for (const brick of bricks) {
    const { x, y, width, height } = brick;
    const bevel = 3;
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.12, brick.color);
    gradient.addColorStop(1, "rgba(10, 16, 27, 0.78)");

    ctx.beginPath();
    ctx.moveTo(x + bevel, y);
    ctx.lineTo(x + width - bevel, y);
    ctx.lineTo(x + width, y + bevel);
    ctx.lineTo(x + width, y + height - bevel);
    ctx.lineTo(x + width - bevel, y + height);
    ctx.lineTo(x + bevel, y + height);
    ctx.lineTo(x, y + height - bevel);
    ctx.lineTo(x, y + bevel);
    ctx.closePath();

    ctx.shadowColor = brick.color;
    ctx.shadowBlur = 9;
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255, 239, 220, 0.68)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 5, y + 3);
    ctx.lineTo(x + width - 5, y + 3);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 4, y + height - 2);
    ctx.lineTo(x + width - 4, y + height - 2);
    ctx.strokeStyle = "rgba(10, 16, 27, 0.4)";
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 239, 220, 0.28)";
    ctx.fillRect(x + 9, y + 7, 3, 1);
    ctx.fillRect(x + width - 15, y + height - 6, 4, 1);

    if (brick.hits === 1) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + width * 0.54, y + 2);
      ctx.lineTo(x + width * 0.47, y + height * 0.3);
      ctx.lineTo(x + width * 0.58, y + height * 0.48);
      ctx.lineTo(x + width * 0.43, y + height * 0.68);
      ctx.lineTo(x + width * 0.5, y + height - 2);
      ctx.moveTo(x + width * 0.47, y + height * 0.3);
      ctx.lineTo(x + width * 0.32, y + height * 0.42);
      ctx.moveTo(x + width * 0.58, y + height * 0.48);
      ctx.lineTo(x + width * 0.72, y + height * 0.38);
      ctx.strokeStyle = "rgba(28, 18, 20, 0.9)";
      ctx.lineWidth = 2;
      ctx.lineJoin = "bevel";
      ctx.stroke();
      ctx.translate(-1, -1);
      ctx.strokeStyle = "rgba(255, 239, 220, 0.72)";
      ctx.lineWidth = 0.75;
      ctx.stroke();
      ctx.restore();
    }
    if (brick.hits > 1) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
      for (let hit = 0; hit < brick.hits; hit++) {
        ctx.beginPath();
        ctx.arc(brick.x + brick.width / 2 - (brick.hits - 1) * 4 + hit * 8, brick.y + brick.height / 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
