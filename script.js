// ----- Logic layer: no DOM code lives in here -----

// Factory: one player object.
const Player = (name, marker) => ({ name, marker });

// The eight winning lines, shared by the board checker.
const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
];

// Factory: the board holds the array and validates moves.
const Gameboard = () => {
  const board = ["", "", "", "", "", "", "", "", ""];

  // Returns true only when the square exists and is still empty.
  const markCell = (index, marker) => {
    const onBoard = Number.isInteger(index) && index >= 0 && index < board.length;
    if (!onBoard || board[index] !== "") return false;
    board[index] = marker;
    return true;
  };

  const reset = () => board.fill("");

  // Returns the winning line array, or null when there is none.
  const findWinner = () => {
    for (const line of WINNING_LINES) {
      const [a, b, c] = line;
      if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]) {
        return line;
      }
    }
    return null;
  };

  const isFull = () => board.every((cell) => cell !== "");

  return { board, markCell, reset, findWinner, isFull };
};

// Factory: turn order and end-of-game state.
const Game = (playerOne, playerTwo, gameboard) => {
  let activePlayer = playerOne;
  let finished = false;
  let winner = null;
  let winningLine = null;

  const switchPlayer = () => {
    activePlayer = activePlayer === playerOne ? playerTwo : playerOne;
  };

  // Play one move and report what happened.
  const playRound = (index) => {
    if (finished) return { accepted: false, reason: "game-over" };

    if (!gameboard.markCell(index, activePlayer.marker)) {
      return { accepted: false, reason: "taken" };
    }

    winningLine = gameboard.findWinner();

    if (winningLine) {
      finished = true;
      winner = activePlayer;
      return { accepted: true, result: "win", player: activePlayer, line: winningLine };
    }

    if (gameboard.isFull()) {
      finished = true;
      return { accepted: true, result: "tie" };
    }

    switchPlayer();
    return { accepted: true, result: "continue", player: activePlayer };
  };

  const restart = () => {
    gameboard.reset();
    activePlayer = playerOne;
    finished = false;
    winner = null;
    winningLine = null;
  };

  return {
    playRound,
    restart,
    isFinished: () => finished,
    getWinner: () => winner,
    getWinningLine: () => winningLine,
    getActivePlayer: () => activePlayer
  };
};

// ----- Display layer: wrapped in a module so it is created once -----

const displayController = (() => {
  const setupForm = document.querySelector("#setup-form");
  const playerOneInput = document.querySelector("#player-one");
  const playerTwoInput = document.querySelector("#player-two");
  const statusElement = document.querySelector("#status");
  const boardElement = document.querySelector("#board");
  const restartButton = document.querySelector("#restart-button");
  const newPlayersButton = document.querySelector("#new-players-button");

  let gameboard = null;
  let game = null;
  let playerOne = null;
  let playerTwo = null;
  const cellButtons = [];

  // Build the nine squares immediately, so the board shows on load.
  for (let index = 0; index < 9; index += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.dataset.index = String(index);
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `Square ${index + 1}`);
    cell.disabled = true;
    cellButtons.push(cell);
    boardElement.append(cell);
  }

  const clearHighlights = () => {
    cellButtons.forEach((cell) => cell.classList.remove("is-winning"));
  };

  const resetStatusStyle = () => statusElement.classList.remove("is-win");

  // Paint every square from the board array, and lock them when the game is done.
  const render = () => {
    const marks = gameboard ? gameboard.board : ["", "", "", "", "", "", "", "", ""];
    const finished = game ? game.isFinished() : true;

    marks.forEach((marker, index) => {
      const cell = cellButtons[index];
      cell.textContent = marker;
      cell.classList.toggle("mark-x", marker === "X");
      cell.classList.toggle("mark-o", marker === "O");
      cell.disabled = marker !== "" || finished;
      cell.setAttribute("aria-label", `Square ${index + 1}${marker ? `, ${marker}` : ""}`);
    });

    clearHighlights();

    if (game && game.getWinningLine()) {
      game.getWinningLine().forEach((index) => cellButtons[index].classList.add("is-winning"));
    }
  };

  const announceTurn = () => {
    resetStatusStyle();
    statusElement.textContent = `${playerOne.name} (X), your turn.`;
  };

  const startGame = (firstName, secondName) => {
    playerOne = Player(firstName, "X");
    playerTwo = Player(secondName, "O");
    gameboard = Gameboard();
    game = Game(playerOne, playerTwo, gameboard);

    render();
    restartButton.disabled = false;
    announceTurn();
  };

  boardElement.addEventListener("click", (event) => {
    const cell = event.target.closest(".cell");
    if (!cell || !game) return;

    const outcome = game.playRound(Number(cell.dataset.index));

    if (!outcome.accepted) {
      if (outcome.reason === "taken") {
        statusElement.textContent = "That square is already taken.";
      }
      return;
    }

    render();

    if (outcome.result === "win") {
      resetStatusStyle();
      statusElement.classList.add("is-win");
      statusElement.textContent = `${outcome.player.name} (${outcome.player.marker}) wins!`;
    } else if (outcome.result === "tie") {
      resetStatusStyle();
      statusElement.textContent = "It's a tie. No squares left.";
    } else {
      statusElement.textContent = `${outcome.player.name} (${outcome.player.marker}), your turn.`;
    }
  });

  setupForm.addEventListener("submit", (event) => {
    // Stops the browser from trying to send the form to a server.
    event.preventDefault();

    const firstName = playerOneInput.value.trim() || "Player X";
    const secondName = playerTwoInput.value.trim() || "Player O";

    if (firstName === secondName) {
      statusElement.textContent = "Please choose two different names.";
      return;
    }

    startGame(firstName, secondName);
    playerTwoInput.blur();
  });

  restartButton.addEventListener("click", () => {
    if (!game) return;

    game.restart();
    render();
    announceTurn();
  });

  newPlayersButton.addEventListener("click", () => {
    gameboard = null;
    game = null;
    playerOne = null;
    playerTwo = null;
    render();
    restartButton.disabled = true;
    resetStatusStyle();
    statusElement.textContent = "Enter both names and start the game.";
    playerOneInput.value = "";
    playerTwoInput.value = "";
    playerOneInput.focus();
  });

  // Start with a clean, empty board visible.
  render();

  // Handy for driving the game from the console during development.
  window.startTicTacToe = (a, b) => startGame(a || "Player X", b || "Player O");
})();
