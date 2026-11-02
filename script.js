/**
 * ==========================================================================
 * TRIKI MASTER - LÓGICA PRINCIPAL DEL JUEGO
 * ==========================================================================
 */

// ==========================================================================
// 1. SISTEMA DE AUDIO (Web Audio API - Sin dependencias externas)
// ==========================================================================
class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('triki_sound_muted') === 'true';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('triki_sound_muted', this.muted);
    return !this.muted;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  playMark(symbol) {
    if (this.muted) return;
    if (symbol === 'X') {
      // Tono brillante agudo para X
      this.playTone(587.33, 'triangle', 0.12, 0.25); // Re5
      setTimeout(() => this.playTone(880, 'sine', 0.18, 0.2), 60); // La5
    } else {
      // Tono suave resonante para O
      this.playTone(392.00, 'sine', 0.14, 0.25); // Sol4
      setTimeout(() => this.playTone(523.25, 'triangle', 0.18, 0.2), 60); // Do5
    }
  }

  playWin() {
    if (this.muted) return;
    // Arpegio victorioso ascendente
    const notes = [523.25, 659.25, 783.99, 1046.50]; // Do5, Mi5, Sol5, Do6
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.playTone(note, 'triangle', 0.35, 0.3);
      }, i * 110);
    });
  }

  playTie() {
    if (this.muted) return;
    const notes = [440, 415.3, 392]; // La4, Sol#4, Sol4
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.playTone(note, 'sawtooth', 0.25, 0.15);
      }, i * 130);
    });
  }

  playClick() {
    this.playTone(800, 'sine', 0.05, 0.08);
  }
}

// ==========================================================================
// 2. SISTEMA DE CONFETI EN CANVAS
// ==========================================================================
class ConfettiManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animId = null;

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(count = 80) {
    const colors = ['#00f0ff', '#ff2a85', '#6366f1', '#f59e0b', '#10b981', '#ffffff'];
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 3;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 4 + Math.random() * 8;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 3,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        life: 0.985
      });
    }

    if (!this.animId) {
      this.loop();
    }
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // Gravedad
      p.vx *= 0.98; // Resistencia
      p.rotation += p.rotationSpeed;
      p.opacity *= p.life;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
      this.ctx.restore();

      if (p.opacity < 0.05 || p.y > this.canvas.height + 20) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.animId = null;
    }
  }

  clear() {
    this.particles = [];
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

// ==========================================================================
// 3. INTELIGENCIA ARTIFICIAL (IA con Minimax y niveles de dificultad)
// ==========================================================================
class AIPlayer {
  constructor(symbol = 'O') {
    this.symbol = symbol;
    this.opponent = symbol === 'X' ? 'O' : 'X';
  }

  getBestMove(board, difficulty = 'medium') {
    const availableMoves = this.getAvailableMoves(board);
    if (availableMoves.length === 0) return null;

    if (difficulty === 'easy') {
      // Movimiento 100% aleatorio
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    if (difficulty === 'medium') {
      // Si la IA puede ganar de inmediato, toma la victoria
      for (const move of availableMoves) {
        board[move] = this.symbol;
        if (this.checkWinner(board, this.symbol)) {
          board[move] = '';
          return move;
        }
        board[move] = '';
      }

      // Si el rival va a ganar en el siguiente turno, bloquea
      for (const move of availableMoves) {
        board[move] = this.opponent;
        if (this.checkWinner(board, this.opponent)) {
          board[move] = '';
          return move;
        }
        board[move] = '';
      }

      // 60% probabilidad de jugada óptima, 40% aleatoria
      if (Math.random() > 0.4) {
        return this.minimaxBestMove(board);
      } else {
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
      }
    }

    // Dificultad 'impossible' (Invencible con Minimax perfecto)
    return this.minimaxBestMove(board);
  }

  minimaxBestMove(board) {
    let bestScore = -Infinity;
    let bestMove = null;
    const availableMoves = this.getAvailableMoves(board);

    // Optimización: si el centro está disponible en los primeros turnos, tomarlo
    if (board[4] === '' && (availableMoves.length === 9 || availableMoves.length === 8)) {
      return 4;
    }

    for (const move of availableMoves) {
      board[move] = this.symbol;
      const score = this.minimax(board, 0, false, -Infinity, Infinity);
      board[move] = '';

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove !== null ? bestMove : availableMoves[0];
  }

  minimax(board, depth, isMaximizing, alpha, beta) {
    if (this.checkWinner(board, this.symbol)) return 10 - depth;
    if (this.checkWinner(board, this.opponent)) return depth - 10;
    if (this.getAvailableMoves(board).length === 0) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of this.getAvailableMoves(board)) {
        board[move] = this.symbol;
        const evaluation = this.minimax(board, depth + 1, false, alpha, beta);
        board[move] = '';
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Poda Alfa-Beta
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of this.getAvailableMoves(board)) {
        board[move] = this.opponent;
        const evaluation = this.minimax(board, depth + 1, true, alpha, beta);
        board[move] = '';
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Poda Alfa-Beta
      }
      return minEval;
    }
  }

  getAvailableMoves(board) {
    const moves = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i] === '') moves.push(i);
    }
    return moves;
  }

  checkWinner(board, mark) {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
      [0, 4, 8], [2, 4, 6]             // Diagonales
    ];
    return winPatterns.some(([a, b, c]) => 
      board[a] === mark && board[b] === mark && board[c] === mark
    );
  }
}

