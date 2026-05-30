export const Direction = {
  RIGHT: 1,
  LEFT: 2,
  UP: 3,
  DOWN: 4
};

export const BLOCK_SIZE = 20;

export class SnakeGame {
  constructor(w = 1000, h = 500) {
    this.w = w;
    this.h = h;
    this.reset();
  }

  reset() {
    this.direction = Direction.RIGHT;
    
    this.head = { x: this.w / 2, y: this.h / 2 };
    this.snake = [
      this.head,
      { x: this.head.x - BLOCK_SIZE, y: this.head.y },
      { x: this.head.x - (2 * BLOCK_SIZE), y: this.head.y }
    ];
    
    this.score = 0;
    this.food = null;
    this.placeFood();
    this.frameIteration = 0;
  }

  placeFood() {
    const x = Math.floor(Math.random() * ((this.w - BLOCK_SIZE) / BLOCK_SIZE)) * BLOCK_SIZE;
    const y = Math.floor(Math.random() * ((this.h - BLOCK_SIZE) / BLOCK_SIZE)) * BLOCK_SIZE;
    this.food = { x, y };
    
    // Check if food is inside snake
    if (this.snake.some(pt => pt.x === this.food.x && pt.y === this.food.y)) {
      this.placeFood();
    }
  }

  isCollision(pt = null) {
    if (pt === null) {
      pt = this.head;
    }
    // hits boundary
    if (pt.x > this.w - BLOCK_SIZE || pt.x < 0 || pt.y > this.h - BLOCK_SIZE || pt.y < 0) {
      return true;
    }
    // hits itself
    for (let i = 1; i < this.snake.length; i++) {
      if (pt.x === this.snake[i].x && pt.y === this.snake[i].y) {
        return true;
      }
    }
    return false;
  }

  // Play step for AI mode (takes array action [straight, right, left])
  playStepAI(action) {
    this.frameIteration++;
    
    // 1. Move
    this.moveAI(action);
    this.snake.unshift(this.head); // insert at beginning
    
    // 2. Check game over
    let reward = 0;
    let gameOver = false;
    
    if (this.isCollision() || this.frameIteration > 100 * this.snake.length) {
      gameOver = true;
      reward = -10;
      return { reward, gameOver, score: this.score };
    }
    
    // 3. Place new food or move
    if (this.head.x === this.food.x && this.head.y === this.food.y) {
      this.score++;
      reward = 10;
      this.placeFood();
    } else {
      this.snake.pop(); // remove tail
    }
    
    return { reward, gameOver, score: this.score };
  }

  moveAI(action) {
    // action: [straight, right, left]
    const clockWise = [Direction.RIGHT, Direction.DOWN, Direction.LEFT, Direction.UP];
    const idx = clockWise.indexOf(this.direction);
    
    let newDir;
    if (action[0] === 1) {
      newDir = clockWise[idx]; // straight
    } else if (action[1] === 1) {
      const nextIdx = (idx + 1) % 4;
      newDir = clockWise[nextIdx]; // right turn
    } else {
      const nextIdx = (idx - 1 + 4) % 4;
      newDir = clockWise[nextIdx]; // left turn
    }
    
    this.direction = newDir;
    
    let x = this.head.x;
    let y = this.head.y;
    
    if (this.direction === Direction.RIGHT) x += BLOCK_SIZE;
    else if (this.direction === Direction.LEFT) x -= BLOCK_SIZE;
    else if (this.direction === Direction.DOWN) y += BLOCK_SIZE;
    else if (this.direction === Direction.UP) y -= BLOCK_SIZE;
    
    this.head = { x, y };
  }

  // Play step for Human mode
  playStepHuman(dir) {
    // Only update direction if it's not directly opposite (can't reverse into itself)
    if (dir === Direction.RIGHT && this.direction !== Direction.LEFT) this.direction = dir;
    else if (dir === Direction.LEFT && this.direction !== Direction.RIGHT) this.direction = dir;
    else if (dir === Direction.UP && this.direction !== Direction.DOWN) this.direction = dir;
    else if (dir === Direction.DOWN && this.direction !== Direction.UP) this.direction = dir;
    
    let x = this.head.x;
    let y = this.head.y;
    
    if (this.direction === Direction.RIGHT) x += BLOCK_SIZE;
    else if (this.direction === Direction.LEFT) x -= BLOCK_SIZE;
    else if (this.direction === Direction.DOWN) y += BLOCK_SIZE;
    else if (this.direction === Direction.UP) y -= BLOCK_SIZE;
    
    this.head = { x, y };
    this.snake.unshift(this.head);
    
    let gameOver = false;
    if (this.isCollision()) {
      gameOver = true;
      return { gameOver, score: this.score };
    }
    
    if (this.head.x === this.food.x && this.head.y === this.food.y) {
      this.score++;
      this.placeFood();
    } else {
      this.snake.pop();
    }
    
    return { gameOver, score: this.score };
  }
}
