// --- DATA ---
const myBooks = [

    {
        title: "Nhlanhla's Dream",
        description: "A cosmic cheese party!",
        cover: "Cover.png",
        link: "https://drive.google.com/file/d/1fKH2YQv4xL1cIPigUwF_4OT06xbG0Zf3/view?usp=drive_link",
        color: "border-cyan-400",
        pages: 24,
        physicalLink: "https://www.amazon.com/s?k=Nhlanhla%27s+Dream+book"
    }
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
let activeGamePanelId = 'embedCard1';
let readerCurrentPage = 1;
let readerTotalPages = 1;
let activeReaderUrl = '';
let readerTouchStartX = 0;
let authInstance = null;
let authReady = false;
let authUser = null;

const GAME_SOURCE_PRESETS = {
    educandy: 'https://www.educandy.com/',
    h5p: 'https://h5p.org/',
    'open-source': 'https://phaser.io/examples/v3',
    custom: ''
};

const STARTER_GAME_URLS = [
    {
        title: 'Educandy Home',
        source: 'educandy',
        url: 'https://www.educandy.com/',
        notes: 'Hosted educational platform. Use shared activity links and follow Educandy terms.'
    },
    {
        title: 'Educandy Games Library',
        source: 'educandy',
        url: 'https://www.educandy.com/site/games',
        notes: 'Good discovery page for kid-friendly vocabulary games. Confirm each game is share-enabled.'
    },
    {
        title: 'H5P Content Types',
        source: 'h5p',
        url: 'https://h5p.org/content-types-and-applications',
        notes: 'H5P is open source (GPL). Great for quizzes and drag-drop experiences.'
    },
    {
        title: 'H5P Memory Game',
        source: 'h5p',
        url: 'https://h5p.org/memory-game',
        notes: 'H5P demo page for memory format. Use self-hosted or hosted H5P embeds in production.'
    },
    {
        title: 'H5P Drag and Drop',
        source: 'h5p',
        url: 'https://h5p.org/drag-and-drop',
        notes: 'Interactive activity style for matching tasks. Keep attribution as required.'
    },
    {
        title: 'Phaser Examples v3',
        source: 'open-source',
        url: 'https://phaser.io/examples/v3',
        notes: 'Open-source HTML5 game framework examples. Check individual example licensing before reuse.'
    },
    {
        title: 'GDevelop Example Games',
        source: 'open-source',
        url: 'https://gdevelop.io/game-example',
        notes: 'Many examples are open projects. Verify game-specific assets and licenses.'
    },
    {
        title: 'OpenGameArt',
        source: 'open-source',
        url: 'https://opengameart.org/',
        notes: 'Asset source for open projects. Respect each asset license (CC0, CC-BY, GPL, etc.).'
    },
    {
        title: 'Godot Demo Projects',
        source: 'open-source',
        url: 'https://github.com/godotengine/godot-demo-projects',
        notes: 'Open-source demo repository. Build and host exported games yourself for embedding.'
    },
    {
        title: 'Phaser GitHub Repo',
        source: 'open-source',
        url: 'https://github.com/phaserjs/phaser',
        notes: 'Framework source repo (MIT). Use examples and docs to create your own hosted games.'
    }
];

// --- FIREBASE AUTH ---

function getFirebaseConfig() {
    const config = window.DREAM_FIREBASE_CONFIG;
    if (!config || typeof config !== 'object') return null;

    const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
    const hasAllRequired = required.every(key => typeof config[key] === 'string' && config[key].trim() !== '');
    return hasAllRequired ? config : null;
}

function setAuthStatus(message, isError = false) {
    const status = document.getElementById('authStatus');
    if (!status) return;

    status.textContent = message;
    status.classList.toggle('text-red-700', isError);
    status.classList.toggle('dark:text-red-200', isError);
    status.classList.toggle('bg-red-50', isError);
    status.classList.toggle('dark:bg-red-950', isError);
    status.classList.toggle('text-teal-700', !isError);
    status.classList.toggle('dark:text-teal-200', !isError);
    status.classList.toggle('bg-teal-50', !isError);
    status.classList.toggle('dark:bg-teal-950', !isError);
}

function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setAuthStatus('Sign in to save your Dream Club progress.');
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function setAuthControlsDisabled(disabled) {
    const signInBtn = document.getElementById('authSignInBtn');
    const signUpBtn = document.getElementById('authSignUpBtn');
    const googleBtn = document.getElementById('authGoogleBtn');
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');

    if (signInBtn) signInBtn.disabled = disabled;
    if (signUpBtn) signUpBtn.disabled = disabled;
    if (googleBtn) googleBtn.disabled = disabled;
    if (emailInput) emailInput.disabled = disabled;
    if (passwordInput) passwordInput.disabled = disabled;
}

function getAuthFormValues() {
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');

    return {
        email: emailInput ? emailInput.value.trim() : '',
        password: passwordInput ? passwordInput.value : ''
    };
}

function getAuthDisplayName(user) {
    if (!user) return 'Guest';
    if (user.displayName && user.displayName.trim()) return user.displayName.trim();
    if (user.email && user.email.trim()) return user.email.trim();
    return 'Member';
}

function syncActiveMemberFromAuth(user) {
    if (!user) {
        activeMemberName = null;
        localStorage.removeItem('activeMemberName');
        return;
    }

    const displayName = getAuthDisplayName(user);
    const existingMember = clubMembers.find(member => member.name.toLowerCase() === displayName.toLowerCase());

    if (existingMember) {
        activeMemberName = existingMember.name;
        userXP = existingMember.xp;
    } else {
        clubMembers.push({ name: displayName, xp: 0 });
        activeMemberName = displayName;
        userXP = 0;
        saveMembers();
    }

    localStorage.setItem('activeMemberName', activeMemberName);
}

function updateAuthUI() {
    const userLabel = document.getElementById('authUserLabel');
    const loginBtn = document.getElementById('authLoginBtn');
    const logoutBtn = document.getElementById('authLogoutBtn');

    if (!userLabel || !loginBtn || !logoutBtn) return;

    if (authUser) {
        userLabel.textContent = getAuthDisplayName(authUser);
        userLabel.classList.remove('hidden');
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        localStorage.setItem('isLoggedIn', 'true');
    } else {
        userLabel.textContent = 'Guest';
        userLabel.classList.add('hidden');
        loginBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        localStorage.setItem('isLoggedIn', 'false');
    }
}

async function signInWithEmail() {
    if (!authReady || !authInstance) {
        setAuthStatus('Firebase is not configured yet. Add keys in firebase-config.js.', true);
        return;
    }

    const { email, password } = getAuthFormValues();
    if (!email || !password) {
        setAuthStatus('Enter both email and password.', true);
        return;
    }

    try {
        setAuthControlsDisabled(true);
        setAuthStatus('Signing in...');
        await authInstance.signInWithEmailAndPassword(email, password);
        setAuthStatus('Welcome back!');
        closeAuthModal();
    } catch (error) {
        setAuthStatus(error.message || 'Unable to sign in right now.', true);
    } finally {
        setAuthControlsDisabled(false);
    }
}

async function signUpWithEmail() {
    if (!authReady || !authInstance) {
        setAuthStatus('Firebase is not configured yet. Add keys in firebase-config.js.', true);
        return;
    }

    const { email, password } = getAuthFormValues();
    if (!email || !password) {
        setAuthStatus('Enter both email and password.', true);
        return;
    }

    if (password.length < 6) {
        setAuthStatus('Password must be at least 6 characters long.', true);
        return;
    }

    try {
        setAuthControlsDisabled(true);
        setAuthStatus('Creating account...');
        await authInstance.createUserWithEmailAndPassword(email, password);
        setAuthStatus('Account created. You are now logged in.');
        closeAuthModal();
    } catch (error) {
        setAuthStatus(error.message || 'Unable to create account right now.', true);
    } finally {
        setAuthControlsDisabled(false);
    }
}

async function signOutAuth() {
    if (!authReady || !authInstance) {
        authUser = null;
        syncActiveMemberFromAuth(null);
        updateAuthUI();
        updateXPDisplay();
        return;
    }

    try {
        await authInstance.signOut();
    } catch (_) {
        // Keep UI responsive even if sign-out network call fails.
        authUser = null;
        syncActiveMemberFromAuth(null);
        updateAuthUI();
        updateXPDisplay();
    }
}

async function signInWithGoogle() {
    if (!authReady || !authInstance || !window.firebase || !window.firebase.auth) {
        setAuthStatus('Firebase is not configured yet. Add keys in firebase-config.js.', true);
        return;
    }

    try {
        setAuthControlsDisabled(true);
        setAuthStatus('Opening Google sign-in...');
        const provider = new window.firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await authInstance.signInWithPopup(provider);
        setAuthStatus('Signed in with Google.');
        closeAuthModal();
    } catch (error) {
        setAuthStatus(error.message || 'Unable to sign in with Google right now.', true);
    } finally {
        setAuthControlsDisabled(false);
    }
}

function wireAuthButtons() {
    const loginBtn = document.getElementById('authLoginBtn');
    const logoutBtn = document.getElementById('authLogoutBtn');
    const closeModalBtn = document.getElementById('closeAuthModalBtn');
    const signInBtn = document.getElementById('authSignInBtn');
    const signUpBtn = document.getElementById('authSignUpBtn');
    const googleBtn = document.getElementById('authGoogleBtn');
    const modal = document.getElementById('authModal');

    if (loginBtn) loginBtn.onclick = openAuthModal;
    if (logoutBtn) logoutBtn.onclick = signOutAuth;
    if (closeModalBtn) closeModalBtn.onclick = closeAuthModal;
    if (signInBtn) signInBtn.onclick = signInWithEmail;
    if (signUpBtn) signUpBtn.onclick = signUpWithEmail;
    if (googleBtn) googleBtn.onclick = signInWithGoogle;

    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeAuthModal();
        });
    }
}

