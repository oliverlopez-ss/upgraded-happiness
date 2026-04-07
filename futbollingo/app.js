// === XP & Levels ===
const XP_PER_CORRECT = 10;
const XP_PER_STREAK_BONUS = 5;
const XP_PER_SENTENCE = 15;

const LEVELS = [
    { level: 1, title: 'Bollkalle', xpNeeded: 0 },
    { level: 2, title: 'Ungdomsspelare', xpNeeded: 50 },
    { level: 3, title: 'Reserv', xpNeeded: 150 },
    { level: 4, title: 'Startspelare', xpNeeded: 300 },
    { level: 5, title: 'Nyckelspelare', xpNeeded: 500 },
    { level: 6, title: 'Lagkapten', xpNeeded: 800 },
    { level: 7, title: 'Stjärnspelare', xpNeeded: 1200 },
    { level: 8, title: 'Landslagsspelare', xpNeeded: 1800 },
    { level: 9, title: 'Världsstjärna', xpNeeded: 2500 },
    { level: 10, title: 'Ballon d\'Or', xpNeeded: 3500 },
];

function getLevelInfo(xp) {
    let current = LEVELS[0];
    let next = LEVELS[1];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].xpNeeded) {
            current = LEVELS[i];
            next = LEVELS[i + 1] || null;
            break;
        }
    }
    const xpInLevel = xp - current.xpNeeded;
    const xpForNext = next ? next.xpNeeded - current.xpNeeded : 1;
    const progress = next ? xpInLevel / xpForNext : 1;
    return { current, next, xpInLevel, xpForNext, progress };
}

// === State ===
const state = {
    selectedCategory: 'all',
    selectedMode: 'flashcard',
    currentWords: [],
    currentSentences: [],
    currentTactics: [],
    currentIndex: 0,
    streak: 0,
    bestStreak: 0,
    sessionCorrect: 0,
    sessionWrong: 0,
    sessionResults: [],
    sessionXP: 0,
    masteredWords: new Set(),
    wordScores: {},
    totalXP: 0,
};

const WORDS_PER_SESSION = 15;
const SENTENCES_PER_SESSION = 8;

// === Persistence ===
function loadProgress() {
    try {
        const saved = localStorage.getItem('futbollingo-progress');
        if (saved) {
            const data = JSON.parse(saved);
            state.masteredWords = new Set(data.mastered || []);
            state.wordScores = data.scores || {};
            state.bestStreak = data.bestStreak || 0;
            state.totalXP = data.totalXP || 0;
        }
    } catch (e) {
        // ignore
    }
}

function saveProgress() {
    try {
        localStorage.setItem('futbollingo-progress', JSON.stringify({
            mastered: [...state.masteredWords],
            scores: state.wordScores,
            bestStreak: state.bestStreak,
            totalXP: state.totalXP,
        }));
    } catch (e) {
        // ignore
    }
}

// === XP Helpers ===
function awardXP(amount) {
    const oldLevel = getLevelInfo(state.totalXP).current.level;
    state.totalXP += amount;
    state.sessionXP += amount;
    const newLevel = getLevelInfo(state.totalXP).current.level;
    saveProgress();
    if (newLevel > oldLevel) {
        showLevelUp(getLevelInfo(state.totalXP).current);
    }
}

function showLevelUp(levelData) {
    const overlay = document.getElementById('levelup-overlay');
    document.getElementById('levelup-level').textContent = `Nivå ${levelData.level}`;
    document.getElementById('levelup-title').textContent = levelData.title;
    overlay.classList.add('active');
    launchConfetti();
    setTimeout(() => overlay.classList.remove('active'), 3000);
}

// === Helpers ===
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getWordsByCategory(category) {
    if (category === 'all') return [...VOCABULARY];
    return VOCABULARY.filter(w => w.category === category);
}

function getSentencesByCategory(category) {
    if (category === 'all') return [...SENTENCES];
    return SENTENCES.filter(s => s.category === category);
}

function selectSessionWords(category) {
    const pool = getWordsByCategory(category);
    pool.sort((a, b) => {
        const scoreA = state.wordScores[a.es] || 0;
        const scoreB = state.wordScores[b.es] || 0;
        return scoreA - scoreB;
    });
    const weak = pool.slice(0, Math.ceil(WORDS_PER_SESSION * 0.6));
    const rest = shuffle(pool.slice(weak.length)).slice(0, WORDS_PER_SESSION - weak.length);
    return shuffle([...weak, ...rest]).slice(0, WORDS_PER_SESSION);
}

function selectSessionSentences(category) {
    const pool = getSentencesByCategory(category);
    return shuffle(pool).slice(0, SENTENCES_PER_SESSION);
}

