// ─── Stage definitions ────────────────────────────────────────────────────────
// Grid and word paths are generated fresh on every stage load.
const STAGES = [
    {
        title: "Nhlanhla's Tool Hunt",
        kicker: 'Stage 1 of 3 — Tools of the Trade',
        words: ['ARTISAN', 'HAMMER', 'QUNU', 'LIGHT', 'TOOLBOX']
    },
    {
        title: "Dreamer's Journey",
        kicker: 'Stage 2 of 3 — Stories Come Alive',
        words: ['DREAM', 'GOGO', 'NATHI', 'CART', 'RACE']
    },
    {
        title: 'Qunu Spirit',
        kicker: 'Stage 3 of 3 — Village & Beyond',
        words: ['RIVER', 'STALL', 'WHEEL', 'PAINT', 'EWASA']
    }
];

// ─── Puzzle generator ─────────────────────────────────────────────────────────
const GRID_SIZE = 10;
// All 8 directions: right, left, down, up, and the four diagonals
const DIRECTIONS = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
];
const FILL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generatePuzzle(words, _attempt) {
    const attempt = (_attempt || 0) + 1;
    if (attempt > 10) {
        throw new Error('generatePuzzle: exceeded max retries');
    }

    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    const paths = {};

    for (const word of words) {
        let placed = false;
        let tries = 0;
        while (!placed && tries < 300) {
            tries++;
            const [dr, dc] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

            // Compute valid start-cell range so every letter stays inside the grid
            const rowMin = dr < 0 ? word.length - 1 : 0;
            const rowMax = dr > 0 ? GRID_SIZE - word.length : GRID_SIZE - 1;
            const colMin = dc < 0 ? word.length - 1 : 0;
            const colMax = dc > 0 ? GRID_SIZE - word.length : GRID_SIZE - 1;

            if (rowMin > rowMax || colMin > colMax) {
                continue;
            }

            const startRow = rowMin + Math.floor(Math.random() * (rowMax - rowMin + 1));
            const startCol = colMin + Math.floor(Math.random() * (colMax - colMin + 1));

            // Check no conflicting letters already occupy these cells
            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
                const r = startRow + i * dr;
                const c = startCol + i * dc;
                if (grid[r][c] !== null && grid[r][c] !== word[i]) {
                    canPlace = false;
                    break;
                }
            }
            if (!canPlace) {
                continue;
            }

            // Commit placement and record the path
            const path = [];
            for (let i = 0; i < word.length; i++) {
                const r = startRow + i * dr;
                const c = startCol + i * dc;
                grid[r][c] = word[i];
                path.push(`${r}-${c}`);
            }
            paths[word] = path;
            placed = true;
        }

        if (!placed) {
            // Restart with a fresh grid (very rare on 10×10 with 5 short words)
            return generatePuzzle(words, attempt);
        }
    }

    // Fill every remaining cell with a random letter
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === null) {
                grid[r][c] = FILL_LETTERS[Math.floor(Math.random() * FILL_LETTERS.length)];
            }
        }
    }

    return { grid, paths };
}

const ROUND_DURATION_SECONDS = 90;
const POINTS_PER_WORD = 100;

// ─── Mutable state ────────────────────────────────────────────────────────────
let currentStageIndex = 0;
let activePuzzle = null;   // generated fresh on each loadStage()
let totalScore = 0;        // carries across stages
let currentScore = 0;      // score earned in the current stage only
let secondsRemaining = ROUND_DURATION_SECONDS;
let timerId = null;
let gameActive = true;
let currentSelection = [];
let pointerIsDown = false;
const foundWords = new Set();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCurrentStage() {
    return STAGES[currentStageIndex];
}

function getCellKey(row, col) {
    return `${row}-${col}`;
}

