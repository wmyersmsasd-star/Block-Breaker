// ============================================================
// BLOCK BREAKER (base game)
//
// game.js  = the canvas, the ball, the paddle, and the game loop
// bricks.js     = where the bricks are and how they are drawn
// collisions.js = what happens when the ball touches things
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const homeScreen = document.getElementById("home-screen");
const gameView = document.getElementById("game-view");
const playButton = document.getElementById("play-button");
const touchButtons = document.querySelectorAll(".touch-controls button");

const WIDTH = canvas.width;   // 600
const HEIGHT = canvas.height; // 450


// ------------------------------------------------------------
// THE BALL
// x and y are the top-left corner. vx and vy are how many pixels
// the ball moves each update (vx = sideways, vy = up/down).
// A positive vy means the ball is moving DOWN the screen.
// ------------------------------------------------------------
const BALL_SPEED = 4;
const MAX_BALL_SPEED = 6.5;

const ball = {
  x: 0,
  y: 0,
  width: 12,
  height: 12,
  vx: 0,
  vy: 0,
  color: "#ff5ea8"
};
let ballSpeed = BALL_SPEED;

// Put the ball in the center and reset its speed and direction.
function resetBall() {
  ball.x = paddle.x + paddle.width / 2 - ball.width / 2;
  ball.y = paddle.y - ball.height - 2;
  ball.vx = 0;
  ball.vy = 0;
  ballTrail = [];
  isServing = true;
}


// ------------------------------------------------------------
// THE PADDLE
// ------------------------------------------------------------
const paddle = {
  x: WIDTH / 2 - 45,
  y: HEIGHT - 30,
  width: 90,
  height: 12,
  speed: 6,
  color: "#4de0ff"
};


// ------------------------------------------------------------
// THE BRICKS (the list is filled in by makeBricks() in bricks.js)
// ------------------------------------------------------------
let bricks = [];
const STARTING_LIVES = 3;
let lives = STARTING_LIVES;
let gameOver = false;
let hasStarted = false;
let isServing = true;
let combo = 0;
let comboTimer = 0;
const COMBO_DURATION = 2.6;
let shieldCharges = 0;
const SKY_BEAM_PERIOD = 3.4;
const SKY_BEAM_PULSE_DURATION = 1.4;
const SKY_BEAM_WIDTH = 10;
const skyBeam = {
  elapsed: 0,
  targetX: WIDTH / 2,
  hasFired: false
};

function randomizeSkyBeamTarget() {
  skyBeam.targetX = 20 + Math.random() * (WIDTH - 40);
}
let score = 0;
let level = 1;
let particles = [];
let ballTrail = [];
let powerUps = [];
let activeEffects = { wide: 0, slow: 0 };
let levelBannerTime = 0;


// ------------------------------------------------------------
// KEYBOARD
// keys["arrowleft"] is true while the left arrow is held down.
// ------------------------------------------------------------
const keys = {};

document.addEventListener("keydown", function (event) {
  const key = event.key.toLowerCase();
  keys[key] = true;
  if ((key === " " || key === "enter") && hasStarted && !gameOver) {
    event.preventDefault();
    launchBall();
  }
  if (key === "r" && gameOver) {
    restartGame();
  }
  // Stop the arrow keys from scrolling the page.
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});

playButton.addEventListener("click", startGame);
canvas.addEventListener("pointerdown", launchBall);
for (const button of touchButtons) {
  const key = button.dataset.key;
  button.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    keys[key] = true;
    button.setPointerCapture(event.pointerId);
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, function () {
      keys[key] = false;
    });
  }
}