function getCategoryName(cat) {
    const names = {
        all: 'Alla ord',
        utrustning: 'Utrustning',
        plan: 'Planen',
        positioner: 'Positioner',
        aktioner: 'Aktioner',
        passningar: 'Passningar & löpningar',
        forsvar: 'Försvar',
        kommandon: 'Rop & kommandon',
        match: 'Match & resultat',
        traning: 'Träning',
        kropp: 'Kropp & skador',
        fraser: 'Vanliga fraser',
    };
    return names[cat] || cat;
}

function normalize(str) {
    return str.toLowerCase()
        .replace(/[¡¿!?.,:;'"()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// === Screen Management ===
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// === Init Start Screen ===
function initStartScreen() {
    loadProgress();
    updateCategoryCounts();
    updateStats();
    updateXPDisplay();

    // Category selection
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.selectedCategory = btn.dataset.category;
        });
    });

    document.querySelector('[data-category="all"]').classList.add('selected');

    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedMode = btn.dataset.mode;
        });
    });

    document.getElementById('start-btn').addEventListener('click', startSession);
}

function updateCategoryCounts() {
    const categories = ['all', 'utrustning', 'plan', 'positioner', 'aktioner', 'passningar', 'forsvar', 'kommandon', 'match', 'traning', 'kropp', 'fraser'];
    categories.forEach(cat => {
        const el = document.getElementById(`count-${cat}`);
        if (el) {
            const words = getWordsByCategory(cat);
            const mastered = words.filter(w => state.masteredWords.has(w.es)).length;
            el.textContent = `${mastered}/${words.length}`;
        }
    });
}

function updateStats() {
    document.getElementById('stat-streak').textContent = state.bestStreak;
    document.getElementById('stat-mastered').textContent = state.masteredWords.size;
    document.getElementById('stat-total').textContent = VOCABULARY.length;
}

function updateXPDisplay() {
    const info = getLevelInfo(state.totalXP);
    document.getElementById('xp-level').textContent = `Nivå ${info.current.level}`;
    document.getElementById('xp-title').textContent = info.current.title;
    document.getElementById('xp-amount').textContent = `${state.totalXP} XP`;
    const fill = document.getElementById('xp-fill');
    fill.style.width = (info.progress * 100) + '%';
    const nextText = document.getElementById('xp-next');
    if (info.next) {
        nextText.textContent = `${info.xpInLevel}/${info.xpForNext} XP till ${info.next.title}`;
    } else {
        nextText.textContent = 'Max nivå uppnådd!';
    }
}

// === Session ===
function startSession() {
    state.currentIndex = 0;
    state.streak = 0;
    state.sessionCorrect = 0;
    state.sessionWrong = 0;
    state.sessionResults = [];
    state.sessionXP = 0;

    if (state.selectedMode === 'sentences') {
        state.currentSentences = selectSessionSentences(state.selectedCategory);
        startSentences();
    } else if (state.selectedMode === 'tactics') {
        state.currentTactics = shuffle([...TACTICAL_SCENARIOS]);
        startTactics();
    } else {
        state.currentWords = selectSessionWords(state.selectedCategory);
        switch (state.selectedMode) {
            case 'flashcard': startFlashcards(); break;
            case 'quiz': startQuiz(); break;
            case 'write': startWrite(); break;
            case 'listen': startListen(); break;
        }
    }
}

// === Flashcards ===
function startFlashcards() {
    showScreen('flashcard-screen');
    showFlashcard();

    const flashcard = document.getElementById('flashcard');
    flashcard.onclick = () => flashcard.classList.toggle('flipped');
    flashcard.onkeydown = (e) => {
        if (e.key === ' ' || e.key === 'Enter') flashcard.classList.toggle('flipped');
    };

    document.getElementById('btn-wrong').onclick = () => rateCard(0);
    document.getElementById('btn-ok').onclick = () => rateCard(1);
    document.getElementById('btn-correct').onclick = () => rateCard(2);
    document.getElementById('back-btn').onclick = () => goHome();
}

function showFlashcard() {
    if (state.currentIndex >= state.currentWords.length) {
        showResults();
        return;
    }

    const word = state.currentWords[state.currentIndex];
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.remove('flipped');

    document.getElementById('card-category').textContent = getCategoryName(word.category);
    document.getElementById('card-front-word').textContent = word.es;
    document.getElementById('card-hint').textContent = 'Tryck för att vända';
    document.getElementById('card-back-word').textContent = word.sv;
    document.getElementById('card-example').textContent = word.example;
    document.getElementById('card-context').textContent = word.context;

    updateProgress('progress-fill', 'progress-text', 'current-streak');
}

