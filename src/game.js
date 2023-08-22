"use strict";
const config = {
  type: Phaser.AUTO,
  width: 400,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 }, 
      debug: false, // Якщо true, будуть видимі контури фізичних тіл (для дебагу)
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);

let doodler;
let platforms;

let score = 0;
let bestScore = 0;
let isOnPlatform = false; // Прапорець, що вказує на перебування персонажа на платформі

let scoreText;
let bestScoreText;
let gameOverText;

let leftKey;
let rightKey;
let spacebar;
let gameOverDistance = 0;
let gameOver = false;

function preload() {
  this.load.image("bg", "assets/doodlerBg.png");
  this.load.image("doodlerLeft", "assets/doodlerLeft.png");
  this.load.image("doodlerRight", "assets/doodlerRight.png");
  this.load.image("platform", "assets/platform.png");
  this.load.image("doodlerJump", "assets/doodlerJump.png");
}

function create() {
  this.add.image(0, 0, "bg").setOrigin(0, 0).setScrollFactor(0);

  scoreText = this.add
    .text(16, 16, "score: 0", { fontSize: "32px", fill: "#000" })
    .setScrollFactor(0);

  bestScoreText = this.add
    .text(16, 48, "Best Score: 0", { fontSize: "24px", fill: "#000" })
    .setScrollFactor(0);
  
  gameOverText = this.add
    .text(config.width / 2, config.height / 2, "Game Over", {
      fontSize: "48px",
      fill: "#FF0000",
    })
    .setOrigin(0.5)
    .setScrollFactor(0);
  gameOverText.setVisible(false); // Початково приховуємо текст "Game Over"

  this.anims.create({
    key: "jump",
    frames: [{ key: "doodlerRight" }, { key: "doodlerJump" }],
    frameRate: 20,
    repeat: 0,
  });

  bestScore = parseInt(localStorage.getItem("bestScore")) || 0; // Завантажити з локального сховища
  updateBestScoreText();

  createDoodler(this.physics);
  createPlatforms(this.physics);

  this.physics.add.collider(doodler, platforms, (doodlerObj, platformObj) => {
    if (platformObj.body.touching.up && doodlerObj.body.touching.down) {
      doodler.setVelocityY(-400);
      doodler.anims.play("jump");
    }
  });

  this.physics.add.collider(platforms, platforms, (collider) => {
    collider.x = Phaser.Math.Between(0, 640);
    collider.refreshBody();
  });

  this.cameras.main.startFollow(doodler, false, 0, 1);

  createKeys(this.input.keyboard);
  updateScoreText();
}

function update() {
  if (gameOver) {
    updateGameOverText.call(this);
    return;
  }
  checkMovement();
  refactorePlatforms();
  checkGameOver.call(this);
  updateScore();
}

function createDoodler(physics) {
  doodler = physics.add.sprite(325, -100, "doodlerLeft");
  doodler.setBounce(0, 1);
  doodler.setVelocityY(-400);
  doodler.body.setSize(64, 90);
  doodler.body.setOffset(32, 30);
  doodler.setDepth(10);
}

function createPlatforms(physics) {
  platforms = physics.add.staticGroup();

  for (let i = 0; i < 10; i++) {
    const platformX = Phaser.Math.Between(50, config.width -50); 
    const platformY = -100 * i;
    platforms.create(platformX, platformY, "platform");
  }

  platforms.children.iterate(function (platform) {
    platform.body.checkCollision.down = false;
    platform.body.checkCollision.left = false;
    platform.body.checkCollision.right = false;
  });
}


function createKeys(keyboard) {
  leftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, true, true);
  rightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, true, true);
  spacebar = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
}

// Перевірка руху гравця
function checkMovement() {
  if (leftKey.isDown && !rightKey.isDown) {
    doodler.setVelocityX(-300);
    doodler.flipX = true;
    if (doodler.x < 15) {
      doodler.x = 615;
    }
  }
  if (rightKey.isDown && !leftKey.isDown) {
    doodler.setVelocityX(300);
    doodler.flipX = false;
    if (doodler.x > 615) {
      doodler.x = 25;
    }
  }
  if (!leftKey.isDown && !rightKey.isDown) {
    doodler.setVelocityX(0);
  }
}

function refactorePlatforms() {
  let minY = 0;
  platforms.children.iterate(function (platform) {
    if (platform.y < minY) minY = platform.y;
  });
  platforms.children.iterate(function (platform) {
    if (
      platform.y > doodler.y &&
      doodler.body.center.distance(platform.body.center) > 700
    ) {
      platform.x = Phaser.Math.Between(0, 640);
      platform.y = minY - 200; 
      platform.refreshBody();
    }
  });
}

function checkGameOver() {
  if (doodler.body.y > gameOverDistance) {
    this.physics.pause();
    gameOver = true;
    createGameOverText.call(this);
  } else if (doodler.body.y * -1 - gameOverDistance * -1 > 700) {
    gameOverDistance = doodler.body.y + 700;
  }
}

function createGameOverText() {
  gameOverText = this.add
    .text(config.width / 2, config.height / 2, "", {
      fontSize: "48px",
      fill: "#FF0000",
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(20);
}

function updateScore() {
  if (doodler.body.touching.down && !isOnPlatform) {
    doodler.body.velocity.y = -400;
    isOnPlatform = true;
    score++;
    updateScoreText();
  }
  if (!doodler.body.touching.down) {
    isOnPlatform = false; // Якщо персонаж не торкається платформи, змінюємо прапорець
  }
  if (score > bestScore) {
    bestScore = score;
    bestScoreText.setText("Best Score: " + bestScore);
    localStorage.setItem("bestScore", bestScore); // Зберегти у локальному сховищі
    updateBestScoreText();
  }
}

function updateGameOverText() {
  gameOverText.text = "Game Over";
  gameOverText.x = config.width / 2;
  gameOverText.y = config.height / 2;

  const scoreY = config.height / 2 + 80;
  const bestScoreY = scoreY + 40;

  scoreText.setPosition(config.width / 2, scoreY);
  bestScoreText.setPosition(config.width / 2, bestScoreY);

  scoreText.text = "Score: " + score;
  bestScoreText.text = "Best Score: " + bestScore;
}

function updateScoreText() {
  scoreText.setText("Score: " + score);
}

function updateBestScoreText() {
  bestScoreText.setText("Best Score: " + bestScore);
}
