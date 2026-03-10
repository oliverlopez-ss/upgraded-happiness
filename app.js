// ============================================================
// Structsales Revenue Architecture Diagnostic — Application
// ============================================================

// === State ===
const state = {
    currentUser: null,
    currentView: 'dashboard',
    stakeholders: [],
    interviews: [],
    gaps: [],
    detectedSignals: {},
    reportData: {},
    assessmentDay: 1,
    activities: [],
    // Live interview state
    liveInterview: null
};

// === Persistence (localStorage) ===
function saveState() {
    const data = {
        stakeholders: state.stakeholders,
        interviews: state.interviews,
        gaps: state.gaps,
        detectedSignals: state.detectedSignals,
        reportData: state.reportData,
        assessmentDay: state.assessmentDay,
        activities: state.activities,
        liveInterview: state.liveInterview
    };
    localStorage.setItem('structsales_diagnostic', JSON.stringify(data));
}

function loadState() {
    const saved = localStorage.getItem('structsales_diagnostic');
    if (saved) {
        const data = JSON.parse(saved);
        Object.assign(state, data);
    }
}

// === Authentication ===
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    const user = DEMO_USERS.find(u => u.email === email && u.password === password);
    if (user) {
        state.currentUser = user;
        errorEl.classList.add('hidden');
        if (document.getElementById('remember-me').checked) {
            localStorage.setItem('structsales_user', JSON.stringify(user));
        }
        enterApp();
    } else {
        errorEl.textContent = 'Felaktig e-post eller lösenord. Försök igen.';
        errorEl.classList.remove('hidden');
    }
});

function togglePassword() {
    const pw = document.getElementById('login-password');
    const btn = pw.nextElementSibling;
    if (pw.type === 'password') {
        pw.type = 'text';
        btn.textContent = 'Dölj';
    } else {
        pw.type = 'password';
        btn.textContent = 'Visa';
    }
}

function showForgotPassword(e) {
    e.preventDefault();
    document.getElementById('forgot-overlay').classList.remove('hidden');
}

function closeForgot(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('forgot-overlay').classList.add('hidden');
    document.getElementById('forgot-msg').classList.add('hidden');
}

function handleForgot() {
    const email = document.getElementById('forgot-email').value.trim();
    const msg = document.getElementById('forgot-msg');
    if (email) {
        msg.textContent = 'Om kontot finns skickas en återställningslänk till ' + email;
        msg.classList.remove('hidden');
    }
}

function handleLogout() {
    state.currentUser = null;
    localStorage.removeItem('structsales_user');
    document.getElementById('app-screen').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

// === Enter App ===
function enterApp() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');

    document.getElementById('nav-client-name').textContent = state.currentUser.name;
    const initials = state.currentUser.name.split(' ').map(n => n[0]).join('');
    document.getElementById('nav-avatar').textContent = initials;

    loadState();
    renderAll();
}

// === Navigation ===
function switchView(view) {
    // Stop timer if leaving live interview
    if (state.currentView === 'live-interview' && view !== 'live-interview') {
        stopLiveTimer();
    }
    state.currentView = view;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });

    renderView(view);
}

// === Render All ===
function renderAll() {
    renderDashboard();
    renderStakeholders();
    renderInterviews();
    renderSignals();
    renderGaps();
    renderReport();
    renderRoadmap();
    renderTimeline();
}

function renderView(view) {
    switch(view) {
        case 'dashboard': renderDashboard(); break;
        case 'stakeholders': renderStakeholders(); break;
        case 'interviews': renderInterviews(); break;
        case 'signals': renderSignals(); break;
        case 'gaps': renderGaps(); break;
        case 'report': renderReport(); break;
        case 'roadmap': renderRoadmap(); break;
        case 'live-interview': renderLiveInterview(); break;
    }
}

// === Dashboard ===
function renderDashboard() {
    const mapped = state.stakeholders.length;
    const interviewed = state.interviews.length;
    const gapCount = state.gaps.length;
    const highGaps = state.gaps.filter(g => g.severity === 'high').length;

    document.getElementById('dashboard-sub').textContent =
        state.currentUser ? state.currentUser.company + ' — Revenue Architecture Diagnostic' : '';
    document.getElementById('assessment-status').textContent =
        'Dag ' + state.assessmentDay + ' av 12';

    document.getElementById('m-stakeholders').textContent = mapped + ' / 5';
    document.getElementById('mf-stakeholders').style.width = (mapped / 5 * 100) + '%';

    document.getElementById('m-interviews').textContent = interviewed + ' / 5';
    document.getElementById('mf-interviews').style.width = (interviewed / 5 * 100) + '%';

    document.getElementById('m-gaps').textContent = gapCount;
    document.getElementById('m-gaps-high').textContent = highGaps;
    document.getElementById('m-day').textContent = 'Dag ' + state.assessmentDay;

    // Signal Summary
    const signalSummary = document.getElementById('signal-summary');
    signalSummary.innerHTML = DIAGNOSTIC_SIGNALS.map(s => {
        const detected = state.detectedSignals[s.id] || false;
        return '<div class="signal-row">' +
            '<div class="signal-dot ' + (detected ? '' : 'inactive') + '" style="background:' + s.tagColor + '"></div>' +
            '<span class="signal-name">' + s.name + '</span>' +
            '<span class="signal-status" style="color:' + (detected ? s.tagColor : 'var(--text-muted)') + '">' +
            (detected ? 'Detekterad' : 'Ej sedd') + '</span>' +
        '</div>';
    }).join('');

    // Gap Tag Chart
    const gapChart = document.getElementById('gap-tag-chart');
    const maxCount = Math.max(1, ...GAP_TAGS.map(t => state.gaps.filter(g => g.tag === t.id).length));
    gapChart.innerHTML = GAP_TAGS.map(t => {
        const count = state.gaps.filter(g => g.tag === t.id).length;
        return '<div class="gt-row">' +
            '<span class="gt-label">' + t.label + '</span>' +
            '<div class="gt-bar-track"><div class="gt-bar-fill" style="width:' + (count / maxCount * 100) + '%;background:' + t.color + '"></div></div>' +
            '<span class="gt-count" style="color:' + t.color + '">' + count + '</span>' +
        '</div>';
    }).join('');

    // Activity Feed
    const feed = document.getElementById('activity-feed');
    if (state.activities.length === 0) {
        feed.innerHTML = '<div class="empty-state"><div class="empty-icon">&#9998;</div><p>Ingen aktivitet ännu</p><p style="font-size:0.8rem">Börja med att lägga till stakeholders</p></div>';
    } else {
        feed.innerHTML = state.activities.slice(-8).reverse().map(a => {
            return '<div class="activity-item">' +
                '<div class="activity-icon" style="background:' + (a.color || 'var(--accent-soft)') + ';color:' + (a.textColor || 'var(--accent)') + '">' + (a.icon || '&#9632;') + '</div>' +
                '<span class="activity-text">' + a.text + '</span>' +
                '<span class="activity-time">' + a.time + '</span>' +
            '</div>';
        }).join('');
    }
}

// === Stakeholders ===
function renderStakeholders() {
    const grid = document.getElementById('stakeholder-grid');
    const all = STAKEHOLDER_ROLES.map(role => {
        const sh = state.stakeholders.find(s => s.roleId === role.role);
        const interview = state.interviews.find(i => i.stakeholderRole === role.role);
        let status = 'pending';
        let statusText = 'Ej kartlagd';
        if (interview) { status = 'completed'; statusText = 'Intervjuad'; }
        else if (sh) { status = 'scheduled'; statusText = 'Kartlagd'; }

        return '<div class="stakeholder-card" onclick="openStakeholderDetail(\'' + encodeURIComponent(role.role) + '\')">' +
            '<div class="sh-header">' +
                '<span class="sh-role">' + role.role + '</span>' +
                '<span class="sh-priority ' + role.priority.toLowerCase() + '">' + role.priority + '</span>' +
            '</div>' +
            '<div class="sh-name ' + (sh ? '' : 'empty') + '">' + (sh ? escapeHtml(sh.name) : 'Ej tilldelad') + '</div>' +
            '<div class="sh-email">' + (sh ? escapeHtml(sh.email || '') : role.why) + '</div>' +
            '<div class="sh-status">' +
                '<div class="sh-status-dot ' + status + '"></div>' +
                '<span>' + statusText + '</span>' +
            '</div>' +
        '</div>';
    });
    grid.innerHTML = all.join('');
}