function initFirebaseAuth() {
    wireAuthButtons();

    if (!window.firebase || typeof window.firebase.initializeApp !== 'function') {
        setAuthStatus('Firebase SDK not loaded. Check your script tags.', true);
        updateAuthUI();
        return;
    }

    const config = getFirebaseConfig();
    if (!config) {
        setAuthStatus('Add your Firebase web config in firebase-config.js to enable login.');
        updateAuthUI();
        return;
    }

    try {
        if (window.firebase.apps && window.firebase.apps.length === 0) {
            window.firebase.initializeApp(config);
        }

        authInstance = window.firebase.auth();
        authReady = true;

        authInstance.onAuthStateChanged((user) => {
            authUser = user || null;
            syncActiveMemberFromAuth(authUser);
            updateAuthUI();
            updateXPDisplay();
        });
    } catch (error) {
        authReady = false;
        setAuthStatus(error.message || 'Failed to initialize Firebase auth.', true);
        updateAuthUI();
    }
}

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

function getActiveSlotNumber() {
    const match = String(activeGamePanelId || '').match(/embedCard(\d+)/);
    return match ? Number(match[1]) : 1;
}

function getSlotElements(slotNumber) {
    const sourceSelect = document.getElementById(`slot${slotNumber}Source`);
    const urlInput = document.getElementById(`slot${slotNumber}Url`);
    const loadButton = document.getElementById(`slot${slotNumber}Load`);
    const frame = document.getElementById(`slot${slotNumber}Frame`);
    const openLink = document.getElementById(`slot${slotNumber}Open`);
    const status = document.getElementById(`slot${slotNumber}Status`);

    if (!sourceSelect || !urlInput || !loadButton || !frame || !openLink || !status) {
        return null;
    }

    return { sourceSelect, urlInput, loadButton, frame, openLink, status };
}

