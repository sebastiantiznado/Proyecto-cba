const LEVELS = {
  beginner: { rows: 9, cols: 9, mines: 10, label: "Principiante" },
  intermediate: { rows: 16, cols: 16, mines: 40, label: "Intermedio" },
  expert: { rows: 16, cols: 30, mines: 99, label: "Experto" }
};

const boardEl = document.getElementById("board");
const mineCounter = document.getElementById("mineCounter");
const timerEl = document.getElementById("timer");
const statusText = document.getElementById("statusText");
const progressText = document.getElementById("progressText");
const faceBtn = document.getElementById("faceBtn");
const bestTime = document.getElementById("bestTime");
const bestLabel = document.getElementById("bestLabel");
const modal = document.getElementById("modal");

let level = "beginner";
let config = LEVELS[level];
let cells = [];
let started = false;
let gameOver = false;
let elapsed = 0;
let timerId = null;
let flags = 0;
let revealedCount = 0;
let longPressTimer = null;
let touchFlagTriggered = false;

function pad(n) {
  const sign = n < 0 ? "-" : "";
  return sign + Math.abs(n).toString().padStart(3, "0").slice(-3);
}

function indexOf(row, col) {
  return row * config.cols + col;
}

function coordsOf(index) {
  return {
    row: Math.floor(index / config.cols),
    col: index % config.cols
  };
}

function neighbors(index) {
  const { row, col } = coordsOf(index);
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < config.rows && c >= 0 && c < config.cols) {
        out.push(indexOf(r, c));
      }
    }
  }
  return out;
}

