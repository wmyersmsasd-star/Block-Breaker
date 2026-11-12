// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 10;
const BRICK_ROWS = 5;
const BRICK_WIDTH = 68;
const BRICK_HEIGHT = 22;
const BRICK_GAP = 6;     // empty space between bricks
const BRICKS_TOP = 74;   // how far down the first row starts
const TNT_FUSE_SECONDS = 2;
const MOVING_BRICK_ROW = 2;
const MOVING_BRICK_SPEED = 3;
let movingBrickOffset = 0;
let movingBrickDirection = 1;
// Builds the list of bricks. Each brick is an object with an
// x, y, width, and height.
function makeBricks(level = 1) {
  const list = [];
  movingBrickOffset = 0;
  movingBrickDirection = 1;
  const rows = Math.min(BRICK_ROWS + Math.floor((level - 1) / 3), 6);
  const pattern = (level - 1) % 4;
  const theme = getDrinkLevelTheme(level);

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

      const colorIndex = (row + level - 1) % theme.colors.length;
      const hits = level >= 3 && row < Math.min(2, Math.floor((level - 1) / 2)) ? 2 : 1;
      const isTnt = row === 0 && (col === 4 || (col === 6 && pattern !== 2));
      list.push({
        x: left + col * (BRICK_WIDTH + BRICK_GAP),
        y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        row,
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color: isTnt ? "#ff633d" : theme.colors[colorIndex],
        hits: isTnt ? 1 : hits,
        maxHits: isTnt ? 1 : hits,
        hitFlash: 0,
        type: isTnt ? "tnt" : "normal",
        fuse: null
      });
    }
  }

  return list;
}

function updateMovingBrickRow() {
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const maxOffset = Math.max(0, WIDTH - totalWidth);
  const previousOffset = movingBrickOffset;
  const nextOffset = previousOffset + movingBrickDirection * MOVING_BRICK_SPEED;

  if (nextOffset >= maxOffset || nextOffset <= 0) {
    movingBrickDirection *= -1;
  }
  movingBrickOffset = Math.max(0, Math.min(maxOffset, nextOffset));

  const offsetChange = movingBrickOffset - previousOffset;
  for (const brick of bricks) {
    if (brick.row === MOVING_BRICK_ROW) {
      brick.x += offsetChange;
    }
  }
}

// Draws every brick in the list.
function drawBricks() {
  for (const brick of bricks) {
    const { x, y, width, height } = brick;
    const isTnt = brick.type === "tnt";
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, isTnt ? "#fff3a6" : "rgba(255, 255, 255, 0.92)");
    gradient.addColorStop(0.16, isTnt ? "#ff633d" : brick.color);
    gradient.addColorStop(0.72, isTnt ? "#ff633d" : brick.color);
    gradient.addColorStop(1, isTnt ? "#811b35" : "rgba(10, 16, 27, 0.64)");

    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);

    ctx.shadowColor = isTnt ? "#ff633d" : brick.color;
    ctx.shadowBlur = isTnt && brick.fuse !== null
      ? 15 + Math.sin(performance.now() / 55) * 7
      : 9;
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    if (brick.hitFlash > 0) {
      ctx.globalAlpha = brick.hitFlash / 0.2;
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);
    ctx.clip();
    const sheenX = x + ((performance.now() / 1800 + brick.row * 0.19) % 1) * width;
    const sheen = ctx.createLinearGradient(sheenX - 10, y, sheenX + 10, y + height);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0)");
    sheen.addColorStop(0.5, "rgba(255, 255, 255, 0.26)");
    sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    ctx.strokeStyle = isTnt ? "rgba(255, 239, 160, 0.92)" : "rgba(255, 255, 255, 0.72)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(x + width * 0.24, y + height * 0.2, width * 0.14, height * 0.18, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.52)";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + width * 0.14, y + height * 0.22);
    ctx.quadraticCurveTo(x + width * 0.45, y + height * 0.12, x + width * 0.76, y + height * 0.22);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
    ctx.beginPath();
    ctx.arc(x + width * 0.82, y + height * 0.58, 1.2, 0, Math.PI * 2);
    ctx.arc(x + width * 0.87, y + height * 0.72, 0.8, 0, Math.PI * 2);
    ctx.fill();

    if (isTnt) {
      drawTntBrick(brick);
    }
    if (!isTnt && brick.maxHits > 1) {
      for (let hit = 0; hit < brick.maxHits; hit++) {
        ctx.beginPath();
        ctx.arc(brick.x + brick.width / 2 - (brick.maxHits - 1) * 4 + hit * 8, brick.y + brick.height / 2, 2, 0, Math.PI * 2);
        ctx.fillStyle = hit < brick.hits
          ? "rgba(255, 255, 255, 0.9)"
          : "rgba(20, 24, 36, 0.55)";
        ctx.fill();
      }
    }
  }
}

function drawTntBrick(brick) {
  const { x, y, width, height } = brick;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + 3, y);
  ctx.lineTo(x + width - 3, y);
  ctx.lineTo(x + width, y + 3);
  ctx.lineTo(x + width, y + height - 3);
  ctx.lineTo(x + width - 3, y + height);
  ctx.lineTo(x + 3, y + height);
  ctx.lineTo(x, y + height - 3);
  ctx.lineTo(x, y + 3);
  ctx.closePath();
  ctx.clip();

  ctx.strokeStyle = "rgba(35, 18, 24, 0.52)";
  ctx.lineWidth = 6;
  for (let offset = -height; offset < width; offset += 15) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y + height);
    ctx.lineTo(x + offset + height, y);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillStyle = "#fff7d1";
  ctx.shadowColor = "#7b1728";
  ctx.shadowBlur = 4;
  ctx.fillText("TNT", x + width / 2, y + height / 2 + 1);
  ctx.restore();

  if (brick.fuse !== null) {
    const barX = x + 2;
    const barY = y - 7;
    const barWidth = width - 4;
    const remaining = Math.max(0, brick.fuse / TNT_FUSE_SECONDS);
    ctx.save();
    ctx.fillStyle = "rgba(14, 17, 26, 0.92)";
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, 6);
    ctx.fillStyle = remaining > 0.5 ? "#8aff78" : remaining > 0.25 ? "#ffd166" : "#ff405c";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.fillRect(barX, barY, barWidth * remaining, 4);
    ctx.restore();
  }
}