// ==========================================================================
// 4. CONTROLADOR PRINCIPAL DEL JUEGO (GameApp)
// ==========================================================================
class GameApp {
  constructor() {
    this.board = Array(9).fill('');
    this.currentPlayer = 'X';
    this.gameActive = true;
    this.history = []; // Pila de jugadas para 'Deshacer'
    this.gameMode = 'pvp'; // 'pvp' o 'ai'
    this.aiDifficulty = 'medium'; // 'easy', 'medium', 'impossible'
    this.isAiThinking = false;

    // Nombres y Puntuaciones
    this.scores = { X: 0, O: 0, ties: 0 };
    this.playerNames = {
      X: localStorage.getItem('triki_name_x') || 'Jugador 1',
      O: localStorage.getItem('triki_name_o') || 'Jugador 2'
    };

    // Combinaciones ganadoras
    this.winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    // Módulos auxiliares
    this.audio = new AudioManager();
    this.confetti = new ConfettiManager('confetti-canvas');
    this.ai = new AIPlayer('O');

    this.initDOM();
    this.loadState();
    this.bindEvents();
    this.render();
  }

  initDOM() {
    // Celdas del tablero
    this.cells = document.querySelectorAll('.cell');
    this.boardElem = document.getElementById('board');
    this.winningSvg = document.getElementById('winning-svg');
    this.winningLine = document.getElementById('winning-line');

    // UI Marcador e indicador de turno
    this.turnText = document.getElementById('current-player-text');
    this.turnBanner = document.getElementById('turn-banner');
    this.cardX = document.getElementById('card-x');
    this.cardO = document.getElementById('card-o');
    this.cardTies = document.getElementById('card-ties');
    this.scoreX = document.getElementById('score-x');
    this.scoreO = document.getElementById('score-o');
    this.scoreTies = document.getElementById('score-ties');
    this.nameXDisplay = document.getElementById('name-x-display');
    this.nameODisplay = document.getElementById('name-o-display');

    // Botones de acción
    this.undoBtn = document.getElementById('undo-btn');
    this.resetRoundBtn = document.getElementById('reset-round-btn');
    this.resetAllBtn = document.getElementById('reset-all-btn');

    // Modos y dificultad
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.aiDiffContainer = document.getElementById('ai-difficulty-container');
    this.diffBtns = document.querySelectorAll('.diff-btn');

    // Header controles
    this.soundBtn = document.getElementById('sound-btn');
    this.soundOnIcon = this.soundBtn.querySelector('.sound-on');
    this.soundOffIcon = this.soundBtn.querySelector('.sound-off');
    this.themeBtn = document.getElementById('theme-btn');
    this.settingsBtn = document.getElementById('settings-btn');

    // Modal Resultados
    this.resultModal = document.getElementById('result-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.modalSubtitle = document.getElementById('modal-subtitle');
    this.modalIcon = document.getElementById('modal-icon');
    this.modalPlayAgain = document.getElementById('modal-play-again');
    this.modalClose = document.getElementById('modal-close');

    // Modal Configuración
    this.settingsModal = document.getElementById('settings-modal');
    this.settingsForm = document.getElementById('settings-form');
    this.closeSettingsBtn = document.getElementById('close-settings');
    this.inputNameX = document.getElementById('input-name-x');
    this.inputNameO = document.getElementById('input-name-o');
    this.themeChoices = document.querySelectorAll('.theme-choice');
  }

  loadState() {
    // Cargar puntuaciones guardadas
    const savedScores = localStorage.getItem('triki_scores');
    if (savedScores) {
      try {
        this.scores = JSON.parse(savedScores);
      } catch (e) {
        console.error('Error parseando scores', e);
      }
    }

    // Cargar tema guardado
    const savedTheme = localStorage.getItem('triki_theme') || 'cyber';
    this.setTheme(savedTheme);

    // Cargar estado de sonido
    if (this.audio.muted) {
      this.soundOnIcon.classList.add('hidden');
      this.soundOffIcon.classList.remove('hidden');
    }

    this.inputNameX.value = this.playerNames.X;
    this.inputNameO.value = this.playerNames.O;
  }

  saveScores() {
    localStorage.setItem('triki_scores', JSON.stringify(this.scores));
  }

  bindEvents() {
    // Click en celdas
    this.cells.forEach(cell => {
      cell.addEventListener('click', (e) => {
        const index = parseInt(cell.getAttribute('data-index'), 10);
        this.handleCellClick(index);
      });
    });

    // Cambio de modo de juego (PvP o IA)
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.audio.playClick();
        const mode = btn.getAttribute('data-mode');
        this.setGameMode(mode);
      });
    });

    // Selector de dificultad IA
    this.diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.audio.playClick();
        this.diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.aiDifficulty = btn.getAttribute('data-diff');
        this.resetRound();
      });
    });

    // Botón Deshacer
    this.undoBtn.addEventListener('click', () => this.undoMove());

    // Reiniciar Ronda
    this.resetRoundBtn.addEventListener('click', () => {
      this.audio.playClick();
      this.resetRound();
    });

    // Reiniciar Marcadores
    this.resetAllBtn.addEventListener('click', () => {
      this.audio.playClick();
      if (confirm('¿Estás seguro de que deseas reiniciar todos los puntos a 0?')) {
        this.scores = { X: 0, O: 0, ties: 0 };
        this.saveScores();
        this.resetRound();
        this.renderScores();
      }
    });

    // Sonido toggle
    this.soundBtn.addEventListener('click', () => {
      const active = this.audio.toggleMute();
      if (active) {
        this.soundOnIcon.classList.remove('hidden');
        this.soundOffIcon.classList.add('hidden');
        this.audio.playClick();
      } else {
        this.soundOnIcon.classList.add('hidden');
        this.soundOffIcon.classList.remove('hidden');
      }
    });

    // Tema toggle cíclico desde el botón del header
    this.themeBtn.addEventListener('click', () => {
      this.audio.playClick();
      const themes = ['cyber', 'light', 'arcade'];
      const current = document.documentElement.getAttribute('data-theme') || 'cyber';
      const nextTheme = themes[(themes.indexOf(current) + 1) % themes.length];
      this.setTheme(nextTheme);
    });

    // Botón de Configuración
    this.settingsBtn.addEventListener('click', () => {
      this.audio.playClick();
      this.openSettingsModal();
    });

    this.closeSettingsBtn.addEventListener('click', () => {
      this.closeSettingsModal();
    });

    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettingsModal();
    });

    // Selección de tema dentro de configuración
    this.themeChoices.forEach(choice => {
      choice.addEventListener('click', () => {
        this.audio.playClick();
        const themeVal = choice.getAttribute('data-theme-val');
        this.setTheme(themeVal);
      });
    });

    // Guardar formulario de configuración
    this.settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.audio.playClick();
      const valX = this.inputNameX.value.trim() || 'Jugador 1';
      const valO = this.inputNameO.value.trim() || 'Jugador 2';

      this.playerNames.X = valX;
      this.playerNames.O = valO;
      localStorage.setItem('triki_name_x', valX);
      localStorage.setItem('triki_name_o', valO);

      this.closeSettingsModal();
      this.render();
    });

    // Modal Fin de Partida
    this.modalPlayAgain.addEventListener('click', () => {
      this.audio.playClick();
      this.closeResultModal();
      this.resetRound();
    });

    this.modalClose.addEventListener('click', () => {
      this.audio.playClick();
      this.closeResultModal();
    });

    this.resultModal.addEventListener('click', (e) => {
      if (e.target === this.resultModal) this.closeResultModal();
    });

    // Atajos de teclado (1-9 para jugar en el teclado numérico o fila de números)
    window.addEventListener('keydown', (e) => {
      if (this.resultModal.classList.contains('hidden') && this.settingsModal.classList.contains('hidden')) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          // Teclado numérico 1-9: map standard phone/numpad layout
          this.handleCellClick(num - 1);
        } else if (e.key === 'r' || e.key === 'R') {
          this.resetRound();
        } else if (e.key === 'z' || e.key === 'Z') {
          this.undoMove();
        }
      }
    });
  }

  setGameMode(mode) {
    if (this.gameMode === mode) return;
    this.gameMode = mode;

    this.tabBtns.forEach(btn => {
      if (btn.getAttribute('data-mode') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (mode === 'ai') {
      this.aiDiffContainer.classList.remove('hidden');
      this.nameODisplay.textContent = `IA (${this.getDifficultyLabel()})`;
    } else {
      this.aiDiffContainer.classList.add('hidden');
      this.nameODisplay.textContent = this.playerNames.O;
    }

    this.resetRound();
  }

  getDifficultyLabel() {
    switch (this.aiDifficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Medio';
      case 'impossible': return 'Invencible';
      default: return 'IA';
    }
  }

  setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('triki_theme', themeName);

    this.themeChoices.forEach(choice => {
      if (choice.getAttribute('data-theme-val') === themeName) {
        choice.classList.add('active');
      } else {
        choice.classList.remove('active');
      }
    });
  }

  handleCellClick(index) {
    if (!this.gameActive || this.board[index] !== '' || this.isAiThinking) {
      return;
    }

    this.makeMove(index, this.currentPlayer);

    if (this.gameActive && this.gameMode === 'ai' && this.currentPlayer === 'O') {
      this.triggerAiTurn();
    }
  }

  makeMove(index, player) {
    this.board[index] = player;
    this.history.push({ index, player });
    this.audio.playMark(player);

    const cell = this.cells[index];
    cell.textContent = player;
    cell.classList.add(player.toLowerCase(), 'cell-mark-anim');

    // Comprobar ganador o empate
    const winResult = this.checkWin(this.board, player);

    if (winResult) {
      this.handleWin(player, winResult.pattern);
    } else if (this.isBoardFull()) {
      this.handleTie();
    } else {
      // Cambiar turno
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
      this.updateTurnDisplay();
    }

    this.updateUndoButton();
  }

  triggerAiTurn() {
    this.isAiThinking = true;
    this.turnText.textContent = 'IA Pensando...';
    this.turnText.className = 'turn-symbol o';

    // Pequeño retardo natural de pensamiento (300ms a 450ms)
    setTimeout(() => {
      if (!this.gameActive) {
        this.isAiThinking = false;
        return;
      }

      const move = this.ai.getBestMove([...this.board], this.aiDifficulty);
      this.isAiThinking = false;

      if (move !== null && this.board[move] === '') {
        this.makeMove(move, 'O');
      }
    }, 380);
  }

  undoMove() {
    if (this.history.length === 0 || !this.gameActive || this.isAiThinking) return;

    this.audio.playClick();

    if (this.gameMode === 'ai') {
      // En modo IA, deshacemos 2 jugadas (la de la IA y la del jugador)
      if (this.history.length >= 2) {
        const lastMove = this.history.pop();
        const prevMove = this.history.pop();
        this.clearCellState(lastMove.index);
        this.clearCellState(prevMove.index);
        this.currentPlayer = 'X';
      } else if (this.history.length === 1) {
        const move = this.history.pop();
        this.clearCellState(move.index);
        this.currentPlayer = 'X';
      }
    } else {
      // En 2 Jugadores, deshace 1 jugada
      const lastMove = this.history.pop();
      this.clearCellState(lastMove.index);
      this.currentPlayer = lastMove.player;
    }

    this.updateTurnDisplay();
    this.updateUndoButton();
  }

  clearCellState(index) {
    this.board[index] = '';
    const cell = this.cells[index];
    cell.textContent = '';
    cell.classList.remove('x', 'o', 'cell-mark-anim', 'winner');
  }

  checkWin(board, player) {
    for (const pattern of this.winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] === player && board[b] === player && board[c] === player) {
        return { winner: player, pattern };
      }
    }
    return null;
  }

  isBoardFull() {
    return this.board.every(cell => cell !== '');
  }

  handleWin(winner, pattern) {
    this.gameActive = false;
    this.scores[winner]++;
    this.saveScores();
    this.renderScores();

    // Resaltar casillas ganadoras
    pattern.forEach(i => {
      this.cells[i].classList.add('winner');
    });

    // Dibujar línea animada
    this.drawWinningLine(pattern, winner);

    // Efectos de celebración
    this.audio.playWin();
    this.confetti.burst(100);

    const winnerName = winner === 'X' 
      ? this.playerNames.X 
      : (this.gameMode === 'ai' ? `IA (${this.getDifficultyLabel()})` : this.playerNames.O);

    setTimeout(() => {
      this.showResultModal(
        '🏆',
        `¡Ganó ${winnerName}!`,
        winner === 'X' ? '¡Gran estrategia!' : (this.gameMode === 'ai' ? '¡La IA dominó el tablero!' : '¡Excelente partida!')
      );
    }, 700);
  }

  handleTie() {
    this.gameActive = false;
    this.scores.ties++;
    this.saveScores();
    this.renderScores();

    this.audio.playTie();

    setTimeout(() => {
      this.showResultModal(
        '⚖️',
        '¡Empate!',
        'Ningún jugador cedió terreno en esta batalla.'
      );
    }, 400);
  }

  drawWinningLine(pattern, winner) {
    const firstCell = this.cells[pattern[0]];
    const lastCell = this.cells[pattern[2]];

    const boardRect = this.boardElem.getBoundingClientRect();
    const firstRect = firstCell.getBoundingClientRect();
    const lastRect = lastCell.getBoundingClientRect();

    // Centros relativos al elemento SVG del tablero
    const x1 = firstRect.left - boardRect.left + firstRect.width / 2;
    const y1 = firstRect.top - boardRect.top + firstRect.height / 2;
    const x2 = lastRect.left - boardRect.left + lastRect.width / 2;
    const y2 = lastRect.top - boardRect.top + lastRect.height / 2;

    this.winningSvg.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
    this.winningLine.setAttribute('x1', x1);
    this.winningLine.setAttribute('y1', y1);
    this.winningLine.setAttribute('x2', x2);
    this.winningLine.setAttribute('y2', y2);

    // Color del ganador
    const themeStyle = getComputedStyle(document.documentElement);
    const strokeColor = winner === 'X' 
      ? themeStyle.getPropertyValue('--color-x').trim() 
      : themeStyle.getPropertyValue('--color-o').trim();

    this.winningLine.setAttribute('stroke', strokeColor);
    
    // Reiniciar animación del trazado SVG
    this.winningLine.style.animation = 'none';
    void this.winningLine.offsetHeight; // Forzar reflow
    this.winningLine.style.animation = '';

    this.winningSvg.classList.add('visible');
  }

  hideWinningLine() {
    this.winningSvg.classList.remove('visible');
    this.winningLine.setAttribute('x1', 0);
    this.winningLine.setAttribute('y1', 0);
    this.winningLine.setAttribute('x2', 0);
    this.winningLine.setAttribute('y2', 0);
  }

  resetRound() {
    this.board = Array(9).fill('');
    this.currentPlayer = 'X';
    this.gameActive = true;
    this.isAiThinking = false;
    this.history = [];

    this.hideWinningLine();
    this.confetti.clear();

    this.cells.forEach(cell => {
      cell.textContent = '';
      cell.classList.remove('x', 'o', 'cell-mark-anim', 'winner');
    });

    this.updateTurnDisplay();
    this.updateUndoButton();
  }

  updateTurnDisplay() {
    const name = this.currentPlayer === 'X'
      ? this.playerNames.X
      : (this.gameMode === 'ai' ? `IA (${this.getDifficultyLabel()})` : this.playerNames.O);

    this.turnText.textContent = `${name} (${this.currentPlayer})`;
    this.turnText.className = `turn-symbol ${this.currentPlayer.toLowerCase()}`;

    // Highlight en las tarjetas de marcador
    if (this.currentPlayer === 'X') {
      this.cardX.classList.add('active-turn');
      this.cardO.classList.remove('active-turn');
    } else {
      this.cardO.classList.add('active-turn');
      this.cardX.classList.remove('active-turn');
    }
  }

  updateUndoButton() {
    this.undoBtn.disabled = this.history.length === 0 || !this.gameActive;
  }

  renderScores() {
    this.scoreX.textContent = this.scores.X;
    this.scoreO.textContent = this.scores.O;
    this.scoreTies.textContent = this.scores.ties;
  }

  renderNames() {
    this.nameXDisplay.textContent = this.playerNames.X;
    if (this.gameMode === 'ai') {
      this.nameODisplay.textContent = `IA (${this.getDifficultyLabel()})`;
    } else {
      this.nameODisplay.textContent = this.playerNames.O;
    }
  }

  render() {
    this.renderScores();
    this.renderNames();
    this.updateTurnDisplay();
    this.updateUndoButton();
  }

  showResultModal(icon, title, subtitle) {
    this.modalIcon.textContent = icon;
    this.modalTitle.textContent = title;
    this.modalSubtitle.textContent = subtitle;
    this.resultModal.classList.remove('hidden');
  }

  closeResultModal() {
    this.resultModal.classList.add('hidden');
  }

  openSettingsModal() {
    this.inputNameX.value = this.playerNames.X;
    this.inputNameO.value = this.playerNames.O;
    this.settingsModal.classList.remove('hidden');
  }

  closeSettingsModal() {
    this.settingsModal.classList.add('hidden');
  }
}

