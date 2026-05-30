import * as tf from '@tensorflow/tfjs';
import { Direction, BLOCK_SIZE } from './game.js';

const MAX_MEMORY = 100000;
const BATCH_SIZE = 1000;
const LR = 0.0005;

class LinearQNet {
  constructor(inputSize, hiddenSize, outputSize) {
    this.model = tf.sequential();
    this.model.add(tf.layers.dense({ units: hiddenSize, inputShape: [inputSize], activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: hiddenSize, activation: 'relu' })); // Additional layer for deeper learning
    this.model.add(tf.layers.dense({ units: outputSize, activation: 'linear' }));
    this.model.compile({
      optimizer: tf.train.adam(LR),
      loss: 'meanSquaredError'
    });
  }

  predict(state) {
    return tf.tidy(() => {
      const stateTensor = tf.tensor2d([state], [1, state.length]);
      return this.model.predict(stateTensor);
    });
  }

  async trainStep(states, actions, rewards, nextStates, dones, gamma) {
    // If it's a single state, convert to array format
    if (!Array.isArray(states[0])) {
      states = [states];
      actions = [actions];
      rewards = [rewards];
      nextStates = [nextStates];
      dones = [dones];
    }

    const statesTensor = tf.tensor2d(states);
    const nextStatesTensor = tf.tensor2d(nextStates);
    const actionsTensor = tf.tensor2d(actions);
    const rewardsTensor = tf.tensor1d(rewards);
    const donesTensor = tf.tensor1d(dones, 'bool');

    // Predict Q-values for current states
    const pred = this.model.predict(statesTensor);
    
    // Predict Q-values for next states
    const nextPred = this.model.predict(nextStatesTensor);
    
    // We need to calculate the target Q-values manually
    const targetQValues = await pred.array();
    const nextQValuesArr = await nextPred.array();
    const rewardsArr = await rewardsTensor.array();
    const donesArr = await donesTensor.array();
    const actionsArr = await actionsTensor.array();

    for (let i = 0; i < donesArr.length; i++) {
      let qNew = rewardsArr[i];
      if (!donesArr[i]) {
        qNew = rewardsArr[i] + gamma * Math.max(...nextQValuesArr[i]);
      }
      
      const actionIdx = actionsArr[i].indexOf(1);
      targetQValues[i][actionIdx] = qNew;
    }

    const targetTensor = tf.tensor2d(targetQValues);
    
    // Train the model
    const info = await this.model.fit(statesTensor, targetTensor, {
      epochs: 1,
      verbose: 0
    });

    // Cleanup memory
    statesTensor.dispose();
    nextStatesTensor.dispose();
    actionsTensor.dispose();
    rewardsTensor.dispose();
    donesTensor.dispose();
    pred.dispose();
    nextPred.dispose();
    targetTensor.dispose();

    return info.history.loss[0];
  }
}

export class Agent {
  constructor() {
    this.nGames = 0;
    this.epsilon = 0;
    this.gamma = 0.9;
    this.memory = []; // maxlen=MAX_MEMORY
    this.model = new LinearQNet(11, 512, 3);
  }

  getState(game) {
    const head = game.snake[0];
    const pointL = { x: head.x - BLOCK_SIZE, y: head.y };
    const pointR = { x: head.x + BLOCK_SIZE, y: head.y };
    const pointU = { x: head.x, y: head.y - BLOCK_SIZE };
    const pointD = { x: head.x, y: head.y + BLOCK_SIZE };

    const dirL = game.direction === Direction.LEFT;
    const dirR = game.direction === Direction.RIGHT;
    const dirU = game.direction === Direction.UP;
    const dirD = game.direction === Direction.DOWN;

    const state = [
      // Danger straight
      (dirR && game.isCollision(pointR)) ||
      (dirL && game.isCollision(pointL)) ||
      (dirU && game.isCollision(pointU)) ||
      (dirD && game.isCollision(pointD)) ? 1 : 0,

      // Danger right
      (dirU && game.isCollision(pointR)) ||
      (dirD && game.isCollision(pointL)) ||
      (dirL && game.isCollision(pointU)) ||
      (dirR && game.isCollision(pointD)) ? 1 : 0,

      // Danger left
      (dirD && game.isCollision(pointR)) ||
      (dirU && game.isCollision(pointL)) ||
      (dirR && game.isCollision(pointU)) ||
      (dirL && game.isCollision(pointD)) ? 1 : 0,

      // Move direction
      dirL ? 1 : 0,
      dirR ? 1 : 0,
      dirU ? 1 : 0,
      dirD ? 1 : 0,

      // Food location
      game.food.x < game.head.x ? 1 : 0, // food left
      game.food.x > game.head.x ? 1 : 0, // food right
      game.food.y < game.head.y ? 1 : 0, // food up
      game.food.y > game.head.y ? 1 : 0  // food down
    ];

    return state;
  }

  remember(state, action, reward, nextState, done) {
    this.memory.push({ state, action, reward, nextState, done });
    if (this.memory.length > MAX_MEMORY) {
      this.memory.shift(); // remove oldest
    }
  }

  async trainLongMemory() {
    let miniSample;
    if (this.memory.length > BATCH_SIZE) {
      miniSample = [...this.memory].sort(() => 0.5 - Math.random()).slice(0, BATCH_SIZE);
    } else {
      miniSample = this.memory;
    }

    const states = miniSample.map(m => m.state);
    const actions = miniSample.map(m => m.action);
    const rewards = miniSample.map(m => m.reward);
    const nextStates = miniSample.map(m => m.nextState);
    const dones = miniSample.map(m => m.done);

    return await this.model.trainStep(states, actions, rewards, nextStates, dones, this.gamma);
  }

  async trainShortMemory(state, action, reward, nextState, done) {
    const loss = await this.model.trainStep(state, action, reward, nextState, done, this.gamma);
    if (loss !== undefined) this.lastLoss = loss;
    return loss;
  }

  getAction(state) {
    this.epsilon = 150 - this.nGames;
    let finalMove = [0, 0, 0];
    this.lastQValues = [0, 0, 0];
    
    if (Math.random() * 200 < this.epsilon) {
      const move = Math.floor(Math.random() * 3);
      finalMove[move] = 1;
    } else {
      const prediction = this.model.predict(state);
      this.lastQValues = prediction.dataSync();
      const move = prediction.argMax(1).dataSync()[0];
      finalMove[move] = 1;
      prediction.dispose();
    }
    
    return finalMove;
  }
}
