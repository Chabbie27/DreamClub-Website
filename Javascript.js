// --- DATA ---
const myBooks = [

    { title: "Nhlanhla's Dream", description: "A cosmic cheese party!", cover: "Cover.png", link: "https://drive.google.com/file/d/1lJXISAkZ3JAVdJY5_W56gsDpIP7n3drv/view?usp=drive_link", color: "border-cyan-400" }
];

// --- INITIAL STATE ---
let userXP = parseInt(localStorage.getItem('dreamXP'), 10) || 0;
let userLevel = parseInt(localStorage.getItem('dreamLevel'), 10) || 1;
const DEFAULT_MEMBERS = [
    { name: 'Sparky', xp: 0 },
    { name: 'Dreamer', xp: 0 }
];
let clubMembers = [
    { name: "Sparky", xp: 0 },
    { name: "Dreamer", xp: 0 }
];
let activeMemberName = localStorage.getItem('activeMemberName') || null;
const popSound = new Audio('https://www.soundjay.com/button/sounds/button-37.mp3');
const starSound = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
const targetWord = 'CHERRY';
const distractors = ['Q', 'X', 'Z'];
let potIngredients = [];

const bridgeWord = 'BALLOON';
const options = [
    { display: 'A, OO', values: ['A', 'O', 'O'], correct: true },
    { display: 'E, UU', values: ['E', 'U', 'U'], correct: false },
    { display: 'I, EE', values: ['I', 'E', 'E'], correct: false }
];
let timerValue = 10;
let bridgeLoopLastTime = 0;
let bridgeLoopFrameId = null;

const correctSpelling = 'FRIEND';
const decoySpellings = ['Freind', 'Frend', 'Friand'];
let lastTapTime = 0;
const collectedStars = new Set();
let gameScores = {
    cookOff: 0,
    bridge: 0,
    finder: 0
};
let activeGamePanelId = 'cookOffCard';

// --- FUNCTIONS ---

function loadMembers() {
    try {
        const saved = JSON.parse(localStorage.getItem('dreamMembers'));
        if (Array.isArray(saved) && saved.length > 0) {
            clubMembers = saved.map(member => {
                if (typeof member === 'string') {
                    return { name: member, xp: 0 };
                }

                return {
                    name: member && typeof member.name === 'string' ? member.name : '',
                    xp: Number(member.xp) || 0
                };
            }).filter(member => member.name.trim() !== '');

            if (clubMembers.length === 0) {
                clubMembers = [...DEFAULT_MEMBERS];
            }
        }
    } catch (_) {
        clubMembers = [...DEFAULT_MEMBERS];
    }
}

function saveMembers() {
    localStorage.setItem('dreamMembers', JSON.stringify(clubMembers));
}

function saveLevel() {
    localStorage.setItem('dreamLevel', userLevel);
}

function escapeSingleQuotes(value) {
    return String(value).replace(/'/g, "\\'");
}

function setJoinFieldVisibility(show) {
    const joinField = document.getElementById('memberJoinField');
    if (!joinField) return;
    joinField.classList.toggle('hidden', !show);
}

function updateGameScoreboard() {
    const cookScore = document.getElementById('cookScore');
    const bridgeScore = document.getElementById('bridgeScore');
    const finderScore = document.getElementById('finderScore');

    if (cookScore) {
        cookScore.textContent = `Cook-Off Score: ${gameScores.cookOff}`;
    }
    if (bridgeScore) {
        bridgeScore.textContent = `Bridge Score: ${gameScores.bridge}`;
    }
    if (finderScore) {
        finderScore.textContent = `Finder Score: ${gameScores.finder}`;
    }
}

function showGamePanel(panelId) {
    const panels = document.querySelectorAll('.game-panel');
    const launchers = document.querySelectorAll('.game-launcher');
    if (!panels.length || !launchers.length) return;

    const targetPanel = document.getElementById(panelId);

    panels.forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== panelId);
    });

    if (targetPanel) {
        targetPanel.classList.remove('game-panel-enter');
        // Force reflow so animation can replay when selecting another panel.
        void targetPanel.offsetWidth;
        targetPanel.classList.add('game-panel-enter');
    }

    launchers.forEach(button => {
        const isActive = button.dataset.game === panelId;
        button.classList.toggle('active', isActive);
    });

    activeGamePanelId = panelId;
}

function initGameLauncher() {
    const launchers = document.querySelectorAll('.game-launcher');
    if (!launchers.length) return;

    launchers.forEach(button => {
        button.onclick = () => {
            const targetPanel = button.dataset.game;
            if (targetPanel) {
                showGamePanel(targetPanel);
            }
        };
    });

    showGamePanel(activeGamePanelId);
}