// ==========================================================================
// 5. GESTOR DE APLICACIÓN WEB INSTALABLE (PWA MANAGER)
// ==========================================================================
class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.installBtn = document.getElementById('pwa-install-btn');
    this.iosModal = document.getElementById('ios-install-modal');
    this.closeIosBtn = document.getElementById('close-ios-modal');

    this.init();
  }

  init() {
    // 1. Registrar Service Worker para soporte offline
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('Service Worker registrado con éxito:', reg.scope))
          .catch((err) => console.warn('Fallo registro Service Worker:', err));
      });
    }

    // 2. Comprobar si ya está instalada o abierta en modo standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      return; // Ya está instalada, no mostrar botón
    }

    // 3. Capturar evento de instalación en Android / Chrome / Edge
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (this.installBtn) {
        this.installBtn.classList.remove('hidden');
      }
    });

    // 4. Si es iOS (Safari), mostrar el botón para enseñar cómo añadir a inicio
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !isStandalone && this.installBtn) {
      this.installBtn.classList.remove('hidden');
    }

    // 5. Manejar click en botón instalar
    if (this.installBtn) {
      this.installBtn.addEventListener('click', () => {
        if (this.deferredPrompt) {
          this.deferredPrompt.prompt();
          this.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              this.installBtn.classList.add('hidden');
            }
            this.deferredPrompt = null;
          });
        } else if (isIOS) {
          if (this.iosModal) this.iosModal.classList.remove('hidden');
        } else {
          alert('Para instalar esta app en tu celular, pulsa en el menú de 3 puntos de tu navegador y elige "Instalar aplicación" o "Agregar a la pantalla principal".');
        }
      });
    }

    // 6. Cerrar modal iOS
    if (this.closeIosBtn && this.iosModal) {
      this.closeIosBtn.addEventListener('click', () => {
        this.iosModal.classList.add('hidden');
      });
      this.iosModal.addEventListener('click', (e) => {
        if (e.target === this.iosModal) this.iosModal.classList.add('hidden');
      });
    }

    // 7. Evento cuando la app termina de instalarse
    window.addEventListener('appinstalled', () => {
      if (this.installBtn) this.installBtn.classList.add('hidden');
    });
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.trikiApp = new GameApp();
  window.pwaManager = new PWAManager();
});
