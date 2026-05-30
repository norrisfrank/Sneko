import { SnakeGame, Direction, BLOCK_SIZE } from './game.js';
import { Agent } from './agent.js';

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreValue = document.getElementById('scoreValue');
const aiToggle = document.getElementById('aiToggle');
const techArea = document.getElementById('techArea');
const instructionText = document.getElementById('instructionText');

// Tech Area DOM
const gamesPlayedEl = document.getElementById('gamesPlayed');
const highScoreEl = document.getElementById('highScore');
const framesSurvivedEl = document.getElementById('framesSurvived');
const epsilonValueEl = document.getElementById('epsilonValue');
const rewardValueEl = document.getElementById('rewardValue');
const memorySizeEl = document.getElementById('memorySize');
const trainingLossEl = document.getElementById('trainingLoss');
const stateVectorEl = document.getElementById('stateVector');
const qValStraightEl = document.getElementById('qValStraight');
const qValRightEl = document.getElementById('qValRight');
const qValLeftEl = document.getElementById('qValLeft');
const actionValueEl = document.getElementById('actionValue');

// Sections
const sections = {
  hero: document.getElementById('heroSection'),
  game: document.getElementById('gameSection'),
  howTo: document.getElementById('howToSection'),
  leaderboard: document.getElementById('leaderboardSection'),
  about: document.getElementById('aboutSection')
};

const navLinks = {
  logo: document.getElementById('navLogo'),
  play: [document.getElementById('navPlayBtn'), document.getElementById('heroPlayBtn')],
  howTo: document.getElementById('navHowTo'),
  leaderboard: document.getElementById('navLeaderboard'),
  about: document.getElementById('navAbout')
};

let game;
let agent;
let isAiMode = false;
let animationId = null;
let lastTime = 0;
let aiLoopTimeout = null;

// Adjust game speed (Human mode)
const HUMAN_FPS = 12; // Slower than original 20 to make it manageable
const AI_FPS = 45; // Fast

let record = 0;
let currentFrames = 0;
let leaderboard = JSON.parse(localStorage.getItem('snekyLeaderboard')) || [];

function init() {
  game = new SnakeGame(1000, 800);
  agent = new Agent();
  
  // Bind events
  window.addEventListener('keydown', handleKeyDown);
  aiToggle.addEventListener('change', handleToggleAI);
  
  // Navigation Bindings
  navLinks.logo.addEventListener('click', () => showSection('hero'));
  navLinks.play.forEach(btn => btn.addEventListener('click', () => {
    showSection('game');
    if (!animationId && !aiLoopTimeout) {
      if (isAiMode) runAILoop();
      else requestAnimationFrame(humanGameLoop);
    }
  }));
  navLinks.howTo.addEventListener('click', () => showSection('howTo'));
  navLinks.leaderboard.addEventListener('click', () => {
    updateLeaderboardTable();
    showSection('leaderboard');
  });
  navLinks.about.addEventListener('click', () => showSection('about'));

  // Initial draw
  drawGame();
}

function showSection(sectionKey) {
  Object.values(sections).forEach(sec => sec.style.display = 'none');
  sections[sectionKey].style.display = 'flex';

  if (sectionKey !== 'game') {
    // Pause game
    cancelAnimationFrame(animationId);
    clearTimeout(aiLoopTimeout);
    animationId = null;
    aiLoopTimeout = null;
  } else if (!animationId && !aiLoopTimeout) {
    lastTime = performance.now();
    if (isAiMode) runAILoop();
    else requestAnimationFrame(humanGameLoop);
  }
}

function handleToggleAI(e) {
  isAiMode = e.target.checked;
  
  if (isAiMode) {
    instructionText.innerHTML = "<strong>AI Agent</strong> is currently playing and learning.";
    techArea.style.display = 'flex'; // Uses flex for the wrap layout
    cancelAnimationFrame(animationId);
    animationId = null;
    runAILoop();
  } else {
    instructionText.innerHTML = "Use <strong>Arrow Keys</strong> to move.";
    techArea.style.display = 'none';
    game.reset();
    currentFrames = 0;
    clearTimeout(aiLoopTimeout);
    aiLoopTimeout = null;
    lastTime = performance.now();
    requestAnimationFrame(humanGameLoop);
  }
}