function applyTheme(theme) {
    const root = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const isDark = theme === 'dark';

    root.classList.toggle('dark', isDark);

    if (themeToggle) {
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('dreamTheme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
        applyTheme(savedTheme);
        return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const nextTheme = isDark ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem('dreamTheme', nextTheme);
}

function updateXPDisplay() {
    if (activeMemberName) {
        const activeMember = clubMembers.find(member => member.name === activeMemberName);
        if (activeMember) {
            activeMember.xp = userXP;
            saveMembers();
        }
    }

    const progress = userXP % 100;
    const xpBar = document.getElementById('xpBar');
    const xpText = document.getElementById('xpText');
    const levelDisplay = document.getElementById('levelDisplay');

    if (xpBar) xpBar.style.width = `${progress}%`;
    if (xpText) xpText.innerText = progress;
    userLevel = Math.floor(userXP / 100) + 1;
    if (levelDisplay) levelDisplay.innerText = userLevel;
    localStorage.setItem('dreamXP', userXP);
    saveLevel();
    renderMembers();
}

function openReader(url, title) {
    popSound.play();
    let secureUrl = url;

    // Normalize Google Drive links so they always open in iframe preview mode.
    const driveMatch = url.match(/\/file\/d\/([^/]+)/);
    if (driveMatch && driveMatch[1]) {
        secureUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    } else {
        secureUrl = url.replace('/view', '/preview');
    }

    document.getElementById('readerIframe').src = secureUrl;
    document.getElementById('readerTitle').innerText = title;
    document.getElementById('readerModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Start 10s Timer for Reward
    setTimeout(() => {
        userXP += 25;
        updateXPDisplay();
        document.getElementById('rewardBadge').classList.remove('hidden');
        starSound.play();
        setTimeout(() => document.getElementById('rewardBadge').classList.add('hidden'), 4000);
    }, 10000);
}

function closeReader() {
    document.getElementById('readerModal').classList.add('hidden');
    document.getElementById('readerIframe').src = "";
    document.body.style.overflow = 'auto';
}

function toggleReaderMode() {
    const body = document.getElementById('readerBody');
    if (body) {
        body.classList.toggle('dark');
    }
}

function displayBooks() {
    const shelf = document.getElementById('myBookshelf');
    if (!shelf) return;

    shelf.innerHTML = myBooks.map(book => `
        <div class="bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl overflow-hidden border-[10px] ${book.color} animate__animated animate__zoomIn">
            <img src="${book.cover}" class="h-48 w-full object-cover">
            <div class="p-6 text-center">
                <h3 class="font-black text-xl mb-2">${book.title}</h3>
                <button onclick="openReader('${book.link}', '${escapeSingleQuotes(book.title)}')" class="bg-purple-600 text-white font-black px-8 py-2 rounded-full shadow-lg">Read Now</button>
            </div>
        </div>
    `).join('');
}

// --- LETTER COOK-OFF ---
function getShuffledPantry() {
    const letters = [...targetWord.split(''), ...distractors];
    for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters;
}

function playSizzleSound() {
    popSound.play();
}

function playSteamHiss() {
    popSound.play();
}

function spitOutIngredient(letter) {
    const status = document.getElementById('cookStatus');
    if (status) {
        status.textContent = `${letter} does not belong there. Try again!`;
    }
}

function triggerExplosionAnimation() {
    const card = document.getElementById('cookOffCard');
    if (!card) return;
    card.classList.add('winner-glow');
    setTimeout(() => card.classList.remove('winner-glow'), 900);
}

function unlockSticker(word) {
    const status = document.getElementById('cookStatus');
    if (status) {
        status.textContent = `Perfect recipe! ${word} sticker unlocked! (+20 XP)`;
    }
    gameScores.cookOff += 20;
    updateGameScoreboard();
    userXP += 20;
    updateXPDisplay();
}

function renderPotSlots() {
    const pot = document.getElementById('potSlots');
    if (!pot) return;

    pot.innerHTML = targetWord
        .split('')
        .map((_, i) => `<div class="pot-slot">${potIngredients[i] || ''}</div>`)
        .join('');
}

function renderPantry() {
    const pantry = document.getElementById('pantryLetters');
    if (!pantry) return;

    const shuffled = getShuffledPantry();
    pantry.innerHTML = '';
    shuffled.forEach(letter => {
        const chip = document.createElement('button');
        chip.className = 'letter-chip';
        chip.textContent = letter;
        chip.onclick = () => addIngredientToPot(letter, chip);
        pantry.appendChild(chip);
    });
}

function addIngredientToPot(letter, sourceButton) {
    const expectedLetter = targetWord[potIngredients.length];

    if (letter === expectedLetter) {
        potIngredients.push(letter);
        if (sourceButton) sourceButton.disabled = true;
        playSizzleSound();
        renderPotSlots();

        if (potIngredients.join('') === targetWord) {
            triggerExplosionAnimation();
            unlockSticker(targetWord);
        }
    } else {
        spitOutIngredient(letter);
        playSteamHiss();
    }
}

function initCookOffGame() {
    potIngredients = [];
    renderPotSlots();
    renderPantry();
    const status = document.getElementById('cookStatus');
    if (status) status.textContent = 'Add letters in order to cook CHERRY.';
}

// --- NEON BRIDGE BUILDER ---
function fillBridgeGaps(word) {
    const bridge = document.getElementById('bridgeWord');
    if (!bridge) return;
    bridge.textContent = word;
    bridge.style.opacity = '1';
}

function characterWalkAcross() {
    const status = document.getElementById('bridgeStatus');
    if (status) {
        status.textContent = 'Bridge complete! Character crossed safely. (+15 XP)';
    }
    gameScores.bridge += 15;
    updateGameScoreboard();
    userXP += 15;
    updateXPDisplay();
}

function shakeBridge() {
    const bridge = document.getElementById('bridgeWord');
    if (!bridge) return;
    bridge.classList.add('bridge-shake');
    setTimeout(() => bridge.classList.remove('bridge-shake'), 400);
}

function setBridgeOpacity(value) {
    const bridge = document.getElementById('bridgeWord');
    if (!bridge) return;
    bridge.style.opacity = String(Math.max(0.2, Math.min(1, value)));
}

function resetTimer() {
    timerValue = 10;
    const timer = document.getElementById('bridgeTimer');
    if (timer) {
        timer.textContent = `Neon timer: ${timerValue.toFixed(1)}s`;
    }
}

function checkBridgeSelection(selectedOption) {
    const status = document.getElementById('bridgeStatus');
    if (selectedOption.correct) {
        fillBridgeGaps(bridgeWord);
        characterWalkAcross();
        resetTimer();
    } else {
        shakeBridge();
        resetTimer();
        if (status) status.textContent = 'Wrong chunk. The bridge shook!';
    }
}

function updateGameLoop(deltaTime) {
    timerValue -= deltaTime;

    if (timerValue < 0) {
        resetTimer();
    }

    if (timerValue < 3) {
        setBridgeOpacity(0.5 + Math.sin(Date.now() * 0.01) * 0.5);
    } else {
        setBridgeOpacity(1);
    }

    const timer = document.getElementById('bridgeTimer');
    if (timer) {
        timer.textContent = `Neon timer: ${Math.max(0, timerValue).toFixed(1)}s`;
    }
}

function bridgeLoop(timestamp) {
    if (!bridgeLoopLastTime) bridgeLoopLastTime = timestamp;
    const deltaTime = (timestamp - bridgeLoopLastTime) / 1000;
    bridgeLoopLastTime = timestamp;
    updateGameLoop(deltaTime);
    bridgeLoopFrameId = requestAnimationFrame(bridgeLoop);
}

function initBridgeBuilder() {
    const optionHost = document.getElementById('bridgeOptions');
    const status = document.getElementById('bridgeStatus');
    const bridge = document.getElementById('bridgeWord');
    if (!optionHost || !status || !bridge) return;

    bridge.textContent = 'B _ L L _ _ N';
    status.textContent = 'Pick the correct sound chunks.';
    optionHost.innerHTML = '';

    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'bridge-option';
        btn.textContent = option.display;
        btn.onclick = () => checkBridgeSelection(option);
        optionHost.appendChild(btn);
    });

    resetTimer();
    bridgeLoopLastTime = 0;
    if (bridgeLoopFrameId) {
        cancelAnimationFrame(bridgeLoopFrameId);
    }
    bridgeLoopFrameId = requestAnimationFrame(bridgeLoop);
}

// --- FLASHLIGHT FINDER ---
function brightenRoom() {
    const card = document.getElementById('finderCard');
    if (!card) return;
    card.classList.add('winner-glow');
    setTimeout(() => card.classList.remove('winner-glow'), 900);
}

function playVictorySound() {
    starSound.play();
}

function playBuzzSound() {
    popSound.play();
}

function collectStar(starId) {
    if (collectedStars.has(starId)) return;
    collectedStars.add(starId);
    gameScores.finder += 5;
    updateGameScoreboard();
    userXP += 5;
    updateXPDisplay();
    const status = document.getElementById('finderStatus');
    if (status) status.textContent = `Star collected! (+5 XP)`;
}

function onObjectTap(tappedObject) {
    const currentTime = Date.now();
    const tapLength = currentTime - lastTapTime;

    if (tapLength < 300 && tapLength > 0) {
        if (tappedObject.text === correctSpelling) {
            brightenRoom();
            playVictorySound();
            gameScores.finder += 25;
            updateGameScoreboard();
            userXP += 25;
            updateXPDisplay();
            const status = document.getElementById('finderStatus');
            if (status) status.textContent = 'Correct spelling found! (+25 XP)';
        } else if (tappedObject.type === 'STAR') {
            collectStar(tappedObject.id);
        } else {
            playBuzzSound();
            const status = document.getElementById('finderStatus');
            if (status) status.textContent = 'Oops, that spelling is not correct.';
        }
    }

    lastTapTime = currentTime;
}

function updateFlashlightPosition(touchX, touchY) {
    const area = document.getElementById('flashlightArea');
    if (!area) return;
    area.style.background = `radial-gradient(circle at ${touchX}px ${touchY}px, rgba(255, 255, 220, 0.8) 0%, rgba(15, 23, 42, 0.95) 55%)`;
}

function initFlashlightFinder() {
    const host = document.getElementById('finderObjects');
    const area = document.getElementById('flashlightArea');
    const status = document.getElementById('finderStatus');
    if (!host || !area || !status) return;

    const objectPool = [
        { id: 'correct-word', type: 'WORD', text: correctSpelling },
        ...decoySpellings.map((word, i) => ({ id: `decoy-${i}`, type: 'WORD', text: word })),
        { id: 'star-1', type: 'STAR', text: 'STAR' }
    ].sort(() => Math.random() - 0.5);

    collectedStars.clear();
    lastTapTime = 0;

    host.innerHTML = '';
    objectPool.forEach(obj => {
        const btn = document.createElement('button');
        btn.className = `finder-chip ${obj.type === 'STAR' ? 'finder-star' : ''}`;
        btn.textContent = obj.text;
        btn.onclick = () => onObjectTap(obj);
        host.appendChild(btn);
    });

    area.onmousemove = (event) => {
        const rect = area.getBoundingClientRect();
        updateFlashlightPosition(event.clientX - rect.left, event.clientY - rect.top);
    };

    area.ontouchmove = (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        const rect = area.getBoundingClientRect();
        updateFlashlightPosition(touch.clientX - rect.left, touch.clientY - rect.top);
    };

    status.textContent = 'Double-tap a spelling to test it.';
    updateFlashlightPosition(120, 60);
}

function resetGames() {
    gameScores = {
        cookOff: 0,
        bridge: 0,
        finder: 0
    };
    updateGameScoreboard();
    initCookOffGame();
    initBridgeBuilder();
    initFlashlightFinder();
}

function startMemoryGame() {
    // Backward-compatible alias for any existing buttons.
    resetGames();
}

function flipTile() {
    // Kept as a no-op for backward compatibility.
}

function checkMatch() {
    // Kept as a no-op for backward compatibility.
}

function joinTheClub() {
    const input = document.getElementById('memberNameInput');
    const name = input.value.trim();

    if (name !== '') {
        popSound.play();

        const existingMember = clubMembers.find(member => member.name.toLowerCase() === name.toLowerCase());
        if (!existingMember) {
            clubMembers.push({ name, xp: 0 });
            activeMemberName = name;
            userXP = 0;
        } else {
            activeMemberName = existingMember.name;
            userXP = existingMember.xp;
        }

        saveMembers();
        localStorage.setItem('activeMemberName', activeMemberName);
        localStorage.setItem('isLoggedIn', 'true');
        updateXPDisplay();
        setJoinFieldVisibility(false);

        const booksSection = document.getElementById('books');
        if (booksSection) {
            booksSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        input.value = '';
    } else {
        alert('Please enter a name to join the club!');
    }
}

function initApp() {
    loadMembers();

    if (activeMemberName) {
        const activeMember = clubMembers.find(member => member.name === activeMemberName);
        if (activeMember) {
            userXP = activeMember.xp;
        }
    }

    displayBooks();
    resetGames();
    initGameLauncher();
    updateXPDisplay();
    setJoinFieldVisibility(localStorage.getItem('isLoggedIn') !== 'true');
}

function renderMembers() {
    const memberScroll = document.getElementById('memberScroll');
    if (!memberScroll) return;
    memberScroll.innerHTML = clubMembers
    .map(member => `<span class="member-tag">${member.name} - ${member.xp} XP</span>`)
        .join('');
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.onclick = toggleTheme;
    }

    initApp();
});