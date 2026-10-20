// Factory: one player object.
const Player = (name, marker) => {
  return { name, marker };
};

// Factory: the gameboard holds the array and validates moves.
const Gameboard = () => {
  const board = [
    "", "", "",
    "", "", "",
    "", "", ""
  ];

  const markCell = (index, marker) => {
    const onBoard = index >= 0 && index < board.length;
    if (!onBoard || board[index] !== "") return false;

    board[index] = marker;
    return true;
  };

  const reset = () => {
    board.fill("");
  };

  // All eight winning lines, checked against the board array.
  const winningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  // Returns the winning line array, or null when there is none yet.
  const findWinner = () => {
    for (const line of winningLines) {
      const [a, b, c] = line;
      if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]) {
        return line;
      }
    }
    return null;
  };

  const isFull = () => board.every((cell) => cell !== "");

  return { board, markCell, reset, findWinner, isFull, winningLines };
};

// Factory: controls turn order and end-of-game state.
const Game = (playerOne, playerTwo, gameboard) => {
  let activePlayer = playerOne;
  let finished = false;
  let winner = null;
  let winningLine = null;

  const switchPlayer = () => {
    activePlayer = activePlayer === playerOne ? playerTwo : playerOne;
  };

  // One move: tries to mark the board, then checks for a win or a tie.
  const playRound = (index) => {
    if (finished) return { accepted: false, reason: "game-over" };

    const placed = gameboard.markCell(index, activePlayer.marker);
    if (!placed) return { accepted: false, reason: "taken" };

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

// Module: all DOM work lives here, so the logic above stays free of it.
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

  // Build the nine square buttons once.
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

  // Read the board array and paint every square from it.
  const render = () => {
    if (!gameboard) return;

    gameboard.board.forEach((marker, index) => {
      const cell = cellButtons[index];
      cell.textContent = marker;
      cell.classList.toggle("mark-x", marker === "X");
      cell.classList.toggle("mark-o", marker === "O");
      cell.disabled = marker !== "" || game.isFinished();
      cell.setAttribute("aria-label", `Square ${index + 1}${marker ? `, ${marker}` : ""}`);
    });

    const line = game.getWinningLine();
    cellButtons.forEach((cell) => cell.classList.remove("is-winning"));
    if (line) {
      line.forEach((index) => cellButtons[index].classList.add("is-winning"));
    }

    restartButton.disabled = false;
  };

  const resetStatusStyle = () => statusElement.classList.remove("is-win");

  const announceStart = () => {
    resetStatusStyle();
    statusElement.textContent = `${playerOne.name} (X) goes first.`;
  };

  const startGame = (firstName, secondName) => {
    playerOne = Player(firstName, "X");
    playerTwo = Player(secondName, "O");
    gameboard = Gameboard();
    game = Game(playerOne, playerTwo, gameboard);

    render();
    announceStart();
  };

  const handleCellClick = (event) => {
    const cell = event.target.closest(".cell");
    if (!cell || !game) return;

    const outcome = game.playRound(Number(cell.dataset.index));

    if (!outcome.accepted) {
      statusElement.textContent =
        outcome.reason === "taken" ? "That square is already taken." : statusElement.textContent;
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
      resetStatusStyle();
      statusElement.textContent = `${outcome.player.name} (${outcome.player.marker}), your turn.`;
    }
  };

  boardElement.addEventListener("click", handleCellClick);

  setupForm.addEventListener("submit", (event) => {
    // Without this, the browser would try to send the form to a server.
    event.preventDefault();

    const firstName = playerOneInput.value.trim() || "Player X";
    const secondName = playerTwoInput.value.trim() || "Player O";

    if (firstName === secondName) {
      statusElement.textContent = "Please choose two different names.";
      return;
    }

    startGame(firstName, secondName);
  });

  restartButton.addEventListener("click", () => {
    if (!game) return;

    game.restart();
    render();
    announceStart();
  });

  newPlayersButton.addEventListener("click", () => {
    gameboard = null;
    game = null;
    cellButtons.forEach((cell) => {
      cell.textContent = "";
      cell.className = "cell";
      cell.disabled = true;
    });
    restartButton.disabled = true;
    setupForm.hidden = false;
    resetStatusStyle();
    statusElement.textContent = "Enter both names and start the game.";
    playerOneInput.focus();
  });

  // Let the module hand a fresh game to the console for testing.
  return { startGame: (a, b) => startGame(a || "Player X", b || "Player O") };
})();