function setSlotStatus(slotNumber, message) {
    const elements = getSlotElements(slotNumber);
    if (!elements) return;
    elements.status.textContent = message;
}

function setSlotPreset(slotNumber, source) {
    const elements = getSlotElements(slotNumber);
    if (!elements) return;

    const presetUrl = GAME_SOURCE_PRESETS[source] || '';
    elements.sourceSelect.value = source;

    if (presetUrl) {
        elements.urlInput.value = presetUrl;
        elements.openLink.href = presetUrl;
        setSlotStatus(slotNumber, `${source.toUpperCase()} preset loaded. Press Load to preview.`);
    } else {
        elements.urlInput.value = '';
        elements.openLink.href = '#';
        setSlotStatus(slotNumber, 'Paste a custom URL and press Load.');
    }
}

function loadSlotEmbed(slotNumber) {
    const elements = getSlotElements(slotNumber);
    if (!elements) return;

    const url = elements.urlInput.value.trim();
    if (!url) {
        setSlotStatus(slotNumber, 'Please paste a valid game URL first.');
        return;
    }

    elements.frame.src = url;
    elements.openLink.href = url;
    setSlotStatus(slotNumber, 'Game loaded. If blocked, use the Open link in a new tab.');
}

function applyGlobalGameSource() {
    const globalSelect = document.getElementById('globalGameSource');
    if (!globalSelect) return;

    const source = globalSelect.value;
    [1, 2, 3].forEach(slotNumber => {
        setSlotPreset(slotNumber, source);
    });
}