function handleKeyDown(e) {
  if (isAiMode || sections.game.style.display === 'none') return; 
  
  switch(e.key) {
    case 'ArrowLeft': game.direction = Direction.LEFT; break;
    case 'ArrowRight': game.direction = Direction.RIGHT; break;
    case 'ArrowUp': game.direction = Direction.UP; break;
    case 'ArrowDown': game.direction = Direction.DOWN; break;
  }
}

function drawGame() {
  ctx.fillStyle = '#0b0b0f';
  ctx.fillRect(0, 0, game.w, game.h);

  game.snake.forEach((pt, idx) => {
    ctx.fillStyle = idx === 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(pt.x, pt.y, BLOCK_SIZE, BLOCK_SIZE);
    ctx.fillStyle = idx === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(pt.x + 4, pt.y + 4, 12, 12);
  });

  ctx.fillStyle = '#d12e2e';
  ctx.fillRect(game.food.x, game.food.y, BLOCK_SIZE, BLOCK_SIZE);
}

function saveScore(score, mode) {
  if (score === 0) return;
  const entry = {
    score,
    mode,
    date: new Date().toLocaleDateString()
  };
  leaderboard.push(entry);
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10); // keep top 10
  localStorage.setItem('snekyLeaderboard', JSON.stringify(leaderboard));
}

function updateLeaderboardTable() {
  const tbody = document.getElementById('leaderboardBody');
  tbody.innerHTML = '';
  if (leaderboard.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No scores yet!</td></tr>';
    return;
  }
  leaderboard.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${idx + 1}</td>
      <td><span style="color: ${entry.mode === 'AI' ? '#38bdf8' : '#4ade80'}">${entry.mode}</span></td>
      <td style="font-weight:bold">${entry.score}</td>
      <td>${entry.date}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateScore() {
  scoreValue.innerText = game.score;
}

// ---------------------------
// HUMAN LOOP
// ---------------------------
function humanGameLoop(currentTime) {
  if (isAiMode || sections.game.style.display === 'none') return;
  
  animationId = requestAnimationFrame(humanGameLoop);
  
  const secondsSinceLastRender = (currentTime - lastTime) / 1000;
  if (secondsSinceLastRender < 1 / HUMAN_FPS) return;
  
  lastTime = currentTime;
  
  const { gameOver } = game.playStepHuman(game.direction);
  
  if (gameOver) {
    saveScore(game.score, 'Human');
    game.reset();
  }
  
  drawGame();
  updateScore();
}

// ---------------------------
// AI LOOP
// ---------------------------
async function runAILoop() {
  if (!isAiMode || sections.game.style.display === 'none') return;

  currentFrames++;
  const stateOld = agent.getState(game);
  const finalMove = agent.getAction(stateOld);
  
  const { reward, gameOver, score } = game.playStepAI(finalMove);
  const stateNew = agent.getState(game);

  await agent.trainShortMemory(stateOld, finalMove, reward, stateNew, gameOver);
  agent.remember(stateOld, finalMove, reward, stateNew, gameOver);

  if (gameOver) {
    saveScore(score, 'AI');
    game.reset();
    agent.nGames++;
    await agent.trainLongMemory();
    if (score > record) record = score;
    currentFrames = 0; // reset frames alive
  }

  drawGame();
  updateScore();
  
  // Intricate UI Update
  gamesPlayedEl.innerText = agent.nGames;
  highScoreEl.innerText = record;
  framesSurvivedEl.innerText = currentFrames;
  epsilonValueEl.innerText = Math.max(0, agent.epsilon).toFixed(1);
  rewardValueEl.innerText = reward;
  memorySizeEl.innerText = `${agent.memory.length.toLocaleString()} / 100k`;
  
  if (agent.lastLoss !== undefined) {
    trainingLossEl.innerText = agent.lastLoss.toFixed(4);
  }

  stateVectorEl.innerText = `[${stateOld.join(', ')}]`;
  
  if (agent.lastQValues) {
    qValStraightEl.innerText = agent.lastQValues[0].toFixed(2);
    qValRightEl.innerText = agent.lastQValues[1].toFixed(2);
    qValLeftEl.innerText = agent.lastQValues[2].toFixed(2);
  }

  const actionText = finalMove[0] === 1 ? 'Straight' : finalMove[1] === 1 ? 'Right' : 'Left';
  actionValueEl.innerText = actionText;

  aiLoopTimeout = setTimeout(runAILoop, 1000 / AI_FPS);
}

// Start
init();
