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

// === Progress ===
function updateProgress(fillId, textId, streakId) {
    const items = state.selectedMode === 'sentences' ? state.currentSentences : state.currentWords;
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
