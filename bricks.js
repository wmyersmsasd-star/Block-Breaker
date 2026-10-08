// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 8;
const BRICK_ROWS = 4;
const BRICK_WIDTH = 60;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 6;     // empty space between bricks
const BRICKS_TOP = 50;   // how far down the first row starts
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
    ctx.shadowColor = brick.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = brick.color;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(238, 232, 235, 0.48)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(brick.x + 1, brick.y + 1, brick.width - 2, brick.height - 2);
    if (brick.hits > 1) {
      ctx.fillStyle = "rgba(238, 232, 235, 0.72)";
      ctx.fillRect(brick.x + brick.width / 2 - 4, brick.y + brick.height / 2 - 2, 8, 4);
    }
  }
}