function useStarterGameUrl(url, source) {
    const slotNumber = getActiveSlotNumber();
    const elements = getSlotElements(slotNumber);
    if (!elements) return;

    elements.sourceSelect.value = source;
    elements.urlInput.value = url;
    loadSlotEmbed(slotNumber);
}

function renderStarterGameList() {
    const host = document.getElementById('starterGameList');
    if (!host) return;

    host.innerHTML = '';
    STARTER_GAME_URLS.forEach(item => {
        const row = document.createElement('div');
        row.className = 'starter-game-item';

        const textWrap = document.createElement('div');
        textWrap.className = 'starter-game-copy';

        const title = document.createElement('p');
        title.className = 'starter-game-title';
        title.textContent = `${item.title} (${item.source})`;

        const url = document.createElement('p');
        url.className = 'starter-game-url';
        url.textContent = item.url;

        const note = document.createElement('p');
        note.className = 'starter-game-note';
        note.textContent = item.notes;

        const useButton = document.createElement('button');
        useButton.type = 'button';
        useButton.className = 'starter-game-use';
        useButton.textContent = 'Use';
        useButton.onclick = () => useStarterGameUrl(item.url, item.source);

        textWrap.appendChild(title);
        textWrap.appendChild(url);
        textWrap.appendChild(note);
        row.appendChild(textWrap);
        row.appendChild(useButton);
        host.appendChild(row);
    });
}

function initGameEmbeds() {
    const applyAll = document.getElementById('applySourceToAllBtn');
    if (applyAll) {
        applyAll.onclick = applyGlobalGameSource;
    }

    [1, 2, 3].forEach(slotNumber => {
        const elements = getSlotElements(slotNumber);
        if (!elements) return;

        elements.sourceSelect.onchange = () => {
            setSlotPreset(slotNumber, elements.sourceSelect.value);
        };

        elements.loadButton.onclick = () => {
            loadSlotEmbed(slotNumber);
        };

        elements.urlInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                loadSlotEmbed(slotNumber);
            }
        });
    });

    setSlotPreset(1, 'educandy');
    setSlotPreset(2, 'h5p');
    setSlotPreset(3, 'open-source');
    renderStarterGameList();
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

function updateReaderPageCounter() {
    const pageCounter = document.getElementById('readerPageCounter');
    if (pageCounter) {
        pageCounter.textContent = `Page ${readerCurrentPage} of ${readerTotalPages}`;
    }
}

function updateReaderControls() {
    const prevButton = document.getElementById('readerPrevBtn');
    const nextButton = document.getElementById('readerNextBtn');
    const jumpInput = document.getElementById('readerPageInput');
    const jumpButton = document.getElementById('readerJumpBtn');

    const atFirstPage = readerCurrentPage <= 1;
    const atLastPage = readerCurrentPage >= readerTotalPages;

    if (prevButton) {
        prevButton.disabled = atFirstPage;
        prevButton.setAttribute('aria-disabled', String(atFirstPage));
    }

    if (nextButton) {
        nextButton.disabled = atLastPage;
        nextButton.setAttribute('aria-disabled', String(atLastPage));
    }

    if (jumpInput) {
        jumpInput.max = String(readerTotalPages);
        jumpInput.value = String(readerCurrentPage);
    }

    if (jumpButton) {
        const shouldDisableJump = readerTotalPages <= 1;
        jumpButton.disabled = shouldDisableJump;
        jumpButton.setAttribute('aria-disabled', String(shouldDisableJump));
    }
}