function rateCard(rating) {
    const word = state.currentWords[state.currentIndex];

    if (rating === 2) {
        state.sessionCorrect++;
        state.streak++;
        state.sessionResults.push({ word, correct: true });
        const score = (state.wordScores[word.es] || 0) + 1;
        state.wordScores[word.es] = score;
        if (score >= 3) state.masteredWords.add(word.es);
        awardXP(XP_PER_CORRECT + (state.streak >= 3 ? XP_PER_STREAK_BONUS : 0));
    } else if (rating === 0) {
        state.sessionWrong++;
        state.streak = 0;
        state.sessionResults.push({ word, correct: false });
        state.wordScores[word.es] = 0;
        state.masteredWords.delete(word.es);
    } else {
        state.sessionResults.push({ word, correct: false });
    }

    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    saveProgress();

    state.currentIndex++;
    showFlashcard();
}

// === Quiz ===
function startQuiz() {
    showScreen('quiz-screen');
    showQuizQuestion();

    document.querySelector('.quiz-back-btn').onclick = () => goHome();
}

function showQuizQuestion() {
    if (state.currentIndex >= state.currentWords.length) {
        showResults();
        return;
    }

    const word = state.currentWords[state.currentIndex];
    const feedback = document.getElementById('quiz-feedback');
    const nextBtn = document.getElementById('quiz-next');
    feedback.className = 'quiz-feedback';
    feedback.style.display = 'none';
    nextBtn.style.display = 'none';

    const estoSv = Math.random() > 0.5;

    if (estoSv) {
        document.getElementById('quiz-question').textContent = 'Vad betyder detta på svenska?';
        document.getElementById('quiz-prompt').textContent = word.es;
    } else {
        document.getElementById('quiz-question').textContent = 'Vad heter detta på spanska?';
        document.getElementById('quiz-prompt').textContent = word.sv;
    }

    const correctAnswer = estoSv ? word.sv : word.es;
    const distractors = shuffle(VOCABULARY.filter(w => w.es !== word.es))
        .slice(0, 3)
        .map(w => estoSv ? w.sv : w.es);

    const options = shuffle([correctAnswer, ...distractors]);

    const optionsEl = document.getElementById('quiz-options');
    optionsEl.innerHTML = '';

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt;
        btn.onclick = () => handleQuizAnswer(btn, opt, correctAnswer, word);
        optionsEl.appendChild(btn);
    });

    updateProgress('quiz-progress-fill', 'quiz-progress-text', 'quiz-streak');
}

function handleQuizAnswer(btn, selected, correct, word) {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(o => o.classList.add('disabled'));

    const feedback = document.getElementById('quiz-feedback');
    const nextBtn = document.getElementById('quiz-next');

    if (selected === correct) {
        btn.classList.add('correct');
        feedback.className = 'quiz-feedback correct';
        feedback.textContent = `Rätt! "${word.example}" - ${word.context}`;
        state.sessionCorrect++;
        state.streak++;
        state.sessionResults.push({ word, correct: true });
        const score = (state.wordScores[word.es] || 0) + 1;
        state.wordScores[word.es] = score;
        if (score >= 3) state.masteredWords.add(word.es);
        btn.classList.add('pop');
        awardXP(XP_PER_CORRECT + (state.streak >= 3 ? XP_PER_STREAK_BONUS : 0));
    } else {
        btn.classList.add('wrong');
        feedback.className = 'quiz-feedback wrong';
        feedback.textContent = `Rätt svar: ${correct}`;
        state.sessionWrong++;
        state.streak = 0;
        state.sessionResults.push({ word, correct: false });
        state.wordScores[word.es] = Math.max(0, (state.wordScores[word.es] || 0) - 1);
        state.masteredWords.delete(word.es);
        options.forEach(o => {
            if (o.textContent === correct) o.classList.add('correct');
        });
        btn.classList.add('shake');
    }

    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    saveProgress();

    nextBtn.style.display = 'block';
    nextBtn.onclick = () => {
        state.currentIndex++;
        showQuizQuestion();
    };

    updateProgress('quiz-progress-fill', 'quiz-progress-text', 'quiz-streak');
}

// === Write ===
function startWrite() {
    showScreen('write-screen');
    showWriteQuestion();

    document.querySelector('.write-back-btn').onclick = () => goHome();
}

function showWriteQuestion() {
    if (state.currentIndex >= state.currentWords.length) {
        showResults();
        return;
    }

    const word = state.currentWords[state.currentIndex];
    const input = document.getElementById('write-input');
    const feedback = document.getElementById('write-feedback');
    const checkBtn = document.getElementById('write-check');
    const nextBtn = document.getElementById('write-next');

    input.value = '';
    input.className = 'write-input';
    input.disabled = false;
    input.focus();
    feedback.className = 'write-feedback';
    feedback.style.display = 'none';
    checkBtn.style.display = 'block';
    nextBtn.style.display = 'none';

    const estoSv = Math.random() > 0.5;

    if (estoSv) {
        document.getElementById('write-direction').textContent = 'Skriv på svenska';
        document.getElementById('write-word').textContent = word.es;
    } else {
        document.getElementById('write-direction').textContent = 'Skriv på spanska';
        document.getElementById('write-word').textContent = word.sv;
    }

    const correctAnswer = estoSv ? word.sv : word.es;

    checkBtn.onclick = () => checkWriteAnswer(input, correctAnswer, word, feedback, checkBtn, nextBtn);
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !input.disabled) {
            checkWriteAnswer(input, correctAnswer, word, feedback, checkBtn, nextBtn);
        }
    };

    nextBtn.onclick = () => {
        state.currentIndex++;
        showWriteQuestion();
    };

    updateProgress('write-progress-fill', 'write-progress-text', 'write-streak');
}

