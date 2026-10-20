// ============================================================
// collisions.js: what happens when the ball touches something
//
// To "bounce", we flip the ball's speed:
//   hit something sideways -> vx = -vx
//   hit something above or below -> vy = -vy
// ============================================================

// Returns true if two rectangles (like the ball and a brick) overlap.
function boxesTouch(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}


// The ball bounces off the left, right, and top walls.
// (The bottom is not a wall: falling off the bottom resets the ball.)
function bounceOffWalls(targetBall = ball) {
  if (targetBall.x < 0) {
    targetBall.x = 0;
    targetBall.vx = -targetBall.vx;
  }
  if (targetBall.x + targetBall.width > WIDTH) {
    targetBall.x = WIDTH - targetBall.width;
    targetBall.vx = -targetBall.vx;
  }
  if (targetBall.y < 0) {
    targetBall.y = 0;
    targetBall.vy = -targetBall.vy;
  }
}


// The ball bounces off the top of the paddle.
// ball.vy > 0 means "the ball is moving down", so it only bounces
// when it is falling onto the paddle.
function bounceOffPaddle(targetBall = ball) {
  if (boxesTouch(targetBall, paddle) && targetBall.vy > 0) {
    targetBall.y = paddle.y - targetBall.height;  // sit on top of the paddle
    if (activeEffects.sticky > 0) {
      targetBall.x = paddle.x + paddle.width / 2 - targetBall.width / 2;
      targetBall.vx = 0;
      targetBall.vy = 0;
      activeEffects.sticky = 0;
      targetBall.serving = true;
      if (targetBall === ball) {
        isServing = true;
      }
      return;
    }
    const ballCenter = targetBall.x + targetBall.width / 2;
    const paddleCenter = paddle.x + paddle.width / 2;
    const hitPosition = (ballCenter - paddleCenter) / (paddle.width / 2);
    let angle = Math.max(-1, Math.min(1, hitPosition)) * 1.05;
    if (Math.abs(angle) < 0.16) {
      angle = ballCenter < paddleCenter ? -0.16 : 0.16;
    }
    const speed = ballSpeed * (activeEffects.slow > 0 ? 0.72 : 1);
    targetBall.vx = Math.sin(angle) * speed;
    targetBall.vy = -Math.cos(angle) * speed;
  }
}


// The ball bounces off the brick it touches and damages it.
function bounceOffBricks(targetBall = ball) {
  for (let i = 0; i < bricks.length; i++) {
    const brick = bricks[i];
    if (!boxesTouch(targetBall, brick)) {
      continue;  // not touching this brick, check the next one
    }

    // How far has the ball pushed into the brick on each side?
    const overlapX = Math.min(targetBall.x + targetBall.width, brick.x + brick.width) - Math.max(targetBall.x, brick.x);
    const overlapY = Math.min(targetBall.y + targetBall.height, brick.y + brick.height) - Math.max(targetBall.y, brick.y);

    if (overlapX < overlapY) {
      // The ball hit the brick's left or right side.
      targetBall.vx = -targetBall.vx;
      if (targetBall.x < brick.x) {
        targetBall.x = brick.x - targetBall.width;     // left of the brick
      } else {
        targetBall.x = brick.x + brick.width;    // right of the brick
      }
    } else {
      // The ball hit the brick's top or bottom.
      targetBall.vy = -targetBall.vy;
      if (targetBall.y < brick.y) {
        targetBall.y = brick.y - targetBall.height;    // above the brick
      } else {
        targetBall.y = brick.y + brick.height;   // below the brick
      }
    }

    brick.hits -= 1;
    const destroyed = brick.hits === 0;
    if (destroyed) {
      bricks.splice(i, 1);
    }
    return { brick, destroyed };  // stop after the first brick hit
  }
  return null;
}
