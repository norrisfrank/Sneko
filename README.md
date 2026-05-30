# Sneko

A classic Snake game implementation featuring an autonomous agent that learns to play using Reinforcement Learning. This project demonstrates the fundamentals of Deep Q Learning by training a neural network to master the game from scratch.

## Overview

This project consists of two primary components:
1. A fully functional Snake game built with web technologies and TensorFlow.js.
2. An agent that uses a Q Learning algorithm to learn the optimal policy for playing the game, maximizing its score by eating food and avoiding collisions.

It serves as an excellent resource for anyone interested in getting started with Reinforcement Learning and seeing a practical, visual application of these concepts.

## Features

* Classic Snake Gameplay: Smooth and responsive controls for manual play.
* Reinforcement Learning Agent: Implements Deep Q Learning to train an autonomous agent.
* State Representation: Efficiently models the game state for the decision making process.
* Customizable Parameters: Easily adjust learning rate, discount factor, and exploration rate.
* Visualization: Watch the neural network learn and play in real time within a modern browser interface.
* Persistent Memory: Saves local high scores and training metrics.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/derrickgitonga/snake_game_ai.git
   cd snake_game_ai
   ```

2. Navigate to the web directory:
   ```bash
   cd web
   ```

3. Install the required dependencies:
   ```bash
   npm install
   ```

## Usage

Start the local development server:
```bash
npm run dev
```

Open the provided local URL in your web browser. You can choose to play manually using the arrow keys, or toggle the Agent switch to watch the neural network learn and play.

## Project Structure

* web/ : Contains the frontend application, game logic, and TensorFlow.js neural network code.
* model/ : Contains original design files and prototype mockups.
* root scripts : Contains legacy Python implementation scripts.

## License

This project is open source and available under the MIT License.
