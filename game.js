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

/* =========================================================
   EFECTO DE EXPLOSIÓN
   ========================================================= */

function createExplosionStyles() {
  if (document.getElementById("explosionStyles")) return;

  const style = document.createElement("style");
  style.id = "explosionStyles";

  style.textContent = `
    #explosionLayer {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      overflow: hidden;
      z-index: 9999;
    }

    .explosion-flash {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(
          circle at center,
          rgba(255,255,255,.95) 0%,
          rgba(255,220,100,.75) 12%,
          rgba(255,100,0,.35) 30%,
          transparent 65%
        );
      animation: explosionFlash .45s ease-out forwards;
    }

    .explosion-core {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 90px;
      height: 90px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background:
        radial-gradient(
          circle,
          #ffffff 0%,
          #fff3a3 12%,
          #ffd166 27%,
          #ff7a18 48%,
          #e63946 68%,
          transparent 72%
        );
      filter: drop-shadow(0 0 30px #ff7a18);
      animation: explosionCore .7s cubic-bezier(.15,.75,.25,1) forwards;
    }

    .explosion-ring {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 80px;
      height: 80px;
      border: 8px solid rgba(255,190,60,.8);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      animation: explosionRing .7s ease-out forwards;
    }

    .explosion-particle {
      position: absolute;
      left: 50%;
      top: 50%;
      width: var(--size);
      height: var(--size);
      border-radius: 50%;
      background: var(--particle-color);
      box-shadow: 0 0 10px var(--particle-color);
      transform: translate(-50%, -50%);
      animation:
        explosionParticle
        var(--duration)
        cubic-bezier(.1,.75,.2,1)
        forwards;
    }

    .explosion-smoke {
      position: absolute;
      left: 50%;
      top: 50%;
      width: var(--size);
      height: var(--size);
      border-radius: 50%;
      background: rgba(50,50,50,.55);
      filter: blur(3px);
      transform: translate(-50%, -50%);
      animation:
        explosionSmoke
        var(--duration)
        ease-out
        forwards;
    }

    body.explosion-shake {
      animation: explosionShake .5s ease-out;
    }

    @keyframes explosionFlash {
      0% {
        opacity: 0;
      }

      10% {
        opacity: 1;
      }

      100% {
        opacity: 0;
      }
    }

    @keyframes explosionCore {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(.1);
      }

      15% {
        opacity: 1;
      }

      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(5);
      }
    }

    @keyframes explosionRing {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(.1);
      }

      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(8);
      }
    }

    @keyframes explosionParticle {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      100% {
        opacity: 0;
        transform:
          translate(
            calc(-50% + var(--x)),
            calc(-50% + var(--y))
          )
          scale(.15);
      }
    }

    @keyframes explosionSmoke {
      0% {
        opacity: .8;
        transform: translate(-50%, -50%) scale(.3);
      }

      100% {
        opacity: 0;
        transform:
          translate(
            calc(-50% + var(--x)),
            calc(-50% + var(--y))
          )
          scale(2.8);
      }
    }

    @keyframes explosionShake {
      0%, 100% {
        transform: translate(0, 0);
      }

      10% {
        transform: translate(-10px, 6px);
      }

      20% {
        transform: translate(9px, -7px);
      }

      30% {
        transform: translate(-8px, -5px);
      }

      40% {
        transform: translate(7px, 6px);
      }

      50% {
        transform: translate(-5px, 4px);
      }

      60% {
        transform: translate(4px, -3px);
      }

      70% {
        transform: translate(-3px, 2px);
      }

      80% {
        transform: translate(2px, -1px);
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   SONIDO DE EXPLOSIÓN
   No necesita ningún archivo .mp3
   ========================================================= */

function playExplosionSound() {
  const AudioContext =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContext) return;

  const audioContext = new AudioContext();

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const now = audioContext.currentTime;

  /* -------------------------
     RUIDO DE LA EXPLOSIÓN
     ------------------------- */

  const bufferSize = audioContext.sampleRate * 0.8;

  const noiseBuffer =
    audioContext.createBuffer(
      1,
      bufferSize,
      audioContext.sampleRate
    );

  const data = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const decay = Math.pow(
      1 - i / bufferSize,
      1.5
    );

    data[i] =
      (Math.random() * 2 - 1) *
      decay;
  }

  const noise =
    audioContext.createBufferSource();

  noise.buffer = noiseBuffer;

  const noiseFilter =
    audioContext.createBiquadFilter();

  noiseFilter.type = "lowpass";

  noiseFilter.frequency.setValueAtTime(
    1000,
    now
  );

  noiseFilter.frequency.exponentialRampToValueAtTime(
    80,
    now + 0.65
  );

  const noiseGain =
    audioContext.createGain();

  noiseGain.gain.setValueAtTime(
    0.0001,
    now
  );

  noiseGain.gain.exponentialRampToValueAtTime(
    0.8,
    now + 0.02
  );

  noiseGain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.7
  );

  noise
    .connect(noiseFilter)
    .connect(noiseGain)
    .connect(audioContext.destination);

  noise.start(now);
  noise.stop(now + 0.8);

  /* -------------------------
     SONIDO GRAVE "BOOM"
     ------------------------- */

  const boom =
    audioContext.createOscillator();

  const boomGain =
    audioContext.createGain();

  boom.type = "sine";

  boom.frequency.setValueAtTime(
    120,
    now
  );

  boom.frequency.exponentialRampToValueAtTime(
    35,
    now + 0.55
  );

  boomGain.gain.setValueAtTime(
    0.0001,
    now
  );

  boomGain.gain.exponentialRampToValueAtTime(
    0.75,
    now + 0.025
  );

  boomGain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.6
  );

  boom
    .connect(boomGain)
    .connect(audioContext.destination);

  boom.start(now);
  boom.stop(now + 0.65);

  /* -------------------------
     PEQUEÑO CLICK INICIAL
     ------------------------- */

  const crack =
    audioContext.createOscillator();

  const crackGain =
    audioContext.createGain();

  crack.type = "square";

  crack.frequency.setValueAtTime(
    700,
    now
  );

  crack.frequency.exponentialRampToValueAtTime(
    120,
    now + 0.08
  );

  crackGain.gain.setValueAtTime(
    0.0001,
    now
  );

  crackGain.gain.exponentialRampToValueAtTime(
    0.25,
    now + 0.005
  );

  crackGain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.1
  );

  crack
    .connect(crackGain)
    .connect(audioContext.destination);

  crack.start(now);
  crack.stop(now + 0.12);

  setTimeout(() => {
    audioContext.close();
  }, 1000);
}

/* =========================================================
   CREAR EXPLOSIÓN
   ========================================================= */

function createExplosion() {
  createExplosionStyles();

  const oldLayer =
    document.getElementById("explosionLayer");

  if (oldLayer) {
    oldLayer.remove();
  }

  const layer =
    document.createElement("div");

  layer.id = "explosionLayer";

  /* Destello */

  const flash =
    document.createElement("div");

  flash.className =
    "explosion-flash";

  layer.appendChild(flash);

  /* Centro */

  const core =
    document.createElement("div");

  core.className =
    "explosion-core";

  layer.appendChild(core);

  /* Onda expansiva */

  const ring =
    document.createElement("div");

  ring.className =
    "explosion-ring";

  layer.appendChild(ring);

  /* Partículas */

  const particleColors = [
    "#ffffff",
    "#ffd166",
    "#ffb703",
    "#ff7a18",
    "#e63946"
  ];

  for (let i = 0; i < 55; i++) {
    const particle =
      document.createElement("span");

    particle.className =
      "explosion-particle";

    const angle =
      Math.random() *
      Math.PI *
      2;

    const distance =
      100 +
      Math.random() *
      Math.min(
        window.innerWidth,
        window.innerHeight
      ) *
      0.45;

    const x =
      Math.cos(angle) *
      distance;

    const y =
      Math.sin(angle) *
      distance;

    particle.style.setProperty(
      "--x",
      `${x}px`
    );

    particle.style.setProperty(
      "--y",
      `${y}px`
    );

    particle.style.setProperty(
      "--size",
      `${4 + Math.random() * 10}px`
    );

    particle.style.setProperty(
      "--duration",
      `${0.5 + Math.random() * 0.7}s`
    );

    particle.style.setProperty(
      "--particle-color",
      particleColors[
        Math.floor(
          Math.random() *
          particleColors.length
        )
      ]
    );

    layer.appendChild(particle);
  }

  /* Humo */

  for (let i = 0; i < 12; i++) {
    const smoke =
      document.createElement("span");

    smoke.className =
      "explosion-smoke";

    const angle =
      Math.random() *
      Math.PI *
      2;

    const distance =
      40 +
      Math.random() * 180;

    smoke.style.setProperty(
      "--x",
      `${Math.cos(angle) * distance}px`
    );

    smoke.style.setProperty(
      "--y",
      `${Math.sin(angle) * distance}px`
    );

    smoke.style.setProperty(
      "--size",
      `${25 + Math.random() * 45}px`
    );

    smoke.style.setProperty(
      "--duration",
      `${0.8 + Math.random() * 0.6}s`
    );

    layer.appendChild(smoke);
  }

  document.body.appendChild(layer);

  /* Sacudida */

  document.body.classList.remove(
    "explosion-shake"
  );

  void document.body.offsetWidth;

  document.body.classList.add(
    "explosion-shake"
  );

  /* Sonido */

  playExplosionSound();

  /* Vibración en móviles */

  if (
    "vibrate" in navigator
  ) {
    navigator.vibrate([
      100,
      50,
      180,
      40,
      250
    ]);
  }

  setTimeout(() => {
    layer.remove();

    document.body.classList.remove(
      "explosion-shake"
    );
  }, 1600);
}

/* =========================================================
   UTILIDADES DEL JUEGO
   ========================================================= */

function pad(n) {
  const sign = n < 0 ? "-" : "";

  return (
    sign +
    Math.abs(n)
      .toString()
      .padStart(3, "0")
      .slice(-3)
  );
}

function indexOf(row, col) {
  return row * config.cols + col;
}

function coordsOf(index) {
  return {
    row: Math.floor(
      index / config.cols
    ),
    col: index % config.cols
  };
}

function neighbors(index) {
  const {
    row,
    col
  } = coordsOf(index);

  const out = [];

  for (
    let dr = -1;
    dr <= 1;
    dr++
  ) {
    for (
      let dc = -1;
      dc <= 1;
      dc++
    ) {
      if (
        dr === 0 &&
        dc === 0
      ) {
        continue;
      }

      const r =
        row + dr;

      const c =
        col + dc;

      if (
        r >= 0 &&
        r < config.rows &&
        c >= 0 &&
        c < config.cols
      ) {
        out.push(
          indexOf(r, c)
        );
      }
    }
  }

  return out;
}

/* =========================================================
   CREAR TABLERO
   ========================================================= */

function createEmptyBoard() {
  cells = Array.from(
    {
      length:
        config.rows *
        config.cols
    },
    (_, index) => ({
      index,
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
      element: null
    })
  );

  boardEl.innerHTML = "";

  boardEl.style.gridTemplateColumns =
    `repeat(${config.cols}, var(--cell))`;

  cells.forEach(cell => {
    const button =
      document.createElement(
        "button"
      );

    button.className =
      "cell";

    button.type =
      "button";

    button.dataset.index =
      cell.index;

    button.setAttribute(
      "role",
      "gridcell"
    );

    button.setAttribute(
      "aria-label",
      "Casilla oculta"
    );

    cell.element =
      button;

    boardEl.appendChild(
      button
    );
  });
}

/* =========================================================
   COLOCAR MINAS
   ========================================================= */

function placeMines(firstIndex) {
  const safe =
    new Set([
      firstIndex,
      ...neighbors(firstIndex)
    ]);

  const candidates =
    cells
      .map(c => c.index)
      .filter(
        i => !safe.has(i)
      );

  for (
    let i =
      candidates.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    [
      candidates[i],
      candidates[j]
    ] = [
      candidates[j],
      candidates[i]
    ];
  }

  candidates
    .slice(0, config.mines)
    .forEach(
      i =>
        cells[i].mine = true
    );

  cells.forEach(cell => {
    if (!cell.mine) {
      cell.adjacent =
        neighbors(
          cell.index
        ).filter(
          i =>
            cells[i].mine
        ).length;
    }
  });
}

/* =========================================================
   TEMPORIZADOR
   ========================================================= */

function startTimer() {
  if (timerId) {
    clearInterval(
      timerId
    );
  }

  timerId =
    setInterval(() => {
      if (gameOver) return;

      elapsed =
        Math.min(
          elapsed + 1,
          999
        );

      timerEl.textContent =
        pad(elapsed);
    }, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(
      timerId
    );
  }

  timerId = null;
}

/* =========================================================
   PRIMER MOVIMIENTO
   ========================================================= */

function firstMove(index) {
  placeMines(index);

  started = true;

  startTimer();

  statusText.textContent =
    "Partida en curso… no pises nada raro 💣";
}

/* =========================================================
   REVELAR CASILLA
   ========================================================= */

function reveal(index) {
  if (gameOver) return;

  const cell =
    cells[index];

  if (
    !cell ||
    cell.revealed ||
    cell.flagged
  ) {
    return;
  }

  if (!started) {
    firstMove(index);
  }

  if (cell.mine) {
    cell.revealed = true;

    cell.element.classList.add(
      "revealed",
      "mine-hit"
    );

    cell.element.textContent =
      "💣";

    /*
     * Primero mostramos la mina
     * y después lanzamos la explosión.
     */
    loseGame();

    return;
  }

  floodReveal(index);

  updateProgress();

  checkWin();
}

/* =========================================================
   REVELACIÓN EN CASCADA
   ========================================================= */

function floodReveal(startIndex) {
  const queue = [
    startIndex
  ];

  const visited =
    new Set();

  while (queue.length) {
    const index =
      queue.shift();

    if (
      visited.has(index)
    ) {
      continue;
    }

    visited.add(index);

    const cell =
      cells[index];

    if (
      !cell ||
      cell.revealed ||
      cell.flagged ||
      cell.mine
    ) {
      continue;
    }

    cell.revealed =
      true;

    revealedCount++;

    renderCell(cell);

    if (
      cell.adjacent === 0
    ) {
      neighbors(index)
        .forEach(n => {
          const next =
            cells[n];

          if (
            !next.revealed &&
            !next.mine &&
            !next.flagged
          ) {
            queue.push(n);
          }
        });
    }
  }
}

/* =========================================================
   RENDERIZAR CASILLA
   ========================================================= */

function renderCell(cell) {
  const el =
    cell.element;

  if (cell.revealed) {
    el.classList.add(
      "revealed"
    );

    el.classList.remove(
      "flagged"
    );

    if (cell.mine) {
      el.textContent =
        "💣";

      el.setAttribute(
        "aria-label",
        "Mina"
      );
    } else if (
      cell.adjacent > 0
    ) {
      el.textContent =
        cell.adjacent;

      el.dataset.num =
        cell.adjacent;

      el.setAttribute(
        "aria-label",
        `${cell.adjacent} minas cercanas`
      );
    } else {
      el.textContent =
        "";

      el.removeAttribute(
        "data-num"
      );

      el.setAttribute(
        "aria-label",
        "Casilla vacía"
      );
    }
  } else {
    el.classList.remove(
      "revealed"
    );

    if (cell.flagged) {
      el.classList.add(
        "flagged"
      );

      el.textContent =
        "🚩";

      el.setAttribute(
        "aria-label",
        "Bandera"
      );
    } else {
      el.classList.remove(
        "flagged"
      );

      el.textContent =
        "";

      el.setAttribute(
        "aria-label",
        "Casilla oculta"
      );
    }
  }
}

/* =========================================================
   BANDERAS
   ========================================================= */

function toggleFlag(index) {
  if (gameOver) return;

  const cell =
    cells[index];

  if (
    !cell ||
    cell.revealed
  ) {
    return;
  }

  cell.flagged =
    !cell.flagged;

  flags +=
    cell.flagged
      ? 1
      : -1;

  renderCell(cell);

  mineCounter.textContent =
    pad(
      config.mines -
      flags
    );
}

/* =========================================================
   CHORD / DOBLE CLICK
   ========================================================= */

function chord(index) {
  if (
    gameOver ||
    !started
  ) {
    return;
  }

  const cell =
    cells[index];

  if (
    !cell ||
    !cell.revealed ||
    cell.adjacent === 0
  ) {
    return;
  }

  const around =
    neighbors(index);

  const flaggedAround =
    around.filter(
      i =>
        cells[i].flagged
    ).length;

  if (
    flaggedAround !==
    cell.adjacent
  ) {
    return;
  }

  for (
    const i of around
  ) {
    const c =
      cells[i];

    if (
      !c.flagged &&
      !c.revealed
    ) {
      if (c.mine) {
        c.revealed =
          true;

        renderCell(c);

        c.element.classList.add(
          "mine-hit"
        );

        loseGame();

        return;
      }

      floodReveal(i);
    }
  }

  updateProgress();

  checkWin();
}

/* =========================================================
   PROGRESO
   ========================================================= */

function updateProgress() {
  const safeCells =
    config.rows *
    config.cols -
    config.mines;

  const pct =
    Math.round(
      (revealedCount /
        safeCells) *
        100
    );

  progressText.textContent =
    `${pct}%`;
}

/* =========================================================
   VICTORIA
   ========================================================= */

function checkWin() {
  const safeCells =
    config.rows *
    config.cols -
    config.mines;

  if (
    revealedCount ===
      safeCells &&
    !gameOver
  ) {
    winGame();
  }
}

/* =========================================================
   MOSTRAR TODAS LAS MINAS
   ========================================================= */

function revealAllMines() {
  cells.forEach(cell => {
    if (
      cell.mine &&
      !cell.flagged
    ) {
      cell.revealed =
        true;

      renderCell(cell);
    } else if (
      !cell.mine &&
      cell.flagged
    ) {
      cell.element.classList.add(
        "mine-wrong"
      );

      cell.element.textContent =
        "✕";
    }
  });
}

/* =========================================================
   PERDER
   ========================================================= */

function loseGame() {
  gameOver = true;

  stopTimer();

  faceBtn.textContent =
    "😵";

  statusText.textContent =
    "BOOM. Seba encontró una mina 💥";

  /*
   * Mostrar todas las minas.
   */
  revealAllMines();

  /*
   * EXPLOSIÓN
   */
  createExplosion();

  /*
   * Mostrar modal después
   * de iniciar el efecto.
   */
  setTimeout(() => {
    showModal(false);
  }, 350);
}

/* =========================================================
   GANAR
   ========================================================= */

function winGame() {
  gameOver = true;

  stopTimer();

  faceBtn.textContent =
    "😎";

  statusText.textContent =
    "¡Tablero limpio! Seba sobrevivió 😎";

  cells.forEach(cell => {
    if (
      cell.mine &&
      !cell.flagged
    ) {
      cell.flagged =
        true;

      renderCell(cell);
    }
  });

  flags =
    config.mines;

  mineCounter.textContent =
    "000";

  const key =
    `seba-minesweeper-best-${level}`;

  const previous =
    Number(
      localStorage.getItem(
        key
      ) || 0
    );

  const isRecord =
    !previous ||
    elapsed < previous;

  if (isRecord) {
    localStorage.setItem(
      key,
      String(elapsed)
    );
  }

  updateRecords();

  showModal(
    true,
    isRecord
  );
}

/* =========================================================
   MODAL
   ========================================================= */

function showModal(
  won,
  isRecord = false
) {
  document.getElementById(
    "modalIcon"
  ).textContent =
    won
      ? (
          isRecord
            ? "🏆"
            : "😎"
        )
      : "💥";

  document.getElementById(
    "modalTitle"
  ).textContent =
    won
      ? (
          isRecord
            ? "¡Nuevo récord!"
            : "¡Ganaste!"
        )
      : "¡BOOM!";

  document.getElementById(
    "modalText"
  ).textContent =
    won
      ? `Seba limpió el tablero en ${elapsed} segundos.${
          isRecord
            ? " Nuevo mejor tiempo guardado."
            : ""
        }`
      : "Una mina se interpuso en el camino. La revancha está a un botón.";

  modal.classList.add(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );
}

function hideModal() {
  modal.classList.remove(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}

/* =========================================================
   NUEVA PARTIDA
   ========================================================= */

function newGame() {
  stopTimer();

  config =
    LEVELS[level];

  started = false;

  gameOver = false;

  elapsed = 0;

  flags = 0;

  revealedCount = 0;

  timerEl.textContent =
    "000";

  mineCounter.textContent =
    pad(config.mines);

  progressText.textContent =
    "0%";

  faceBtn.textContent =
    "🙂";

  statusText.textContent =
    "Haz tu primera jugada, Seba 👀";

  hideModal();

  const explosion =
    document.getElementById(
      "explosionLayer"
    );

  if (explosion) {
    explosion.remove();
  }

  document.body.classList.remove(
    "explosion-shake"
  );

  createEmptyBoard();

  updateRecords();
}

/* =========================================================
   RÉCORDS
   ========================================================= */

function updateRecords() {
  const entries = [
    [
      "beginner",
      "recordBeginner"
    ],
    [
      "intermediate",
      "recordIntermediate"
    ],
    [
      "expert",
      "recordExpert"
    ]
  ];

  entries.forEach(
    ([key, id]) => {
      const value =
        Number(
          localStorage.getItem(
            `seba-minesweeper-best-${key}`
          ) || 0
        );

      document.getElementById(
        id
      ).textContent =
        value
          ? `${value}s`
          : "—";
    }
  );

  const current =
    Number(
      localStorage.getItem(
        `seba-minesweeper-best-${level}`
      ) || 0
    );

  bestTime.textContent =
    current
      ? `${current}s`
      : "—";

  bestLabel.textContent =
    LEVELS[level].label;
}

/* =========================================================
   EVENTOS DEL TABLERO
   ========================================================= */

boardEl.addEventListener(
  "click",
  event => {
    if (
      touchFlagTriggered
    ) {
      touchFlagTriggered =
        false;

      return;
    }

    const cell =
      event.target.closest(
        ".cell"
      );

    if (!cell) return;

    reveal(
      Number(
        cell.dataset.index
      )
    );
  }
);

boardEl.addEventListener(
  "contextmenu",
  event => {
    const cell =
      event.target.closest(
        ".cell"
      );

    if (!cell) return;

    event.preventDefault();

    toggleFlag(
      Number(
        cell.dataset.index
      )
    );
  }
);

boardEl.addEventListener(
  "dblclick",
  event => {
    const cell =
      event.target.closest(
        ".cell"
      );

    if (!cell) return;

    event.preventDefault();

    chord(
      Number(
        cell.dataset.index
      )
    );
  }
);

/* =========================================================
   CONTROLES TÁCTILES
   ========================================================= */

boardEl.addEventListener(
  "touchstart",
  event => {
    const cell =
      event.target.closest(
        ".cell"
      );

    if (!cell) return;

    touchFlagTriggered =
      false;

    longPressTimer =
      setTimeout(() => {
        touchFlagTriggered =
          true;

        toggleFlag(
          Number(
            cell.dataset.index
          )
        );

        if (
          navigator.vibrate
        ) {
          navigator.vibrate(
            25
          );
        }
      }, 520);
  },
  {
    passive: true
  }
);

[
  "touchend",
  "touchcancel",
  "touchmove"
].forEach(type => {
  boardEl.addEventListener(
    type,
    () => {
      if (
        longPressTimer
      ) {
        clearTimeout(
          longPressTimer
        );
      }

      longPressTimer =
        null;
    },
    {
      passive: true
    }
  );
});

/* =========================================================
   DIFICULTADES
   ========================================================= */

document
  .querySelectorAll(
    ".difficulty-btn"
  )
  .forEach(btn => {
    btn.addEventListener(
      "click",
      () => {
        level =
          btn.dataset.level;

        document
          .querySelectorAll(
            ".difficulty-btn"
          )
          .forEach(b =>
            b.classList.toggle(
              "active",
              b === btn
            )
          );

        newGame();
      }
    );
  });

/* =========================================================
   BOTONES
   ========================================================= */

document
  .getElementById(
    "newGameBtn"
  )
  .addEventListener(
    "click",
    newGame
  );

faceBtn.addEventListener(
  "click",
  newGame
);

document
  .getElementById(
    "playAgainBtn"
  )
  .addEventListener(
    "click",
    newGame
  );

document
  .getElementById(
    "closeModalBtn"
  )
  .addEventListener(
    "click",
    hideModal
  );

/* =========================================================
   BORRAR RÉCORDS
   ========================================================= */

document
  .getElementById(
    "clearRecordsBtn"
  )
  .addEventListener(
    "click",
    () => {
      [
        "beginner",
        "intermediate",
        "expert"
      ].forEach(key => {
        localStorage.removeItem(
          `seba-minesweeper-best-${key}`
        );
      });

      updateRecords();
    }
  );

/* =========================================================
   TEMA
   ========================================================= */

document
  .getElementById(
    "themeBtn"
  )
  .addEventListener(
    "click",
    () => {
      document.body.classList.toggle(
        "light"
      );

      const light =
        document.body.classList.contains(
          "light"
        );

      document.getElementById(
        "themeBtn"
      ).textContent =
        light
          ? "🌙"
          : "☀️";

      localStorage.setItem(
        "seba-minesweeper-theme",
        light
          ? "light"
          : "dark"
      );
    }
  );

/* =========================================================
   CARGAR TEMA GUARDADO
   ========================================================= */

if (
  localStorage.getItem(
    "seba-minesweeper-theme"
  ) === "light"
) {
  document.body.classList.add(
    "light"
  );

  document.getElementById(
    "themeBtn"
  ).textContent =
    "🌙";
}

/* =========================================================
   INICIAR JUEGO
   ========================================================= */

newGame();
