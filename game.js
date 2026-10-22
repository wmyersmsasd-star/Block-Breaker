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
const adminForm = document.getElementById("admin-form");
const adminCodeInput = document.getElementById("admin-code");
const adminStatus = document.getElementById("admin-status");
const touchButtons = document.querySelectorAll(".touch-controls [data-key]");
const fireButton = document.getElementById("fire-button");
const coinCount = document.getElementById("coin-count");
const openCaseButton = document.getElementById("open-case-button");
const caseStatus = document.getElementById("case-status");
const skinCollection = document.getElementById("skin-collection");
const workshopButton = document.getElementById("workshop-button");

const WIDTH = canvas.width;   // 800
const HEIGHT = canvas.height; // 600
const SKIN_SAVE_KEY = "blockBreakerPaddleCollection";
const SKIN_RARITIES = [
  { name: "Common", chance: 55 },
  { name: "Uncommon", chance: 26 },
  { name: "Rare", chance: 13 },
  { name: "Epic", chance: 5 },
  { name: "Legendary", chance: 1 }
];
const PADDLE_SKINS = [
  { id: "neon-circuit", name: "Neon Circuit", rarity: "Common", color: "#4de0ff", highlight: "#e9ffff", shadow: "#168c9f", pattern: "solid" },
  { id: "sunset", name: "Sunset", rarity: "Common", color: "#ff8065", highlight: "#ffe0a6", shadow: "#a83a50", pattern: "stripe" },
  { id: "sprout", name: "Sprout", rarity: "Common", color: "#83df87", highlight: "#e4ffd1", shadow: "#34794e", pattern: "dots" },
  { id: "glacier", name: "Glacier", rarity: "Uncommon", color: "#68c9ff", highlight: "#f0ffff", shadow: "#315db3", pattern: "stripe" },
  { id: "voltage", name: "Voltage", rarity: "Uncommon", color: "#ffe05c", highlight: "#fff8bf", shadow: "#b46a24", pattern: "double" },
  { id: "berry-pop", name: "Berry Pop", rarity: "Uncommon", color: "#f477c8", highlight: "#ffe6fa", shadow: "#843eaa", pattern: "dots" },
  { id: "deep-sea", name: "Deep Sea", rarity: "Rare", color: "#358bdb", highlight: "#b9fff4", shadow: "#172f88", pattern: "circuit" },
  { id: "ember", name: "Ember", rarity: "Rare", color: "#ff633d", highlight: "#ffe26e", shadow: "#8f174e", pattern: "flame" },
  { id: "amethyst", name: "Amethyst", rarity: "Rare", color: "#a976ff", highlight: "#f7d5ff", shadow: "#56258e", pattern: "prism" },
  { id: "holochrome", name: "Holochrome", rarity: "Epic", color: "#62ffe0", highlight: "#fff4a8", shadow: "#714dff", pattern: "prism" },
  { id: "starforge", name: "Starforge", rarity: "Epic", color: "#ffbd54", highlight: "#fff4ca", shadow: "#c63b8f", pattern: "stars" },
  { id: "phantom", name: "Phantom", rarity: "Epic", color: "#b69aff", highlight: "#eeefff", shadow: "#412e91", pattern: "circuit" },
  { id: "crown-of-stars", name: "Crown of Stars", rarity: "Legendary", color: "#ffe66d", highlight: "#ffffff", shadow: "#e44eaa", pattern: "stars" },
  { id: "dragonfire", name: "Dragonfire", rarity: "Legendary", color: "#ff4d68", highlight: "#fff17b", shadow: "#7615b6", pattern: "flame" },
  { id: "singularity", name: "Singularity", rarity: "Legendary", color: "#69f0ff", highlight: "#ffffff", shadow: "#9c36ff", pattern: "cosmic" },
  { id: "red-dragon", name: "Crimson Dragon", rarity: "Mythic", oddsLabel: "1 IN 1,000,000", color: "#ff2020", highlight: "#ffd166", shadow: "#720b12", pattern: "dragon" }
];
const DEFAULT_SKIN_ID = "neon-circuit";
let caseStatusMessage = "Beat a level to earn a coin.";
let collectionState = loadCollection();
let equippedSkin = getSkin(collectionState.equippedSkinId);


