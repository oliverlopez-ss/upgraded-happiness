class SalesGame {
    constructor() {
        this.playerName = '';
        this.totalScore = 0;
        this.currentScenarioIndex = 0;
        this.currentStepIndex = 0;
        this.scenarioScore = 0;
        this.scenarioResults = [];
        this.dialogueHistory = [];
    }

    // Screen management
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    showStart() {
        this.showScreen('screen-start');
    }

    // Start the game
    start() {
        const nameInput = document.getElementById('player-name');
        this.playerName = nameInput.value.trim() || 'Säljare';
        this.totalScore = 0;
        this.currentScenarioIndex = 0;
        this.scenarioResults = [];
        this.loadScenario();
    }

    restart() {
        this.showScreen('screen-start');
    }

    // Load a scenario
    loadScenario() {
        if (this.currentScenarioIndex >= SCENARIOS.length) {
            this.showGameOver();
            return;
        }

        this.currentStepIndex = 0;
        this.scenarioScore = 0;
        this.dialogueHistory = [];

        const scenario = SCENARIOS[this.currentScenarioIndex];

        document.getElementById('scenario-label').textContent =
            `Scenario ${this.currentScenarioIndex + 1}/${SCENARIOS.length}`;

        this.showScreen('screen-game');
        this.renderContext(scenario);
        this.loadStep();
    }

    // Render scenario context/background
    renderContext(scenario) {
        const ctx = document.getElementById('scenario-context');
        ctx.innerHTML = `
            <h3>${scenario.title}</h3>
            <p>${scenario.description}</p>
            <div class="company-info">
                <strong>Kund:</strong> ${scenario.customer.company} &mdash;
                <strong>Kontakt:</strong> ${scenario.customer.name}, ${scenario.customer.role}
                ${scenario.customer.info ? `<br>${scenario.customer.info}` : ''}
            </div>
        `;
    }

    // Load current step
    loadStep() {
        const scenario = SCENARIOS[this.currentScenarioIndex];
        const step = scenario.steps[this.currentStepIndex];

        document.getElementById('step-label').textContent =
            `Steg ${this.currentStepIndex + 1}/${scenario.steps.length}`;
        document.getElementById('current-score').textContent = this.totalScore + this.scenarioScore;

        // Add customer dialogue
        const dialogueArea = document.getElementById('dialogue-area');

        if (this.currentStepIndex === 0) {
            dialogueArea.innerHTML = '';
        }

        if (step.customerDialogue) {
            this.addDialogueBubble(
                scenario.customer.name,
                step.customerDialogue,
                'customer'
            );
        }

        // Render interaction
        this.renderInteraction(step);
    }

    addDialogueBubble(speaker, text, type) {
        const dialogueArea = document.getElementById('dialogue-area');
        const bubble = document.createElement('div');
        bubble.className = `dialogue-bubble ${type}`;
        bubble.innerHTML = `
            <div class="dialogue-speaker">${speaker}</div>
            <div class="dialogue-text">${text}</div>
        `;
        dialogueArea.appendChild(bubble);
        bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Render the interaction area based on step type
    renderInteraction(step) {
        const area = document.getElementById('interaction-area');

        switch (step.type) {
            case 'choice':
                this.renderChoices(area, step);
                break;
            case 'freetext':
                this.renderFreetext(area, step);
                break;
            case 'dialogue-tree':
                this.renderDialogueTree(area, step);
                break;
            default:
                this.renderChoices(area, step);
        }
    }

    // Multiple choice
    renderChoices(area, step) {
        area.innerHTML = `
            <h4>${step.prompt}</h4>
            <div class="choice-list">
                ${step.choices.map((c, i) => `
                    <button class="choice-btn" onclick="game.selectChoice(${i})">
                        ${c.text}
                    </button>
                `).join('')}
            </div>
        `;
    }

    selectChoice(index) {
        const scenario = SCENARIOS[this.currentScenarioIndex];
        const step = scenario.steps[this.currentStepIndex];
        const choice = step.choices[index];

        // Show player response as dialogue
        this.addDialogueBubble('Du', choice.text, 'player');

        // Show feedback
        this.showFeedback(choice.points, choice.feedback, choice.tip);
    }

    // Free text input
    renderFreetext(area, step) {
        area.innerHTML = `
            <h4>${step.prompt}</h4>
            <div class="freetext-area">
                <textarea id="freetext-input" placeholder="${step.placeholder || 'Skriv ditt svar...'}"
                    maxlength="500"></textarea>
                <p class="freetext-hint">${step.hint || 'Skriv ett övertygande svar. Poäng baseras på nyckelbegrepp.'}</p>
                <div class="submit-row">
                    <button class="btn btn-primary" onclick="game.submitFreetext()">Skicka</button>
                </div>
            </div>
        `;
    }

    submitFreetext() {
        const input = document.getElementById('freetext-input');
        const text = input.value.trim();

        if (!text) return;

        const scenario = SCENARIOS[this.currentScenarioIndex];
        const step = scenario.steps[this.currentStepIndex];

        // Show player response
        this.addDialogueBubble('Du', text, 'player');

        // Evaluate with keywords
        const result = this.evaluateFreetext(text, step.evaluation);
        this.showFeedback(result.points, result.feedback, result.tip);
    }

    evaluateFreetext(text, evaluation) {
        const lowerText = text.toLowerCase();
        let points = evaluation.basePoints || 5;
        let matchedKeywords = [];

        for (const kw of evaluation.keywords) {
            const terms = Array.isArray(kw.term) ? kw.term : [kw.term];
            if (terms.some(t => lowerText.includes(t.toLowerCase()))) {
                points += kw.bonus;
                matchedKeywords.push(kw.label);
            }
        }

        // Cap points
        points = Math.min(points, evaluation.maxPoints || 30);
        points = Math.max(points, 0);

        let feedback;
        if (points >= (evaluation.maxPoints || 30) * 0.8) {
            feedback = evaluation.feedbackGreat || 'Utmärkt svar!';
        } else if (points >= (evaluation.maxPoints || 30) * 0.5) {
            feedback = evaluation.feedbackGood || 'Bra svar!';
        } else {
            feedback = evaluation.feedbackOk || 'Det finns förbättringspotential.';
        }

        if (matchedKeywords.length > 0) {
            feedback += ` Du använde: ${matchedKeywords.join(', ')}.`;
        }

        return {
            points,
            feedback,
            tip: evaluation.tip || ''
        };
    }

    // Dialogue tree
    renderDialogueTree(area, step) {
        area.innerHTML = `
            <h4>${step.prompt}</h4>
            <div class="choice-list">
                ${step.options.map((o, i) => `
                    <button class="choice-btn" onclick="game.selectDialogueOption(${i})">
                        ${o.text}
                    </button>
                `).join('')}
            </div>
        `;
    }

    selectDialogueOption(index) {
        const scenario = SCENARIOS[this.currentScenarioIndex];
        const step = scenario.steps[this.currentStepIndex];
        const option = step.options[index];

        // Show player choice
        this.addDialogueBubble('Du', option.text, 'player');

        // Show customer response if any
        if (option.response) {
            setTimeout(() => {
                this.addDialogueBubble(scenario.customer.name, option.response, 'customer');
            }, 400);
        }

        // Check if there's a follow-up
        if (option.followUp) {
            setTimeout(() => {
                const area = document.getElementById('interaction-area');
                area.innerHTML = `
                    <h4>${option.followUp.prompt}</h4>
                    <div class="choice-list">
                        ${option.followUp.options.map((fo, fi) => `
                            <button class="choice-btn" onclick="game.handleFollowUp(${index}, ${fi})">
                                ${fo.text}
                            </button>
                        `).join('')}
                    </div>
                `;
            }, 800);
        } else {
            setTimeout(() => {
                this.showFeedback(option.points, option.feedback, option.tip);
            }, option.response ? 800 : 0);
        }
    }

    handleFollowUp(parentIndex, followUpIndex) {
        const scenario = SCENARIOS[this.currentScenarioIndex];
        const step = scenario.steps[this.currentStepIndex];
        const followUp = step.options[parentIndex].followUp;
        const option = followUp.options[followUpIndex];

        this.addDialogueBubble('Du', option.text, 'player');

        if (option.response) {
            setTimeout(() => {
                this.addDialogueBubble(scenario.customer.name, option.response, 'customer');
            }, 400);
        }

        const totalPoints = (step.options[parentIndex].points || 0) + option.points;

        setTimeout(() => {
            this.showFeedback(totalPoints, option.feedback, option.tip);
        }, option.response ? 800 : 0);
    }

    // Feedback
    showFeedback(points, feedback, tip) {
        this.scenarioScore += points;

        const icon = document.getElementById('feedback-icon');
        const title = document.getElementById('feedback-title');
        const text = document.getElementById('feedback-text');
        const pointsEl = document.getElementById('feedback-points');
        const tipEl = document.getElementById('feedback-tip');

        if (points >= 20) {
            icon.textContent = '\u2B50';
            title.textContent = 'Utmärkt!';
        } else if (points >= 10) {
            icon.textContent = '\u2705';
            title.textContent = 'Bra jobbat!';
        } else if (points >= 5) {
            icon.textContent = '\uD83D\uDC4D';
            title.textContent = 'Okej!';
        } else {
            icon.textContent = '\uD83D\uDCA1';
            title.textContent = 'Nästa gång!';
        }

        text.textContent = feedback;
        pointsEl.textContent = `+${points} poäng`;

        if (tip) {
            tipEl.style.display = 'block';
            tipEl.innerHTML = `<strong>Tips:</strong> ${tip}`;
        } else {
            tipEl.style.display = 'none';
        }

        this.showScreen('screen-feedback');
    }

    // Go to next step
    nextStep() {
        this.currentStepIndex++;
        const scenario = SCENARIOS[this.currentScenarioIndex];

        if (this.currentStepIndex >= scenario.steps.length) {
            this.showScenarioComplete();
            return;
        }

        this.showScreen('screen-game');
        this.loadStep();
    }

    // Scenario complete
    showScenarioComplete() {
        const scenario = SCENARIOS[this.currentScenarioIndex];
        const maxPossible = scenario.maxScore || 100;
        const percentage = Math.round((this.scenarioScore / maxPossible) * 100);

        this.scenarioResults.push({
            title: scenario.title,
            score: this.scenarioScore,
            maxScore: maxPossible,
            percentage
        });

        this.totalScore += this.scenarioScore;

        const summary = document.getElementById('scenario-summary');
        let grade;
        if (percentage >= 80) grade = 'A - Toppklass!';
        else if (percentage >= 60) grade = 'B - Bra!';
        else if (percentage >= 40) grade = 'C - Godkänt';
        else grade = 'D - Behöver träning';

        summary.innerHTML = `
            <div class="summary-row">
                <span>${scenario.title}</span>
                <span>${grade}</span>
            </div>
            <div class="summary-row">
                <span>Poäng</span>
                <span>${this.scenarioScore} / ${maxPossible}</span>
            </div>
            <div class="summary-row">
                <span>Total poäng hittills</span>
                <span>${this.totalScore}</span>
            </div>
        `;

        this.showScreen('screen-scenario-complete');
    }

    nextScenario() {
        this.currentScenarioIndex++;
        this.loadScenario();
    }

    // Game over
    showGameOver() {
        const maxTotal = SCENARIOS.reduce((sum, s) => sum + (s.maxScore || 100), 0);
        const percentage = Math.round((this.totalScore / maxTotal) * 100);

        let rank;
        if (percentage >= 85) rank = 'Sales Director';
        else if (percentage >= 70) rank = 'Senior Account Executive';
        else if (percentage >= 55) rank = 'Account Executive';
        else if (percentage >= 40) rank = 'Sales Representative';
        else rank = 'Junior Trainee';

        const summary = document.getElementById('final-summary');
        summary.innerHTML = `
            <div class="final-total">${this.totalScore} poäng</div>
            <div class="final-grade">${percentage}% av max</div>
            <div class="final-rank">${rank}</div>
            <div class="final-breakdown">
                ${this.scenarioResults.map(r => `
                    <div class="summary-row">
                        <span>${r.title}</span>
                        <span>${r.score}/${r.maxScore}</span>
                    </div>
                `).join('')}
                <div class="summary-row">
                    <span>Totalt</span>
                    <span>${this.totalScore}/${maxTotal}</span>
                </div>
            </div>
        `;

        // Save to leaderboard
        this.saveScore(this.playerName, this.totalScore);

        this.showScreen('screen-gameover');
    }

    // Leaderboard
    saveScore(name, score) {
        const entries = this.getLeaderboard();
        entries.push({
            name,
            score,
            date: new Date().toLocaleDateString('sv-SE')
        });
        entries.sort((a, b) => b.score - a.score);
        const top10 = entries.slice(0, 10);
        localStorage.setItem('salesmaster-leaderboard', JSON.stringify(top10));
    }

    getLeaderboard() {
        const data = localStorage.getItem('salesmaster-leaderboard');
        return data ? JSON.parse(data) : [];
    }

    showLeaderboard() {
        const entries = this.getLeaderboard();
        const list = document.getElementById('leaderboard-list');

        if (entries.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted);">Inga resultat ännu. Spela en runda!</p>';
        } else {
            list.innerHTML = entries.map((e, i) => `
                <div class="leaderboard-entry">
                    <span class="leaderboard-rank">#${i + 1}</span>
                    <span class="leaderboard-name">${this.escapeHtml(e.name)}</span>
                    <span class="leaderboard-score">${e.score}</span>
                    <span class="leaderboard-date">${e.date}</span>
                </div>
            `).join('');
        }

        this.showScreen('screen-leaderboard');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const game = new SalesGame();