function checkWriteAnswer(input, correct, word, feedback, checkBtn, nextBtn) {
    const answer = normalize(input.value);
    const expected = normalize(correct);

    input.disabled = true;
    checkBtn.style.display = 'none';

    if (answer === expected) {
        input.className = 'write-input correct';
        feedback.className = 'write-feedback correct';
        feedback.textContent = `Rätt! "${word.example}" - ${word.context}`;
        state.sessionCorrect++;
        state.streak++;
        state.sessionResults.push({ word, correct: true });
        const score = (state.wordScores[word.es] || 0) + 1;
        state.wordScores[word.es] = score;
        if (score >= 3) state.masteredWords.add(word.es);
        awardXP(XP_PER_CORRECT + (state.streak >= 3 ? XP_PER_STREAK_BONUS : 0));
    } else {
        input.className = 'write-input wrong';
        feedback.className = 'write-feedback wrong';
        feedback.textContent = `Rätt svar: ${correct}`;
        state.sessionWrong++;
        state.streak = 0;
        state.sessionResults.push({ word, correct: false });
        state.wordScores[word.es] = Math.max(0, (state.wordScores[word.es] || 0) - 1);
        state.masteredWords.delete(word.es);
        input.classList.add('shake');
    }

    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    saveProgress();
    nextBtn.style.display = 'block';

    updateProgress('write-progress-fill', 'write-progress-text', 'write-streak');
}

// === Listen ===
function startListen() {
    showScreen('listen-screen');
    showListenQuestion();

    document.querySelector('.listen-back-btn').onclick = () => goHome();
}

function speakWord(text, rate = 1) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = rate;
        utterance.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(v => v.lang.startsWith('es'));
        if (spanishVoice) utterance.voice = spanishVoice;

        window.speechSynthesis.speak(utterance);
    }
}

function showListenQuestion() {
    if (state.currentIndex >= state.currentWords.length) {
        showResults();
        return;
    }

    const word = state.currentWords[state.currentIndex];
    const input = document.getElementById('listen-input');
    const feedback = document.getElementById('listen-feedback');
    const checkBtn = document.getElementById('listen-check');
    const nextBtn = document.getElementById('listen-next');

    input.value = '';
    input.className = 'write-input';
    input.disabled = false;
    input.focus();
    feedback.className = 'write-feedback';
    feedback.style.display = 'none';
    checkBtn.style.display = 'block';
    nextBtn.style.display = 'none';

    setTimeout(() => speakWord(word.es), 300);

    document.getElementById('listen-play').onclick = () => speakWord(word.es);
    document.getElementById('listen-slow').onclick = () => speakWord(word.es, 0.5);

    checkBtn.onclick = () => checkListenAnswer(input, word, feedback, checkBtn, nextBtn);
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !input.disabled) {
            checkListenAnswer(input, word, feedback, checkBtn, nextBtn);
        }
    };

    nextBtn.onclick = () => {
        state.currentIndex++;
        showListenQuestion();
    };

    updateProgress('listen-progress-fill', 'listen-progress-text', 'listen-streak');
}

function checkListenAnswer(input, word, feedback, checkBtn, nextBtn) {
    const answer = normalize(input.value);
    const expected = normalize(word.es);

    input.disabled = true;
    checkBtn.style.display = 'none';

    if (answer === expected) {
        input.className = 'write-input correct';
        feedback.className = 'write-feedback correct';
        feedback.textContent = `Rätt! ${word.es} = ${word.sv}`;
        state.sessionCorrect++;
        state.streak++;
        state.sessionResults.push({ word, correct: true });
        const score = (state.wordScores[word.es] || 0) + 1;
        state.wordScores[word.es] = score;
        if (score >= 3) state.masteredWords.add(word.es);
        awardXP(XP_PER_CORRECT + (state.streak >= 3 ? XP_PER_STREAK_BONUS : 0));
    } else {
        input.className = 'write-input wrong';
        feedback.className = 'write-feedback wrong';
        feedback.textContent = `Rätt svar: ${word.es} (${word.sv})`;
        state.sessionWrong++;
        state.streak = 0;
        state.sessionResults.push({ word, correct: false });
        state.wordScores[word.es] = Math.max(0, (state.wordScores[word.es] || 0) - 1);
        state.masteredWords.delete(word.es);
        input.classList.add('shake');
    }

    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    saveProgress();
    nextBtn.style.display = 'block';

    updateProgress('listen-progress-fill', 'listen-progress-text', 'listen-streak');
}