function openStakeholderModal(prefillRole) {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.textContent = 'Lägg till stakeholder';

    const roleOptions = STAKEHOLDER_ROLES.map(r =>
        '<option value="' + r.role + '" ' + (prefillRole === r.role ? 'selected' : '') + '>' + r.role + ' (' + r.priority + ')</option>'
    ).join('');

    body.innerHTML =
        '<div class="form-group"><label>Roll</label><select id="sh-form-role">' + roleOptions + '</select></div>' +
        '<div class="form-group"><label>Namn</label><input type="text" id="sh-form-name" placeholder="Fullständigt namn"></div>' +
        '<div class="form-group"><label>E-post</label><input type="email" id="sh-form-email" placeholder="namn@foretag.se"></div>' +
        '<div class="form-group"><label>Titel</label><input type="text" id="sh-form-title" placeholder="T.ex. VP Sales"></div>' +
        '<div class="form-group"><label>Anteckningar</label><textarea id="sh-form-notes" placeholder="Politiskt känsliga rapporteringslinjer, tillgänglighet etc."></textarea></div>' +
        '<div class="modal-actions">' +
            '<button class="btn-ghost" onclick="closeModal()">Avbryt</button>' +
            '<button class="btn-primary" onclick="saveStakeholder()">Spara</button>' +
        '</div>';

    document.getElementById('modal-overlay').classList.remove('hidden');
}

function saveStakeholder() {
    const role = document.getElementById('sh-form-role').value;
    const name = document.getElementById('sh-form-name').value.trim();
    const email = document.getElementById('sh-form-email').value.trim();
    const title = document.getElementById('sh-form-title').value.trim();
    const notes = document.getElementById('sh-form-notes').value.trim();

    if (!name) return;

    const existing = state.stakeholders.findIndex(s => s.roleId === role);
    const sh = { roleId: role, name, email, title, notes, addedAt: new Date().toISOString() };

    if (existing >= 0) {
        state.stakeholders[existing] = sh;
    } else {
        state.stakeholders.push(sh);
    }

    addActivity('Stakeholder tillagd: <strong>' + escapeHtml(name) + '</strong> (' + role + ')', 'var(--green-soft)', 'var(--green)', '&#9673;');
    saveState();
    closeModal();
    renderAll();
}

