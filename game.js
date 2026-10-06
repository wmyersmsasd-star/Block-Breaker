// ============================================================
// BLOCK BREAKER (base game)
//
// game.js  = the canvas, the ball, the paddle, and the game loop
// bricks.js     = where the bricks are and how they are drawn
// collisions.js = what happens when the ball touches things
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;   // 600
const HEIGHT = canvas.height; // 450


// ------------------------------------------------------------
// THE BALL
// x and y are the top-left corner. vx and vy are how many pixels
// the ball moves each update (vx = sideways, vy = up/down).
// A positive vy means the ball is moving DOWN the screen.
// ------------------------------------------------------------
const BALL_SPEED = 4;

const ball = {
  x: 0,
  y: 0,
  width: 12,
  height: 12,
  vx: 0,
  vy: 0,
  color: "#ff4fd8"
};

// Put the ball in the center and reset its speed and direction.
function resetBall() {
  ball.x = WIDTH / 2 - ball.width / 2;
  ball.y = HEIGHT / 2 - ball.height / 2;
  ball.vx = 0;
  ball.vy = BALL_SPEED;  // straight down
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
  color: "#7ef9ff"
};


// ------------------------------------------------------------
// THE BRICKS (the list is filled in by makeBricks() in bricks.js)
// ------------------------------------------------------------
let bricks = [];
const STARTING_LIVES = 3;
let lives = STARTING_LIVES;
let gameOver = false;


// ------------------------------------------------------------
// KEYBOARD
// keys["arrowleft"] is true while the left arrow is held down.
// ------------------------------------------------------------
const keys = {};

document.addEventListener("keydown", function (event) {
  const key = event.key.toLowerCase();
  keys[key] = true;
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


// ------------------------------------------------------------
// UPDATE: runs 60 times every second. Move things, then check
// what they touched.
// ------------------------------------------------------------
function update() {
  if (gameOver) {
    return;
  }

  movePaddle();
  moveBall();

  bounceOffWalls();   // collisions.js
  bounceOffPaddle();  // collisions.js
  bounceOffBricks();  // collisions.js

  // Losing a ball costs one life, but leaves the remaining bricks intact.
  if (ball.y > HEIGHT) {
    lives = lives - 1;
    paddle.x = WIDTH / 2 - paddle.width / 2;
    if (lives === 0) {
      gameOver = true;
      return;
    }
    resetBall();
  }
}

function restartGame() {
  lives = STARTING_LIVES;
  gameOver = false;
  bricks = makeBricks();
  paddle.x = WIDTH / 2 - paddle.width / 2;
  resetBall();
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
}

function moveBall() {
  ball.x = ball.x + ball.vx;
  ball.y = ball.y + ball.vy;
}


// ------------------------------------------------------------
// DRAW: paints everything on the canvas. Black background,
// white shapes.
// ------------------------------------------------------------
function draw() {
  const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  background.addColorStop(0, "#0b1020");
  background.addColorStop(1, "#12091f");
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
  glow.addColorStop(0, "rgba(71, 214, 255, 0.35)");
  glow.addColorStop(1, "rgba(71, 214, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.shadowColor = paddle.color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = paddle.color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

  ctx.shadowColor = ball.color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = ball.color;
  ctx.fillRect(ball.x, ball.y, ball.width, ball.height);
  ctx.shadowBlur = 0;

  drawBricks();  // bricks.js

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f7f5ff";
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`LIVES: ${lives}`, 18, 28);

  if (gameOver) {
    ctx.fillStyle = "rgba(5, 8, 22, 0.78)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = "center";
    ctx.shadowColor = "#ff4fd8";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ff8be5";
    ctx.font = "bold 38px 'Courier New', monospace";
    ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f7f5ff";
    ctx.font = "18px 'Courier New', monospace";
    ctx.fillText("PRESS R TO RESTART", WIDTH / 2, HEIGHT / 2 + 28);
  }
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
  bricks = makeBricks();  // bricks.js
  resetBall();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

// Wait until all three script files have loaded, then start.
window.addEventListener("load", start);