// ------------------------------------------------------------
// UPDATE: runs 60 times every second. Move things, then check
// what they touched.
// ------------------------------------------------------------
function update() {
  if (!hasStarted || gameOver) {
    return;
  }

  movePaddle();
  if (isServing) {
    ball.x = paddle.x + paddle.width / 2 - ball.width / 2;
    updateParticles();
    updatePowerUps();
    updateEffects();
    levelBannerTime = Math.max(0, levelBannerTime - STEP / 1000);
    return;
  }

  if (comboTimer > 0) {
    comboTimer = Math.max(0, comboTimer - STEP / 1000);
    if (comboTimer === 0) {
      combo = 0;
    }
  }

  updateSkyBeam();
  moveBall();

  bounceOffWalls();   // collisions.js
  bounceOffPaddle();  // collisions.js
  const brickHit = bounceOffBricks();  // collisions.js
  if (brickHit) {
    combo += 1;
    comboTimer = COMBO_DURATION;
    const multiplier = 1 + Math.floor(combo / 4) * 0.25;
    score += Math.round((brickHit.destroyed ? 100 : 25) * multiplier);
    burstParticles(brickHit.brick);
    if (brickHit.destroyed) {
      maybeDropPowerUp(brickHit.brick);
    }
    if (bricks.length === 0) {
      advanceLevel();
    }
  }
  updateParticles();
  updatePowerUps();
  updateEffects();
  levelBannerTime = Math.max(0, levelBannerTime - STEP / 1000);

  // Losing a ball costs one life, but leaves the remaining bricks intact.
  if (ball.y > HEIGHT && !gameOver) {
    if (shieldCharges > 0) {
      shieldCharges -= 1;
      ball.y = HEIGHT - ball.height - 2;
      ball.vy = -Math.abs(ball.vy || ballSpeed);
      burstParticles({
        x: ball.x,
        y: HEIGHT - 4,
        width: ball.width,
        height: 2,
        color: "#7bdff2"
      });
    } else {
      lives -= 1;
      combo = 0;
      comboTimer = 0;
      paddle.x = WIDTH / 2 - paddle.width / 2;
      if (lives === 0) {
        gameOver = true;
        return;
      }
      resetBall();
    }
  }
}

function restartGame() {
  lives = STARTING_LIVES;
  gameOver = false;
  score = 0;
  combo = 0;
  comboTimer = 0;
  shieldCharges = 0;
  level = 1;
  ballSpeed = BALL_SPEED;
  particles = [];
  ballTrail = [];
  powerUps = [];
  activeEffects = { wide: 0, slow: 0 };
  paddle.width = 90;
  bricks = makeBricks();
  paddle.x = WIDTH / 2 - paddle.width / 2;
  skyBeam.elapsed = 0;
  skyBeam.targetX = WIDTH / 2;
  skyBeam.hasFired = false;
  resetBall();
}

function updateSkyBeam() {
  if (level < 3) {
    skyBeam.elapsed = 0;
    skyBeam.hasFired = false;
    return;
  }

  const previousElapsed = skyBeam.elapsed;
  skyBeam.elapsed += STEP / 1000;

  if (!skyBeam.hasFired
      && previousElapsed < SKY_BEAM_PULSE_DURATION
      && skyBeam.elapsed >= SKY_BEAM_PULSE_DURATION) {
    skyBeam.hasFired = true;
    const beamLeft = skyBeam.targetX - SKY_BEAM_WIDTH / 2;
    const beamRight = skyBeam.targetX + SKY_BEAM_WIDTH / 2;
    if (beamLeft < paddle.x + paddle.width && beamRight > paddle.x) {
      lives -= 1;
      if (lives <= 0) {
        gameOver = true;
      }
    }
  }

  if (skyBeam.elapsed >= SKY_BEAM_PERIOD) {
    skyBeam.elapsed -= SKY_BEAM_PERIOD;
    randomizeSkyBeamTarget();
    skyBeam.hasFired = false;
  }
}

function startGame() {
  restartGame();
  hasStarted = true;
  homeScreen.hidden = true;
  gameView.hidden = false;
}

function launchBall() {
  if (!hasStarted || gameOver || !isServing) {
    return;
  }
  const speed = ballSpeed * (activeEffects.slow > 0 ? 0.72 : 1);
  ball.vx = speed * 0.28;
  ball.vy = -speed * Math.sqrt(1 - 0.28 ** 2);
  isServing = false;
}

function advanceLevel() {
  level += 1;
  ballSpeed = Math.min(BALL_SPEED + (level - 1) * 0.5, MAX_BALL_SPEED);
  bricks = makeBricks(level);
  powerUps = [];
  paddle.x = WIDTH / 2 - paddle.width / 2;
  if (level >= 3) {
    skyBeam.elapsed = 0;
    randomizeSkyBeamTarget();
    skyBeam.hasFired = false;
  }
  resetBall();
  levelBannerTime = 1.8;
}