// ------------------------------------------------------------
// THE BALL
// x and y are the top-left corner. vx and vy are how many pixels
// the ball moves each update (vx = sideways, vy = up/down).
// A positive vy means the ball is moving DOWN the screen.
// ------------------------------------------------------------
const BALL_SPEED = 5;
const MAX_BALL_SPEED = 7.5;

const ball = {
  x: 0,
  y: 0,
  width: 14,
  height: 14,
  vx: 0,
  vy: 0,
  color: "#ff5ea8",
  trail: [],
  serving: true,
  serveOffset: 0,
  launchAngle: Math.asin(0.28)
};
const balls = [ball];
let ballSpeed = BALL_SPEED;

// Put the ball in the center and reset its speed and direction.
function resetBall() {
  for (const targetBall of balls) {
    targetBall.x = paddle.x + paddle.width / 2 - targetBall.width / 2 + targetBall.serveOffset;
    targetBall.y = paddle.y - targetBall.height - 2;
    targetBall.vx = 0;
    targetBall.vy = 0;
    targetBall.trail = [];
    targetBall.serving = true;
  }
  isServing = true;
}


// ------------------------------------------------------------
// THE PADDLE
// ------------------------------------------------------------
const paddle = {
  x: WIDTH / 2 - 56,
  y: HEIGHT - 38,
  width: 112,
  height: 15,
  speed: 7
};

function getSkin(skinId) {
  return PADDLE_SKINS.find((skin) => skin.id === skinId) || PADDLE_SKINS[0];
}

function loadCollection() {
  const defaultCollection = {
    coins: 0,
    ownedSkinIds: [DEFAULT_SKIN_ID],
    equippedSkinId: DEFAULT_SKIN_ID
  };

  try {
    const saved = window.localStorage.getItem(SKIN_SAVE_KEY);
    if (!saved) {
      return defaultCollection;
    }
    const parsed = JSON.parse(saved);
    if (!Number.isSafeInteger(parsed.coins) || parsed.coins < 0 || !Array.isArray(parsed.ownedSkinIds)) {
      throw new Error("Saved paddle collection has an invalid format.");
    }
    const ownedSkinIds = [...new Set(parsed.ownedSkinIds.filter((skinId) =>
      PADDLE_SKINS.some((skin) => skin.id === skinId)
    ))];
    if (!ownedSkinIds.includes(DEFAULT_SKIN_ID)) {
      ownedSkinIds.push(DEFAULT_SKIN_ID);
    }
    const equippedSkinId = ownedSkinIds.includes(parsed.equippedSkinId)
      ? parsed.equippedSkinId
      : DEFAULT_SKIN_ID;
    return { coins: parsed.coins, ownedSkinIds, equippedSkinId };
  } catch (error) {
    caseStatusMessage = "Saved collection unavailable; starting with the default skin.";
    return defaultCollection;
  }
}

function saveCollection() {
  try {
    window.localStorage.setItem(SKIN_SAVE_KEY, JSON.stringify(collectionState));
    return true;
  } catch (error) {
    caseStatusMessage = "Collection changed, but the browser could not save it.";
    return false;
  }
}

function renderSkinCollection() {
  if (!coinCount || !skinCollection || !openCaseButton) {
    return;
  }

  coinCount.textContent = adminMode ? "∞" : String(collectionState.coins);
  skinCollection.replaceChildren();
  for (const skin of PADDLE_SKINS) {
    const owned = collectionState.ownedSkinIds.includes(skin.id);
    const equipped = collectionState.equippedSkinId === skin.id;
    const card = document.createElement("article");
    card.className = `skin-card rarity-${skin.rarity.toLowerCase()}`;
    card.style.setProperty("--skin-color", skin.color);
    card.style.setProperty("--skin-highlight", skin.highlight);

    const swatch = document.createElement("span");
    swatch.className = "skin-swatch";
    swatch.setAttribute("aria-hidden", "true");
    const name = document.createElement("strong");
    name.textContent = skin.name;
    const rarity = document.createElement("span");
    rarity.className = "skin-rarity";
    rarity.textContent = skin.oddsLabel || skin.rarity;
    if (skin.oddsLabel) {
      rarity.title = `${skin.rarity} - 1 in 1,000,000 chance`;
    }
    const action = document.createElement("button");
    action.type = "button";
    action.disabled = !owned || equipped;
    action.textContent = !owned ? "LOCKED" : equipped ? "EQUIPPED" : "EQUIP";
    if (owned && !equipped) {
      action.addEventListener("click", () => equipSkin(skin.id));
    }

    card.append(swatch, name, rarity, action);
    skinCollection.append(card);
  }
  openCaseButton.disabled = (!adminMode && collectionState.coins < 1)
    || collectionState.ownedSkinIds.length === PADDLE_SKINS.length;
  if (collectionState.ownedSkinIds.length === PADDLE_SKINS.length) {
    openCaseButton.textContent = "COLLECTION COMPLETE";
  } else {
    openCaseButton.textContent = adminMode ? "OPEN CASE · FREE" : "OPEN CASE · 1 COIN";
  }
}

