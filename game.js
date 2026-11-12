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
const CASE_BATCH_SIZE = 100;
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
  const canOpenCases = collectionState.ownedSkinIds.length < PADDLE_SKINS.length;
  openCaseButton.disabled = (!adminMode && collectionState.coins < CASE_BATCH_SIZE) || !canOpenCases;
  openCaseButton.textContent = !canOpenCases
    ? "COLLECTION COMPLETE"
    : adminMode
      ? `OPEN ${CASE_BATCH_SIZE} CASES · FREE`
      : `OPEN ${CASE_BATCH_SIZE} CASES · ${CASE_BATCH_SIZE} COINS`;
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
  const availableSkins = PADDLE_SKINS.filter((skin) =>
    !collectionState.ownedSkinIds.includes(skin.id)
  );
  if (availableSkins.length === 0) {
    caseStatusMessage = "You have unlocked every paddle skin!";
    updateCaseStatus();
    renderSkinCollection();
    return;
  }

  const casesToOpen = Math.min(CASE_BATCH_SIZE, availableSkins.length);
  if (!adminMode && collectionState.coins < casesToOpen) {
    caseStatusMessage = `You need ${casesToOpen} coins. Beat a level to earn one.`;
    updateCaseStatus();
    return;
  }

  if (!adminMode) {
    collectionState.coins -= casesToOpen;
  }

  let newlyUnlocked = 0;
  for (let i = 0; i < casesToOpen; i += 1) {
    const remainingSkins = PADDLE_SKINS.filter((skin) =>
      !collectionState.ownedSkinIds.includes(skin.id)
    );
    if (remainingSkins.length === 0) {
      break;
    }

    const dragonSkin = remainingSkins.find((skin) => skin.id === "red-dragon");
    let wonSkin = dragonSkin && Math.random() < 1 / 1_000_000 ? dragonSkin : null;
    const availableRarities = SKIN_RARITIES.map((rarity) => ({
      ...rarity,
      skins: remainingSkins.filter((skin) => skin.rarity === rarity.name)
    })).filter((rarity) => rarity.skins.length > 0);

    if (!wonSkin) {
      if (availableRarities.length === 0) {
        if (!adminMode) {
          collectionState.coins += 1;
        }
        break;
      }

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

    if (!collectionState.ownedSkinIds.includes(wonSkin.id)) {
      collectionState.ownedSkinIds.push(wonSkin.id);
      newlyUnlocked += 1;
    }
    collectionState.equippedSkinId = wonSkin.id;
    equippedSkin = wonSkin;
  }

  const saved = saveCollection();
  caseStatusMessage = saved
    ? `Opened ${casesToOpen} cases. ${newlyUnlocked > 0 ? `Unlocked ${newlyUnlocked} new skin${newlyUnlocked === 1 ? "" : "s"}.` : "No new skins this batch."}`
    : `Opened ${casesToOpen} cases. ${newlyUnlocked > 0 ? `Unlocked ${newlyUnlocked} new skin${newlyUnlocked === 1 ? "" : "s"}.` : "No new skins this batch."} The browser could not save the collection.`;
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
let comboPulse = 0;
const COMBO_DURATION = 2.6;
const PADDLE_FLASH_DURATION = 0.5;
const PADDLE_JELLY_DURATION = 0.38;
let screenFlash = 0;
let screenFlashColor = "#e1fbff";
let paddleJelly = 0;
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
let drinkSplashes = [];
let tntBlasts = [];
let powerUps = [];
let activeEffects = { wide: 0, slow: 0, drink: 0, sticky: 0 };
let drinkPour = null;
let drinkCooldown = 0;
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
    fireDrink();
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
    fireDrink();
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

  screenFlash = Math.max(0, screenFlash - STEP / 1000);
  comboPulse = Math.max(0, comboPulse - STEP / 1000);
  movePaddle();
  paddleJelly = Math.max(0, paddleJelly - STEP / 1000);
  updateMovingBrickRow();
  updateTntFuses();
  if (updateDrinkPour()) {
    advanceLevel();
    return;
  }
  if (bricks.length === 0) {
    advanceLevel();
    return;
  }
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
  for (const targetBall of balls) {
    if (targetBall.serving) {
      continue;
    }
    moveBall(targetBall);
    bounceOffWalls(targetBall);   // collisions.js
    bounceOffPaddle(targetBall);  // collisions.js
    const brickHit = bounceOffBricks(targetBall);  // collisions.js
    if (brickHit && (brickHit.brick.type !== "tnt" || brickHit.tntTriggered)) {
      combo += 1;
      comboTimer = COMBO_DURATION;
      comboPulse = 0.18;
      const multiplier = 1 + Math.floor(combo / 4) * 0.25;
      score += Math.round((brickHit.destroyed ? 100 : 25) * multiplier);
      createBrickImpact(brickHit.brick);
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
  comboPulse = 0;
  screenFlash = 0;
  screenFlashColor = "#e1fbff";
  shieldCharges = 0;
  level = 1;
  ballSpeed = BALL_SPEED;
  particles = [];
  drinkSplashes = [];
  tntBlasts = [];
  powerUps = [];
  activeEffects = { wide: 0, slow: 0, drink: 0, sticky: 0 };
  drinkPour = null;
  drinkCooldown = 0;
  paddleJelly = 0;
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
  drinkPour = null;
  drinkCooldown = 0;
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
  const types = ["wide", "slow", "life", "shield", "drink", "sticky"];
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
  } else if (powerUp.type === "drink") {
    activeEffects.drink = 10;
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
  if (activeEffects.drink > 0) {
    activeEffects.drink = Math.max(0, activeEffects.drink - elapsed);
  }
  if (activeEffects.sticky > 0) {
    activeEffects.sticky = Math.max(0, activeEffects.sticky - elapsed);
  }
}

function fireDrink() {
  if (!hasStarted || gameOver || activeEffects.drink <= 0 || drinkCooldown > 0 || drinkPour) {
    return;
  }
  const theme = getDrinkLevelTheme();
  drinkPour = {
    x: paddle.x + paddle.width / 2,
    elapsed: 0,
    hitBricks: new Set(),
    colors: [theme.glow, theme.colors[0], theme.colors[2]]
  };
  drinkCooldown = 2;
}

function updateDrinkPour() {
  drinkCooldown = Math.max(0, drinkCooldown - STEP / 1000);
  if (!drinkPour) {
    return false;
  }

  drinkPour.elapsed += STEP / 1000;
  const frontY = 42 + Math.min(1, drinkPour.elapsed) * (HEIGHT - 42);
  const left = drinkPour.x - 24;
  const right = drinkPour.x + 24;
  for (let index = bricks.length - 1; index >= 0; index -= 1) {
    const brick = bricks[index];
    if (drinkPour.hitBricks.has(brick)
        || brick.x >= right || brick.x + brick.width <= left
        || brick.y >= frontY) {
      continue;
    }

    drinkPour.hitBricks.add(brick);
    if (brick.type === "tnt") {
      if (brick.fuse === null) {
        brick.fuse = TNT_FUSE_SECONDS;
        score += 30;
        createBrickImpact(brick);
      }
      continue;
    }

    brick.hits -= 1;
    brick.hitFlash = 0.2;
    const destroyed = brick.hits <= 0;
    score += destroyed ? 75 : 30;
    createBrickImpact(brick);
    if (destroyed) {
      bricks.splice(index, 1);
      maybeDropPowerUp(brick);
    }
  }

  if (drinkPour.elapsed >= 2) {
    drinkPour = null;
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
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 3.8;
    particles.push({
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.36 + Math.random() * 0.28,
      size: 2 + Math.random() * 3,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: brick.color
    });
  }
}

function triggerPaddleHitEffect(targetBall) {
  const impactX = targetBall.x + targetBall.width / 2;
  const theme = createDrinkEffect(impactX, paddle.y + 2);
  paddleJelly = PADDLE_JELLY_DURATION;
  screenFlash = PADDLE_FLASH_DURATION;
  screenFlashColor = theme.flash;
}

const DRINK_THEMES = [
  { name: "juice", colors: ["#ff416c", "#ff9f43", "#ffe66d"], flash: "#fff0f2" },
  { name: "tea", colors: ["#c58a4a", "#f5d6a0", "#8fd3a8"], flash: "#fff5df" },
  { name: "tropical", colors: ["#2de2c5", "#ffda55", "#ff6fae"], flash: "#eafff8" }
];

const DRINK_LEVEL_THEMES = [
  {
    name: "Citrus Splash",
    category: "FRUIT JUICE",
    colors: ["#ff7043", "#ffb52e", "#ffe066", "#8bc34a", "#f44336", "#ffc857", "#e76f51", "#c5e063"],
    background: ["#25140f", "#30201a", "#101d1a"],
    glow: "#ff9f43"
  },
  {
    name: "Berry Blend",
    category: "FRUIT JUICE",
    colors: ["#e63970", "#b5179e", "#ff6b6b", "#7b2cbf", "#f72585", "#ff8fab", "#9d4edd", "#ff4d6d"],
    background: ["#200e23", "#28152c", "#111324"],
    glow: "#f477c8"
  },
  {
    name: "Watermelon Cooler",
    category: "FRUIT JUICE",
    colors: ["#ff5d73", "#ff8fa3", "#5ecb82", "#f94144", "#9be564", "#ffb3c1", "#43aa8b", "#f3722c"],
    background: ["#1d161d", "#211e2b", "#10201d"],
    glow: "#ff6b6b"
  },
  {
    name: "Peach Iced Tea",
    category: "TEA",
    colors: ["#d98245", "#f2b56b", "#e8d09a", "#a9bf83", "#cb6e45", "#f5d6a0", "#8da77b", "#ffc879"],
    background: ["#241710", "#2c2118", "#172019"],
    glow: "#e7a35b"
  },
  {
    name: "Matcha Garden",
    category: "TEA",
    colors: ["#5e8c45", "#a7c957", "#d4e09b", "#80a65b", "#c4d77e", "#779c59", "#e0e8a4", "#91b85d"],
    background: ["#101e17", "#1a2a1c", "#111e20"],
    glow: "#a7c957"
  },
  {
    name: "Hibiscus Tea",
    category: "TEA",
    colors: ["#c44569", "#e56b6f", "#f4a261", "#9d4edd", "#ff758f", "#b56576", "#f28482", "#e9c46a"],
    background: ["#21121e", "#2a1824", "#171624"],
    glow: "#e56b6f"
  },
  {
    name: "Mango Cooler",
    category: "TROPICAL DRINK",
    colors: ["#ff8c42", "#ffd166", "#f9c74f", "#f94144", "#90be6d", "#f9844a", "#ffbe0b", "#43aa8b"],
    background: ["#25170e", "#302017", "#11201c"],
    glow: "#ffb52e"
  },
  {
    name: "Pineapple Lime",
    category: "TROPICAL DRINK",
    colors: ["#d9ed55", "#a7c957", "#f9c74f", "#52b788", "#ffe66d", "#80b918", "#f4a261", "#34a0a4"],
    background: ["#17200f", "#202719", "#10201d"],
    glow: "#d9ed55"
  }
];

function getDrinkLevelTheme(currentLevel = level) {
  return DRINK_LEVEL_THEMES[(currentLevel - 1) % DRINK_LEVEL_THEMES.length];
}

function createDrinkEffect(x, y) {
  const theme = DRINK_THEMES[Math.floor(Math.random() * DRINK_THEMES.length)];
  const duration = 0.52;
  drinkSplashes.push({ x, y, life: duration, duration, theme });

  const particleCount = theme.name === "tea" ? 14 : 18;
  for (let index = 0; index < particleCount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = theme.name === "tea"
      ? 0.7 + Math.random() * 1.8
      : 1.6 + Math.random() * 3.8;
    const life = 0.28 + Math.random() * 0.28;
    const kind = theme.name === "tea" ? "drink-bubble" : "drink-drop";
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: theme.name === "tea" ? -0.5 - Math.random() * 1.6 : Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 2 + Math.random() * (theme.name === "tea" ? 3 : 5),
      rotation: angle,
      kind,
      color: theme.colors[index % theme.colors.length]
    });
  }

  if (theme.name === "tropical") {
    for (let index = 0; index < 3; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.4;
      const life = 0.38 + Math.random() * 0.18;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 5 + Math.random() * 3,
        rotation: angle,
        kind: index === 0 ? "drink-fruit" : "drink-leaf",
        color: theme.colors[index]
      });
    }
  }

  return theme;
}