// === Sentences Mode ===
function startSentences() {
    showScreen('sentence-screen');
    showSentenceQuestion();

    document.querySelector('.sentence-back-btn').onclick = () => goHome();
}

function showSentenceQuestion() {
    if (state.currentIndex >= state.currentSentences.length) {
        showResults();
        return;
    }

    const sentence = state.currentSentences[state.currentIndex];
    const feedback = document.getElementById('sentence-feedback');
    const nextBtn = document.getElementById('sentence-next');
    feedback.className = 'quiz-feedback';
    feedback.style.display = 'none';
    nextBtn.style.display = 'none';

    // Show the situation/context
    document.getElementById('sentence-situation').textContent = sentence.situation;

    // Decide direction
    const showSpanish = Math.random() > 0.4; // More often show Spanish (harder)

    if (showSpanish) {
        document.getElementById('sentence-direction').textContent = 'Vad betyder denna mening?';
        document.getElementById('sentence-prompt').textContent = sentence.es;
    } else {
        document.getElementById('sentence-direction').textContent = 'Hur säger man detta på spanska?';
        document.getElementById('sentence-prompt').textContent = sentence.sv;
    }

    const correctAnswer = showSpanish ? sentence.sv : sentence.es;

    // Generate distractors from same category if possible
    const pool = SENTENCES.filter(s => s.es !== sentence.es);
    const distractors = shuffle(pool)
        .slice(0, 3)
        .map(s => showSpanish ? s.sv : s.es);

    const options = shuffle([correctAnswer, ...distractors]);

    const optionsEl = document.getElementById('sentence-options');
    optionsEl.innerHTML = '';

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt;
        btn.onclick = () => handleSentenceAnswer(btn, opt, correctAnswer, sentence);
        optionsEl.appendChild(btn);
    });

    updateProgress('sentence-progress-fill', 'sentence-progress-text', 'sentence-streak');
}

function handleSentenceAnswer(btn, selected, correct, sentence) {
    const options = document.querySelectorAll('#sentence-options .quiz-option');
    options.forEach(o => o.classList.add('disabled'));

    const feedback = document.getElementById('sentence-feedback');
    const nextBtn = document.getElementById('sentence-next');

    if (selected === correct) {
        btn.classList.add('correct');
        feedback.className = 'quiz-feedback correct';
        feedback.innerHTML = `Rätt! <span class="sentence-tip">${sentence.tip || ''}</span>`;
        state.sessionCorrect++;
        state.streak++;
        state.sessionResults.push({ word: { es: sentence.es, sv: sentence.sv }, correct: true });
        btn.classList.add('pop');
        awardXP(XP_PER_SENTENCE + (state.streak >= 3 ? XP_PER_STREAK_BONUS : 0));
    } else {
        btn.classList.add('wrong');
        feedback.className = 'quiz-feedback wrong';
        feedback.textContent = `Rätt svar: ${correct}`;
        state.sessionWrong++;
        state.streak = 0;
        state.sessionResults.push({ word: { es: sentence.es, sv: sentence.sv }, correct: false });
        options.forEach(o => {
            if (o.textContent === correct) o.classList.add('correct');
        });
        btn.classList.add('shake');
    }

    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    saveProgress();

    nextBtn.style.display = 'block';
    nextBtn.onclick = () => {
        state.currentIndex++;
        showSentenceQuestion();
    };

    updateProgress('sentence-progress-fill', 'sentence-progress-text', 'sentence-streak');
}

