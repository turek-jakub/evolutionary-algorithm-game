import { Network } from "./network.js";

class Viewport {
  #canvas = document.getElementById("canvas");
  #ctx = canvas.getContext("2d");

  /** @param {Sprite[]} spritesArr */
  draw(drawableArr) {
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

    for (const drawable of drawableArr) {
      drawable.draw(this.#ctx);
    }
  }
}

class Game {
  #gameSpeed = 1;
  /** @type {Set<Pipes>} */
  #pipes = new Set();
  #previousUpdateTime = 0;
  #totalLogicUpdates = 0;
  #viewport = new Viewport();
  #numOfPipes = 0;
  /** @type {Set<BirdObject>} */
  #birds;
  #background = new SpriteObject(
    new Sprite("assets/Flappy Bird/background-day.png"),
  );
  #ground1 = new SpriteObject(new Sprite("assets/Flappy Bird/base.png"), {
    x: 0,
    y: 480,
  });
  #ground2 = new SpriteObject(new Sprite("assets/Flappy Bird/base.png"), {
    x: 288,
    y: 480,
  });
  #objects;
  #deathCnt = 0;
  #timeBetweenDecision = 10;
  #startTime = 0;

  restart() {
    this.#pipes.clear();
    this.#numOfPipes = 0;
    this.#deathCnt = 0;
    this.#startTime = 0;
    this.#totalLogicUpdates = 0;
    this.#previousUpdateTime = 0;

    const birdArray = [...this.#birds];
    birdArray.sort((a, b) => a.getSurvivalTime() - b.getSurvivalTime());
    const best = birdArray.toSpliced(0, birdArray.length - 10);
    this.#birds.clear();
    for (const bird of best) {
      bird.reset();
      this.#birds.add(bird);
      for (let i = 0; i < 99; i++) {
        this.#birds.add(new BirdObject(bird));
      }
    }
    this.setup();
  }

  /**@param {Set<BirdObject>} birds */
  constructor(birds) {
    this.#birds = birds;
    this.setup();
  }

  setup() {
    this.addPipes(300, this.#numOfPipes++);
    this.addPipes(500, this.#numOfPipes++);
    window.requestAnimationFrame((time) => this.viewUpdate(time));
  }

  viewUpdate(time) {
    if (this.#startTime === 0) {
      this.#startTime = time;
    }

    time = time - this.#startTime;
    const timeSegment = this.#timeBetweenDecision / this.#gameSpeed;
    let currentSegment = this.#totalLogicUpdates * timeSegment;

    if (time - currentSegment > 250) {
      const timeToDrop = time - currentSegment - 250;
      this.#startTime += timeToDrop;
      time -= timeToDrop;
    }

    while (currentSegment < time - timeSegment) {
      this.#totalLogicUpdates++;
      currentSegment = this.#totalLogicUpdates * timeSegment;
      this.update(currentSegment - this.#previousUpdateTime);
      this.#previousUpdateTime = currentSegment;
    }
    this.update(time - currentSegment, false);
    if (this.#deathCnt >= 1000) {
      this.restart();
      return;
    }
    this.#viewport.draw(this.#objects);

    this.#previousUpdateTime = time;
    window.requestAnimationFrame((time) => this.viewUpdate(time));
  }

  update(time, think = true) {
    const delta = time / 1000;
    this.#objects = [this.#background];
    for (const bird of this.#birds) {
      for (const pipe of this.#pipes) {
        if (this.isCollision(bird, pipe)) {
          bird.kill();
        } else if (bird.getPosition() > pipe.getPositionX()) {
          const pipeId = pipe.getId();
          if (pipeId > bird.getScore()) bird.setScore(pipeId);
        }
      }
    }

    for (const pipe of this.#pipes) {
      pipe.setPositionX(pipe.getPositionX() - 100 * delta * this.#gameSpeed);

      if (pipe.getPositionX() < -52) {
        this.addPipes(300 + 10 * Math.random() - 5, this.#numOfPipes++);
        this.#pipes.delete(pipe);
      } else this.#objects.push(pipe);
    }

    for (const bird of this.#birds) {
      if (!bird.isGrounded()) bird.addSurvivalTime();
      const position = bird.getPosition();

      if (position.y <= 458) {
        bird.setVelocity(bird.getVelocity() + 800 * delta * this.#gameSpeed);
        bird.setPositionY(
          position.y + bird.getVelocity() * delta * this.#gameSpeed,
        );
      } else {
        bird.setPositionX(bird.getPosition().x - 100 * delta * this.#gameSpeed);
        if (!bird.isGrounded()) {
          bird.setGrounded(true);
          this.#deathCnt++;
        }
      }
      if (position.x > -32) this.#objects.push(bird);
    }
    if (think) this.decide();

    this.#ground1.setPositionX(
      this.#ground1.getPosition().x - 100 * delta * this.#gameSpeed,
    );
    this.#ground2.setPositionX(
      this.#ground2.getPosition().x - 100 * delta * this.#gameSpeed,
    );

    if (this.#ground1.getPosition().x < -336)
      this.#ground1.setPositionX(this.#ground2.getPosition().x + 336);

    if (this.#ground2.getPosition().x < -336)
      this.#ground2.setPositionX(this.#ground1.getPosition().x + 336);

    this.#objects.push(this.#ground1, this.#ground2);
  }

  addPipes(distance, id) {
    this.#pipes.add(new Pipes(distance, id));
  }

  /**
   * @param {BirdObject} bird
   * @param {Pipes} pipe */
  isCollision(bird, pipe) {
    if (
      pipe.getPositionX() + pipe.getWidth() > bird.getPosition().x &&
      pipe.getPositionX() < bird.getPosition().x + 34 &&
      (bird.getPosition().y < pipe.getSeparationTop() ||
        bird.getPosition().y + 24 >
          pipe.getSeparationTop() + pipe.pipeSeparation) &&
      bird.isAlive()
    ) {
      return true;
    }
    return false;
  }

  decide() {
    for (const bird of this.#birds) {
      if (!bird.isAlive()) continue;

      const info = [];
      info.push(bird.getVelocity() / 1000, 1);
      info.push(bird.getPosition().y / 512, 1);

      const [...pipes] = this.#pipes;

      const upcomingPipes = pipes.filter(
        (p) => p.getPositionX() + p.getWidth() > bird.getPosition().x,
      );
      upcomingPipes.sort((a, b) => a.getPositionX() - b.getPositionX());

      const closer = upcomingPipes[0] || pipes[0];
      const further = upcomingPipes[1] || closer;

      info.push((closer.getPositionX() - bird.getPosition().x) / 500, 1);
      info.push((closer.getSeparationTop() - bird.getPosition().y) / 512, 1);

      info.push((further.getPositionX() - bird.getPosition().x) / 500, 1);
      info.push((further.getSeparationTop() - bird.getPosition().y / 512, 1));

      info.push(1);

      if (bird.decide(info)) bird.setVelocity(-300);
    }
  }
}

class Pipes {
  pipeSeparation = 120;

  #separationTop = Math.floor(Math.random() * 212) + 100;
  #height = 320;
  #width = 52;
  #topPipe;
  #bottomPipe;
  #positionX;
  #id;

  /**@param {Number} positionX */
  constructor(positionX, id) {
    this.#topPipe = new SpriteObject(
      new Sprite("assets/Flappy Bird/pipe-green.png"),
      { x: positionX, y: this.#separationTop + this.pipeSeparation },
    );
    this.#bottomPipe = new SpriteObject(
      new Sprite("assets/Flappy Bird/pipe-green-down.png"),
      { x: positionX, y: this.#separationTop - this.#height },
    );
    this.#positionX = positionX;
    this.#id = id;
  }

  draw(ctx) {
    this.#topPipe.draw(ctx);
    this.#bottomPipe.draw(ctx);
  }

  setPositionX(positionX) {
    this.#positionX = positionX;
    this.#topPipe.setPositionX(positionX);
    this.#bottomPipe.setPositionX(positionX);
  }

  getPositionX() {
    return this.#positionX;
  }

  getWidth() {
    return this.#width;
  }

  getHeight() {
    return this.#height;
  }

  getId() {
    return this.#id;
  }

  getSeparationTop() {
    return this.#separationTop;
  }
}

class Sprite {
  #image;
  #rotation;
  constructor(src, rotation = 0) {
    this.#image = new Image();
    this.#image.src = src;
    this.#rotation = rotation;
  }

  getImage() {
    return this.#image;
  }

  getRotation() {
    return this.#rotation;
  }

  getDimensions() {
    return { width: this.#image.width, height: this.#image.height };
  }
}

/** @abstract */
class Drawable {
  /**@type {{x: Number, y: Number}} */
  #position;

  constructor(position = { x: 0, y: 0 }) {
    this.#position = position;
  }

  drawComplete(ctx, image, width, height, rotation) {
    if (!image.complete) return;
    if (rotation === 0)
      ctx.drawImage(image, this.#position.x, this.#position.y);
    else {
      ctx.save();
      const middleX = this.#position.x + width / 2;
      const middleY = this.#position.y + height / 2;
      ctx.translate(middleX, middleY);
      ctx.rotate(rotation);
      ctx.drawImage(image, -width / 2, -height / 2);
      ctx.restore();
    }
  }

  draw(ctx) {
    throw new Error("draw(ctx) must be implemented");
  }

  setPosition(position) {
    this.#position = position;
  }

  setPositionX(positionX) {
    this.#position.x = positionX;
  }

  setPositionY(positionY) {
    this.#position.y = positionY;
  }

  getPosition() {
    return this.#position;
  }
}

class SpriteObject extends Drawable {
  #sprite;

  /**
   * @param {Sprite} sprite
   * @param {{x: Number, y: Number}}
   */
  constructor(sprite, position) {
    super(position);
    this.#sprite = sprite;
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const image = this.#sprite.getImage();
    if (!image.complete) return;
    const { width, height } = this.#sprite.getDimensions();
    const rotation = this.#sprite.getRotation();

    super.drawComplete(ctx, image, width, height, rotation);
  }
}

class BirdObject extends Drawable {
  #animationManager = new BirdAnimationManager();
  #network = new Network();
  #velocity = 0;
  #isAlive = true;
  #isGrounded = false;
  #survivalTime = 0;
  #score = 0;

  constructor(parentBird = null) {
    super({ x: 127, y: 244 });

    if (parentBird) {
      this.#network = new Network(parentBird.getNetwork());
    } else {
      this.#network = new Network();
    }
  }

  getNetwork() {
    return this.#network;
  }

  reset() {
    this.setPosition({ x: 127, y: 244 });
    this.#velocity = 0;
    this.#isAlive = true;
    this.#isGrounded = false;
    this.#score = 0;
    this.#survivalTime = 0;
  }

  draw(ctx) {
    const { image, rotation } = this.#animationManager.getCurrentImage(
      this.#velocity,
      this.#isAlive,
    );

    if (!image.complete) return;
    const width = image.width;
    const height = image.height;
    super.drawComplete(ctx, image, width, height, rotation);
  }

  getScore() {
    return this.#score;
  }

  setScore(score) {
    this.#score = score;
  }

  setVelocity(velocity) {
    this.#velocity = velocity;
  }

  kill() {
    this.#isAlive = false;
  }

  getVelocity() {
    return this.#velocity;
  }

  isAlive() {
    return this.#isAlive;
  }

  decide(info) {
    return this.#network.decide(info);
  }

  isGrounded() {
    return this.#isGrounded;
  }

  setGrounded(val) {
    this.#isGrounded = val;
  }

  getSurvivalTime() {
    return this.#survivalTime;
  }

  addSurvivalTime() {
    this.#survivalTime++;
  }
}

class BirdAnimationManager {
  #width = 34;
  #height = 24;
  #images;
  constructor() {
    this.#images = { up: new Image(), mid: new Image(), down: new Image() };
    this.#images.up.src = "assets/Flappy Bird/yellowbird-downflap.png";
    this.#images.mid.src = "assets/Flappy Bird/yellowbird-midflap.png";
    this.#images.down.src = "assets/Flappy Bird/yellowbird-upflap.png";
  }

  /**@returns {{image: HTMLImageElement, rotation: Number}} */
  getCurrentImage(velocity, isAlive) {
    if (velocity > 0)
      return {
        image: this.#images.down,
        rotation: (Math.min(isAlive ? 30 : 90, velocity / 5) * Math.PI) / 180,
      };
    else if (velocity < 0)
      return {
        image: this.#images.up,
        rotation: (Math.max(-30, velocity / 5) * Math.PI) / 180,
      };

    return { image: this.#images.mid, rotation: 0 };
  }
}

new Game(new Set(Array.from({ length: 1000 }, () => new BirdObject())));