function maybeDropPowerUp(brick) {
  if (bricks.length === 0 || Math.random() > 0.22) {
    return;
  }
  const types = ["wide", "slow", "life", "shield"];
  powerUps.push({
    x: brick.x + brick.width / 2 - 10,
    y: brick.y + brick.height / 2 - 10,
    width: 20,
    height: 20,
    vy: 2.2,
    type: types[Math.floor(Math.random() * types.length)]
  });
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    powerUp.y += powerUp.vy;

    if (boxesTouch(powerUp, paddle)) {
      collectPowerUp(powerUp);
      powerUps.splice(i, 1);
    } else if (powerUp.y > HEIGHT) {
      powerUps.splice(i, 1);
    }
  }
}

function collectPowerUp(powerUp) {
  if (powerUp.type === "wide") {
    activeEffects.wide = 12;
    paddle.width = 140;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x - 25));
  } else if (powerUp.type === "slow") {
    if (activeEffects.slow === 0) {
      setBallSpeed(ballSpeed * 0.72);
    }
    activeEffects.slow = 8;
  } else if (powerUp.type === "life") {
    if (lives < 5) {
      lives += 1;
    } else {
      score += 250;
    }
  } else if (powerUp.type === "shield") {
    shieldCharges = Math.min(2, shieldCharges + 1);
  }
}

function updateEffects() {
  const elapsed = STEP / 1000;
  if (activeEffects.wide > 0) {
    activeEffects.wide = Math.max(0, activeEffects.wide - elapsed);
    if (activeEffects.wide === 0) {
      paddle.width = 90;
      paddle.x = Math.min(paddle.x, WIDTH - paddle.width);
    }
  }
  if (activeEffects.slow > 0) {
    activeEffects.slow = Math.max(0, activeEffects.slow - elapsed);
    if (activeEffects.slow === 0) {
      setBallSpeed(ballSpeed);
    }
  }
}

function setBallSpeed(speed) {
  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  if (currentSpeed === 0) {
    return;
  }
  const scale = speed / currentSpeed;
  ball.vx *= scale;
  ball.vy *= scale;
}

function burstParticles(brick) {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.55,
      color: brick.color
    });
  }
}

function updateParticles() {
  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.04;
    particle.life -= STEP / 1000;
  }
  particles = particles.filter((particle) => particle.life > 0);
  for (const trailPoint of ballTrail) {
    trailPoint.life -= STEP / 1000;
  }
  ballTrail = ballTrail.filter((trailPoint) => trailPoint.life > 0);
}

function movePaddle() {
  if (keys["arrowleft"] || keys["a"]) {
    paddle.x = paddle.x - paddle.speed;
  }
  if (keys["arrowright"] || keys["d"]) {
    paddle.x = paddle.x + paddle.speed;
  }

  // Keep the paddle on the screen.
  if (paddle.x < 0) {
    paddle.x = 0;
  }
  if (paddle.x + paddle.width > WIDTH) {
    paddle.x = WIDTH - paddle.width;
  }
  if (isServing) {
    ball.x = paddle.x + paddle.width / 2 - ball.width / 2;
  }
}

function moveBall() {
  ballTrail.push({
    x: ball.x + ball.width / 2,
    y: ball.y + ball.height / 2,
    life: 0.24
  });
  if (ballTrail.length > 8) {
    ballTrail.shift();
  }
  ball.x = ball.x + ball.vx;
  ball.y = ball.y + ball.vy;
}

function drawPowerUps() {
  const colors = { wide: "#4ecdc4", slow: "#9b5de5", life: "#ff4d8d", shield: "#7bdff2" };
  const labels = { wide: "W", slow: "S", life: "+", shield: "G" };
  for (const powerUp of powerUps) {
    const color = colors[powerUp.type];
    ctx.save();
    ctx.translate(powerUp.x + 10, powerUp.y + 10);
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-7, -7, 14, 14, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.fillStyle = "#30313a";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labels[powerUp.type], powerUp.x + 10, powerUp.y + 10);
  }
  ctx.textBaseline = "alphabetic";
}