// === Tactics Mode ===
function renderPitch(svg, scenario) {
    const ns = 'http://www.w3.org/2000/svg';
    svg.innerHTML = '';

    // Pitch dimensions in viewBox: 500 x 320
    const W = 500, H = 320;

    // Defs for gradients and markers
    const defs = document.createElementNS(ns, 'defs');

    // Pitch gradient (vertical stripes)
    const stripeCount = 10;
    for (let i = 0; i < stripeCount; i++) {
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', i * (W / stripeCount));
        rect.setAttribute('y', 0);
        rect.setAttribute('width', W / stripeCount);
        rect.setAttribute('height', H);
        rect.setAttribute('fill', i % 2 === 0 ? '#1a472a' : '#1e5232');
        svg.appendChild(rect);
    }

    // Arrow markers
    const markerPass = document.createElementNS(ns, 'marker');
    markerPass.setAttribute('id', 'arrowPass');
    markerPass.setAttribute('markerWidth', '8');
    markerPass.setAttribute('markerHeight', '8');
    markerPass.setAttribute('refX', '7');
    markerPass.setAttribute('refY', '4');
    markerPass.setAttribute('orient', 'auto');
    const arrowPath = document.createElementNS(ns, 'path');
    arrowPath.setAttribute('d', 'M0,1 L7,4 L0,7 Z');
    arrowPath.setAttribute('fill', '#fbbf24');
    markerPass.appendChild(arrowPath);
    defs.appendChild(markerPass);

    const markerRun = document.createElementNS(ns, 'marker');
    markerRun.setAttribute('id', 'arrowRun');
    markerRun.setAttribute('markerWidth', '8');
    markerRun.setAttribute('markerHeight', '8');
    markerRun.setAttribute('refX', '7');
    markerRun.setAttribute('refY', '4');
    markerRun.setAttribute('orient', 'auto');
    const arrowPath2 = document.createElementNS(ns, 'path');
    arrowPath2.setAttribute('d', 'M0,1 L7,4 L0,7 Z');
    arrowPath2.setAttribute('fill', '#38bdf8');
    markerRun.appendChild(arrowPath2);
    defs.appendChild(markerRun);

    const markerPress = document.createElementNS(ns, 'marker');
    markerPress.setAttribute('id', 'arrowPress');
    markerPress.setAttribute('markerWidth', '8');
    markerPress.setAttribute('markerHeight', '8');
    markerPress.setAttribute('refX', '7');
    markerPress.setAttribute('refY', '4');
    markerPress.setAttribute('orient', 'auto');
    const arrowPath3 = document.createElementNS(ns, 'path');
    arrowPath3.setAttribute('d', 'M0,1 L7,4 L0,7 Z');
    arrowPath3.setAttribute('fill', '#f87171');
    markerPress.appendChild(arrowPath3);
    defs.appendChild(markerPress);

    svg.appendChild(defs);

    // Pitch lines
    const lines = document.createElementNS(ns, 'g');
    lines.setAttribute('stroke', 'rgba(255,255,255,0.35)');
    lines.setAttribute('stroke-width', '1.5');
    lines.setAttribute('fill', 'none');

    // Outer border
    const border = document.createElementNS(ns, 'rect');
    border.setAttribute('x', '10'); border.setAttribute('y', '10');
    border.setAttribute('width', W - 20); border.setAttribute('height', H - 20);
    border.setAttribute('rx', '2');
    lines.appendChild(border);

    // Halfway line
    const half = document.createElementNS(ns, 'line');
    half.setAttribute('x1', W/2); half.setAttribute('y1', '10');
    half.setAttribute('x2', W/2); half.setAttribute('y2', H - 10);
    lines.appendChild(half);

    // Center circle
    const cc = document.createElementNS(ns, 'circle');
    cc.setAttribute('cx', W/2); cc.setAttribute('cy', H/2); cc.setAttribute('r', '35');
    lines.appendChild(cc);

    // Center dot
    const cd = document.createElementNS(ns, 'circle');
    cd.setAttribute('cx', W/2); cd.setAttribute('cy', H/2); cd.setAttribute('r', '3');
    cd.setAttribute('fill', 'rgba(255,255,255,0.35)');
    lines.appendChild(cd);

    // Left penalty area
    const lpa = document.createElementNS(ns, 'rect');
    lpa.setAttribute('x', '10'); lpa.setAttribute('y', H/2 - 65);
    lpa.setAttribute('width', '65'); lpa.setAttribute('height', '130');
    lines.appendChild(lpa);

    // Left goal area
    const lga = document.createElementNS(ns, 'rect');
    lga.setAttribute('x', '10'); lga.setAttribute('y', H/2 - 30);
    lga.setAttribute('width', '25'); lga.setAttribute('height', '60');
    lines.appendChild(lga);

    // Right penalty area
    const rpa = document.createElementNS(ns, 'rect');
    rpa.setAttribute('x', W - 75); rpa.setAttribute('y', H/2 - 65);
    rpa.setAttribute('width', '65'); rpa.setAttribute('height', '130');
    lines.appendChild(rpa);

    // Right goal area
    const rga = document.createElementNS(ns, 'rect');
    rga.setAttribute('x', W - 35); rga.setAttribute('y', H/2 - 30);
    rga.setAttribute('width', '25'); rga.setAttribute('height', '60');
    lines.appendChild(rga);

    // Left goal
    const lg = document.createElementNS(ns, 'rect');
    lg.setAttribute('x', '2'); lg.setAttribute('y', H/2 - 18);
    lg.setAttribute('width', '8'); lg.setAttribute('height', '36');
    lg.setAttribute('stroke', 'rgba(255,255,255,0.5)');
    lg.setAttribute('rx', '1');
    lines.appendChild(lg);

    // Right goal
    const rg = document.createElementNS(ns, 'rect');
    rg.setAttribute('x', W - 10); rg.setAttribute('y', H/2 - 18);
    rg.setAttribute('width', '8'); rg.setAttribute('height', '36');
    rg.setAttribute('stroke', 'rgba(255,255,255,0.5)');
    rg.setAttribute('rx', '1');
    lines.appendChild(rg);

    svg.appendChild(lines);

    // Arrows
    scenario.arrows.forEach(a => {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', a.fromX * W / 100);
        line.setAttribute('y1', a.fromY * H / 100);
        line.setAttribute('x2', a.toX * W / 100);
        line.setAttribute('y2', a.toY * H / 100);
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('stroke-linecap', 'round');

        if (a.type === 'pass') {
            line.setAttribute('stroke', '#fbbf24');
            line.setAttribute('marker-end', 'url(#arrowPass)');
        } else if (a.type === 'run') {
            line.setAttribute('stroke', '#38bdf8');
            line.setAttribute('stroke-dasharray', '6,4');
            line.setAttribute('marker-end', 'url(#arrowRun)');
            line.style.animation = 'arrowDash 0.8s linear infinite';
        } else if (a.type === 'press') {
            line.setAttribute('stroke', '#f87171');
            line.setAttribute('stroke-dasharray', '4,3');
            line.setAttribute('marker-end', 'url(#arrowPress)');
            line.style.animation = 'arrowDash 0.6s linear infinite';
        }

        svg.appendChild(line);
    });

    // Home players (bright green/cyan)
    scenario.homePlayers.forEach(p => {
        const g = document.createElementNS(ns, 'g');
        const px = p.x * W / 100;
        const py = p.y * H / 100;

        // Glow
        if (p.hasBall || p.highlight) {
            const glow = document.createElementNS(ns, 'circle');
            glow.setAttribute('cx', px); glow.setAttribute('cy', py);
            glow.setAttribute('r', '16');
            glow.setAttribute('fill', p.hasBall ? 'rgba(251, 191, 36, 0.3)' : 'rgba(74, 222, 128, 0.3)');
            g.appendChild(glow);
        }

        // Circle
        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('cx', px); circle.setAttribute('cy', py);
        circle.setAttribute('r', '12');
        circle.setAttribute('fill', p.role === 'gk' ? '#06b6d4' : '#22c55e');
        circle.setAttribute('stroke', '#fff');
        circle.setAttribute('stroke-width', '1.5');
        if (p.hasBall) {
            circle.setAttribute('fill', '#eab308');
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '2');
        }
        g.appendChild(circle);

        // Number
        const text = document.createElementNS(ns, 'text');
        text.setAttribute('x', px); text.setAttribute('y', py + 1);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('fill', '#000');
        text.setAttribute('font-size', '10');
        text.setAttribute('font-weight', '800');
        text.setAttribute('font-family', 'Inter, sans-serif');
        text.textContent = p.num;
        g.appendChild(text);

        svg.appendChild(g);
    });

    // Away players (dark/red)
    scenario.awayPlayers.forEach(p => {
        const g = document.createElementNS(ns, 'g');
        const px = p.x * W / 100;
        const py = p.y * H / 100;

        if (p.hasBall) {
            const glow = document.createElementNS(ns, 'circle');
            glow.setAttribute('cx', px); glow.setAttribute('cy', py);
            glow.setAttribute('r', '16');
            glow.setAttribute('fill', 'rgba(251, 191, 36, 0.3)');
            g.appendChild(glow);
        }
        if (p.highlight) {
            const glow = document.createElementNS(ns, 'circle');
            glow.setAttribute('cx', px); glow.setAttribute('cy', py);
            glow.setAttribute('r', '16');
            glow.setAttribute('fill', 'rgba(248, 113, 113, 0.3)');
            g.appendChild(glow);
        }

        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('cx', px); circle.setAttribute('cy', py);
        circle.setAttribute('r', '12');
        circle.setAttribute('fill', p.role === 'gk' ? '#a855f7' : '#dc2626');
        circle.setAttribute('stroke', 'rgba(255,255,255,0.6)');
        circle.setAttribute('stroke-width', '1.5');
        if (p.hasBall) {
            circle.setAttribute('fill', '#eab308');
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '2');
        }
        g.appendChild(circle);

        const text = document.createElementNS(ns, 'text');
        text.setAttribute('x', px); text.setAttribute('y', py + 1);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-size', '10');
        text.setAttribute('font-weight', '800');
        text.setAttribute('font-family', 'Inter, sans-serif');
        text.textContent = p.num;
        g.appendChild(text);

        svg.appendChild(g);
    });
}