function setGameStatus(message) {
    const el = document.getElementById('gameStatus');
    if (el) {
        el.textContent = message;
    }
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function updateHud() {
    const stage = getCurrentStage();
    const scoreEl = document.getElementById('scoreValue');
    const wordsEl = document.getElementById('wordsFoundValue');
    const timerEl = document.getElementById('timerValue');
    const stageEl = document.getElementById('stageValue');

    if (scoreEl) {
        scoreEl.textContent = String(totalScore + currentScore);
    }
    if (wordsEl) {
        wordsEl.textContent = `${foundWords.size} / ${stage.words.length}`;
    }
    if (timerEl) {
        timerEl.textContent = `${secondsRemaining}s`;
        if (timerEl.parentElement) {
            timerEl.parentElement.classList.toggle('is-warning', secondsRemaining <= 15 && gameActive);
        }
    }
    if (stageEl) {
        stageEl.textContent = `${currentStageIndex + 1} / ${STAGES.length}`;
    }
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function stopTimer() {
    if (timerId) {
        window.clearInterval(timerId);
        timerId = null;
    }
}

function startTimer() {
    stopTimer();
    timerId = window.setInterval(() => {
        if (!gameActive) {
            return;
        }
        secondsRemaining -= 1;
        updateHud();
        if (secondsRemaining > 0) {
            return;
        }
        stopTimer();
        setGameEnabled(false);
        clearActiveSelection();
        setGameStatus('Time is up. Reset the puzzle to try again.');
    }, 1000);
}

// ─── Grid enable / disable ────────────────────────────────────────────────────
function setGameEnabled(enabled) {
    gameActive = enabled;
    const grid = document.getElementById('word-search-grid');
    if (grid) {
        grid.classList.toggle('is-disabled', !enabled);
    }
}

// ─── Popup ────────────────────────────────────────────────────────────────────
function hideWinPopup() {
    const popup = document.getElementById('winPopup');
    if (popup) {
        popup.classList.add('hidden');
    }
}

function showWinPopup(isLastStage) {
    const popup = document.getElementById('winPopup');
    const kicker = document.getElementById('winPopupKicker');
    const title = document.getElementById('winPopupTitle');
    const summary = document.getElementById('winPopupSummary');
    const nextBtn = document.getElementById('nextStageBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const grandTotal = totalScore + currentScore;

    if (isLastStage) {
        if (kicker) { kicker.textContent = 'All Stages Complete!'; }
        if (title) { title.textContent = 'You finished every puzzle!'; }
        if (summary) {
            summary.textContent = `Amazing work! Grand total: ${grandTotal} points across all ${STAGES.length} stages.`;
        }
        if (nextBtn) { nextBtn.classList.add('hidden'); }
        if (playAgainBtn) { playAgainBtn.textContent = 'Play Again from Stage 1'; }
    } else {
        if (kicker) { kicker.textContent = `Stage ${currentStageIndex + 1} of ${STAGES.length} Complete!`; }
        if (title) { title.textContent = 'Great job — keep going!'; }
        if (summary) {
            summary.textContent = `Stage score: ${currentScore} pts with ${secondsRemaining}s left. Total so far: ${grandTotal}.`;
        }
        if (nextBtn) { nextBtn.classList.remove('hidden'); }
        if (playAgainBtn) { playAgainBtn.textContent = 'Restart from Stage 1'; }
    }

    if (popup) {
        popup.classList.remove('hidden');
    }
}

// ─── Selection logic ──────────────────────────────────────────────────────────
function clearActiveSelection() {
    document.querySelectorAll('.grid-cell.is-active').forEach(cell => {
        cell.classList.remove('is-active');
    });
    currentSelection = [];
}

function addCellToSelection(cell) {
    if (!gameActive) {
        return;
    }
    const key = cell.dataset.key;
    if (!key || currentSelection.includes(key) || cell.classList.contains('is-found')) {
        return;
    }
    currentSelection.push(key);
    cell.classList.add('is-active');
}

function normalizeSelection(sel) {
    return sel.join('|');
}

function checkSelection() {
    const stage = getCurrentStage();
    const norm = normalizeSelection(currentSelection);
    const rev = normalizeSelection([...currentSelection].reverse());

    const matched = stage.words.find(word => {
        const path = normalizeSelection(activePuzzle.paths[word]);
        return path === norm || path === rev;
    });

    if (!matched || foundWords.has(matched)) {
        clearActiveSelection();
        setGameStatus('Keep going. Try another line of letters.');
        return;
    }

    foundWords.add(matched);
    currentScore += POINTS_PER_WORD + secondsRemaining;

    activePuzzle.paths[matched].forEach(key => {
        const cell = document.querySelector(`[data-key="${key}"]`);
        if (cell) {
            cell.classList.remove('is-active');
            cell.classList.add('is-found');
        }
    });

    const listItem = document.querySelector(`[data-word="${matched}"]`);
    if (listItem) {
        listItem.classList.add('found');
    }

    currentSelection = [];
    updateHud();

    if (foundWords.size === stage.words.length) {
        stopTimer();
        setGameEnabled(false);
        const isLast = currentStageIndex === STAGES.length - 1;
        setGameStatus(isLast
            ? 'You completed every stage. Incredible!'
            : `Stage ${currentStageIndex + 1} cleared! Prepare for the next challenge.`
        );
        showWinPopup(isLast);
        return;
    }

    setGameStatus(`Nice find: ${matched}. ${stage.words.length - foundWords.size} words left.`);
}

// ─── Pointer handlers ─────────────────────────────────────────────────────────
function handlePointerStart(cell) {
    if (!gameActive) {
        return;
    }
    pointerIsDown = true;
    clearActiveSelection();
    addCellToSelection(cell);
}

function handlePointerEnter(cell) {
    if (!pointerIsDown || !gameActive) {
        return;
    }
    addCellToSelection(cell);
}

function handlePointerMove(event) {
    if (!pointerIsDown || !gameActive) {
        return;
    }
    const el = document.elementFromPoint(event.clientX, event.clientY);
    const cell = el ? el.closest('.grid-cell') : null;
    if (cell) {
        addCellToSelection(cell);
    }
}

function finishSelection() {
    if (!pointerIsDown) {
        return;
    }
    pointerIsDown = false;
    if (!currentSelection.length || !gameActive) {
        clearActiveSelection();
        return;
    }
    checkSelection();
}

// ─── Rendering ────────────────────────────────────────────────────────────────
function renderWordSearchGrid() {
    const grid = document.getElementById('word-search-grid');
    if (!grid) {
        return;
    }
    grid.innerHTML = '';
    activePuzzle.grid.forEach((rowLetters, rowIndex) => {
        rowLetters.forEach((letter, colIndex) => {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'grid-cell';
            cell.textContent = letter;
            cell.dataset.key = getCellKey(rowIndex, colIndex);
            cell.addEventListener('pointerdown', () => handlePointerStart(cell));
            cell.addEventListener('pointerenter', () => handlePointerEnter(cell));
            grid.appendChild(cell);
        });
    });
}

function renderWordList() {
    const stage = getCurrentStage();
    const list = document.getElementById('list');
    if (!list) {
        return;
    }
    list.innerHTML = stage.words
        .map(w => `<li data-word="${w}">${w}</li>`)
        .join('');
}

function updateStageTitle() {
    const stage = getCurrentStage();
    const h1 = document.querySelector('.word-search-page h1');
    const kicker = document.querySelector('.game-kicker');
    if (h1) { h1.textContent = stage.title; }
    if (kicker) { kicker.textContent = stage.kicker; }
}

// ─── Stage lifecycle ──────────────────────────────────────────────────────────
function loadStage(index) {
    const stage = STAGES[index];
    currentStageIndex = index;
    foundWords.clear();
    currentSelection = [];
    pointerIsDown = false;
    currentScore = 0;
    secondsRemaining = ROUND_DURATION_SECONDS;

    activePuzzle = generatePuzzle(stage.words);
    hideWinPopup();
    renderWordSearchGrid();
    renderWordList();
    updateStageTitle();
    setGameEnabled(true);
    updateHud();
    startTimer();
    setGameStatus(`Find all ${stage.words.length} words before the timer runs out.`);
}

function advanceToNextStage() {
    totalScore += currentScore;
    loadStage(currentStageIndex + 1);
}

function resetPuzzle() {
    totalScore = 0;
    loadStage(0);
}

function initDreamMatcher() {
    const root = document.querySelector('.match-game');
    if (!root) {
        return;
    }

    const dragContainer = document.getElementById('matcherDragContainer');
    const dropContainer = document.getElementById('matcherDropContainer');
    const status = document.getElementById('matcherStatus');
    const stageValue = document.getElementById('matcherStageValue');
    const nextStageButton = document.getElementById('nextMatcherStage');
    const resetButton = document.getElementById('resetMatcher');

    if (!dragContainer || !dropContainer) {
        return;
    }

    const MATCHER_STAGE_BANK = [
        {
            name: 'Starter Dreams',
            pairs: [
                { id: 'nhlanhla', label: 'Nhlanhla', dream: 'Wants to build big things (Artisan)' },
                { id: 'bongani', label: 'Bongani', dream: 'Wants to be a Policeman' }
            ]
        },
        {
            name: 'Village Helpers',
            pairs: [
                { id: 'gogo', label: 'Gogo', dream: 'Sells vegetables at the station' },
                { id: 'tatufaku', label: 'Tatu Faku', dream: 'An artisan who fixes and builds in the village' }
            ]
        },
        {
            name: 'Race Day Heroes',
            pairs: [
                { id: 'nathi', label: 'Nathi', dream: 'Helped Nhlanhla build her cart' },
                { id: 'mrpretorius', label: 'Mr. Pretorius', dream: 'The school headmaster who announced the race' }
            ]
        },
        {
            name: 'Story Moments',
            pairs: [
                { id: 'nhlanhla2', label: 'Nhlanhla', dream: 'Won the cart race and a shiny red toolbox' },
                { id: 'bongani2', label: 'Bongani', dream: 'Helps count the shiny orange carrots' }
            ]
        }
    ];

    const MATCHER_STAGE_COUNT = 3;
    let selectedStages = [];
    let currentMatcherStageIndex = 0;

    let selectedItemId = null;
    let matchedCount = 0;
    let items = [];
    let zones = [];

    function randomize(array) {
        const copy = [...array];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function getCurrentMatcherStage() {
        return selectedStages[currentMatcherStageIndex];
    }

    function setStatus(message) {
        if (status) {
            status.textContent = message;
        }
    }

    function clearSelectedItem() {
        items.forEach(item => item.classList.remove('is-selected'));
        selectedItemId = null;
    }

    function updateMatcherHud() {
        if (stageValue) {
            stageValue.textContent = `${currentMatcherStageIndex + 1} / ${selectedStages.length}`;
        }
    }

    function flashWrongZone(zone) {
        zone.classList.add('is-wrong');
        window.setTimeout(() => zone.classList.remove('is-wrong'), 220);
    }

    function handleMatchDrop(zone, itemId) {
        if (zone.classList.contains('correct')) {
            return;
        }

        const matchId = zone.getAttribute('data-match');
        if (itemId !== matchId) {
            flashWrongZone(zone);
            setStatus('Not quite. Try a different dream card.');
            return;
        }

        const item = document.getElementById(itemId);
        if (!item || item.classList.contains('is-matched')) {
            return;
        }

        zone.classList.add('correct');
        zone.textContent = `Correct! ${item.textContent}`;
        item.classList.add('is-matched');
        clearSelectedItem();
        matchedCount += 1;

        if (matchedCount === items.length) {
            if (currentMatcherStageIndex === selectedStages.length - 1) {
                setStatus('Amazing. You completed every Dream Matcher stage!');
                if (nextStageButton) {
                    nextStageButton.classList.add('hidden');
                }
            } else {
                setStatus('Stage cleared. Tap Next Matcher Stage to continue.');
                if (nextStageButton) {
                    nextStageButton.classList.remove('hidden');
                }
            }
            return;
        }

        setStatus('Nice match. Keep going.');
    }

    function bindMatcherInteractions() {
        items.forEach(item => {
            item.addEventListener('dragstart', event => {
                if (item.classList.contains('is-matched')) {
                    event.preventDefault();
                    return;
                }
                event.dataTransfer.setData('text/plain', item.id);
                event.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('click', () => {
                if (item.classList.contains('is-matched')) {
                    return;
                }
                if (selectedItemId === item.id) {
                    clearSelectedItem();
                    setStatus('Selection cleared. Pick a character to match.');
                    return;
                }
                clearSelectedItem();
                selectedItemId = item.id;
                item.classList.add('is-selected');
                setStatus(`Selected ${item.textContent}. Tap a dream card to match.`);
            });
        });

        zones.forEach(zone => {
            zone.addEventListener('dragover', event => {
                event.preventDefault();
                zone.classList.add('is-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('is-over');
            });

            zone.addEventListener('drop', event => {
                event.preventDefault();
                zone.classList.remove('is-over');
                const itemId = event.dataTransfer.getData('text/plain');
                if (!itemId) {
                    return;
                }
                handleMatchDrop(zone, itemId);
            });

            zone.addEventListener('click', () => {
                if (!selectedItemId) {
                    return;
                }
                handleMatchDrop(zone, selectedItemId);
            });
        });
    }

    function renderMatcherStage() {
        const stage = getCurrentMatcherStage();
        const shuffledPairs = randomize(stage.pairs);
        const shuffledDreams = randomize(stage.pairs);

        dragContainer.innerHTML = shuffledPairs
            .map(pair => `<div class="item" draggable="true" id="matcher-${pair.id}">${pair.label}</div>`)
            .join('');

        dropContainer.innerHTML = shuffledDreams
            .map(pair => `<div class="drop-zone" data-match="matcher-${pair.id}" data-label="${pair.dream}">${pair.dream}</div>`)
            .join('');

        items = Array.from(root.querySelectorAll('.item'));
        zones = Array.from(root.querySelectorAll('.drop-zone'));
        matchedCount = 0;
        clearSelectedItem();
        bindMatcherInteractions();
        updateMatcherHud();
        if (nextStageButton) {
            nextStageButton.classList.add('hidden');
        }
        setStatus(`Stage ${currentMatcherStageIndex + 1}: Match all dreams in ${stage.name}.`);
    }

    function startNewMatcherRun() {
        selectedStages = randomize(MATCHER_STAGE_BANK).slice(0, MATCHER_STAGE_COUNT);
        currentMatcherStageIndex = 0;
        renderMatcherStage();
    }

    function advanceMatcherStage() {
        if (currentMatcherStageIndex >= selectedStages.length - 1) {
            return;
        }
        currentMatcherStageIndex += 1;
        renderMatcherStage();
    }

    function resetMatcher() {
        startNewMatcherRun();
        setStatus('New randomized run started. Match every stage.');
    }

    if (nextStageButton) {
        nextStageButton.addEventListener('click', advanceMatcherStage);
    }

    if (resetButton) {
        resetButton.addEventListener('click', resetMatcher);
    }

    startNewMatcherRun();
}

function initRecycleBuildGame() {
    const root = document.querySelector('.recycle-game');
    if (!root) {
        return;
    }

    const materialsGrid = document.getElementById('materialsGrid');
    const prompt = document.getElementById('recyclePrompt');
    const stageValue = document.getElementById('recycleStageValue');
    const nextStageButton = document.getElementById('nextRecycleStage');
    const checkButton = document.getElementById('checkBuild');
    const resetButton = document.getElementById('resetBuild');
    const feedback = document.getElementById('buildFeedback');

    if (!materialsGrid || !checkButton || !resetButton || !feedback) {
        return;
    }

    const RECYCLE_STAGE_BANK = [
        {
            name: 'Cart Builder Basics',
            prompt: 'Nhlanhla built her cart using recycled items. Click the 4 items she used!',
            targetCorrect: 4,
            materials: [
                { label: 'Old Wood Planks', correct: true },
                { label: 'Shiny Gold Bars', correct: false },
                { label: 'Plastic Wheels', correct: true },
                { label: 'Steering Rope', correct: true },
                { label: 'New Motor Engine', correct: false },
                { label: 'Discarded Nails', correct: true }
            ]
        },
        {
            name: 'Tatu Faku\'s Table',
            prompt: 'Tatu Faku builds strong tables for families. Pick the 4 recycled items he would use!',
            targetCorrect: 4,
            materials: [
                { label: 'Old Wooden Pallets', correct: true },
                { label: 'Brand New Marble Slab', correct: false },
                { label: 'Reused Nails', correct: true },
                { label: 'Leftover Wood Planks', correct: true },
                { label: 'Store-bought Glass Top', correct: false },
                { label: 'Recovered Metal Brackets', correct: true }
            ]
        },
        {
            name: 'Gogo\'s Market Stall',
            prompt: 'Help Gogo set up her vegetable stall using 4 recycled materials!',
            targetCorrect: 4,
            materials: [
                { label: 'Repurposed Wooden Crates', correct: true },
                { label: 'Solid Gold Display Stand', correct: false },
                { label: 'Old Cardboard Boxes', correct: true },
                { label: 'Recovered Canopy Cloth', correct: true },
                { label: 'Factory-fresh Neon Sign', correct: false },
                { label: 'Salvaged Rope for Fastening', correct: true }
            ]
        },
        {
            name: 'Nathi\'s Walkway Fix',
            prompt: 'Nathi works on glass walkways. Pick the 4 recycled items an artisan would reuse!',
            targetCorrect: 4,
            materials: [
                { label: 'Reclaimed Steel Beams', correct: true },
                { label: 'Brand New Diamond Bolts', correct: false },
                { label: 'Salvaged Metal Frames', correct: true },
                { label: 'Reused Bolts and Joints', correct: true },
                { label: 'Fresh Carbon Fiber Kit', correct: false },
                { label: 'Recycled Rubber Pads', correct: true }
            ]
        }
    ];

    const RECYCLE_STAGE_COUNT = 3;
    let selectedStages = [];
    let currentRecycleStageIndex = 0;
    let materialButtons = [];

    function randomize(array) {
        const copy = [...array];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function getCurrentRecycleStage() {
        return selectedStages[currentRecycleStageIndex];
    }

    function setFeedback(message, tone) {
        feedback.textContent = message;
        feedback.classList.remove('is-success', 'is-error');
        if (tone === 'success') {
            feedback.classList.add('is-success');
        }
        if (tone === 'error') {
            feedback.classList.add('is-error');
        }
    }

    function updateRecycleHud() {
        if (stageValue) {
            stageValue.textContent = `${currentRecycleStageIndex + 1} / ${selectedStages.length}`;
        }
    }

    function getSelectedMaterials() {
        return materialButtons.filter(button => button.classList.contains('is-selected'));
    }

    function freezeBoard() {
        materialButtons.forEach(button => {
            button.disabled = true;
        });
    }

    function resetBoardForCurrentStage() {
        materialButtons.forEach(button => {
            button.disabled = false;
            button.classList.remove('is-selected', 'is-correct', 'is-wrong');
        });
        const stage = getCurrentRecycleStage();
        setFeedback(`Pick ${stage.targetCorrect} items and press "Check My Cart!"`);
    }

    function bindMaterialInteractions() {
        materialButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (button.disabled) {
                    return;
                }

                const stage = getCurrentRecycleStage();
                if (!button.classList.contains('is-selected') && getSelectedMaterials().length >= stage.targetCorrect) {
                    setFeedback(`You can only choose ${stage.targetCorrect} items. Unselect one to change.`, 'error');
                    return;
                }

                button.classList.toggle('is-selected');
                const selectedCount = getSelectedMaterials().length;
                setFeedback(`Selected ${selectedCount} of ${stage.targetCorrect} items.`);
            });
        });
    }

    function renderRecycleStage() {
        const stage = getCurrentRecycleStage();
        const shuffledMaterials = randomize(stage.materials);

        if (prompt) {
            prompt.textContent = stage.prompt;
        }

        materialsGrid.innerHTML = shuffledMaterials
            .map(item => `<button class="material-item" type="button" data-correct="${item.correct}">${item.label}</button>`)
            .join('');

        materialButtons = Array.from(root.querySelectorAll('.material-item'));
        bindMaterialInteractions();
        updateRecycleHud();
        if (nextStageButton) {
            nextStageButton.classList.add('hidden');
        }
        resetBoardForCurrentStage();
    }

    function startNewRecycleRun() {
        selectedStages = randomize(RECYCLE_STAGE_BANK).slice(0, RECYCLE_STAGE_COUNT);
        currentRecycleStageIndex = 0;
        renderRecycleStage();
    }

    function advanceRecycleStage() {
        if (currentRecycleStageIndex >= selectedStages.length - 1) {
            return;
        }
        currentRecycleStageIndex += 1;
        renderRecycleStage();
    }

    function resetRecycleGame() {
        startNewRecycleRun();
        setFeedback('New randomized run started. Build every stage cart.');
    }

    checkButton.addEventListener('click', () => {
        const stage = getCurrentRecycleStage();
        const selected = getSelectedMaterials();
        if (selected.length !== stage.targetCorrect) {
            setFeedback(`Please select exactly ${stage.targetCorrect} items before checking.`, 'error');
            return;
        }

        let correctSelections = 0;
        selected.forEach(button => {
            const isCorrect = button.dataset.correct === 'true';
            button.classList.remove('is-selected');
            button.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
            if (isCorrect) {
                correctSelections += 1;
            }
        });

        if (correctSelections === stage.targetCorrect) {
            const isLastStage = currentRecycleStageIndex === selectedStages.length - 1;
            if (isLastStage) {
                setFeedback('Perfect build streak! You completed every Recycle & Build stage.', 'success');
                if (nextStageButton) {
                    nextStageButton.classList.add('hidden');
                }
            } else {
                setFeedback('Perfect build! Tap Next Recycle Stage to continue.', 'success');
                if (nextStageButton) {
                    nextStageButton.classList.remove('hidden');
                }
            }
        } else {
            setFeedback(`You got ${correctSelections} of ${stage.targetCorrect} correct. Reset and try again.`, 'error');
        }

        freezeBoard();
    });

    if (nextStageButton) {
        nextStageButton.addEventListener('click', advanceRecycleStage);
    }

    resetButton.addEventListener('click', resetRecycleGame);
    startNewRecycleRun();
}

function initWhoAmIMatchingGame() {
    const root = document.querySelector('.whoami-game');
    if (!root) {
        return;
    }

    const namesColumn = document.getElementById('whoamiNames');
    const dreamsColumn = document.getElementById('whoamiDreams');
    const prompt = document.getElementById('whoamiPrompt');
    const status = document.getElementById('whoamiStatus');
    const stageValue = document.getElementById('whoamiStageValue');
    const nextStageButton = document.getElementById('nextWhoAmIStage');
    const resetButton = document.getElementById('resetWhoAmI');

    if (!namesColumn || !dreamsColumn || !status || !stageValue || !resetButton) {
        return;
    }

    const WHOAMI_STAGE_BANK = [
        {
            name: 'Founders',
            prompt: 'Match each Dream Club founder to their dream.',
            pairs: [
                { id: 'name1', name: 'Nhlanhla', dream: 'Wants to be an Artisan' },
                { id: 'name2', name: 'Bongani', dream: 'Wants to be a Policeman' },
                { id: 'name3', name: 'Nathi', dream: 'Builds glass walkways' }
            ]
        },
        {
            name: 'Village Helpers',
            prompt: 'Match each person to what they do in the story.',
            pairs: [
                { id: 'name4', name: 'Gogo', dream: 'Sells vegetables at the station' },
                { id: 'name5', name: 'Tatu Faku', dream: 'Fixes and builds things in the village' },
                { id: 'name6', name: 'Mr. Pretorius', dream: 'The school headmaster' }
            ]
        },
        {
            name: 'Story Stars',
            prompt: 'Match each character to their role in the story.',
            pairs: [
                { id: 'name7', name: 'Nhlanhla', dream: 'Built a cart called Light' },
                { id: 'name8', name: 'Nathi', dream: 'Builds glass walkways in Johannesburg' },
                { id: 'name9', name: 'Mrs. Brown', dream: 'Nhlanhla\'s teacher at school' }
            ]
        },
        {
            name: 'Dream Team',
            prompt: 'Final set: connect each name to the right fact.',
            pairs: [
                { id: 'name10', name: 'Gogo', dream: 'Gave Nhlanhla a red scarf for good luck' },
                { id: 'name11', name: 'Tatu Faku', dream: 'Taught Nhlanhla about tools' },
                { id: 'name12', name: 'Bongani', dream: 'Helps count the shiny orange carrots' }
            ]
        }
    ];

    const WHOAMI_STAGE_COUNT = 3;
    let selectedStages = [];
    let currentStageIndex = 0;
    let selectedNameId = null;
    let matchBoxes = [];
    let dropTargets = [];
    let matchedCount = 0;

    function randomize(array) {
        const copy = [...array];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function getCurrentStage() {
        return selectedStages[currentStageIndex];
    }

    function setStatus(message) {
        status.textContent = message;
    }

    function clearSelectedName() {
        matchBoxes.forEach(box => box.classList.remove('is-selected'));
        selectedNameId = null;
    }

    function updateHud() {
        stageValue.textContent = `${currentStageIndex + 1} / ${selectedStages.length}`;
    }

    function flashWrongTarget(target) {
        target.classList.add('is-wrong');
        window.setTimeout(() => target.classList.remove('is-wrong'), 220);
    }

    function handleDrop(target, incomingId) {
        if (target.classList.contains('correct')) {
            return;
        }

        const accepted = target.getAttribute('data-accept');
        if (incomingId !== accepted) {
            flashWrongTarget(target);
            setStatus('Not a match yet. Try another dream card.');
            return;
        }

        const box = document.getElementById(incomingId);
        if (!box || box.classList.contains('is-matched')) {
            return;
        }

        target.classList.add('correct');
        target.textContent = `Correct! ${box.textContent}`;
        box.classList.add('is-matched');
        clearSelectedName();
        matchedCount += 1;

        if (matchedCount === matchBoxes.length) {
            if (currentStageIndex === selectedStages.length - 1) {
                setStatus('Amazing. You completed every Who Am I stage!');
                if (nextStageButton) {
                    nextStageButton.classList.add('hidden');
                }
            } else {
                setStatus('Stage cleared. Tap Next Who Am I Stage to continue.');
                if (nextStageButton) {
                    nextStageButton.classList.remove('hidden');
                }
            }
            return;
        }

        setStatus('Great match. Keep going.');
    }

    function bindInteractions() {
        matchBoxes.forEach(box => {
            box.addEventListener('dragstart', event => {
                if (box.classList.contains('is-matched')) {
                    event.preventDefault();
                    return;
                }
                event.dataTransfer.setData('text/plain', box.id);
                event.dataTransfer.effectAllowed = 'move';
            });

            box.addEventListener('click', () => {
                if (box.classList.contains('is-matched')) {
                    return;
                }

                if (selectedNameId === box.id) {
                    clearSelectedName();
                    setStatus('Selection cleared. Tap a name, then a dream card.');
                    return;
                }

                clearSelectedName();
                selectedNameId = box.id;
                box.classList.add('is-selected');
                setStatus(`Selected ${box.textContent}. Now tap a dream card.`);
            });
        });

        dropTargets.forEach(target => {
            target.addEventListener('dragover', event => {
                event.preventDefault();
                target.classList.add('is-over');
            });

            target.addEventListener('dragleave', () => {
                target.classList.remove('is-over');
            });

            target.addEventListener('drop', event => {
                event.preventDefault();
                target.classList.remove('is-over');
                const id = event.dataTransfer.getData('text/plain');
                if (!id) {
                    return;
                }
                handleDrop(target, id);
            });

            target.addEventListener('click', () => {
                if (!selectedNameId) {
                    return;
                }
                handleDrop(target, selectedNameId);
            });
        });
    }

    function renderStage() {
        const stage = getCurrentStage();
        const shuffledNames = randomize(stage.pairs);
        const shuffledDreams = randomize(stage.pairs);

        if (prompt) {
            prompt.textContent = stage.prompt;
        }

        namesColumn.innerHTML = shuffledNames
            .map(pair => `<button class="match-box" draggable="true" id="whoami-${pair.id}" type="button">${pair.name}</button>`)
            .join('');

        dreamsColumn.innerHTML = shuffledDreams
            .map(pair => `<div class="drop-target" data-accept="whoami-${pair.id}">${pair.dream}</div>`)
            .join('');

        matchBoxes = Array.from(root.querySelectorAll('.match-box'));
        dropTargets = Array.from(root.querySelectorAll('.drop-target'));
        matchedCount = 0;
        clearSelectedName();
        bindInteractions();
        updateHud();

        if (nextStageButton) {
            nextStageButton.classList.add('hidden');
        }

        setStatus(`Stage ${currentStageIndex + 1}: Match all names in ${stage.name}.`);
    }

    function startNewRun() {
        selectedStages = randomize(WHOAMI_STAGE_BANK).slice(0, WHOAMI_STAGE_COUNT);
        currentStageIndex = 0;
        renderStage();
    }

    function advanceStage() {
        if (currentStageIndex >= selectedStages.length - 1) {
            return;
        }
        currentStageIndex += 1;
        renderStage();
    }

    function resetWhoAmI() {
        startNewRun();
        setStatus('New randomized run started. Match every stage.');
    }

    if (nextStageButton) {
        nextStageButton.addEventListener('click', advanceStage);
    }

    resetButton.addEventListener('click', resetWhoAmI);
    startNewRun();
}

function initGameTabs() {
    const tabButtons = Array.from(document.querySelectorAll('.game-tab'));
    const panels = Array.from(document.querySelectorAll('.game-panel-section'));

    if (!tabButtons.length || !panels.length) {
        return;
    }

    function setActiveTab(targetId) {
        tabButtons.forEach(button => {
            const isTarget = button.dataset.target === targetId;
            button.classList.toggle('is-active', isTarget);
        });

        panels.forEach(panel => {
            panel.classList.toggle('hidden', panel.id !== targetId);
        });

        // Pause Word Hunt timer when the user is on other games.
        if (targetId !== 'wordHuntSection') {
            stopTimer();
            return;
        }

        // Resume timer only if the puzzle is still active and not already running.
        if (gameActive && !timerId && secondsRemaining > 0) {
            startTimer();
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            if (!targetId) {
                return;
            }
            setActiveTab(targetId);
        });
    });

    const defaultTab = tabButtons.find(button => button.classList.contains('is-active'));
    setActiveTab(defaultTab ? defaultTab.dataset.target : 'wordHuntSection');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function initWordSearchGame() {
    const grid = document.getElementById('word-search-grid');
    if (!grid) {
        return;
    }

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', finishSelection);
    document.addEventListener('pointercancel', finishSelection);

    const resetButton = document.getElementById('resetPuzzle');
    if (resetButton) {
        resetButton.addEventListener('click', resetPuzzle);
    }

    const nextStageButton = document.getElementById('nextStageBtn');
    if (nextStageButton) {
        nextStageButton.addEventListener('click', advanceToNextStage);
    }

    const playAgainButton = document.getElementById('playAgainBtn');
    if (playAgainButton) {
        playAgainButton.addEventListener('click', resetPuzzle);
    }

    totalScore = 0;
    loadStage(0);
    initGameTabs();
    initDreamMatcher();
    initRecycleBuildGame();
    initWhoAmIMatchingGame();
}

document.addEventListener('DOMContentLoaded', initWordSearchGame);