// ------------------------------------------------------------
// DRAW: paints everything on the canvas. Black background,
// white shapes.
// ------------------------------------------------------------
function draw() {
  const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  background.addColorStop(0, "#111827");
  background.addColorStop(0.5, "#1b1630");
  background.addColorStop(1, "#0d1326");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT * 0.15,
    12,
    WIDTH / 2,
    HEIGHT * 0.15,
    WIDTH * 0.8
  );
  glow.addColorStop(0, "rgba(255, 77, 141, 0.18)");
  glow.addColorStop(0.4, "rgba(75, 210, 255, 0.14)");
  glow.addColorStop(1, "rgba(75, 210, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawCourt();
  drawSkyBeam();
  drawShield();
  drawBallTrail();

  const paddleGradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
  paddleGradient.addColorStop(0, "#e9ffff");
  paddleGradient.addColorStop(0.35, paddle.color);
  paddleGradient.addColorStop(1, "#168c9f");
  ctx.shadowColor = paddle.color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = paddleGradient;
  roundedRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  roundedRect(paddle.x + paddle.width * 0.2, paddle.y + 2, paddle.width * 0.6, 2, 1);

  ctx.shadowColor = ball.color;
  ctx.shadowBlur = 18;
  const ballGradient = ctx.createRadialGradient(
    ball.x + ball.width * 0.34,
    ball.y + ball.height * 0.3,
    1,
    ball.x + ball.width / 2,
    ball.y + ball.height / 2,
    ball.width / 2
  );
  ballGradient.addColorStop(0, "#ffffff");
  ballGradient.addColorStop(0.42, ball.color);
  ballGradient.addColorStop(1, "#b52c73");
  ctx.fillStyle = ballGradient;
  ctx.beginPath();
  ctx.arc(ball.x + ball.width / 2, ball.y + ball.height / 2, ball.width / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  drawBricks();  // bricks.js
  drawPowerUps();

  drawParticles();
  drawHud();

  if (levelBannerTime > 0 && !gameOver) {
    ctx.textAlign = "center";
    ctx.shadowColor = "#4de0ff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#f6fbff";
    ctx.font = "bold 30px 'Courier New', monospace";
    ctx.fillText(`LEVEL ${level}`, WIDTH / 2, HEIGHT / 2);
    ctx.shadowBlur = 0;
  }

  if (isServing && hasStarted && !gameOver) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(237, 246, 255, 0.78)";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText("PRESS SPACE OR TAP TO LAUNCH", WIDTH / 2, HEIGHT - 48);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(11, 14, 24, 0.8)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = "center";
    ctx.shadowColor = "#ff5ea8";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ff5ea8";
    ctx.font = "bold 38px 'Courier New', monospace";
    ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 28);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#edf6ff";
    ctx.font = "18px 'Courier New', monospace";
    ctx.fillText(`FINAL SCORE  ${score}`, WIDTH / 2, HEIGHT / 2 + 8);
    ctx.fillText("PRESS R TO RESTART", WIDTH / 2, HEIGHT / 2 + 42);
  }
}

function drawSkyBeam() {
  if (level < 3) {
    return;
  }

  const isPulsing = skyBeam.elapsed < SKY_BEAM_PULSE_DURATION;
  const fadeProgress = isPulsing
    ? 1
    : 1 - (skyBeam.elapsed - SKY_BEAM_PULSE_DURATION) / SKY_BEAM_PULSE_DURATION;
  const pulse = isPulsing
    ? 0.3 + (Math.sin(skyBeam.elapsed * Math.PI * 8) + 1) * 0.22
    : 0;
  const alpha = Math.max(0, isPulsing ? pulse : fadeProgress);
  const beamWidth = isPulsing ? SKY_BEAM_WIDTH * 0.65 : SKY_BEAM_WIDTH;
  const beamLeft = skyBeam.targetX - beamWidth / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = "#ff4d8d";
  ctx.shadowBlur = isPulsing ? 18 : 30;
  ctx.fillStyle = isPulsing ? "rgba(255, 77, 141, 0.52)" : "rgba(255, 77, 141, 0.7)";
  ctx.fillRect(beamLeft, 0, beamWidth, paddle.y + paddle.height);
  ctx.fillStyle = "rgba(255, 221, 234, 0.8)";
  ctx.fillRect(skyBeam.targetX - 1, 0, 2, paddle.y + paddle.height);
  ctx.restore();
}