function createBrickImpact(brick) {
  createDrinkEffect(brick.x + brick.width / 2, brick.y + brick.height / 2);
}

function updateTntFuses() {
  for (const brick of [...bricks]) {
    if (brick.hitFlash > 0) {
      brick.hitFlash = Math.max(0, brick.hitFlash - STEP / 1000);
    }
  }
  for (const brick of bricks) {
    if (brick.type !== "tnt" || brick.fuse === null) {
      continue;
    }
    brick.fuse = Math.max(0, brick.fuse - STEP / 1000);
    if (brick.fuse === 0 && bricks.includes(brick)) {
      detonateTnt(brick);
    }
  }
}

function detonateTnt(firstTnt) {
  const pending = [firstTnt];
  const destroyedBricks = new Set();
  const detonatedTnt = new Set();
  const blastWidth = BRICK_WIDTH + BRICK_GAP;
  const blastHeight = BRICK_HEIGHT + BRICK_GAP;

  while (pending.length > 0) {
    const tnt = pending.shift();
    if (!bricks.includes(tnt) || detonatedTnt.has(tnt)) {
      continue;
    }
    detonatedTnt.add(tnt);
    createTntBlast(tnt);

    const centerX = tnt.x + tnt.width / 2;
    const centerY = tnt.y + tnt.height / 2;
    for (const brick of bricks) {
      const distanceX = Math.abs(brick.x + brick.width / 2 - centerX);
      const distanceY = Math.abs(brick.y + brick.height / 2 - centerY);
      if (distanceX <= blastWidth && distanceY <= blastHeight) {
        destroyedBricks.add(brick);
        if (brick.type === "tnt" && !detonatedTnt.has(brick)) {
          pending.push(brick);
        }
      }
    }
  }

  const multiplier = 1 + Math.floor(combo / 4) * 0.25;
  score += destroyedBricks.size * Math.round(100 * multiplier);
  combo += destroyedBricks.size;
  comboTimer = COMBO_DURATION;
  bricks = bricks.filter((brick) => !destroyedBricks.has(brick));
}