function equipSkin(skinId) {
  if (!collectionState.ownedSkinIds.includes(skinId)) {
    return;
  }
  collectionState.equippedSkinId = skinId;
  equippedSkin = getSkin(skinId);
  const saved = saveCollection();
  caseStatusMessage = saved
    ? `${equippedSkin.name} equipped.`
    : "Skin equipped for this session, but the browser could not save it.";
  updateCaseStatus();
  renderSkinCollection();
}

function openCase() {
  if (!adminMode && collectionState.coins < 1) {
    caseStatusMessage = "You need 1 coin. Beat a level to earn one.";
    updateCaseStatus();
    return;
  }

  const availableSkins = PADDLE_SKINS.filter((skin) =>
    !collectionState.ownedSkinIds.includes(skin.id)
  );
  if (availableSkins.length === 0) {
    caseStatusMessage = "You have unlocked every paddle skin!";
    updateCaseStatus();
    renderSkinCollection();
    return;
  }

  if (!adminMode) {
    collectionState.coins -= 1;
  }
  const dragonSkin = availableSkins.find((skin) => skin.id === "red-dragon");
  let wonSkin = dragonSkin && Math.random() < 1 / 1_000_000 ? dragonSkin : null;
  const availableRarities = SKIN_RARITIES.map((rarity) => ({
    ...rarity,
    skins: availableSkins.filter((skin) => skin.rarity === rarity.name)
  })).filter((rarity) => rarity.skins.length > 0);
  if (!wonSkin && availableRarities.length === 0) {
    if (!adminMode) {
      collectionState.coins += 1;
    }
    caseStatusMessage = adminMode
      ? "The Crimson Dragon did not appear. Try again."
      : "The Crimson Dragon did not appear. Your coin was returned.";
    updateCaseStatus();
    renderSkinCollection();
    return;
  }
  if (!wonSkin) {
    const totalChance = availableRarities.reduce((total, rarity) => total + rarity.chance, 0);
    let roll = Math.random() * totalChance;
    let selectedRarity = availableRarities[availableRarities.length - 1];
    for (const rarity of availableRarities) {
      roll -= rarity.chance;
      if (roll < 0) {
        selectedRarity = rarity;
        break;
      }
    }
    wonSkin = selectedRarity.skins[Math.floor(Math.random() * selectedRarity.skins.length)];
  }

  collectionState.ownedSkinIds.push(wonSkin.id);
  collectionState.equippedSkinId = wonSkin.id;
  equippedSkin = wonSkin;
  const saved = saveCollection();
  caseStatusMessage = saved
    ? `Unlocked ${wonSkin.rarity}: ${wonSkin.name}! It is now equipped.`
    : `Unlocked ${wonSkin.rarity}: ${wonSkin.name}! It is equipped for this session, but the browser could not save it.`;
  updateCaseStatus();
  renderSkinCollection();
  if (caseStatus) {
    caseStatus.classList.remove("case-reveal");
    void caseStatus.offsetWidth;
    caseStatus.classList.add("case-reveal");
  }
}

function updateCaseStatus() {
  if (caseStatus) {
    caseStatus.textContent = caseStatusMessage;
  }
}