function startTactics() {
    showScreen('tactic-screen');
    showTacticQuestion();

    document.querySelector('.tactic-back-btn').onclick = () => goHome();
}

function showTacticQuestion() {
    if (state.currentIndex >= state.currentTactics.length) {
        showResults();
        return;
    }

    const scenario = state.currentTactics[state.currentIndex];
    const feedback = document.getElementById('tactic-feedback');
    const nextBtn = document.getElementById('tactic-next');
    feedback.className = 'quiz-feedback';
    feedback.style.display = 'none';
    nextBtn.style.display = 'none';

    document.getElementById('tactic-title').textContent = scenario.title;
    document.getElementById('tactic-situation').textContent = scenario.situation;
    document.getElementById('tactic-question').textContent = scenario.question;

    // Render pitch
    const svg = document.getElementById('pitch-svg');
    renderPitch(svg, scenario);

    // Options
    const optionsEl = document.getElementById('tactic-options');
    optionsEl.innerHTML = '';

    scenario.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt;
        btn.onclick = () => handleTacticAnswer(btn, idx, scenario);
        optionsEl.appendChild(btn);
    });

    updateProgress('tactic-progress-fill', 'tactic-progress-text', 'tactic-streak');
}

function handleTacticAnswer(btn, selectedIdx, scenario) {
    const options = document.querySelectorAll('#tactic-options .quiz-option');
    options.forEach(o => o.classList.add('disabled'));

    const feedback = document.getElementById('tactic-feedback');
    const nextBtn = document.getElementById('tactic-next');
    const isCorrect = selectedIdx === scenario.correctIndex;

    if (isCorrect) {
        btn.classList.add('correct');
        feedback.className = 'quiz-feedback correct';
        feedback.textContent = scenario.explanation;
        state.sessionCorrect++;
        state.streak++;
        state.sessionResults.push({ word: { es: scenario.options[scenario.correctIndex], sv: scenario.title }, correct: true });
        btn.classList.add('pop');
        awardXP(XP_PER_SENTENCE + (state.streak >= 3 ? XP_PER_STREAK_BONUS : 0));
    } else {
        btn.classList.add('wrong');
        feedback.className = 'quiz-feedback wrong';
        feedback.textContent = `Rätt svar: ${scenario.options[scenario.correctIndex]}. ${scenario.explanation}`;
        state.sessionWrong++;
        state.streak = 0;
        state.sessionResults.push({ word: { es: scenario.options[scenario.correctIndex], sv: scenario.title }, correct: false });
        options.forEach((o, i) => {
            if (i === scenario.correctIndex) o.classList.add('correct');
        });
        btn.classList.add('shake');
    }

    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    saveProgress();

    nextBtn.style.display = 'block';
    nextBtn.onclick = () => {
        state.currentIndex++;
        showTacticQuestion();
    };

    updateProgress('tactic-progress-fill', 'tactic-progress-text', 'tactic-streak');
}