function drawHud() {
  ctx.fillStyle = "rgba(6, 12, 20, 0.78)";
  ctx.fillRect(0, 0, WIDTH, 42);
  ctx.strokeStyle = "rgba(123, 223, 242, 0.32)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 41.5);
  ctx.lineTo(WIDTH, 41.5);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#dedbe2";
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${String(score).padStart(5, "0")}`, 16, 28);
  ctx.textAlign = "center";
  ctx.fillStyle = "#a2c6c8";
  ctx.fillText(`LEVEL ${level}  ·  x${(1 + Math.floor(combo / 4) * 0.25).toFixed(2)}`, WIDTH / 2, 28);
  ctx.textAlign = "right";
  ctx.fillStyle = "#d6a0b4";
  ctx.fillText(`LIVES ${"\u2665 ".repeat(lives).trim()}`, WIDTH - 16, 28);
  if (shieldCharges > 0) {
    ctx.fillStyle = "#7bdff2";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillText(`GUARD x${shieldCharges}`, WIDTH - 16, 58);
  }
  if (activeEffects.wide > 0 || activeEffects.slow > 0) {
    ctx.textAlign = "center";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillStyle = "#bcb3ca";
    const effects = [];
    if (activeEffects.wide > 0) effects.push(`WIDE ${Math.ceil(activeEffects.wide)}s`);
    if (activeEffects.slow > 0) effects.push(`SLOW ${Math.ceil(activeEffects.slow)}s`);
    ctx.fillText(effects.join("  "), WIDTH / 2, HEIGHT - 12);
  }
  if (combo > 0) {
    const streakWidth = 112;
    ctx.textAlign = "left";
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`STREAK x${(1 + Math.floor(combo / 4) * 0.25).toFixed(2)}`, 16, HEIGHT - 20);
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fillRect(16, HEIGHT - 13, streakWidth, 3);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(16, HEIGHT - 13, streakWidth * (comboTimer / COMBO_DURATION), 3);
  }
}

function drawShield() {
  if (shieldCharges === 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 180) * 0.16;
  ctx.shadowColor = "#7bdff2";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#7bdff2";
  ctx.fillRect(0, HEIGHT - 3, WIDTH, 3);
  ctx.restore();
}

function drawBallTrail() {
  ctx.save();
  for (const trailPoint of ballTrail) {
    const opacity = trailPoint.life / 0.24;
    ctx.globalAlpha = opacity * 0.4;
    ctx.fillStyle = ball.color;
    ctx.shadowColor = ball.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(trailPoint.x, trailPoint.y, 2 + opacity * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCourt() {
  ctx.save();
  ctx.strokeStyle = "rgba(171, 205, 224, 0.055)";
  ctx.lineWidth = 1;
  for (let x = 24; x < WIDTH; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 42);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 54; y < HEIGHT; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(123, 223, 242, 0.22)";
  ctx.beginPath();
  ctx.moveTo(0, 42);
  ctx.lineTo(WIDTH, 42);
  ctx.stroke();
  ctx.restore();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.min(1, particle.life * 2);
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(particle.x, particle.y, 4, 4);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}


// ------------------------------------------------------------
// THE GAME LOOP
// The browser calls frame() every time it is ready to draw.
// Some screens are faster than others, so we make sure update()
// always runs exactly 60 times per second on every computer.
// ------------------------------------------------------------
const STEP = 1000 / 60;
let lastTime = 0;
let leftover = 0;

function frame(now) {
  leftover = leftover + (now - lastTime);
  lastTime = now;

  // If the tab was hidden for a while, don't try to catch up.
  if (leftover > 250) {
    leftover = 250;
  }

  while (leftover >= STEP) {
    update();
    leftover = leftover - STEP;
  }

  draw();
  requestAnimationFrame(frame);
}

function start() {
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

// Wait until all three script files have loaded, then start.
window.addEventListener("load", start);