// ------------------------------------------------------------
// THE BRICKS (the list is filled in by makeBricks() in bricks.js)
// ------------------------------------------------------------
let bricks = [];
const STARTING_LIVES = 3;
let lives = STARTING_LIVES;
let gameOver = false;
let hasStarted = false;
let isServing = true;
let adminUnlocked = false;
let adminMode = false;
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
let powerUps = [];
let activeEffects = { wide: 0, slow: 0, laser: 0, sticky: 0 };
let laserShots = [];
let laserCooldown = 0;
let levelBannerTime = 0;
const starfield = Array.from({ length: 150 }, (_, index) => ({
  x: (index * 173.37 + (index % 5) * 29) % WIDTH,
  y: (index * 257.91 + (index % 11) * 13) % HEIGHT,
  size: index % 17 === 0 ? 1.8 : index % 4 === 0 ? 1.2 : 0.7,
  phase: index * 1.91,
  color: index % 9 === 0 ? "#ffd58a" : index % 3 === 0 ? "#91f4ed" : "#dceaff"
}));


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
  if (key === "x") {
    event.preventDefault();
    fireLaser();
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
openCaseButton.addEventListener("click", openCase);
workshopButton.addEventListener("click", returnToWorkshop);
adminForm.addEventListener("submit", function (event) {
  event.preventDefault();
  if (adminCodeInput.value === "34521") {
    adminUnlocked = true;
    adminStatus.textContent = "ADMIN MODE UNLOCKED. START A GAME TO ACTIVATE.";
    adminForm.classList.add("is-unlocked");
    adminCodeInput.value = "";
  } else {
    adminStatus.textContent = "CODE NOT RECOGNIZED.";
    adminForm.classList.remove("is-unlocked");
    adminCodeInput.select();
  }
});
renderSkinCollection();
updateCaseStatus();
canvas.addEventListener("pointerdown", launchBall);
if (fireButton) {
  fireButton.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    fireLaser();
  });
}
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
  if (updateLaserShots()) {
    advanceLevel();
    return;
  }
  for (const targetBall of balls) {
    if (targetBall.serving) {
      continue;
    }
    moveBall(targetBall);
    bounceOffWalls(targetBall);   // collisions.js
    bounceOffPaddle(targetBall);  // collisions.js
    const brickHit = bounceOffBricks(targetBall);  // collisions.js
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
        return;
      }
    }

    if (targetBall.y > HEIGHT && !gameOver) {
      if (adminMode) {
        launchAdminBall(targetBall);
      } else if (shieldCharges > 0) {
        shieldCharges -= 1;
        targetBall.y = HEIGHT - targetBall.height - 2;
        targetBall.vy = -Math.abs(targetBall.vy || ballSpeed);
        burstParticles({
          x: targetBall.x,
          y: HEIGHT - 4,
          width: targetBall.width,
          height: 2,
          color: "#7bdff2"
        });
        continue;
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
        return;
      }
    }
  }
  updateParticles();
  updatePowerUps();
  updateEffects();
  levelBannerTime = Math.max(0, levelBannerTime - STEP / 1000);

}

function restartGame() {
  adminMode = adminUnlocked;
  lives = STARTING_LIVES;
  gameOver = false;
  score = 0;
  combo = 0;
  comboTimer = 0;
  shieldCharges = 0;
  level = 1;
  ballSpeed = BALL_SPEED;
  particles = [];
  powerUps = [];
  activeEffects = { wide: 0, slow: 0, laser: 0, sticky: 0 };
  laserShots = [];
  laserCooldown = 0;
  paddle.width = adminMode ? WIDTH : 112;
  balls.splice(1);
  if (adminMode) {
    const angles = [-0.62, -0.31, 0, 0.31, 0.62];
    const colors = ["#ff5ea8", "#59d9ff", "#ffd166", "#82f59a", "#ad8cff"];
    ball.serveOffset = -224;
    ball.launchAngle = angles[0];
    ball.color = colors[0];
    for (let index = 1; index < angles.length; index++) {
      balls.push(createExtraBall(index, angles[index], colors[index]));
    }
  } else {
    ball.serveOffset = 0;
    ball.launchAngle = Math.asin(0.28);
    ball.color = "#ff5ea8";
  }
  bricks = makeBricks();
  paddle.x = WIDTH / 2 - paddle.width / 2;
  skyBeam.elapsed = 0;
  skyBeam.targetX = WIDTH / 2;
  skyBeam.hasFired = false;
  resetBall();
  renderSkinCollection();
}

function createExtraBall(index, launchAngle, color) {
  return {
    x: 0,
    y: 0,
    width: ball.width,
    height: ball.height,
    vx: 0,
    vy: 0,
    color,
    trail: [],
    serving: true,
    serveOffset: (index - 2) * 112,
    launchAngle
  };
}