function getReaderUrlForPage(baseUrl, pageNumber) {
    const cleanedUrl = String(baseUrl || '').replace(/#page=\d+$/, '');
    return `${cleanedUrl}#page=${pageNumber}`;
}

function setReaderPage(pageNumber) {
    const normalizedPage = Math.min(readerTotalPages, Math.max(1, pageNumber));
    readerCurrentPage = normalizedPage;
    updateReaderPageCounter();
    updateReaderControls();

    const readerFrame = document.getElementById('readerIframe');
    if (readerFrame && activeReaderUrl) {
        readerFrame.src = getReaderUrlForPage(activeReaderUrl, readerCurrentPage);
    }
}

function jumpReaderPage() {
    const jumpInput = document.getElementById('readerPageInput');
    if (!jumpInput) return;

    const requestedPage = Number(jumpInput.value);
    if (!Number.isFinite(requestedPage)) return;

    setReaderPage(Math.round(requestedPage));
}

function prevReaderPage() {
    setReaderPage(readerCurrentPage - 1);
}

function nextReaderPage() {
    setReaderPage(readerCurrentPage + 1);
}

function openReader(url, title, totalPages = 1, physicalBookLink = '') {
    popSound.play();
    let secureUrl = url;

    // Normalize Google Drive links so they always open in iframe preview mode.
    const driveMatch = url.match(/\/file\/d\/([^/]+)/);
    if (driveMatch && driveMatch[1]) {
        secureUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    } else if (url.includes('/view')) {
        secureUrl = url.replace('/view', '/preview');
    }

    activeReaderUrl = secureUrl;
    readerCurrentPage = 1;
    readerTotalPages = Math.max(1, Number(totalPages) || 1);
    updateReaderPageCounter();
    updateReaderControls();

    document.getElementById('readerIframe').src = getReaderUrlForPage(activeReaderUrl, readerCurrentPage);
    document.getElementById('readerTitle').innerText = title;
    const buyButton = document.getElementById('buyBookButton');
    if (buyButton) {
        buyButton.href = physicalBookLink || url;
    }
    document.getElementById('readerModal').classList.remove('hidden');
    document.body.classList.add('reader-open');
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

function initReaderPageJump() {
    const jumpInput = document.getElementById('readerPageInput');
    if (!jumpInput) return;

    jumpInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            jumpReaderPage();
        }
    });
}

function closeReader() {
    document.getElementById('readerModal').classList.add('hidden');
    document.getElementById('readerIframe').src = "";
    document.body.classList.remove('reader-open');
    document.body.style.overflow = 'auto';
}

function toggleReaderMode() {
    const body = document.getElementById('readerBody');
    if (body) {
        body.classList.toggle('dark');
    }
}

function openReaderByIndex(bookIndex) {
    const book = myBooks[bookIndex];
    if (!book) return;
    openReader(book.link, book.title, book.pages, book.physicalLink);
}

function isReaderOpen() {
    const readerModal = document.getElementById('readerModal');
    return !!readerModal && !readerModal.classList.contains('hidden');
}

function handleReaderKeyNavigation(event) {
    if (!isReaderOpen()) return;

    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prevReaderPage();
        return;
    }

    if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextReaderPage();
        return;
    }

    if (event.key === 'Escape') {
        event.preventDefault();
        closeReader();
    }
}

function initReaderSwipeNavigation() {
    const readerBody = document.getElementById('readerBody');
    if (!readerBody) return;

    readerBody.addEventListener('touchstart', (event) => {
        const touch = event.changedTouches[0];
        if (!touch) return;
        readerTouchStartX = touch.clientX;
    }, { passive: true });

    readerBody.addEventListener('touchend', (event) => {
        if (!isReaderOpen()) return;

        const touch = event.changedTouches[0];
        if (!touch) return;

        const deltaX = touch.clientX - readerTouchStartX;
        const swipeThreshold = 45;

        if (deltaX <= -swipeThreshold) {
            nextReaderPage();
        } else if (deltaX >= swipeThreshold) {
            prevReaderPage();
        }
    }, { passive: true });
}

function displayBooks() {
    const shelf = document.getElementById('myBookshelf');
    if (!shelf) return;

    shelf.innerHTML = myBooks.map((book, index) => `
        <div class="bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl overflow-hidden border-[10px] ${book.color} animate__animated animate__zoomIn max-w-lg w-full">
            <img src="${book.cover}" class="w-full object-contain">
            <div class="p-10 text-center">
                <h3 class="font-black text-3xl mb-4">${book.title}</h3>
                <button onclick="openReaderByIndex(${index})" class="bg-purple-600 text-white font-black px-12 py-4 rounded-full shadow-lg text-xl">Read Now</button>
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
    initGameEmbeds();
    initGameLauncher();
    initFirebaseAuth();
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

    document.addEventListener('keydown', handleReaderKeyNavigation);
    initReaderSwipeNavigation();
    initReaderPageJump();

    initApp();
});