function openStakeholderDetail(encodedRole) {
    const role = decodeURIComponent(encodedRole);
    const roleData = STAKEHOLDER_ROLES.find(r => r.role === role);
    const sh = state.stakeholders.find(s => s.roleId === role);

    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.textContent = role;

    let html = '<div style="margin-bottom:1rem;">' +
        '<div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">Prioritet: ' + roleData.priority + ' — Intervjuordning: ' + roleData.order + '</div>' +
        '<div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem;">' + roleData.why + '</div>';

    if (sh) {
        html += '<div style="padding:0.75rem;background:var(--green-soft);border-radius:var(--radius-sm);margin-bottom:1rem;">' +
            '<strong>' + escapeHtml(sh.name) + '</strong>' + (sh.title ? ' — ' + escapeHtml(sh.title) : '') +
            (sh.email ? '<br><span style="font-size:0.8rem;color:var(--text-secondary)">' + escapeHtml(sh.email) + '</span>' : '') +
        '</div>';
    } else {
        html += '<button class="btn-primary btn-sm" style="margin-bottom:1rem;" onclick="closeModal();openStakeholderModal(\'' + encodeURIComponent(role) + '\')">+ Tilldela person</button>';
    }

    html += '<h4 style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.75rem;">Frågeuppsättning</h4>';
    html += '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
    roleData.questions.forEach((q, i) => {
        html += '<div style="font-size:0.85rem;color:var(--text-secondary);padding:0.5rem 0;border-bottom:1px solid var(--border);">' +
            '<span style="color:var(--accent);font-weight:700;margin-right:0.5rem;">' + (i + 1) + '.</span>' + q +
        '</div>';
    });
    html += '</div>';

    html += '<div style="margin-top:1rem;padding:0.75rem;background:var(--accent-soft);border-radius:var(--radius-sm);">' +
        '<div style="font-size:0.7rem;font-weight:600;color:var(--accent);text-transform:uppercase;margin-bottom:0.3rem;">Follow-up Probe</div>' +
        '<div style="font-size:0.85rem;color:var(--text-secondary);">' + roleData.probe + '</div>' +
    '</div>';

    html += '</div>';

    body.innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

// === Interviews ===
function renderInterviews() {
    const list = document.getElementById('interview-list');

    if (state.interviews.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#9998;</div><p>Inga intervjuer registrerade ännu</p><p style="font-size:0.8rem">Klicka "Starta intervju" för att genomföra ett interaktivt discovery-samtal</p></div>';
        return;
    }

    list.innerHTML = state.interviews.map((iv, idx) => {
        const tagHtml = (iv.gapTags || []).map(t => {
            const tagData = GAP_TAGS.find(g => g.id === t);
            return tagData ? '<span class="iv-tag" style="background:' + tagData.color + '22;color:' + tagData.color + '">' + tagData.label + '</span>' : '';
        }).join('');

        const answeredCount = iv.answers ? Object.values(iv.answers).filter(a => a.trim()).length : 0;
        const roleData = STAKEHOLDER_ROLES.find(r => r.role === iv.stakeholderRole);
        const totalQs = roleData ? roleData.questions.length : 0;

        return '<div class="interview-card">' +
            '<div class="iv-header">' +
                '<span class="iv-stakeholder">' + escapeHtml(iv.stakeholderRole) + (iv.stakeholderName ? ' — ' + escapeHtml(iv.stakeholderName) : '') + '</span>' +
                '<span class="iv-date">' + iv.date + '</span>' +
            '</div>' +
            '<div class="iv-meta">' +
                '<div class="iv-meta-item"><strong>Längd:</strong> ' + (iv.duration || '60 min') + '</div>' +
                '<div class="iv-meta-item"><strong>Datakvalitet:</strong> ' + (iv.dataQuality || 'Medium') + '</div>' +
                (answeredCount > 0 ? '<div class="iv-meta-item"><strong>Svar:</strong> ' + answeredCount + ' / ' + totalQs + ' frågor</div>' : '') +
            '</div>' +
            (iv.topQuote ? '<div class="iv-quote">"' + escapeHtml(iv.topQuote) + '"</div>' : '') +
            (iv.keyTension ? '<div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem;"><strong>Nyckelspänning:</strong> ' + escapeHtml(iv.keyTension) + '</div>' : '') +
            '<div class="iv-tags">' + tagHtml + '</div>' +
            '<div class="iv-actions">' +
                '<button class="btn-primary btn-sm" onclick="reviewInterview(' + idx + ')">Visa svar</button>' +
                '<button class="btn-ghost btn-sm" onclick="editInterview(' + idx + ')">Redigera</button>' +
                '<button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteInterview(' + idx + ')">Ta bort</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function openInterviewModal(editIdx) {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const isEdit = editIdx !== undefined;
    const iv = isEdit ? state.interviews[editIdx] : {};
    title.textContent = isEdit ? 'Redigera intervju' : 'Ny intervju';

    const roleOptions = STAKEHOLDER_ROLES.map(r =>
        '<option value="' + r.role + '" ' + (iv.stakeholderRole === r.role ? 'selected' : '') + '>' + r.role + '</option>'
    ).join('');

    const qualityOptions = ['Låg', 'Medium', 'Hög'].map(q =>
        '<option ' + (iv.dataQuality === q ? 'selected' : '') + '>' + q + '</option>'
    ).join('');

    const tagCheckboxes = GAP_TAGS.map(t => {
        const checked = (iv.gapTags || []).includes(t.id) ? 'checked' : '';
        return '<label class="checkbox-label" style="margin-right:1rem;"><input type="checkbox" class="iv-gap-tag" value="' + t.id + '" ' + checked + '><span style="color:' + t.color + '">' + t.label + '</span></label>';
    }).join('');

    body.innerHTML =
        '<div class="form-group"><label>Stakeholder-roll</label><select id="iv-form-role">' + roleOptions + '</select></div>' +
        '<div class="form-group"><label>Datum</label><input type="date" id="iv-form-date" value="' + (iv.date || new Date().toISOString().slice(0,10)) + '"></div>' +
        '<div class="form-group"><label>Längd</label><input type="text" id="iv-form-duration" value="' + (iv.duration || '60 min') + '" placeholder="60 min"></div>' +
        '<div class="form-group"><label>Toppquote (verbatim)</label><textarea id="iv-form-quote" placeholder="Det viktigaste citatet från samtalet">' + escapeHtml(iv.topQuote || '') + '</textarea></div>' +
        '<div class="form-group"><label>Nyckelspänning observerad</label><textarea id="iv-form-tension" placeholder="Beskriv den viktigaste spänningen/motsättningen">' + escapeHtml(iv.keyTension || '') + '</textarea></div>' +
        '<div class="form-group"><label>Gap-taggar identifierade</label><div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.3rem;">' + tagCheckboxes + '</div></div>' +
        '<div class="form-group"><label>Datakvalitet</label><select id="iv-form-quality">' + qualityOptions + '</select></div>' +
        '<div class="form-group"><label>Uppföljning behövs?</label><textarea id="iv-form-followup" placeholder="Beskriv eventuell uppföljning">' + escapeHtml(iv.followUp || '') + '</textarea></div>' +
        '<div class="modal-actions">' +
            '<button class="btn-ghost" onclick="closeModal()">Avbryt</button>' +
            '<button class="btn-primary" onclick="saveInterview(' + (isEdit ? editIdx : -1) + ')">Spara</button>' +
        '</div>';

    document.getElementById('modal-overlay').classList.remove('hidden');
}

function saveInterview(editIdx) {
    const role = document.getElementById('iv-form-role').value;
    const sh = state.stakeholders.find(s => s.roleId === role);

    const tags = Array.from(document.querySelectorAll('.iv-gap-tag:checked')).map(el => el.value);

    const iv = {
        stakeholderRole: role,
        stakeholderName: sh ? sh.name : '',
        date: document.getElementById('iv-form-date').value,
        duration: document.getElementById('iv-form-duration').value.trim() || '60 min',
        topQuote: document.getElementById('iv-form-quote').value.trim(),
        keyTension: document.getElementById('iv-form-tension').value.trim(),
        gapTags: tags,
        dataQuality: document.getElementById('iv-form-quality').value,
        followUp: document.getElementById('iv-form-followup').value.trim(),
        answers: (editIdx >= 0 && state.interviews[editIdx]) ? state.interviews[editIdx].answers : {},
        signalFlags: (editIdx >= 0 && state.interviews[editIdx]) ? state.interviews[editIdx].signalFlags : {}
    };

    if (editIdx >= 0) {
        state.interviews[editIdx] = iv;
    } else {
        state.interviews.push(iv);
        addActivity('Intervju genomförd: <strong>' + escapeHtml(role) + '</strong>', 'var(--accent-soft)', 'var(--accent)', '&#9998;');
    }

    runDiagnosticEngine();
    saveState();
    closeModal();
    renderAll();
}

function editInterview(idx) { openInterviewModal(idx); }

function deleteInterview(idx) {
    if (confirm('Vill du ta bort denna intervju?')) {
        state.interviews.splice(idx, 1);
        runDiagnosticEngine();
        saveState();
        renderAll();
    }
}

function reviewInterview(idx) {
    const iv = state.interviews[idx];
    const roleData = STAKEHOLDER_ROLES.find(r => r.role === iv.stakeholderRole);
    if (!roleData) return;

    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.textContent = 'Intervjusvar — ' + iv.stakeholderRole;

    let html = '';
    roleData.questions.forEach((q, i) => {
        const answer = iv.answers ? (iv.answers[i] || '') : '';
        const signals = iv.signalFlags ? (iv.signalFlags[i] || []) : [];
        const signalHtml = signals.map(sid => {
            const s = DIAGNOSTIC_SIGNALS.find(ds => ds.id === sid);
            return s ? '<span style="display:inline-block;padding:0.1rem 0.4rem;border-radius:8px;font-size:0.65rem;font-weight:600;background:' + s.tagColor + '22;color:' + s.tagColor + ';">' + s.name + '</span>' : '';
        }).join(' ');

        html += '<div style="padding:0.75rem 0;' + (i < roleData.questions.length - 1 ? 'border-bottom:1px solid var(--border);' : '') + '">' +
            '<div style="font-size:0.8rem;color:var(--accent);font-weight:600;margin-bottom:0.3rem;">Fråga ' + (i + 1) + '</div>' +
            '<div style="font-size:0.9rem;font-weight:500;margin-bottom:0.5rem;">' + q + '</div>' +
            (answer ? '<div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.5;padding:0.5rem 0.75rem;background:var(--bg);border-radius:var(--radius-sm);">' + escapeHtml(answer) + '</div>' : '<div style="font-size:0.8rem;color:var(--text-muted);font-style:italic;">Inget svar registrerat</div>') +
            (signalHtml ? '<div style="margin-top:0.4rem;">' + signalHtml + '</div>' : '') +
        '</div>';
    });

    body.innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

// ============================================================
// LIVE INTERVIEW MODE
// ============================================================

let liveTimerInterval = null;
let liveTimerSeconds = 0;
let liveTimerRunning = false;

function startLiveInterview() {
    // Show role selection modal
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.textContent = 'Starta intervju';

    const roleCards = STAKEHOLDER_ROLES.map(r => {
        const sh = state.stakeholders.find(s => s.roleId === r.role);
        const done = state.interviews.find(i => i.stakeholderRole === r.role);
        const disabled = done ? 'style="opacity:0.4;pointer-events:none;"' : '';
        return '<div class="stakeholder-card" ' + disabled + ' onclick="launchLiveInterview(\'' + encodeURIComponent(r.role) + '\')" style="cursor:pointer;margin-bottom:0.5rem;">' +
            '<div class="sh-header"><span class="sh-role">' + r.role + '</span><span class="sh-priority ' + r.priority.toLowerCase() + '">' + r.priority + '</span></div>' +
            '<div style="font-size:0.85rem;color:var(--text-secondary);">' + (sh ? escapeHtml(sh.name) : 'Ej tilldelad') + (done ? ' — Redan intervjuad' : '') + '</div>' +
        '</div>';
    }).join('');

    body.innerHTML = '<p style="margin-bottom:1rem;color:var(--text-secondary);font-size:0.9rem;">Välj vilken stakeholder du ska intervjua:</p>' + roleCards;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function launchLiveInterview(encodedRole) {
    const role = decodeURIComponent(encodedRole);
    const roleData = STAKEHOLDER_ROLES.find(r => r.role === role);
    const sh = state.stakeholders.find(s => s.roleId === role);

    state.liveInterview = {
        role: role,
        stakeholderName: sh ? sh.name : '',
        phase: 0, // 0=open, 1=context, 2=questions, 3=synthesis
        currentQuestion: 0,
        answers: {},
        signalFlags: {},
        openNotes: '',
        contextNotes: '',
        synthesisQuote: '',
        synthesisTension: '',
        synthesisFollowUp: '',
        synthesisQuality: 'Medium',
        startedAt: new Date().toISOString()
    };

    liveTimerSeconds = 0;
    liveTimerRunning = false;

    closeModal();
    switchView('live-interview');
}

function renderLiveInterview() {
    const container = document.getElementById('live-interview-content');
    const liv = state.liveInterview;
    if (!liv) {
        container.innerHTML = '<div class="empty-state"><p>Ingen aktiv intervju</p></div>';
        return;
    }

    const roleData = STAKEHOLDER_ROLES.find(r => r.role === liv.role);
    const phases = [
        { name: 'Öppning', time: '5 min' },
        { name: 'Kontext', time: '10 min' },
        { name: 'Frågor', time: '30 min' },
        { name: 'Syntes', time: '15 min' }
    ];

    const timerMin = Math.floor(liveTimerSeconds / 60);
    const timerSec = liveTimerSeconds % 60;
    const timerStr = String(timerMin).padStart(2, '0') + ':' + String(timerSec).padStart(2, '0');

    let html = '';

    // Top bar
    html += '<div class="liv-top">' +
        '<div class="liv-top-left">' +
            '<button class="liv-back" onclick="exitLiveInterview()">&larr;</button>' +
            '<div><div class="liv-role">' + liv.role + (liv.stakeholderName ? ' — ' + escapeHtml(liv.stakeholderName) : '') + '</div>' +
            '<div class="liv-phase-label">' + phases[liv.phase].name + ' (' + phases[liv.phase].time + ')</div></div>' +
        '</div>' +
        '<div class="liv-timer">' +
            '<div class="liv-timer-display">' + timerStr + '</div>' +
            '<button class="liv-timer-btn" onclick="toggleLiveTimer()">' + (liveTimerRunning ? '&#10074;&#10074;' : '&#9654;') + '</button>' +
        '</div>' +
    '</div>';

    // Phase bar
    html += '<div class="liv-phases">';
    phases.forEach((p, i) => {
        let cls = '';
        if (i < liv.phase) cls = 'done';
        else if (i === liv.phase) cls = 'active';
        html += '<div class="liv-phase ' + cls + '" onclick="setLivePhase(' + i + ')">' +
            '<span class="liv-phase-name">' + p.name + '</span>' +
            '<span class="liv-phase-time">' + p.time + '</span>' +
        '</div>';
    });
    html += '</div>';

    // Phase content
    html += '<div class="liv-body">';
    html += '<div class="liv-main">';

    if (liv.phase === 0) {
        // Opening phase
        html += '<div class="liv-question-card current">' +
            '<div class="liv-q-number">FAS 1 — ÖPPNING</div>' +
            '<div class="liv-q-text">Framställ syftet. Bekräfta konfidentialitet. Förtydliga att detta är diagnostiskt, inte utvärderande.</div>' +
            '<textarea class="liv-q-answer" placeholder="Anteckningar under öppningen..." onchange="saveLiveField(\'openNotes\', this.value)">' + escapeHtml(liv.openNotes || '') + '</textarea>' +
        '</div>';
        html += '<div style="text-align:right;"><button class="btn-primary" onclick="setLivePhase(1)">Gå till Kontext &rarr;</button></div>';

    } else if (liv.phase === 1) {
        // Context phase
        html += '<div class="liv-question-card current">' +
            '<div class="liv-q-number">FAS 2 — KONTEXT</div>' +
            '<div class="liv-q-text">Fråga om deras roll, erfarenhet, största nuvarande utmaning. Låt dem definiera sin värld först.</div>' +
            '<textarea class="liv-q-answer" placeholder="Anteckna roll, erfarenhet, utmaningar..." onchange="saveLiveField(\'contextNotes\', this.value)" style="min-height:150px;">' + escapeHtml(liv.contextNotes || '') + '</textarea>' +
        '</div>';
        html += '<div style="display:flex;justify-content:space-between;"><button class="btn-ghost" onclick="setLivePhase(0)">&larr; Öppning</button><button class="btn-primary" onclick="setLivePhase(2)">Gå till Frågor &rarr;</button></div>';

    } else if (liv.phase === 2) {
        // Questions phase
        const questions = roleData.questions;
        const qi = liv.currentQuestion;

        // Current question
        html += '<div class="liv-question-card current">' +
            '<div class="liv-q-number">FRÅGA ' + (qi + 1) + ' AV ' + questions.length + '</div>' +
            '<div class="liv-q-text">' + questions[qi] + '</div>' +
            '<textarea class="liv-q-answer" id="liv-answer-' + qi + '" placeholder="Anteckna svaret verbatim — exakt språk, inte sammanfattningar..." onchange="saveLiveAnswer(' + qi + ', this.value)" style="min-height:120px;">' + escapeHtml(liv.answers[qi] || '') + '</textarea>' +
            '<div class="liv-q-footer">' +
                '<div class="liv-q-signals">' +
                    DIAGNOSTIC_SIGNALS.map(s => {
                        const flagged = (liv.signalFlags[qi] || []).includes(s.id);
                        return '<button class="liv-signal-chip ' + (flagged ? 'flagged' : '') + '" onclick="toggleLiveSignal(' + qi + ',\'' + s.id + '\')">' + s.name + '</button>';
                    }).join('') +
                '</div>' +
            '</div>' +
        '</div>';

        // Navigation
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<button class="btn-ghost" ' + (qi === 0 ? 'onclick="setLivePhase(1)"' : 'onclick="setLiveQuestion(' + (qi - 1) + ')"') + '>&larr; ' + (qi === 0 ? 'Kontext' : 'Föregående') + '</button>';
        html += '<span style="font-size:0.8rem;color:var(--text-muted);">' + (qi + 1) + ' / ' + questions.length + '</span>';
        if (qi < questions.length - 1) {
            html += '<button class="btn-primary" onclick="setLiveQuestion(' + (qi + 1) + ')">Nästa fråga &rarr;</button>';
        } else {
            html += '<button class="btn-primary" onclick="setLivePhase(3)">Gå till Syntes &rarr;</button>';
        }
        html += '</div>';

    } else if (liv.phase === 3) {
        // Synthesis phase
        html += '<div class="liv-synthesis">';
        html += '<div class="liv-question-card current">' +
            '<div class="liv-q-number">FAS 4 — SYNTES &amp; AVSLUT</div>' +
            '<div class="liv-q-text">Reflektera tillbaka vad du hört. Fråga: "Finns det något viktigt du förväntade dig att jag skulle fråga som jag inte frågade?"</div>' +
        '</div>';

        html += '<div class="form-group"><label>Toppquote (verbatim — det viktigaste citatet)</label>' +
            '<textarea class="liv-q-answer" placeholder="Det enskilt mest avslöjande citatet..." onchange="saveLiveField(\'synthesisQuote\', this.value)">' + escapeHtml(liv.synthesisQuote || '') + '</textarea></div>';

        html += '<div class="form-group"><label>Nyckelspänning observerad</label>' +
            '<textarea class="liv-q-answer" placeholder="Den viktigaste motsättningen eller gapet mellan narrativ och verklighet..." onchange="saveLiveField(\'synthesisTension\', this.value)">' + escapeHtml(liv.synthesisTension || '') + '</textarea></div>';

        html += '<div class="form-group"><label>Uppföljning behövs?</label>' +
            '<textarea class="liv-q-answer" placeholder="Eventuella uppföljningsåtgärder..." onchange="saveLiveField(\'synthesisFollowUp\', this.value)">' + escapeHtml(liv.synthesisFollowUp || '') + '</textarea></div>';

        html += '<div class="form-group"><label>Datakvalitet</label>' +
            '<select style="width:100%;padding:0.7rem;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font);" onchange="saveLiveField(\'synthesisQuality\', this.value)">' +
            ['Låg', 'Medium', 'Hög'].map(q => '<option ' + (liv.synthesisQuality === q ? 'selected' : '') + '>' + q + '</option>').join('') +
            '</select></div>';

        html += '</div>';

        html += '<div class="liv-complete-bar">' +
            '<span class="liv-complete-text">Intervju redo att slutföras</span>' +
            '<button class="btn-primary" onclick="completeLiveInterview()">Slutför &amp; analysera</button>' +
        '</div>';
    }

    html += '</div>'; // liv-main

    // Sidebar panel
    html += '<div class="liv-sidebar-panel">';

    // Probe panel
    html += '<div class="liv-panel">' +
        '<div class="liv-panel-title">Follow-up Probe</div>' +
        '<div class="liv-probe">' + roleData.probe + '</div>' +
    '</div>';

    // Progress panel
    html += '<div class="liv-panel">' +
        '<div class="liv-panel-title">Frågeöversikt</div>' +
        '<div class="liv-progress-list">';
    roleData.questions.forEach((q, i) => {
        const hasAnswer = liv.answers[i] && liv.answers[i].trim();
        const isCurrent = liv.phase === 2 && liv.currentQuestion === i;
        let cls = '';
        if (isCurrent) cls = 'current';
        else if (hasAnswer) cls = 'answered';
        html += '<div class="liv-progress-item ' + cls + '" onclick="jumpToQuestion(' + i + ')">' +
            '<div class="liv-progress-dot"></div>' +
            '<span style="font-size:0.75rem;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">' + (i+1) + '. ' + q.substring(0, 35) + '...</span>' +
        '</div>';
    });
    html += '</div></div>';

    // Flagged signals
    const allFlags = {};
    Object.values(liv.signalFlags || {}).forEach(flags => {
        (flags || []).forEach(f => { allFlags[f] = (allFlags[f] || 0) + 1; });
    });
    const flaggedSignals = Object.entries(allFlags);
    if (flaggedSignals.length > 0) {
        html += '<div class="liv-panel">' +
            '<div class="liv-panel-title">Flaggade signaler</div>';
        flaggedSignals.forEach(([sid, count]) => {
            const s = DIAGNOSTIC_SIGNALS.find(ds => ds.id === sid);
            if (s) {
                html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.3rem 0;font-size:0.8rem;">' +
                    '<span style="color:' + s.tagColor + ';">' + s.name + '</span>' +
                    '<span style="color:var(--text-muted);">' + count + 'x</span>' +
                '</div>';
            }
        });
        html += '</div>';
    }

    html += '</div>'; // liv-sidebar-panel
    html += '</div>'; // liv-body

    container.innerHTML = html;
}

function saveLiveField(field, value) {
    if (state.liveInterview) {
        state.liveInterview[field] = value;
        saveState();
    }
}

function saveLiveAnswer(qi, value) {
    if (state.liveInterview) {
        state.liveInterview.answers[qi] = value;
        saveState();
        // Re-render sidebar progress without full re-render
        renderLiveInterview();
    }
}

function toggleLiveSignal(qi, signalId) {
    if (!state.liveInterview) return;
    if (!state.liveInterview.signalFlags[qi]) {
        state.liveInterview.signalFlags[qi] = [];
    }
    const idx = state.liveInterview.signalFlags[qi].indexOf(signalId);
    if (idx >= 0) {
        state.liveInterview.signalFlags[qi].splice(idx, 1);
    } else {
        state.liveInterview.signalFlags[qi].push(signalId);
    }
    saveState();
    renderLiveInterview();
}

function setLivePhase(phase) {
    if (state.liveInterview) {
        state.liveInterview.phase = phase;
        saveState();
        renderLiveInterview();
    }
}

function setLiveQuestion(qi) {
    if (state.liveInterview) {
        state.liveInterview.currentQuestion = qi;
        state.liveInterview.phase = 2;
        saveState();
        renderLiveInterview();
    }
}

function jumpToQuestion(qi) {
    setLiveQuestion(qi);
}

function toggleLiveTimer() {
    if (liveTimerRunning) {
        stopLiveTimer();
    } else {
        liveTimerRunning = true;
        liveTimerInterval = setInterval(function() {
            liveTimerSeconds++;
            const el = document.querySelector('.liv-timer-display');
            if (el) {
                const m = Math.floor(liveTimerSeconds / 60);
                const s = liveTimerSeconds % 60;
                el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
            }
        }, 1000);
        renderLiveInterview();
    }
}

function stopLiveTimer() {
    liveTimerRunning = false;
    if (liveTimerInterval) {
        clearInterval(liveTimerInterval);
        liveTimerInterval = null;
    }
}

function exitLiveInterview() {
    if (state.liveInterview) {
        const answered = Object.values(state.liveInterview.answers).filter(a => a && a.trim()).length;
        if (answered > 0 && !confirm('Du har ' + answered + ' svar. Vill du lämna? (Data sparas och du kan återuppta.)')) {
            return;
        }
    }
    stopLiveTimer();
    switchView('interviews');
}

function completeLiveInterview() {
    const liv = state.liveInterview;
    if (!liv) return;

    stopLiveTimer();

    // Collect all flagged signals
    const allSignals = {};
    Object.values(liv.signalFlags || {}).forEach(flags => {
        (flags || []).forEach(f => { allSignals[f] = true; });
    });

    // Determine gap tags from flagged signals
    const gapTags = [];
    Object.keys(allSignals).forEach(sid => {
        const signal = DIAGNOSTIC_SIGNALS.find(s => s.id === sid);
        if (signal && !gapTags.includes(signal.tag)) {
            gapTags.push(signal.tag);
        }
    });

    // Duration
    const mins = Math.floor(liveTimerSeconds / 60);
    const durStr = mins > 0 ? mins + ' min' : '60 min';

    // Save as interview
    const iv = {
        stakeholderRole: liv.role,
        stakeholderName: liv.stakeholderName,
        date: new Date().toISOString().slice(0, 10),
        duration: durStr,
        topQuote: liv.synthesisQuote || '',
        keyTension: liv.synthesisTension || '',
        gapTags: gapTags,
        dataQuality: liv.synthesisQuality || 'Medium',
        followUp: liv.synthesisFollowUp || '',
        answers: liv.answers || {},
        signalFlags: liv.signalFlags || {}
    };

    state.interviews.push(iv);

    // Mark detected signals
    Object.keys(allSignals).forEach(sid => {
        state.detectedSignals[sid] = true;
    });

    addActivity('Intervju slutförd: <strong>' + escapeHtml(liv.role) + '</strong> — ' + Object.values(liv.answers).filter(a => a && a.trim()).length + ' svar', 'var(--green-soft)', 'var(--green)', '&#9998;');

    state.liveInterview = null;

    // Run diagnostic engine to auto-generate gaps
    runDiagnosticEngine();

    saveState();
    switchView('interviews');
    renderAll();
}

// ============================================================
// DIAGNOSTIC ENGINE — Auto-generate gaps from interview data
// ============================================================

// Keyword patterns for each signal type
const SIGNAL_KEYWORDS = {
    'forecast-vagueness': {
        tag: 'Forecast',
        patterns: ['känner oss bra', 'ser bra ut', 'hoppas', 'tror att', 'pipeline ser hälsosam', 'magkänsla', 'gut feel', 'ungefär', 'svårt att säga', 'ingen aning', 'vet inte riktigt', 'ingen forecast', 'gissar', 'uppskattar', 'ingen metodik', 'optimistisk'],
        gapTitle: 'Opålitlig intäktsprognos',
        gapImplication: 'Utan strukturerad forecast-metodik fattas beslut baserade på magkänsla snarare än data, vilket skapar oförutsägbarhet i intäktsplanering och resursallokering.'
    },
    'hero-dependency': {
        tag: 'Dependency',
        patterns: ['hen hanterar', 'hon hanterar', 'han hanterar', 'beroende av', 'om hen slutar', 'om hon slutar', 'om han slutar', 'en person', 'enskild person', 'bara en som', 'nyckelperson', 'oersättlig', 'ingen annan kan', 'personberoende'],
        gapTitle: 'Kritiskt personberoende i kommersiell motor',
        gapImplication: 'Intäktsgenerering är beroende av enskilda individer snarare än repeterbara system. Om nyckelpersoner lämnar riskerar pipeline att kollapsa inom 90 dagar.'
    },
    'stage-ambiguity': {
        tag: 'Pipeline',
        patterns: ['rör sig framåt', 'inga tydliga steg', 'vet inte riktigt', 'definierar inte', 'ingen definition', 'subjektivt', 'olika sätt', 'tolkar olika', 'inte överens', 'inga kriterier', 'oklart', 'varierar', 'ingen process'],
        gapTitle: 'Pipeline-stages saknar beteendedefinitioner',
        gapImplication: 'Utan objektiva exit-kriterier per stage kan pipeline-data inte användas för forecast eller resursplanering. Deals rör sig baserat på tid snarare än kundåtgärder.'
    },
    'attribution-blindness': {
        tag: 'Alignment',
        patterns: ['svårt att bevisa', 'vet att det fungerar', 'kan inte visa', 'ingen attribution', 'last touch', 'first touch', 'oklart bidrag', 'marketing och sälj', 'sälj och marketing', 'inget samband', 'kan inte koppla', 'separata system', 'ingen koppling'],
        gapTitle: 'Avsaknad av attributionsmodell marketing-till-intäkt',
        gapImplication: 'Utan kausal attribution allokeras marknadsföringsbudget baserat på antaganden snarare än bevisad avkastning. Investerings-beslut i demand generation saknar datagrund.'
    },
    'conversion-silence': {
        tag: 'Pipeline',
        patterns: ['får kolla', 'måste logga in', 'inte uppdaterat', 'CRM inte', 'ingen koll', 'ingen statistik', 'spårar inte', 'vet inte konvertering', 'ingen konvertering', 'inga siffror', 'dålig data'],
        gapTitle: 'Okänd konvertering mellan pipeline-stages',
        gapImplication: 'Utan konverteringsdata per stage saknas möjlighet att identifiera flaskhalsar, prognostisera pipeline-värde eller dimensionera topfunnel-behov för att nå intäktsmål.'
    },
    'qualification-drift': {
        tag: 'Foundation',
        patterns: ['tar möte med alla', 'vem som helst', 'ingen ICP', 'bred målgrupp', 'ingen kvalificering', 'inte definierat', 'tar in allt', 'öppna för alla', 'alla branscher', 'ingen filter', 'bred approach', 'tar vad vi kan'],
        gapTitle: 'ICP och kvalificeringskriterier saknas eller används ej',
        gapImplication: 'Utan definierad ICP och kvalificeringsramverk investerar säljteamet tid i deals med låg strukturell passning, vilket leder till långa cykler och dålig close rate.'
    },
    'misaligned-expectations': {
        tag: 'Alignment',
        patterns: ['lovar för mycket', 'överlovar', 'kunden förväntar sig', 'förvånad', 'inte vad de fick', 'sälj lovade', 'missnöjda tidigt', 'churn efter', 'tidig churn', 'onboarding problem', 'CS involveras för sent', 'inte med i säljprocessen'],
        gapTitle: 'Misalignment mellan säljlöften och CS-leverans',
        gapImplication: 'Kunder upplever en klyfta mellan vad som såldes och vad som levereras, vilket driver tidig churn och underminerar kundnöjdhet och expansion-potential.'
    }
};

function runDiagnosticEngine() {
    // Analyze all interview answers for signal patterns
    const signalHits = {}; // signalId -> { count, evidence[], stakeholders[] }

    DIAGNOSTIC_SIGNALS.forEach(s => {
        signalHits[s.id] = { count: 0, evidence: [], stakeholders: [] };
    });

    state.interviews.forEach(iv => {
        const role = iv.stakeholderRole;

        // Check manually flagged signals
        if (iv.signalFlags) {
            Object.values(iv.signalFlags).forEach(flags => {
                (flags || []).forEach(sid => {
                    if (signalHits[sid]) {
                        if (!signalHits[sid].stakeholders.includes(role)) {
                            signalHits[sid].stakeholders.push(role);
                        }
                        signalHits[sid].count++;
                    }
                });
            });
        }

        // Check answers for keyword patterns
        if (iv.answers) {
            const allText = Object.values(iv.answers).join(' ').toLowerCase();

            Object.entries(SIGNAL_KEYWORDS).forEach(([signalId, config]) => {
                config.patterns.forEach(pattern => {
                    if (allText.includes(pattern.toLowerCase())) {
                        if (!signalHits[signalId].stakeholders.includes(role)) {
                            signalHits[signalId].stakeholders.push(role);
                        }
                        signalHits[signalId].count++;

                        // Find the answer containing this pattern for evidence
                        Object.entries(iv.answers).forEach(([qi, answer]) => {
                            if (answer && answer.toLowerCase().includes(pattern.toLowerCase())) {
                                const snippet = answer.substring(0, 200);
                                if (!signalHits[signalId].evidence.some(e => e === snippet)) {
                                    signalHits[signalId].evidence.push(snippet);
                                }
                            }
                        });
                    }
                });
            });

        }

        // Check top quote and key tension
        const metaText = ((iv.topQuote || '') + ' ' + (iv.keyTension || '')).toLowerCase();
        Object.entries(SIGNAL_KEYWORDS).forEach(([signalId, config]) => {
            config.patterns.forEach(pattern => {
                if (metaText.includes(pattern.toLowerCase())) {
                    if (!signalHits[signalId].stakeholders.includes(role)) {
                        signalHits[signalId].stakeholders.push(role);
                    }
                    signalHits[signalId].count++;
                }
            });
        });
    });

    // Update detected signals
    Object.entries(signalHits).forEach(([sid, data]) => {
        if (data.count > 0) {
            state.detectedSignals[sid] = true;
        }
    });

    // Auto-generate gaps from confirmed signals (appeared across 2+ stakeholders or flagged 3+ times)
    const autoGaps = [];

    Object.entries(signalHits).forEach(([signalId, data]) => {
        if (data.stakeholders.length >= 2 || data.count >= 3) {
            const config = SIGNAL_KEYWORDS[signalId];
            if (!config) return;

            // Check if a similar gap already exists (manual or auto)
            const existing = state.gaps.find(g =>
                g.tag === config.tag && g.autoSignalId === signalId
            );
            if (existing) return;

            // Also check for manually created gaps with similar tags
            const manualSimilar = state.gaps.find(g =>
                g.tag === config.tag && !g.autoSignalId
            );
            if (manualSimilar) return;

            // Determine severity
            let severity = 'low';
            if (data.stakeholders.length >= 3) severity = 'high';
            else if (data.stakeholders.length >= 2 || data.count >= 3) severity = 'medium';

            // Build evidence string
            let evidenceStr = 'Identifierat hos ' + data.stakeholders.length + ' stakeholders (' + data.stakeholders.join(', ') + ').';
            if (data.evidence.length > 0) {
                evidenceStr += ' Citat: "' + data.evidence[0] + '"';
            }

            autoGaps.push({
                title: config.gapTitle,
                evidence: evidenceStr,
                tag: config.tag,
                severity: severity,
                implication: config.gapImplication,
                autoSignalId: signalId,
                autoGenerated: true
            });
        }
    });

    // Add auto-generated gaps
    autoGaps.forEach(gap => {
        state.gaps.push(gap);
        addActivity('Auto-gap identifierat: <strong>' + escapeHtml(gap.title) + '</strong> [' + gap.severity.toUpperCase() + ']', 'var(--red-soft)', 'var(--red)', '&#10006;');
    });

    // Auto-generate report recommendations based on gaps
    if (state.gaps.length > 0) {
        autoGenerateRecommendations();
    }
}

function autoGenerateRecommendations() {
    const gaps = state.gaps;
    const highGaps = gaps.filter(g => g.severity === 'high');
    const medGaps = gaps.filter(g => g.severity === 'medium');

    // Auto-fill S1 Executive Summary if empty
    if (!state.reportData['S1_coreFinding'] && gaps.length >= 2) {
        const tagCounts = {};
        gaps.forEach(g => { tagCounts[g.tag] = (tagCounts[g.tag] || 0) + 1; });
        const topTag = Object.entries(tagCounts).sort((a,b) => b[1] - a[1])[0];
        const tagData = GAP_TAGS.find(t => t.id === topTag[0]);

        state.reportData['S1_coreFinding'] = 'Den kommersiella arkitekturen uppvisar ' + gaps.length + ' strukturella gaps, med koncentration inom ' + (tagData ? tagData.module : topTag[0]) + '. ' + (highGaps.length > 0 ? highGaps.length + ' av dessa blockerar tillväxt direkt.' : '');
    }

    if (!state.reportData['S1_primaryRisk'] && highGaps.length > 0) {
        state.reportData['S1_primaryRisk'] = 'Om de identifierade ' + highGaps.length + ' högrisk-gapen inte adresseras inom 6-12 månader riskerar företaget att: (1) förlora intäktsförutsägbarhet, (2) öka churn och (3) stagnera tillväxt.';
    }

    // Auto-fill S6 Recommended engagement
    if (!state.reportData['S6_recommendedProgramme'] && gaps.length >= 2) {
        const modules = [];
        const usedTags = [];
        gaps.sort((a,b) => {
            const o = { high: 0, medium: 1, low: 2 };
            return (o[a.severity] || 2) - (o[b.severity] || 2);
        }).forEach(g => {
            if (!usedTags.includes(g.tag)) {
                const tagData = GAP_TAGS.find(t => t.id === g.tag);
                if (tagData) modules.push(tagData.module);
                usedTags.push(g.tag);
            }
        });
        state.reportData['S6_recommendedProgramme'] = 'Revenue Architecture Programme med fokus på: ' + modules.join(', ') + '.';
    }
}

// === Signals ===
function renderSignals() {
    const grid = document.getElementById('signals-grid');
    grid.innerHTML = DIAGNOSTIC_SIGNALS.map(s => {
        const detected = state.detectedSignals[s.id] || false;
        return '<div class="signal-card" data-number="' + s.number + '">' +
            '<div class="signal-number">SIGNAL ' + s.number + '</div>' +
            '<div class="signal-card-name">' + s.name + '</div>' +
            '<span class="signal-tag" style="background:' + s.tagColor + '22;color:' + s.tagColor + '">' + s.tag + '</span>' +
            '<div class="signal-desc">' + s.description + '</div>' +
            '<div class="signal-listen">' +
                '<div class="signal-listen-label">Lyssna efter</div>' +
                '<div class="signal-listen-text">' + s.listenFor + '</div>' +
            '</div>' +
            '<div class="signal-card-detected">' +
                '<span>' + (detected ? 'Signal detekterad' : 'Ej detekterad') + '</span>' +
                '<button class="signal-toggle ' + (detected ? 'active' : '') + '" onclick="toggleSignal(\'' + s.id + '\')">' +
                (detected ? 'Avmarkera' : 'Markera som detekterad') + '</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function toggleSignal(id) {
    state.detectedSignals[id] = !state.detectedSignals[id];
    const signal = DIAGNOSTIC_SIGNALS.find(s => s.id === id);
    if (state.detectedSignals[id]) {
        addActivity('Signal detekterad: <strong>' + signal.name + '</strong>', signal.tagColor + '22', signal.tagColor, '&#9888;');
    }
    saveState();
    renderSignals();
    renderDashboard();
}

// === Gaps ===
function renderGaps() {
    const list = document.getElementById('gaps-list');

    if (state.gaps.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#10006;</div><p>Inga gaps registrerade ännu</p><p style="font-size:0.8rem">Genomför intervjuer — gaps genereras automatiskt baserat på svar och flaggade signaler</p></div>';
        return;
    }

    list.innerHTML = state.gaps.map((gap, idx) => {
        const tagData = GAP_TAGS.find(t => t.id === gap.tag);
        const autoLabel = gap.autoGenerated ? '<span style="font-size:0.65rem;padding:0.1rem 0.4rem;border-radius:8px;background:var(--accent-soft);color:var(--accent);margin-left:0.5rem;">AUTO</span>' : '';
        return '<div class="gap-card">' +
            '<div class="gap-header">' +
                '<span class="gap-title">' + escapeHtml(gap.title) + autoLabel + '</span>' +
                '<div class="gap-badges">' +
                    '<span class="gap-severity ' + gap.severity + '">' + getSeverityLabel(gap.severity) + '</span>' +
                    (tagData ? '<span class="gap-tag-badge" style="background:' + tagData.color + '22;color:' + tagData.color + '">' + tagData.label + '</span>' : '') +
                '</div>' +
            '</div>' +
            (gap.evidence ? '<div class="gap-evidence">' + escapeHtml(gap.evidence) + '</div>' : '') +
            '<div class="gap-implication"><strong>Affärsimplikation:</strong> ' + escapeHtml(gap.implication || 'Ej angiven') + '</div>' +
            '<div class="gap-actions">' +
                '<button class="btn-ghost btn-sm" onclick="editGap(' + idx + ')">Redigera</button>' +
                '<button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteGap(' + idx + ')">Ta bort</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function openGapModal(editIdx) {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const isEdit = editIdx !== undefined;
    const gap = isEdit ? state.gaps[editIdx] : {};
    title.textContent = isEdit ? 'Redigera gap' : 'Registrera gap';

    const tagOptions = GAP_TAGS.map(t =>
        '<option value="' + t.id + '" ' + (gap.tag === t.id ? 'selected' : '') + '>' + t.label + ' — ' + t.module + '</option>'
    ).join('');

    const sevOptions = SEVERITY_LEVELS.map(s =>
        '<option value="' + s.id + '" ' + (gap.severity === s.id ? 'selected' : '') + '>' + s.label + ' — ' + s.description + '</option>'
    ).join('');

    body.innerHTML =
        '<div class="form-group"><label>Gap-titel</label><input type="text" id="gap-form-title" value="' + escapeHtml(gap.title || '') + '" placeholder="T.ex. \'No Defined Pipeline Qualification Framework\'"></div>' +
        '<div class="form-group"><label>Evidens (verbatim citat eller observerat mönster)</label><textarea id="gap-form-evidence" placeholder="T.ex. \'Tre separata stakeholders beskrev kvalificering som magkänsla\'">' + escapeHtml(gap.evidence || '') + '</textarea></div>' +
        '<div class="form-group"><label>Gap-tagg / RAP-modul</label><select id="gap-form-tag">' + tagOptions + '</select></div>' +
        '<div class="form-group"><label>Severitet</label><select id="gap-form-severity">' + sevOptions + '</select></div>' +
        '<div class="form-group"><label>Affärsimplikation</label><textarea id="gap-form-implication" placeholder="Vilken strukturell konsekvens skapar detta? Var specifik.">' + escapeHtml(gap.implication || '') + '</textarea></div>' +
        '<div class="modal-actions">' +
            '<button class="btn-ghost" onclick="closeModal()">Avbryt</button>' +
            '<button class="btn-primary" onclick="saveGap(' + (isEdit ? editIdx : -1) + ')">Spara</button>' +
        '</div>';

    document.getElementById('modal-overlay').classList.remove('hidden');
}

function saveGap(editIdx) {
    const gap = {
        title: document.getElementById('gap-form-title').value.trim(),
        evidence: document.getElementById('gap-form-evidence').value.trim(),
        tag: document.getElementById('gap-form-tag').value,
        severity: document.getElementById('gap-form-severity').value,
        implication: document.getElementById('gap-form-implication').value.trim()
    };

    if (!gap.title) return;

    if (editIdx >= 0) {
        state.gaps[editIdx] = gap;
    } else {
        state.gaps.push(gap);
        addActivity('Gap registrerat: <strong>' + escapeHtml(gap.title) + '</strong> [' + gap.tag + ']', 'var(--red-soft)', 'var(--red)', '&#10006;');
    }

    saveState();
    closeModal();
    renderAll();
}

function editGap(idx) { openGapModal(idx); }

function deleteGap(idx) {
    if (confirm('Vill du ta bort detta gap?')) {
        state.gaps.splice(idx, 1);
        saveState();
        renderAll();
    }
}

function getSeverityLabel(id) {
    const s = SEVERITY_LEVELS.find(s => s.id === id);
    return s ? s.label : id;
}

// === Report ===
function renderReport() {
    const content = document.getElementById('report-content');

    content.innerHTML = REPORT_SECTIONS.map(section => {
        let fieldsHtml = '';

        if (section.dynamic && section.id === 'S4') {
            if (state.gaps.length > 0) {
                fieldsHtml = '<div class="rs-dynamic-note">Denna sektion fylls automatiskt från gap-analysen. ' + state.gaps.length + ' gap(s) registrerade.</div>';
                fieldsHtml += state.gaps.map((gap, i) => {
                    const tagData = GAP_TAGS.find(t => t.id === gap.tag);
                    const autoLabel = gap.autoGenerated ? ' (auto-genererat)' : '';
                    return '<div style="margin-top:1rem;padding:1rem;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);">' +
                        '<div style="font-weight:700;margin-bottom:0.5rem;">Gap ' + (i+1) + ' — ' + escapeHtml(gap.title) + autoLabel + '</div>' +
                        '<div style="font-size:0.85rem;color:var(--text-secondary);"><strong>Evidens:</strong> ' + escapeHtml(gap.evidence || 'Ej angiven') + '</div>' +
                        '<div style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.3rem;"><strong>Tagg / Severitet:</strong> ' + (tagData ? tagData.label : gap.tag) + ' — ' + getSeverityLabel(gap.severity) + '</div>' +
                        '<div style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.3rem;"><strong>Implikation:</strong> ' + escapeHtml(gap.implication || 'Ej angiven') + '</div>' +
                    '</div>';
                }).join('');
            } else {
                fieldsHtml = '<div class="rs-dynamic-note">Inga gaps registrerade ännu. Genomför intervjuer för att auto-generera gap-analysen.</div>';
            }
        } else if (section.dynamic && section.id === 'S5') {
            fieldsHtml = section.fields.map(f => {
                return '<div class="rs-field"><label>' + f.label + '</label>' +
                    '<textarea placeholder="' + f.placeholder + '" onchange="saveReportField(\'' + section.id + '\',\'' + f.key + '\',this.value)">' + escapeHtml(state.reportData[section.id + '_' + f.key] || '') + '</textarea></div>';
            }).join('');

            if (state.gaps.length > 0) {
                const sorted = [...state.gaps].sort((a,b) => {
                    const order = { high: 0, medium: 1, low: 2 };
                    return (order[a.severity] || 2) - (order[b.severity] || 2);
                });
                fieldsHtml += '<div style="margin-top:1rem;"><div style="font-size:0.8rem;font-weight:600;color:var(--text-muted);margin-bottom:0.5rem;">AUTO-PRIORITERING BASERAD PÅ SEVERITET:</div>';
                sorted.forEach((gap, i) => {
                    fieldsHtml += '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid var(--border);font-size:0.85rem;">' +
                        '<span style="font-weight:800;color:var(--accent);width:24px;">' + (i+1) + '</span>' +
                        '<span>' + escapeHtml(gap.title) + '</span>' +
                        '<span class="gap-severity ' + gap.severity + '" style="margin-left:auto;">' + getSeverityLabel(gap.severity) + '</span>' +
                    '</div>';
                });
                fieldsHtml += '</div>';
            }
        } else {
            fieldsHtml = section.fields.map(f => {
                return '<div class="rs-field"><label>' + f.label + '</label>' +
                    '<textarea placeholder="' + f.placeholder + '" onchange="saveReportField(\'' + section.id + '\',\'' + f.key + '\',this.value)">' + escapeHtml(state.reportData[section.id + '_' + f.key] || '') + '</textarea></div>';
            }).join('');
        }

        return '<div class="report-section">' +
            '<div class="rs-header"><span class="rs-badge">' + section.id + '</span><span class="rs-title">' + section.title + '</span></div>' +
            '<div class="rs-desc">' + section.description + '</div>' +
            '<div class="rs-fields">' + fieldsHtml + '</div>' +
        '</div>';
    }).join('');
}

function saveReportField(section, key, value) {
    state.reportData[section + '_' + key] = value;
    saveState();
}

function exportReport() {
    let text = '=== STRUCTSALES — REVENUE ARCHITECTURE ASSESSMENT REPORT ===\n\n';
    text += 'Klient: ' + (state.currentUser ? state.currentUser.company : '') + '\n';
    text += 'Datum: ' + new Date().toISOString().slice(0, 10) + '\n';
    text += 'Förberedd av: ' + (state.currentUser ? state.currentUser.name : '') + '\n';
    text += 'Antal intervjuer: ' + state.interviews.length + '\n';
    text += 'Antal identifierade gaps: ' + state.gaps.length + '\n\n';

    REPORT_SECTIONS.forEach(section => {
        text += '--- ' + section.id + ': ' + section.title + ' ---\n\n';

        if (section.dynamic && section.id === 'S4') {
            state.gaps.forEach((gap, i) => {
                const tagData = GAP_TAGS.find(t => t.id === gap.tag);
                text += 'Gap ' + (i+1) + ': ' + gap.title + (gap.autoGenerated ? ' (auto)' : '') + '\n';
                text += '  Evidens: ' + (gap.evidence || 'Ej angiven') + '\n';
                text += '  Tagg: ' + (tagData ? tagData.label : gap.tag) + ' | Severitet: ' + getSeverityLabel(gap.severity) + '\n';
                text += '  Implikation: ' + (gap.implication || 'Ej angiven') + '\n\n';
            });
        } else {
            section.fields.forEach(f => {
                const val = state.reportData[section.id + '_' + f.key] || '';
                text += f.label + ': ' + (val || '[Ej ifyllt]') + '\n';
            });
        }
        text += '\n';
    });

    text += '---\nwww.structsales.se | Confidential\n';

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Structsales_Assessment_Report_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
}

// === Roadmap ===
function renderRoadmap() {
    const content = document.getElementById('roadmap-content');

    if (state.gaps.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="empty-icon">&#10148;</div><p>Ingen roadmap ännu</p><p style="font-size:0.8rem">Genomför intervjuer för att auto-generera gaps och en prioriterad roadmap</p></div>';
        return;
    }

    const sorted = [...state.gaps].sort((a,b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.severity] || 2) - (order[b.severity] || 2);
    });

    content.innerHTML = sorted.map((gap, i) => {
        const tagData = GAP_TAGS.find(t => t.id === gap.tag);
        return '<div class="roadmap-item">' +
            '<div class="rm-priority">' + (i + 1) + '</div>' +
            '<div class="rm-content">' +
                '<div class="rm-title">' + escapeHtml(gap.title) + '</div>' +
                '<div class="rm-rationale">' + escapeHtml(gap.implication || 'Ingen implikation angiven') + '</div>' +
                (tagData ? '<span class="rm-module" style="background:' + tagData.color + '22;color:' + tagData.color + '">RAP-modul: ' + tagData.module + '</span>' : '') +
            '</div>' +
        '</div>';
    }).join('');
}

// === Timeline ===
function renderTimeline() {
    const el = document.getElementById('timeline-mini');
    el.innerHTML = ASSESSMENT_TIMELINE.map((t, i) => {
        let dotClass = '';
        const dayStart = parseInt(t.days);
        if (dayStart < state.assessmentDay) dotClass = 'done';
        else if (dayStart === state.assessmentDay) dotClass = 'active';
        return '<div class="tl-item">' +
            '<div class="tl-dot ' + dotClass + '"></div>' +
            '<span>Dag ' + t.days + ': ' + t.stage + '</span>' +
        '</div>';
    }).join('');
}

// === Modal ===
function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modal-overlay').classList.add('hidden');
}

// === Activity ===
function addActivity(text, bgColor, textColor, icon) {
    const now = new Date();
    const time = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    state.activities.push({ text, color: bgColor, textColor, icon, time });
    if (state.activities.length > 50) state.activities = state.activities.slice(-50);
    saveState();
}

// === Utility ===
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// === Auto-login check ===
(function init() {
    const saved = localStorage.getItem('structsales_user');
    if (saved) {
        state.currentUser = JSON.parse(saved);
        enterApp();
    }
})();