function launchAdminBall(targetBall) {
  targetBall.x = paddle.x + paddle.width / 2 - targetBall.width / 2 + targetBall.serveOffset;
  targetBall.y = paddle.y - targetBall.height - 2;
  const speed = ballSpeed * (activeEffects.slow > 0 ? 0.72 : 1);
  targetBall.vx = Math.sin(targetBall.launchAngle) * speed;
  targetBall.vy = -Math.cos(targetBall.launchAngle) * speed;
  targetBall.serving = false;
  isServing = balls.every((activeBall) => activeBall.serving);
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
      if (!adminMode) {
        lives -= 1;
        if (lives <= 0) {
          gameOver = true;
        }
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

function returnToWorkshop() {
  hasStarted = false;
  homeScreen.hidden = false;
  gameView.hidden = true;
}

function launchBall() {
  if (!hasStarted || gameOver || !balls.some((targetBall) => targetBall.serving)) {
    return;
  }
  const speed = ballSpeed * (activeEffects.slow > 0 ? 0.72 : 1);
  for (const targetBall of balls) {
    if (!targetBall.serving) {
      continue;
    }
    targetBall.vx = Math.sin(targetBall.launchAngle) * speed;
    targetBall.vy = -Math.cos(targetBall.launchAngle) * speed;
    targetBall.serving = false;
  }
  isServing = balls.every((targetBall) => targetBall.serving);
}

function advanceLevel() {
  if (adminMode) {
    caseStatusMessage = "Admin mode: coins are unlimited.";
  } else {
    collectionState.coins += 1;
    const saved = saveCollection();
    caseStatusMessage = saved
      ? "Level cleared! You earned 1 coin."
      : "Level cleared! You earned 1 coin, but the browser could not save it.";
  }
  updateCaseStatus();
  renderSkinCollection();
  level += 1;
  ballSpeed = Math.min(BALL_SPEED + (level - 1) * 0.5, MAX_BALL_SPEED);
  bricks = makeBricks(level);
  powerUps = [];
  laserShots = [];
  laserCooldown = 0;
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
  if (bricks.length === 0 || Math.random() > 0.27) {
    return;
  }
  const types = ["wide", "slow", "life", "shield", "laser", "sticky"];
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
    paddle.width = adminMode ? WIDTH : 164;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x - 26));
  } else if (powerUp.type === "slow") {
    if (activeEffects.slow === 0) {
      setBallSpeed(ballSpeed * 0.72);
    }
    activeEffects.slow = 8;
  } else if (powerUp.type === "life") {
    if (adminMode) {
      score += 250;
    } else if (lives < 5) {
      lives += 1;
    } else {
      score += 250;
    }
  } else if (powerUp.type === "shield") {
    shieldCharges = Math.min(2, shieldCharges + 1);
  } else if (powerUp.type === "laser") {
    activeEffects.laser = 10;
  } else if (powerUp.type === "sticky") {
    activeEffects.sticky = 10;
  }
}

function updateEffects() {
  const elapsed = STEP / 1000;
  if (activeEffects.wide > 0) {
    activeEffects.wide = Math.max(0, activeEffects.wide - elapsed);
    if (activeEffects.wide === 0) {
      paddle.width = adminMode ? WIDTH : 112;
      paddle.x = Math.min(paddle.x, WIDTH - paddle.width);
    }
  }
  if (activeEffects.slow > 0) {
    activeEffects.slow = Math.max(0, activeEffects.slow - elapsed);
    if (activeEffects.slow === 0) {
      setBallSpeed(ballSpeed);
    }
  }
  if (activeEffects.laser > 0) {
    activeEffects.laser = Math.max(0, activeEffects.laser - elapsed);
  }
  if (activeEffects.sticky > 0) {
    activeEffects.sticky = Math.max(0, activeEffects.sticky - elapsed);
  }
}

function fireLaser() {
  if (!hasStarted || gameOver || activeEffects.laser <= 0 || laserCooldown > 0) {
    return;
  }
  laserShots.push({
    x: paddle.x + paddle.width / 2 - 2,
    y: paddle.y - 14,
    width: 4,
    height: 14
  });
  laserCooldown = 0.28;
}