// === Progress ===
function updateProgress(fillId, textId, streakId) {
    const items = state.selectedMode === 'tactics' ? state.currentTactics
        : state.selectedMode === 'sentences' ? state.currentSentences
        : state.currentWords;
    const total = items.length;
    const current = state.currentIndex;
    const pct = total > 0 ? (current / total) * 100 : 0;

    document.getElementById(fillId).style.width = pct + '%';
    document.getElementById(textId).textContent = `${current}/${total}`;
    document.getElementById(streakId).textContent = state.streak;
}

// === Confetti ===
function launchConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#4ade80', '#38bdf8', '#fbbf24', '#fb923c', '#c084fc', '#f87171'];

    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = (Math.random() * 8 + 6) + 'px';
        piece.style.height = (Math.random() * 8 + 6) + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
        piece.style.animationDelay = (Math.random() * 0.5) + 's';
        container.appendChild(piece);

        setTimeout(() => piece.remove(), 4000);
    }
}

// === Results ===
function showResults() {
    showScreen('results-screen');
    launchConfetti();

    document.getElementById('result-correct').textContent = state.sessionCorrect;
    document.getElementById('result-wrong').textContent = state.sessionWrong;
    document.getElementById('result-streak').textContent = state.bestStreak;
    document.getElementById('result-xp').textContent = `+${state.sessionXP} XP`;

    const wordsEl = document.getElementById('results-words');
    wordsEl.innerHTML = '';

    state.sessionResults.forEach(({ word, correct }) => {
        const div = document.createElement('div');
        div.className = `result-word ${correct ? 'was-correct' : 'was-wrong'}`;
        div.innerHTML = `
            <span class="result-word-es">${word.es}</span>
            <span class="result-word-sv">${word.sv}</span>
        `;
        wordsEl.appendChild(div);
    });

    document.getElementById('results-restart').onclick = () => startSession();
    document.getElementById('results-home').onclick = () => goHome();
}

// === Navigation ===
function goHome() {
    updateCategoryCounts();
    updateStats();
    updateXPDisplay();
    showScreen('start-screen');
}

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
    initStartScreen();

    // Preload voices for speech synthesis
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
});