function createTntBlast(brick) {
  const x = brick.x + brick.width / 2;
  const y = brick.y + brick.height / 2;
  tntBlasts.push({ x, y, life: 0.72, duration: 0.72 });

  const sparkColors = ["#ffffff", "#fff2a6", "#ffd166", "#ff8b38", "#ff4d3d"];
  for (let index = 0; index < 38; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 7;
    const life = 0.36 + Math.random() * 0.42;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      size: 2 + Math.random() * 4,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.42,
      color: sparkColors[Math.floor(Math.random() * sparkColors.length)]
    });
  }

  for (let index = 0; index < 10; index += 1) {
    const life = 0.55 + Math.random() * 0.4;
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 1.8,
      vy: -0.5 - Math.random() * 1.8,
      life,
      maxLife: life,
      size: 8 + Math.random() * 12,
      kind: "smoke",
      color: "rgba(61, 58, 72, 0.65)"
    });
  }
}

function updateParticles() {
  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += particle.kind === "smoke" ? -0.015 : particle.kind === "spark" ? 0.015 : 0.04;
    if (particle.spin) {
      particle.rotation += particle.spin;
    }
    particle.life -= STEP / 1000;
  }
  particles = particles.filter((particle) => particle.life > 0);
  for (const blast of tntBlasts) {
    blast.life -= STEP / 1000;
  }
  tntBlasts = tntBlasts.filter((blast) => blast.life > 0);
  for (const splash of drinkSplashes) {
    splash.life -= STEP / 1000;
  }
  drinkSplashes = drinkSplashes.filter((splash) => splash.life > 0);
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
  const colors = { wide: "#4ecdc4", slow: "#9b5de5", life: "#ff4d8d", shield: "#7bdff2", drink: getDrinkLevelTheme().glow, sticky: "#a7e58d" };
  const labels = { wide: "W", slow: "S", life: "+", shield: "G", drink: "D", sticky: "C" };
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
  const jellyProgress = paddleJelly > 0
    ? 1 - paddleJelly / PADDLE_JELLY_DURATION
    : 1;
  const impactSquash = Math.exp(-jellyProgress * 6);
  const wobble = Math.sin(jellyProgress * Math.PI * 4) * Math.exp(-jellyProgress * 5);
  const horizontalScale = 1 + impactSquash * 0.12 - wobble * 0.06;
  const verticalScale = 1 - impactSquash * 0.3 + wobble * 0.16;
  const centerX = paddle.x + paddle.width / 2;
  const centerY = paddle.y + paddle.height / 2;
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
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(horizontalScale, verticalScale);
  ctx.translate(-centerX, -centerY);
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

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
  ctx.clip();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(
    paddle.x + paddle.width * 0.28,
    paddle.y + paddle.height * 0.2,
    paddle.width * 0.2,
    paddle.height * 0.22,
    -0.12,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = equippedSkin.highlight;
  roundedRect(
    paddle.x + paddle.width * 0.12,
    paddle.y + 1,
    paddle.width * 0.76,
    Math.max(2, paddle.height * 0.2),
    3
  );
  ctx.restore();

  ctx.globalAlpha = 0.78;
  ctx.fillStyle = equippedSkin.highlight;
  roundedRect(paddle.x + paddle.width * 0.2, paddle.y + 2, paddle.width * 0.6, 2, 1);
  ctx.restore();
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
    const centerX = targetBall.x + targetBall.width / 2;
    const centerY = targetBall.y + targetBall.height / 2;
    const wobble = Math.sin(performance.now() / 75 + targetBall.x * 0.08) * 0.9;
    const speed = Math.hypot(targetBall.vx, targetBall.vy);
    const stretch = targetBall.serving ? 0 : Math.min(0.1, speed * 0.012);
    ctx.shadowColor = targetBall.color;
    ctx.shadowBlur = 18;
    const ballGradient = ctx.createRadialGradient(
      targetBall.x + targetBall.width * 0.34,
      targetBall.y + targetBall.height * 0.3,
      1,
      centerX,
      centerY,
      targetBall.width / 2
    );
    ballGradient.addColorStop(0, "#ffffff");
    ballGradient.addColorStop(0.42, targetBall.color);
    ballGradient.addColorStop(1, "rgba(35, 18, 45, 0.78)");
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY,
      targetBall.width * (0.5 + stretch),
      targetBall.height * (0.46 - stretch * 0.45) + wobble * 0.12,
      Math.atan2(targetBall.vy, targetBall.vx) * 0.08,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(
      targetBall.x + targetBall.width * 0.34,
      targetBall.y + targetBall.height * 0.28,
      targetBall.width * 0.16,
      targetBall.height * 0.1,
      -0.45,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(centerX + targetBall.width * 0.2, centerY + targetBall.height * 0.18, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.shadowBlur = 0;

  drawBricks();  // bricks.js
  drawDrinkPour();
  drawDrinkSplashes();
  drawTntBlasts();
  drawPowerUps();

  drawParticles();
  drawHud();
  drawScreenFlash();

  if (levelBannerTime > 0 && !gameOver) {
    const theme = getDrinkLevelTheme();
    ctx.textAlign = "center";
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#f6fbff";
    ctx.font = "bold 30px 'Courier New', monospace";
    ctx.fillText(theme.name, WIDTH / 2, HEIGHT / 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.glow;
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText(`LEVEL ${level}  ·  ${theme.category}`, WIDTH / 2, HEIGHT / 2 + 25);
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
  const theme = getDrinkLevelTheme();
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, theme.background[0]);
  background.addColorStop(0.48, theme.background[1]);
  background.addColorStop(1, theme.background[2]);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  const aurora = ctx.createLinearGradient(0, 70, WIDTH, HEIGHT * 0.72);
  aurora.addColorStop(0, "rgba(76, 92, 255, 0)");
  aurora.addColorStop(0.28, theme.glow);
  aurora.addColorStop(0.55, theme.colors[2]);
  aurora.addColorStop(0.78, theme.colors[0]);
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
  ctx.strokeStyle = `${getDrinkLevelTheme().glow}88`;
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
  const theme = getDrinkLevelTheme();
  ctx.fillStyle = theme.glow;
  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.fillText(`${theme.name.toUpperCase()}  ·  x${(1 + Math.floor(combo / 4) * 0.25).toFixed(2)}`, WIDTH / 2, 28);
  ctx.textAlign = "right";
  ctx.font = "bold 14px 'Courier New', monospace";
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
  if (activeEffects.wide > 0 || activeEffects.slow > 0 || activeEffects.drink > 0 || activeEffects.sticky > 0) {
    ctx.textAlign = "center";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillStyle = "#bcb3ca";
    const effects = [];
    if (activeEffects.wide > 0) effects.push(`WIDE ${Math.ceil(activeEffects.wide)}s`);
    if (activeEffects.slow > 0) effects.push(`SLOW ${Math.ceil(activeEffects.slow)}s`);
    if (activeEffects.drink > 0) effects.push(`DRINK ${Math.ceil(activeEffects.drink)}s`);
    if (activeEffects.sticky > 0) effects.push(`CATCH ${Math.ceil(activeEffects.sticky)}s`);
    ctx.fillText(effects.join("  "), WIDTH / 2, HEIGHT - 12);
  }
  drawComboMeter();
}

function drawComboMeter() {
  if (combo === 0) {
    return;
  }

  const x = 16;
  const y = HEIGHT - 51;
  const width = 196;
  const height = 40;
  const multiplier = (1 + Math.floor(combo / 4) * 0.25).toFixed(2);
  const meterWidth = width - 18;

  ctx.save();
  ctx.fillStyle = "rgba(5, 12, 24, 0.88)";
  ctx.strokeStyle = "rgba(255, 209, 102, 0.72)";
  ctx.lineWidth = 1;
  ctx.shadowColor = "#ffd166";
  ctx.shadowBlur = comboPulse > 0 ? 5 + 9 * (comboPulse / 0.18) : 5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 5);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillStyle = "#fff0bd";
  ctx.fillText(`COMBO ${String(combo).padStart(2, "0")}`, x + 9, y + 12);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffd166";
  ctx.fillText(`x${multiplier}`, x + width - 9, y + 12);

  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.beginPath();
  ctx.roundRect(x + 9, y + 25, meterWidth, 5, 2);
  ctx.fill();
  ctx.fillStyle = "#ffd166";
  ctx.shadowColor = "#ffb703";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(x + 9, y + 25, meterWidth * (comboTimer / COMBO_DURATION), 5, 2);
  ctx.fill();
  ctx.restore();
  ctx.textBaseline = "alphabetic";
}

function drawScreenFlash() {
  if (screenFlash <= 0) {
    return;
  }

  const fade = screenFlash / PADDLE_FLASH_DURATION;
  ctx.save();
  ctx.globalAlpha = 0.34 * fade * fade;
  ctx.fillStyle = screenFlashColor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function drawDrinkPour() {
  if (!drinkPour) {
    return;
  }

  const progress = Math.min(1, drinkPour.elapsed);
  const frontY = 42 + progress * (HEIGHT - 42);
  const remaining = Math.max(0, 1 - Math.max(0, drinkPour.elapsed - 1));
  const left = drinkPour.x - 24;
  const colors = drinkPour.colors;
  const gradient = ctx.createLinearGradient(left, 42, left + 48, 42);
  gradient.addColorStop(0, `${colors[0]}22`);
  gradient.addColorStop(0.35, `${colors[1]}bb`);
  gradient.addColorStop(0.7, `${colors[2]}a8`);
  gradient.addColorStop(1, `${colors[0]}33`);

  ctx.save();
  ctx.globalAlpha = remaining;
  ctx.shadowColor = colors[0];
  ctx.shadowBlur = 22;
  ctx.fillStyle = gradient;
  ctx.fillRect(left, 42, 48, Math.max(0, frontY - 42));
  if (progress < 1) {
    const ripple = Math.sin(drinkPour.elapsed * 34) * 4;
    ctx.fillStyle = colors[2];
    ctx.beginPath();
    ctx.ellipse(drinkPour.x, frontY + ripple, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
    ctx.beginPath();
    ctx.ellipse(drinkPour.x, frontY + ripple - 2, 15, 2, 0, 0, Math.PI * 2);
    ctx.fill();
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
  ctx.strokeStyle = `${getDrinkLevelTheme().glow}66`;
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
    if (particle.kind && particle.kind.startsWith("drink-")) {
      drawDrinkParticle(particle);
      continue;
    }

    ctx.globalAlpha = particle.kind === "smoke"
      ? Math.min(1, particle.life / particle.maxLife) * 0.55
      : Math.min(1, particle.life * 2);
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = particle.kind === "smoke" ? 0 : 10;
    ctx.save();
    if (particle.kind === "smoke") {
      const progress = 1 - particle.life / particle.maxLife;
      const radius = particle.size * (0.65 + progress * 0.75);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawDrinkSplashes() {
  for (const splash of drinkSplashes) {
    const progress = 1 - splash.life / splash.duration;
    const radius = 5 + progress * 34;
    const opacity = 1 - progress;
    ctx.save();
    ctx.globalAlpha = opacity * 0.32;
    ctx.fillStyle = splash.theme.colors[0];
    ctx.shadowColor = splash.theme.colors[1];
    ctx.shadowBlur = 12 * opacity;
    ctx.beginPath();
    ctx.moveTo(splash.x - radius, splash.y);
    ctx.quadraticCurveTo(splash.x - radius * 0.86, splash.y - radius * 0.3, splash.x - radius * 0.64, splash.y - radius * 0.1);
    ctx.quadraticCurveTo(splash.x - radius * 0.5, splash.y - radius * 0.48, splash.x - radius * 0.35, splash.y - radius * 0.12);
    ctx.quadraticCurveTo(splash.x - radius * 0.12, splash.y - radius * 0.7, splash.x + radius * 0.04, splash.y - radius * 0.18);
    ctx.quadraticCurveTo(splash.x + radius * 0.22, splash.y - radius * 0.56, splash.x + radius * 0.4, splash.y - radius * 0.12);
    ctx.quadraticCurveTo(splash.x + radius * 0.68, splash.y - radius * 0.44, splash.x + radius * 0.72, splash.y - radius * 0.08);
    ctx.quadraticCurveTo(splash.x + radius * 0.9, splash.y - radius * 0.23, splash.x + radius, splash.y);
    ctx.quadraticCurveTo(splash.x, splash.y + radius * 0.24, splash.x - radius, splash.y);
    ctx.fill();

    ctx.globalAlpha = opacity;
    ctx.strokeStyle = splash.theme.colors[0];
    ctx.lineWidth = 3 * opacity + 0.5;
    ctx.shadowColor = splash.theme.colors[1];
    ctx.shadowBlur = 14 * opacity;
    ctx.beginPath();
    ctx.ellipse(splash.x, splash.y, radius, radius * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = opacity * 0.7;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(splash.x, splash.y, radius * 0.68, radius * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawDrinkParticle(particle) {
  const opacity = Math.max(0, particle.life / particle.maxLife);
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = particle.color;
  ctx.strokeStyle = particle.color;
  ctx.shadowColor = particle.color;
  ctx.shadowBlur = 8;

  if (particle.kind === "drink-bubble") {
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = opacity * 0.8;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-particle.size * 0.32, -particle.size * 0.32, Math.max(0.7, particle.size * 0.22), 0, Math.PI * 2);
    ctx.fill();
  } else if (particle.kind === "drink-fruit") {
    ctx.beginPath();
    ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, particle.size * 0.68, 0, Math.PI * 2);
    ctx.moveTo(-particle.size * 0.5, 0);
    ctx.lineTo(particle.size * 0.5, 0);
    ctx.moveTo(0, -particle.size * 0.5);
    ctx.lineTo(0, particle.size * 0.5);
    ctx.stroke();
  } else if (particle.kind === "drink-leaf") {
    ctx.beginPath();
    ctx.moveTo(-particle.size, 0);
    ctx.quadraticCurveTo(0, -particle.size * 0.9, particle.size, 0);
    ctx.quadraticCurveTo(0, particle.size * 0.9, -particle.size, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-particle.size * 0.75, 0);
    ctx.lineTo(particle.size * 0.75, 0);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -particle.size);
    ctx.quadraticCurveTo(particle.size * 0.9, -particle.size * 0.1, particle.size * 0.5, particle.size * 0.62);
    ctx.quadraticCurveTo(0, particle.size, -particle.size * 0.5, particle.size * 0.62);
    ctx.quadraticCurveTo(-particle.size * 0.9, -particle.size * 0.1, 0, -particle.size);
    ctx.fill();
  }

  ctx.restore();
}

function drawTntBlasts() {
  for (const blast of tntBlasts) {
    const progress = 1 - blast.life / blast.duration;
    const fade = 1 - progress;
    const radius = 12 + progress * 112;

    ctx.save();
    const glow = ctx.createRadialGradient(blast.x, blast.y, 2, blast.x, blast.y, radius);
    glow.addColorStop(0, `rgba(255, 250, 213, ${0.72 * fade})`);
    glow.addColorStop(0.18, `rgba(255, 157, 55, ${0.48 * fade})`);
    glow.addColorStop(1, "rgba(255, 63, 45, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = fade;
    ctx.shadowColor = "#ff6a32";
    ctx.shadowBlur = 22 * fade;
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 4 * fade + 0.5;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 245, 207, 0.9)";
    ctx.lineWidth = 1.5 * fade;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, radius * 0.68, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 197, 100, 0.8)";
    ctx.lineWidth = 2 * fade;
    for (let ray = 0; ray < 12; ray += 1) {
      const angle = (Math.PI * 2 * ray) / 12;
      const innerRadius = radius * 0.24;
      const outerRadius = radius * (0.52 + (ray % 3) * 0.1);
      ctx.beginPath();
      ctx.moveTo(blast.x + Math.cos(angle) * innerRadius, blast.y + Math.sin(angle) * innerRadius);
      ctx.lineTo(blast.x + Math.cos(angle) * outerRadius, blast.y + Math.sin(angle) * outerRadius);
      ctx.stroke();
    }
    ctx.restore();
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
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

// Wait until all three script files have loaded, then start.
window.addEventListener("load", start);