function createEmptyBoard() {
  cells = Array.from({ length: config.rows * config.cols }, (_, index) => ({
    index,
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
    element: null
  }));

  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${config.cols}, var(--cell))`;

  cells.forEach(cell => {
    const button = document.createElement("button");
    button.className = "cell";
    button.type = "button";
    button.dataset.index = cell.index;
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", "Casilla oculta");
    cell.element = button;
    boardEl.appendChild(button);
  });
}

function placeMines(firstIndex) {
  const safe = new Set([firstIndex, ...neighbors(firstIndex)]);
  const candidates = cells.map(c => c.index).filter(i => !safe.has(i));

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  candidates.slice(0, config.mines).forEach(i => cells[i].mine = true);

  cells.forEach(cell => {
    if (!cell.mine) {
      cell.adjacent = neighbors(cell.index).filter(i => cells[i].mine).length;
    }
  });
}

function startTimer() {
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    if (gameOver) return;
    elapsed = Math.min(elapsed + 1, 999);
    timerEl.textContent = pad(elapsed);
  }, 1000);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function firstMove(index) {
  placeMines(index);
  started = true;
  startTimer();
  statusText.textContent = "Partida en curso… no pises nada raro 💣";
}

function reveal(index) {
  if (gameOver) return;
  const cell = cells[index];
  if (!cell || cell.revealed || cell.flagged) return;

  if (!started) firstMove(index);

  if (cell.mine) {
    cell.revealed = true;
    cell.element.classList.add("revealed", "mine-hit");
    cell.element.textContent = "💣";
    loseGame();
    return;
  }

  floodReveal(index);
  updateProgress();
  checkWin();
}

function floodReveal(startIndex) {
  const queue = [startIndex];
  const visited = new Set();

  while (queue.length) {
    const index = queue.shift();
    if (visited.has(index)) continue;
    visited.add(index);

    const cell = cells[index];
    if (!cell || cell.revealed || cell.flagged || cell.mine) continue;

    cell.revealed = true;
    revealedCount++;
    renderCell(cell);

    if (cell.adjacent === 0) {
      neighbors(index).forEach(n => {
        const next = cells[n];
        if (!next.revealed && !next.mine && !next.flagged) queue.push(n);
      });
    }
  }
}

function renderCell(cell) {
  const el = cell.element;
  if (cell.revealed) {
    el.classList.add("revealed");
    el.classList.remove("flagged");
    if (cell.mine) {
      el.textContent = "💣";
      el.setAttribute("aria-label", "Mina");
    } else if (cell.adjacent > 0) {
      el.textContent = cell.adjacent;
      el.dataset.num = cell.adjacent;
      el.setAttribute("aria-label", `${cell.adjacent} minas cercanas`);
    } else {
      el.textContent = "";
      el.removeAttribute("data-num");
      el.setAttribute("aria-label", "Casilla vacía");
    }
  } else {
    el.classList.remove("revealed");
    if (cell.flagged) {
      el.classList.add("flagged");
      el.textContent = "🚩";
      el.setAttribute("aria-label", "Bandera");
    } else {
      el.classList.remove("flagged");
      el.textContent = "";
      el.setAttribute("aria-label", "Casilla oculta");
    }
  }
}

function toggleFlag(index) {
  if (gameOver) return;
  const cell = cells[index];
  if (!cell || cell.revealed) return;

  cell.flagged = !cell.flagged;
  flags += cell.flagged ? 1 : -1;
  renderCell(cell);
  mineCounter.textContent = pad(config.mines - flags);
}

function chord(index) {
  if (gameOver || !started) return;
  const cell = cells[index];
  if (!cell || !cell.revealed || cell.adjacent === 0) return;

  const around = neighbors(index);
  const flaggedAround = around.filter(i => cells[i].flagged).length;
  if (flaggedAround !== cell.adjacent) return;

  for (const i of around) {
    const c = cells[i];
    if (!c.flagged && !c.revealed) {
      if (c.mine) {
        c.revealed = true;
        renderCell(c);
        c.element.classList.add("mine-hit");
        loseGame();
        return;
      }
      floodReveal(i);
    }
  }

  updateProgress();
  checkWin();
}

function updateProgress() {
  const safeCells = config.rows * config.cols - config.mines;
  const pct = Math.round((revealedCount / safeCells) * 100);
  progressText.textContent = `${pct}%`;
}

function checkWin() {
  const safeCells = config.rows * config.cols - config.mines;
  if (revealedCount === safeCells && !gameOver) {
    winGame();
  }
}

function revealAllMines() {
  cells.forEach(cell => {
    if (cell.mine && !cell.flagged) {
      cell.revealed = true;
      renderCell(cell);
    } else if (!cell.mine && cell.flagged) {
      cell.element.classList.add("mine-wrong");
      cell.element.textContent = "✕";
    }
  });
}

function loseGame() {
  gameOver = true;
  stopTimer();
  faceBtn.textContent = "😵";
  statusText.textContent = "BOOM. Seba encontró una mina 💥";
  revealAllMines();
  showModal(false);
}

function winGame() {
  gameOver = true;
  stopTimer();
  faceBtn.textContent = "😎";
  statusText.textContent = "¡Tablero limpio! Seba sobrevivió 😎";

  cells.forEach(cell => {
    if (cell.mine && !cell.flagged) {
      cell.flagged = true;
      renderCell(cell);
    }
  });
  flags = config.mines;
  mineCounter.textContent = "000";

  const key = `seba-minesweeper-best-${level}`;
  const previous = Number(localStorage.getItem(key) || 0);
  const isRecord = !previous || elapsed < previous;

  if (isRecord) {
    localStorage.setItem(key, String(elapsed));
  }

  updateRecords();
  showModal(true, isRecord);
}

function showModal(won, isRecord = false) {
  document.getElementById("modalIcon").textContent = won ? (isRecord ? "🏆" : "😎") : "💥";
  document.getElementById("modalTitle").textContent = won ? (isRecord ? "¡Nuevo récord!" : "¡Ganaste!") : "¡BOOM!";
  document.getElementById("modalText").textContent = won
    ? `Seba limpió el tablero en ${elapsed} segundos.${isRecord ? " Nuevo mejor tiempo guardado." : ""}`
    : "Una mina se interpuso en el camino. La revancha está a un botón.";
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function hideModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function newGame() {
  stopTimer();
  config = LEVELS[level];
  started = false;
  gameOver = false;
  elapsed = 0;
  flags = 0;
  revealedCount = 0;
  timerEl.textContent = "000";
  mineCounter.textContent = pad(config.mines);
  progressText.textContent = "0%";
  faceBtn.textContent = "🙂";
  statusText.textContent = "Haz tu primera jugada, Seba 👀";
  hideModal();
  createEmptyBoard();
  updateRecords();
}

function updateRecords() {
  const entries = [
    ["beginner", "recordBeginner"],
    ["intermediate", "recordIntermediate"],
    ["expert", "recordExpert"]
  ];

  entries.forEach(([key, id]) => {
    const value = Number(localStorage.getItem(`seba-minesweeper-best-${key}`) || 0);
    document.getElementById(id).textContent = value ? `${value}s` : "—";
  });

  const current = Number(localStorage.getItem(`seba-minesweeper-best-${level}`) || 0);
  bestTime.textContent = current ? `${current}s` : "—";
  bestLabel.textContent = LEVELS[level].label;
}

boardEl.addEventListener("click", event => {
  if (touchFlagTriggered) {
    touchFlagTriggered = false;
    return;
  }
  const cell = event.target.closest(".cell");
  if (!cell) return;
  reveal(Number(cell.dataset.index));
});

boardEl.addEventListener("contextmenu", event => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  event.preventDefault();
  toggleFlag(Number(cell.dataset.index));
});

boardEl.addEventListener("dblclick", event => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  event.preventDefault();
  chord(Number(cell.dataset.index));
});

boardEl.addEventListener("touchstart", event => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  touchFlagTriggered = false;
  longPressTimer = setTimeout(() => {
    touchFlagTriggered = true;
    toggleFlag(Number(cell.dataset.index));
    if (navigator.vibrate) navigator.vibrate(25);
  }, 520);
}, { passive: true });

["touchend", "touchcancel", "touchmove"].forEach(type => {
  boardEl.addEventListener(type, () => {
    if (longPressTimer) clearTimeout(longPressTimer);
    longPressTimer = null;
  }, { passive: true });
});

document.querySelectorAll(".difficulty-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    level = btn.dataset.level;
    document.querySelectorAll(".difficulty-btn").forEach(b => b.classList.toggle("active", b === btn));
    newGame();
  });
});

document.getElementById("newGameBtn").addEventListener("click", newGame);
faceBtn.addEventListener("click", newGame);
document.getElementById("playAgainBtn").addEventListener("click", newGame);
document.getElementById("closeModalBtn").addEventListener("click", hideModal);

document.getElementById("clearRecordsBtn").addEventListener("click", () => {
  ["beginner","intermediate","expert"].forEach(key => {
    localStorage.removeItem(`seba-minesweeper-best-${key}`);
  });
  updateRecords();
});

document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("light");
  const light = document.body.classList.contains("light");
  document.getElementById("themeBtn").textContent = light ? "🌙" : "☀️";
  localStorage.setItem("seba-minesweeper-theme", light ? "light" : "dark");
});

if (localStorage.getItem("seba-minesweeper-theme") === "light") {
  document.body.classList.add("light");
  document.getElementById("themeBtn").textContent = "🌙";
}

newGame();