function updateLaserShots() {
  laserCooldown = Math.max(0, laserCooldown - STEP / 1000);
  for (let i = laserShots.length - 1; i >= 0; i--) {
    const shot = laserShots[i];
    shot.y -= 9;
    if (shot.y + shot.height < 42) {
      laserShots.splice(i, 1);
      continue;
    }

    const brickIndex = bricks.findIndex((brick) => boxesTouch(shot, brick));
    if (brickIndex === -1) {
      continue;
    }
    const [brick] = bricks.splice(brickIndex, 1);
    brick.hits -= 1;
    score += brick.hits <= 0 ? 75 : 30;
    burstParticles(brick);
    if (brick.hits > 0) {
      bricks.splice(brickIndex, 0, brick);
    } else {
      maybeDropPowerUp(brick);
    }
    laserShots.splice(i, 1);
  }
  return bricks.length === 0;
}

function setBallSpeed(speed) {
  for (const targetBall of balls) {
    const currentSpeed = Math.hypot(targetBall.vx, targetBall.vy);
    if (currentSpeed === 0) {
      continue;
    }
    const scale = speed / currentSpeed;
    targetBall.vx *= scale;
    targetBall.vy *= scale;
  }
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
  for (const targetBall of balls) {
    for (const trailPoint of targetBall.trail) {
      trailPoint.life -= STEP / 1000;
    }
    targetBall.trail = targetBall.trail.filter((trailPoint) => trailPoint.life > 0);
  }
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
  for (const targetBall of balls) {
    if (targetBall.serving) {
      targetBall.x = paddle.x + paddle.width / 2 - targetBall.width / 2 + targetBall.serveOffset;
      targetBall.y = paddle.y - targetBall.height - 2;
    }
  }
}

function moveBall(targetBall) {
  targetBall.trail.push({
    x: targetBall.x + targetBall.width / 2,
    y: targetBall.y + targetBall.height / 2,
    life: 0.24
  });
  if (targetBall.trail.length > 8) {
    targetBall.trail.shift();
  }
  targetBall.x += targetBall.vx;
  targetBall.y += targetBall.vy;
}

function drawPowerUps() {
  const colors = { wide: "#4ecdc4", slow: "#9b5de5", life: "#ff4d8d", shield: "#7bdff2", laser: "#ffd166", sticky: "#a7e58d" };
  const labels = { wide: "W", slow: "S", life: "+", shield: "G", laser: "L", sticky: "C" };
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

function drawPaddle() {
  const rarityGlow = {
    Common: 14,
    Uncommon: 20,
    Rare: 26,
    Epic: 34,
    Legendary: 44,
    Mythic: 62
  };
  const patternOpacity = equippedSkin.rarity === "Mythic" ? 1
    : equippedSkin.rarity === "Legendary" ? 0.95
    : equippedSkin.rarity === "Epic" ? 0.78
      : equippedSkin.rarity === "Rare" ? 0.62 : 0.48;
  const paddleGradient = ctx.createLinearGradient(
    paddle.x,
    paddle.y,
    paddle.x,
    paddle.y + paddle.height
  );
  paddleGradient.addColorStop(0, equippedSkin.highlight);
  paddleGradient.addColorStop(0.35, equippedSkin.color);
  paddleGradient.addColorStop(1, equippedSkin.shadow);
  ctx.save();
  ctx.shadowColor = equippedSkin.color;
  ctx.shadowBlur = rarityGlow[equippedSkin.rarity];
  ctx.fillStyle = paddleGradient;
  roundedRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
  ctx.clip();
  ctx.strokeStyle = equippedSkin.highlight;
  ctx.fillStyle = equippedSkin.highlight;
  ctx.globalAlpha = patternOpacity;
  ctx.lineWidth = equippedSkin.rarity === "Mythic" || equippedSkin.rarity === "Legendary" ? 2.5 : 1.5;

  if (equippedSkin.pattern === "stripe" || equippedSkin.pattern === "double"
      || equippedSkin.pattern === "prism") {
    const spacing = equippedSkin.pattern === "double" ? 14 : 22;
    for (let x = paddle.x - paddle.height; x < paddle.x + paddle.width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, paddle.y + paddle.height);
      ctx.lineTo(x + paddle.height, paddle.y);
      ctx.stroke();
      if (equippedSkin.pattern === "double") {
        ctx.beginPath();
        ctx.moveTo(x + 5, paddle.y + paddle.height);
        ctx.lineTo(x + paddle.height + 5, paddle.y);
        ctx.stroke();
      }
    }
  } else if (equippedSkin.pattern === "dots" || equippedSkin.pattern === "cosmic") {
    for (let x = paddle.x + 8; x < paddle.x + paddle.width; x += 18) {
      ctx.beginPath();
      ctx.arc(x, paddle.y + paddle.height / 2, equippedSkin.pattern === "cosmic" ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fill();
      if (equippedSkin.pattern === "cosmic" && x + 9 < paddle.x + paddle.width) {
        ctx.beginPath();
        ctx.arc(x + 9, paddle.y + 4, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (equippedSkin.pattern === "circuit") {
    for (let x = paddle.x + 7; x < paddle.x + paddle.width - 8; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, paddle.y + paddle.height);
      ctx.lineTo(x, paddle.y + 6);
      ctx.lineTo(x + 9, paddle.y + 6);
      ctx.stroke();
      ctx.fillRect(x - 1, paddle.y + 3, 3, 3);
    }
  } else if (equippedSkin.pattern === "flame") {
    for (let x = paddle.x; x < paddle.x + paddle.width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, paddle.y + paddle.height);
      ctx.lineTo(x + 8, paddle.y + 5);
      ctx.lineTo(x + 14, paddle.y + 10);
      ctx.lineTo(x + 22, paddle.y);
      ctx.stroke();
    }
  } else if (equippedSkin.pattern === "stars") {
    for (let x = paddle.x + 10; x < paddle.x + paddle.width; x += 28) {
      const y = paddle.y + paddle.height / 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x + 2, y - 1);
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x + 2, y + 1);
      ctx.lineTo(x, y + 4);
      ctx.lineTo(x - 2, y + 1);
      ctx.lineTo(x - 5, y);
      ctx.lineTo(x - 2, y - 1);
      ctx.closePath();
      ctx.fill();
    }
  } else if (equippedSkin.pattern === "dragon") {
    for (let x = paddle.x + 4; x < paddle.x + paddle.width - 4; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, paddle.y + 3);
      ctx.quadraticCurveTo(x + 6, paddle.y + paddle.height + 3, x + 12, paddle.y + 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 1, paddle.y + 2);
      ctx.lineTo(x + 5, paddle.y - 3);
      ctx.lineTo(x + 8, paddle.y + 2);
      ctx.fill();
    }
  }
  ctx.restore();

  if (equippedSkin.pattern === "dragon") {
    const effectTime = performance.now() / 160;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = equippedSkin.highlight;
    ctx.shadowColor = equippedSkin.color;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2;
    for (let index = 0; index < 7; index += 1) {
      const x = paddle.x + 8 + index * 16;
      const flicker = Math.sin(effectTime + index * 1.7) * 3;
      ctx.beginPath();
      ctx.moveTo(x, paddle.y + 2);
      ctx.quadraticCurveTo(x - 4, paddle.y - 7 - flicker, x + 2, paddle.y - 12 - flicker);
      ctx.quadraticCurveTo(x + 1, paddle.y - 5, x + 7, paddle.y + 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.globalAlpha = 0.78;
  ctx.fillStyle = equippedSkin.highlight;
  roundedRect(paddle.x + paddle.width * 0.2, paddle.y + 2, paddle.width * 0.6, 2, 1);
  ctx.restore();
}


// ------------------------------------------------------------
// DRAW: paints the arcade court, effects, and game objects.
// ------------------------------------------------------------
function draw() {
  drawCosmicBackdrop();

  drawCourt();
  drawSkyBeam();
  drawShield();
  drawBallTrail();

  drawPaddle();

  for (const targetBall of balls) {
    ctx.shadowColor = targetBall.color;
    ctx.shadowBlur = 18;
    const ballGradient = ctx.createRadialGradient(
      targetBall.x + targetBall.width * 0.34,
      targetBall.y + targetBall.height * 0.3,
      1,
      targetBall.x + targetBall.width / 2,
      targetBall.y + targetBall.height / 2,
      targetBall.width / 2
    );
    ballGradient.addColorStop(0, "#ffffff");
    ballGradient.addColorStop(0.42, targetBall.color);
    ballGradient.addColorStop(1, "#b52c73");
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(
      targetBall.x + targetBall.width / 2,
      targetBall.y + targetBall.height / 2,
      targetBall.width / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  drawBricks();  // bricks.js
  drawPowerUps();
  drawLaserShots();

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

function drawCosmicBackdrop() {
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, "#080b20");
  background.addColorStop(0.48, "#10162b");
  background.addColorStop(1, "#07121c");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  const aurora = ctx.createLinearGradient(0, 70, WIDTH, HEIGHT * 0.72);
  aurora.addColorStop(0, "rgba(76, 92, 255, 0)");
  aurora.addColorStop(0.28, "rgba(76, 92, 255, 0.28)");
  aurora.addColorStop(0.55, "rgba(58, 228, 205, 0.22)");
  aurora.addColorStop(0.78, "rgba(255, 93, 160, 0.18)");
  aurora.addColorStop(1, "rgba(255, 93, 160, 0)");
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = aurora;
  ctx.lineCap = "round";
  ctx.shadowColor = "#54cfe0";
  ctx.shadowBlur = 34;
  ctx.lineWidth = 58;
  ctx.beginPath();
  ctx.moveTo(-80, HEIGHT * 0.42);
  ctx.bezierCurveTo(WIDTH * 0.2, HEIGHT * 0.12, WIDTH * 0.46, HEIGHT * 0.78, WIDTH * 0.72, HEIGHT * 0.38);
  ctx.bezierCurveTo(WIDTH * 0.88, HEIGHT * 0.16, WIDTH * 0.94, HEIGHT * 0.26, WIDTH + 80, HEIGHT * 0.1);
  ctx.stroke();

  ctx.globalAlpha = 0.34;
  ctx.shadowBlur = 20;
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.moveTo(-40, HEIGHT * 0.76);
  ctx.bezierCurveTo(WIDTH * 0.25, HEIGHT * 0.95, WIDTH * 0.45, HEIGHT * 0.43, WIDTH * 0.72, HEIGHT * 0.66);
  ctx.bezierCurveTo(WIDTH * 0.84, HEIGHT * 0.78, WIDTH * 0.91, HEIGHT * 0.58, WIDTH + 50, HEIGHT * 0.5);
  ctx.stroke();

  const time = performance.now() / 1000;
  for (const star of starfield) {
    ctx.globalAlpha = 0.38 + (Math.sin(time * 1.5 + star.phase) + 1) * 0.28;
    ctx.fillStyle = star.color;
    ctx.fillRect(star.x, star.y, star.size, star.size);
    if (star.size > 1.5) {
      ctx.globalAlpha *= 0.55;
      ctx.fillRect(star.x - 2.5, star.y + 0.8, star.size + 5, 0.6);
      ctx.fillRect(star.x + 0.8, star.y - 2.5, 0.6, star.size + 5);
    }
  }
  ctx.restore();
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
  ctx.fillText(
    adminMode ? "LIVES ∞" : `LIVES ${"\u2665 ".repeat(lives).trim()}`,
    WIDTH - 16,
    28
  );
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffda8b";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillText(`COINS ${adminMode ? "∞" : collectionState.coins}`, 16, 58);
  if (shieldCharges > 0) {
    ctx.fillStyle = "#7bdff2";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillText(`GUARD x${shieldCharges}`, WIDTH - 16, 58);
  }
  if (activeEffects.wide > 0 || activeEffects.slow > 0 || activeEffects.laser > 0 || activeEffects.sticky > 0) {
    ctx.textAlign = "center";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillStyle = "#bcb3ca";
    const effects = [];
    if (activeEffects.wide > 0) effects.push(`WIDE ${Math.ceil(activeEffects.wide)}s`);
    if (activeEffects.slow > 0) effects.push(`SLOW ${Math.ceil(activeEffects.slow)}s`);
    if (activeEffects.laser > 0) effects.push(`LASER ${Math.ceil(activeEffects.laser)}s`);
    if (activeEffects.sticky > 0) effects.push(`CATCH ${Math.ceil(activeEffects.sticky)}s`);
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

function drawLaserShots() {
  ctx.save();
  ctx.strokeStyle = "#ffe08a";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.shadowColor = "#ff9f43";
  ctx.shadowBlur = 14;
  for (const shot of laserShots) {
    ctx.beginPath();
    ctx.moveTo(shot.x + shot.width / 2, shot.y + shot.height);
    ctx.lineTo(shot.x + shot.width / 2, shot.y);
    ctx.stroke();
  }
  ctx.restore();
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
  for (const targetBall of balls) {
    for (const trailPoint of targetBall.trail) {
      const opacity = trailPoint.life / 0.24;
      ctx.globalAlpha = opacity * 0.4;
      ctx.fillStyle = targetBall.color;
      ctx.shadowColor = targetBall.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(trailPoint.x, trailPoint.y, 2 + opacity * 3, 0, Math.PI * 2);
      ctx.fill();
    }
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
