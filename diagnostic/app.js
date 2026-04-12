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
    signalEvidence: {},  // signalId -> { count, stakeholders[], quotes[], sources[] }
    reportData: {},
    assessmentDay: 1,
    activities: [],
    // Live interview state
    liveInterview: null,
    // Analysis areas: areaId -> { answers: { qIndex: string }, maturity: { qIndex: 1|2|3|4 } }
    areaAnswers: {}
};

// === Persistence (localStorage) ===
function saveState() {
    const data = {
        stakeholders: state.stakeholders,
        interviews: state.interviews,
        gaps: state.gaps,
        detectedSignals: state.detectedSignals,
        signalEvidence: state.signalEvidence,
        reportData: state.reportData,
        assessmentDay: state.assessmentDay,
        activities: state.activities,
        liveInterview: state.liveInterview,
        areaAnswers: state.areaAnswers
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
    renderAreas();
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
        case 'areas': renderAreas(); break;
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

    // Architecture Maturity Summary
    const maturityEl = document.getElementById('maturity-summary');
    if (maturityEl) {
        maturityEl.innerHTML = ANALYSIS_AREAS.map(area => {
            const m = getAreaMaturity(area.id);
            const lbl = m ? getMaturityLabel(m.score) : { label: 'Ej bedömd', color: '#6b7280' };
            const pct = m ? m.percent : 0;
            return '<div class="maturity-row" onclick="switchView(\'areas\')">' +
                '<span class="maturity-icon" style="color:' + area.color + '">' + area.icon + '</span>' +
                '<span class="maturity-name">' + area.name + '</span>' +
                '<div class="maturity-bar"><div class="maturity-fill" style="width:' + pct + '%;background:' + lbl.color + '"></div></div>' +
                '<span class="maturity-pct" style="color:' + lbl.color + '">' + (m ? pct + '%' : '—') + '</span>' +
            '</div>';
        }).join('');
    }

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
    const signalHits = {}; // signalId -> { count, evidence[], stakeholders[], quotes[] }

    DIAGNOSTIC_SIGNALS.forEach(s => {
        signalHits[s.id] = { count: 0, evidence: [], stakeholders: [], quotes: [], sources: [] };
    });

    state.interviews.forEach(iv => {
        const role = iv.stakeholderRole;
        const name = iv.stakeholderName || role;

        // Check manually flagged signals
        if (iv.signalFlags) {
            Object.values(iv.signalFlags).forEach(flags => {
                (flags || []).forEach(sid => {
                    if (signalHits[sid]) {
                        if (!signalHits[sid].stakeholders.includes(role)) {
                            signalHits[sid].stakeholders.push(role);
                        }
                        signalHits[sid].count++;
                        if (!signalHits[sid].sources.some(s => s.name === name)) {
                            signalHits[sid].sources.push({ name: name, role: role, method: 'flaggad manuellt' });
                        }
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
                                // Store as quote with attribution
                                if (signalHits[signalId].quotes.length < 5) {
                                    const quoteSnippet = extractQuoteSnippet(answer, pattern);
                                    if (quoteSnippet && !signalHits[signalId].quotes.some(q => q.text === quoteSnippet)) {
                                        signalHits[signalId].quotes.push({ text: quoteSnippet, speaker: name, role: role });
                                    }
                                }
                            }
                        });

                        if (!signalHits[signalId].sources.some(s => s.name === name)) {
                            signalHits[signalId].sources.push({ name: name, role: role, method: 'nyckelordsmatchning' });
                        }
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
                    // Add top quote as evidence
                    if (iv.topQuote && iv.topQuote.toLowerCase().includes(pattern.toLowerCase())) {
                        if (signalHits[signalId].quotes.length < 5) {
                            signalHits[signalId].quotes.push({ text: iv.topQuote, speaker: name, role: role });
                        }
                    }
                }
            });
        });
    });

    // Update detected signals AND store rich evidence
    Object.entries(signalHits).forEach(([sid, data]) => {
        if (data.count > 0) {
            state.detectedSignals[sid] = true;
            state.signalEvidence[sid] = {
                count: data.count,
                stakeholders: data.stakeholders,
                quotes: data.quotes,
                sources: data.sources
            };
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

            // Determine severity via 4-dimension model
            // Corroboration: based on stakeholder count
            let corroboration = 1;
            if (data.stakeholders.length >= 3) corroboration = 3;
            else if (data.stakeholders.length >= 2) corroboration = 2;

            // Revenue Impact: signals that directly block revenue (Forecast, Hero Dependency, Qualification Drift) = 3
            const highRevSignals = ['forecast-vagueness', 'hero-dependency', 'qualification-drift'];
            const medRevSignals = ['stage-ambiguity', 'conversion-silence', 'misaligned-expectations'];
            let revenue = 1;
            if (highRevSignals.includes(signalId)) revenue = 3;
            else if (medRevSignals.includes(signalId)) revenue = 2;

            // Structural Depth: Foundation/Dependency signals are fundamental, Pipeline/Alignment are process-level
            let depth = 2;
            if (config.tag === 'Foundation' || config.tag === 'Dependency') depth = 3;
            else if (config.tag === 'Alignment' || config.tag === 'Pipeline') depth = 2;
            else depth = 2;

            // Reversibility: fundamental gaps (Foundation, Dependency) are hardest to reverse
            let reversibility = 2;
            if (config.tag === 'Foundation' || config.tag === 'Dependency') reversibility = 3;
            else if (config.tag === 'Pipeline' || config.tag === 'Forecast') reversibility = 2;
            else reversibility = 2;

            const severityScores = { revenue, depth, reversibility, corroboration };
            const severity = computeSeverityFromScores(severityScores) || 'medium';

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
                severityScores: severityScores,
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

    // Auto-generate signals activity log
    Object.entries(signalHits).forEach(([sid, data]) => {
        if (data.count > 0 && data.sources.length > 0) {
            const signal = DIAGNOSTIC_SIGNALS.find(s => s.id === sid);
            if (signal) {
                addActivity('Signal auto-detekterad: <strong>' + signal.name + '</strong> (' + data.stakeholders.length + ' stakeholders, ' + data.count + ' träffar)', signal.tagColor + '22', signal.tagColor, '&#9888;');
            }
        }
    });

    // Auto-generate ALL report sections based on interview data and gaps
    autoGenerateFullReport(signalHits);
}

// Helper: extract a meaningful quote snippet around a keyword match
function extractQuoteSnippet(text, keyword) {
    const lower = text.toLowerCase();
    const idx = lower.indexOf(keyword.toLowerCase());
    if (idx < 0) return null;
    const start = Math.max(0, idx - 50);
    const end = Math.min(text.length, idx + keyword.length + 100);
    let snippet = text.substring(start, end).trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
}

function autoGenerateFullReport(signalHits) {
    const gaps = state.gaps;
    const highGaps = gaps.filter(g => g.severity === 'high');
    const medGaps = gaps.filter(g => g.severity === 'medium');

    // =============================================
    // S1: Executive Summary — auto-generate all fields
    // =============================================
    if (gaps.length >= 1) {
        const tagCounts = {};
        gaps.forEach(g => { tagCounts[g.tag] = (tagCounts[g.tag] || 0) + 1; });
        const topTagEntry = Object.entries(tagCounts).sort((a,b) => b[1] - a[1])[0];
        const tagData = topTagEntry ? GAP_TAGS.find(t => t.id === topTagEntry[0]) : null;

        // Architecture maturity insights from ANALYSIS_AREAS
        const areaScores = ANALYSIS_AREAS.map(a => ({ area: a, maturity: getAreaMaturity(a.id) }))
            .filter(s => s.maturity);
        const weakAreas = areaScores.filter(s => s.maturity.score < 2.5)
            .sort((a, b) => a.maturity.score - b.maturity.score);

        if (!state.reportData['S1_coreFinding']) {
            let finding = 'Den kommersiella arkitekturen uppvisar ' + gaps.length + ' strukturella gaps' +
                (tagData ? ', med koncentration inom ' + tagData.module : '') + '. ' +
                (highGaps.length > 0 ? highGaps.length + ' av dessa blockerar tillväxt direkt.' : 'Majoriteten skapar operativ friktion som begränsar skalbarhet.');
            if (weakAreas.length > 0) {
                const names = weakAreas.slice(0, 3).map(w => w.area.name).join(', ');
                finding += ' Arkitekturell mognadsmätning visar särskilt låg strukturell nivå inom ' + names + '.';
            }
            state.reportData['S1_coreFinding'] = finding;
        }

        if (!state.reportData['S1_primaryRisk']) {
            if (highGaps.length > 0) {
                state.reportData['S1_primaryRisk'] = 'Om de identifierade ' + highGaps.length + ' högrisk-gapen inte adresseras inom 6-12 månader riskerar företaget att: (1) förlora intäktsförutsägbarhet, (2) öka churn och (3) stagnera tillväxt.';
            } else if (medGaps.length > 0) {
                state.reportData['S1_primaryRisk'] = 'De ' + medGaps.length + ' identifierade friktionspunkterna ackumuleras och riskerar att övergå till tillväxtblockerare inom 6-12 månader om de inte adresseras strukturellt.';
            }
        }

        if (!state.reportData['S1_primaryRecommendation']) {
            // Generate recommendation based on the top gap category
            const recommendations = {
                'Pipeline': 'Implementera en beteendedefinierad pipeline-arkitektur med objektiva exit-kriterier per stage, konverteringsspårning och forecast-integration.',
                'Foundation': 'Definiera ICP, kvalificeringsramverk och GTM-principer som strukturellt fundament innan kommersiella processer skalas.',
                'Forecast': 'Ersätt intuitiv forecasting med en deal-baserad sannolikhetsmodell kopplad till definierade pipeline-stages och konverteringsdata.',
                'Dependency': 'Systematisera den kommersiella motorn genom att dokumentera och replikera best practices från nyckelpersoner till repeterbara processer.',
                'Alignment': 'Etablera en gemensam kommersiell arkitektur mellan marketing och sälj med delad attribution, gemensamma KPI:er och strukturerad handoff.'
            };
            if (topTagEntry) {
                state.reportData['S1_primaryRecommendation'] = recommendations[topTagEntry[0]] || 'Genomför Revenue Architecture Programme för att adressera identifierade strukturella gaps.';
            }
        }
    }

    // =============================================
    // S2: Assessment Scope — auto-generate from interview data
    // =============================================
    if (state.interviews.length > 0) {
        if (!state.reportData['S2_stakeholdersInterviewed']) {
            const stakeholderLines = state.interviews.map(iv => {
                return iv.stakeholderRole + ' — ' + (iv.stakeholderName || 'Ej namngivna') + ' — ' + (iv.date || 'Datum ej angivet');
            });
            state.reportData['S2_stakeholdersInterviewed'] = stakeholderLines.join('\n');
        }

        if (!state.reportData['S2_duration']) {
            const totalInterviews = state.interviews.length;
            const totalMinutes = state.interviews.reduce((sum, iv) => {
                const mins = parseInt(iv.duration) || 60;
                return sum + mins;
            }, 0);
            const days = state.assessmentDay || 1;
            state.reportData['S2_duration'] = totalInterviews + ' intervjuer genomförda under ' + days + ' dagar. Total intervjutid: ~' + totalMinutes + ' minuter.';
        }

        if (!state.reportData['S2_companiesAssessed'] && state.currentUser) {
            // Try to infer from context
            const roles = [...new Set(state.interviews.map(iv => iv.stakeholderRole))];
            state.reportData['S2_companiesAssessed'] = 'Bedömning genomförd med ' + roles.length + ' stakeholder-roller representerade: ' + roles.join(', ') + '.';
        }
    }

    // =============================================
    // S3: Current State — auto-synthesize from interview answers
    // =============================================
    if (state.interviews.length >= 2) {
        autoGenerateCurrentState();
    }

    // =============================================
    // S5: Prioritized Roadmap — auto-generate dependency logic and timeline
    // =============================================
    if (gaps.length >= 2) {
        if (!state.reportData['S5_dependencyLogic']) {
            const sorted = [...gaps].sort((a,b) => {
                const order = { high: 0, medium: 1, low: 2 };
                return (order[a.severity] || 2) - (order[b.severity] || 2);
            });

            // Build dependency chain reasoning
            const tagOrder = [];
            sorted.forEach(g => {
                if (!tagOrder.includes(g.tag)) tagOrder.push(g.tag);
            });

            const depMap = {
                'Foundation': 'Foundation (ICP & kvalificering) måste definieras först — det utgör grunden för alla andra kommersiella processer.',
                'Pipeline': 'Pipeline-arkitektur bygger på att Foundation är på plats. Stages behöver objektiva kriterier kopplade till ICP.',
                'Forecast': 'Forecast-metodik kräver fungerande pipeline-data. Utan definierade stages och konverteringstal saknas inputs.',
                'Dependency': 'Personberoende kan adresseras parallellt genom att systematisera processer som byggs i Pipeline och Foundation.',
                'Alignment': 'Alignment mellan marketing och sälj optimeras efter att pipeline och forecast-arkitektur etablerats.'
            };

            const logic = tagOrder.map((tag, i) => {
                return (i + 1) + '. ' + (depMap[tag] || tag);
            }).join('\n');

            state.reportData['S5_dependencyLogic'] = logic;
        }

        if (!state.reportData['S5_estimatedTimeline']) {
            if (highGaps.length >= 3) {
                state.reportData['S5_estimatedTimeline'] = 'Fas 1 (Månad 1-3): Adressera högrisk-gaps — Foundation & Pipeline. Fas 2 (Månad 4-6): Forecast & Alignment. Fas 3 (Månad 7-12): Optimering & skalning.';
            } else if (highGaps.length >= 1) {
                state.reportData['S5_estimatedTimeline'] = 'Fas 1 (Månad 1-2): Åtgärda kritiska gaps. Fas 2 (Månad 3-5): Strukturell uppbyggnad. Fas 3 (Månad 6+): Optimering.';
            } else {
                state.reportData['S5_estimatedTimeline'] = 'Fas 1 (Månad 1-3): Adressera friktionspunkter. Fas 2 (Månad 4-6): Konsolidera och optimera.';
            }
        }
    }

    // =============================================
    // S6: Recommended Engagement — auto-generate all fields
    // =============================================
    if (gaps.length >= 1) {
        if (!state.reportData['S6_recommendedProgramme']) {
            const modules = [];
            const usedTags = [];
            [...gaps].sort((a,b) => {
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

        if (!state.reportData['S6_engagementFormat']) {
            if (highGaps.length >= 2) {
                state.reportData['S6_engagementFormat'] = 'Rekommenderat format: Veckovisa arbetssessioner (90 min) under första 3 månaderna, därefter månatlig rådgivning med kvartalsvis governance-genomgång.';
            } else {
                state.reportData['S6_engagementFormat'] = 'Rekommenderat format: Månatlig rådgivning med dedikerade arbetssessioner vid behov. Kvartalsvis uppföljning av KPI:er och strukturell progress.';
            }
        }

        if (!state.reportData['S6_investmentLevel']) {
            const uniqueTags = [...new Set(gaps.map(g => g.tag))];
            if (uniqueTags.length >= 4 || highGaps.length >= 3) {
                state.reportData['S6_investmentLevel'] = 'Enterprise-tier (från 12 950 EUR/månad) — motiverat av antal identifierade gaps (' + gaps.length + '), deras allvarlighetsgrad och behovet av parallell intervention över ' + uniqueTags.length + ' moduler.';
            } else if (uniqueTags.length >= 2 || highGaps.length >= 1) {
                state.reportData['S6_investmentLevel'] = 'Growth-tier (från 7 950 EUR/månad) — motiverat av ' + gaps.length + ' strukturella gaps över ' + uniqueTags.length + ' moduler, varav ' + highGaps.length + ' med hög allvarlighetsgrad.';
            } else {
                state.reportData['S6_investmentLevel'] = 'Foundation-tier (från 4 950 EUR/månad) — fokuserat engagement för att adressera ' + gaps.length + ' identifierade gap(s) inom ett avgränsat område.';
            }
        }

        if (!state.reportData['S6_expectedOutcome']) {
            state.reportData['S6_expectedOutcome'] = 'Om 90 dagar: Definierad pipeline-arkitektur, implementerade kvalificeringsramar och första forecast-cykeln baserad på strukturerad metodik. ' +
                'Om 6 månader: Fungerande kommersiell motor med mätbara konverteringstal, reducerat personberoende och datadriven forecast med >80% tillförlitlighet.';
        }
    }
}

// ============================================================
// AUTO-GENERATE S3: Current State from interview answers
// ============================================================
function autoGenerateCurrentState() {
    // Analyze interview answers to extract insights about current state
    // Each field in S3 corresponds to specific question areas

    const answersByRole = {};
    state.interviews.forEach(iv => {
        answersByRole[iv.stakeholderRole] = {
            answers: iv.answers || {},
            name: iv.stakeholderName || iv.stakeholderRole,
            topQuote: iv.topQuote || '',
            keyTension: iv.keyTension || ''
        };
    });

    // S3: Revenue Model — CEO Q1, Q3
    if (!state.reportData['S3_revenueModel']) {
        const insights = [];
        const ceo = answersByRole['CEO / Founder'];
        if (ceo) {
            if (ceo.answers[0]) insights.push('Intäktsmodell: ' + summarizeAnswer(ceo.answers[0]));
            if (ceo.answers[2]) insights.push('Primär intäktskälla: ' + summarizeAnswer(ceo.answers[2]));
        }
        const cfo = answersByRole['CFO / Finance'];
        if (cfo && cfo.answers[3]) insights.push('Bruttomarginaltrend: ' + summarizeAnswer(cfo.answers[3]));
        if (insights.length > 0) {
            state.reportData['S3_revenueModel'] = insights.join('. ') + '.';
        }
    }

    // S3: Team Structure — CEO Q1, Sales Q6-7, Marketing Q7
    if (!state.reportData['S3_teamStructure']) {
        const insights = [];
        const cfo = answersByRole['CFO / Finance'];
        if (cfo && cfo.answers[4]) insights.push('Headcount-dimensionering: ' + summarizeAnswer(cfo.answers[4]));
        const ceo = answersByRole['CEO / Founder'];
        if (ceo && ceo.answers[5]) insights.push('Insyn: ' + summarizeAnswer(ceo.answers[5]));
        const sales = answersByRole['Head of Sales'];
        if (sales && sales.answers[6]) insights.push('Största begränsning (sälj): ' + summarizeAnswer(sales.answers[6]));
        if (insights.length > 0) {
            state.reportData['S3_teamStructure'] = insights.join('. ') + '.';
        }
    }

    // S3: Pipeline & Process — Sales Q1, Q2, Q3, Q4
    if (!state.reportData['S3_pipelineProcess']) {
        const insights = [];
        const sales = answersByRole['Head of Sales'];
        if (sales) {
            if (sales.answers[0]) insights.push('Deal-process: ' + summarizeAnswer(sales.answers[0]));
            if (sales.answers[1]) insights.push('Kvalificering: ' + summarizeAnswer(sales.answers[1]));
            if (sales.answers[2]) insights.push('Pipeline-fördelning: ' + summarizeAnswer(sales.answers[2]));
            if (sales.answers[4]) insights.push('Flaskhalsar: ' + summarizeAnswer(sales.answers[4]));
        }
        if (insights.length > 0) {
            state.reportData['S3_pipelineProcess'] = insights.join('. ') + '.';
        }
    }

    // S3: Forecast Practice — Sales Q4, CEO Q5, CFO Q1
    if (!state.reportData['S3_forecastPractice']) {
        const insights = [];
        const sales = answersByRole['Head of Sales'];
        if (sales && sales.answers[3]) insights.push('Forecast-metod (sälj): ' + summarizeAnswer(sales.answers[3]));
        const ceo = answersByRole['CEO / Founder'];
        if (ceo && ceo.answers[4]) insights.push('Forecast-konfidens (CEO): ' + summarizeAnswer(ceo.answers[4]));
        const cfo = answersByRole['CFO / Finance'];
        if (cfo && cfo.answers[0]) insights.push('Intäktsförutsägbarhet (CFO): ' + summarizeAnswer(cfo.answers[0]));
        if (insights.length > 0) {
            state.reportData['S3_forecastPractice'] = insights.join('. ') + '.';
        }
    }

    // S3: Marketing-Sales Dynamic — Marketing Q1-Q7, Sales Q5-Q6
    if (!state.reportData['S3_marketingSalesDynamic']) {
        const insights = [];
        const marketing = answersByRole['Marketing Lead'];
        if (marketing) {
            if (marketing.answers[0]) insights.push('MQL-definition: ' + summarizeAnswer(marketing.answers[0]));
            if (marketing.answers[1]) insights.push('Lead-handoff: ' + summarizeAnswer(marketing.answers[1]));
            if (marketing.answers[2]) insights.push('Attribution: ' + summarizeAnswer(marketing.answers[2]));
            if (marketing.answers[4]) insights.push('Glapp marketing-sälj: ' + summarizeAnswer(marketing.answers[4]));
        }
        const sales = answersByRole['Head of Sales'];
        if (sales && sales.answers[5]) insights.push('Lead-kvalitet (sälj): ' + summarizeAnswer(sales.answers[5]));
        if (insights.length > 0) {
            state.reportData['S3_marketingSalesDynamic'] = insights.join('. ') + '.';
        }
    }

    // S3: CS Model — CS Q1-Q7
    if (!state.reportData['S3_csModel']) {
        const insights = [];
        const cs = answersByRole['CS / Retention Lead'];
        if (cs) {
            if (cs.answers[0]) insights.push('Onboarding (90 dagar): ' + summarizeAnswer(cs.answers[0]));
            if (cs.answers[1]) insights.push('Churn-orsaker: ' + summarizeAnswer(cs.answers[1]));
            if (cs.answers[3]) insights.push('Hälsosam kundbas: ' + summarizeAnswer(cs.answers[3]));
            if (cs.answers[4]) insights.push('Expansion-rörelse: ' + summarizeAnswer(cs.answers[4]));
            if (cs.answers[5]) insights.push('Sälj-CS alignment: ' + summarizeAnswer(cs.answers[5]));
        }
        if (insights.length > 0) {
            state.reportData['S3_csModel'] = insights.join('. ') + '.';
        }
    }
}

// Helper: Summarize a long answer to a concise excerpt
function summarizeAnswer(text) {
    if (!text) return 'Ej besvarat';
    const trimmed = text.trim();
    if (trimmed.length <= 180) return trimmed;
    // Find a natural break point
    const cutoff = trimmed.substring(0, 180);
    const lastPeriod = cutoff.lastIndexOf('.');
    const lastComma = cutoff.lastIndexOf(',');
    const breakAt = Math.max(lastPeriod, lastComma);
    if (breakAt > 80) return trimmed.substring(0, breakAt + 1);
    return cutoff + '...';
}

// Re-run diagnostics: clears auto-generated data and re-analyzes
function rerunDiagnostics() {
    if (!confirm('Detta rensar allt auto-genererat innehåll (gaps, signaler, rapportfält) och kör om analysen baserat på nuvarande intervjudata. Manuellt skapade gaps behålls. Fortsätt?')) return;

    // Remove auto-generated gaps
    state.gaps = state.gaps.filter(g => !g.autoGenerated);

    // Clear auto-detected signals (keep manually toggled ones would require tracking — clear all and re-detect)
    state.detectedSignals = {};
    state.signalEvidence = {};

    // Clear auto-generated report fields (only fields that would be auto-populated)
    const autoFields = [
        'S1_coreFinding', 'S1_primaryRisk', 'S1_primaryRecommendation',
        'S2_stakeholdersInterviewed', 'S2_duration', 'S2_companiesAssessed',
        'S3_revenueModel', 'S3_teamStructure', 'S3_pipelineProcess', 'S3_forecastPractice', 'S3_marketingSalesDynamic', 'S3_csModel',
        'S5_dependencyLogic', 'S5_estimatedTimeline',
        'S6_recommendedProgramme', 'S6_engagementFormat', 'S6_investmentLevel', 'S6_expectedOutcome'
    ];
    autoFields.forEach(key => { delete state.reportData[key]; });

    // Re-run the diagnostic engine
    runDiagnosticEngine();

    saveState();
    renderAll();
    addActivity('Diagnostikmotor omkörning genomförd — alla auto-genererade fält uppdaterade', 'var(--accent-soft)', 'var(--accent)', '&#8635;');
    saveState();
}

// === Signals ===
function renderSignals() {
    const grid = document.getElementById('signals-grid');
    grid.innerHTML = DIAGNOSTIC_SIGNALS.map(s => {
        const detected = state.detectedSignals[s.id] || false;
        const evidence = state.signalEvidence[s.id] || null;

        // Build evidence section if signal has been auto-detected
        let evidenceHtml = '';
        if (detected && evidence) {
            evidenceHtml += '<div class="signal-evidence">';

            // Show detection stats
            evidenceHtml += '<div class="signal-evidence-stats">' +
                '<span class="signal-stat"><strong>' + evidence.count + '</strong> träffar</span>' +
                '<span class="signal-stat"><strong>' + evidence.stakeholders.length + '</strong> stakeholders</span>' +
            '</div>';

            // Show which stakeholders
            if (evidence.stakeholders.length > 0) {
                evidenceHtml += '<div class="signal-evidence-stakeholders">' +
                    '<div class="signal-evidence-label">Detekterad hos</div>' +
                    evidence.stakeholders.map(sh =>
                        '<span class="signal-stakeholder-chip">' + escapeHtml(sh) + '</span>'
                    ).join('') +
                '</div>';
            }

            // Show quotes
            if (evidence.quotes && evidence.quotes.length > 0) {
                evidenceHtml += '<div class="signal-evidence-quotes">' +
                    '<div class="signal-evidence-label">Citat</div>';
                evidence.quotes.slice(0, 3).forEach(q => {
                    evidenceHtml += '<div class="signal-quote">' +
                        '<div class="signal-quote-text">&ldquo;' + escapeHtml(q.text) + '&rdquo;</div>' +
                        '<div class="signal-quote-speaker">— ' + escapeHtml(q.speaker) + ' (' + escapeHtml(q.role) + ')</div>' +
                    '</div>';
                });
                evidenceHtml += '</div>';
            }

            // Show detection sources
            if (evidence.sources && evidence.sources.length > 0) {
                evidenceHtml += '<div class="signal-evidence-sources">' +
                    '<div class="signal-evidence-label">Källor</div>';
                evidence.sources.forEach(src => {
                    evidenceHtml += '<div class="signal-source">' +
                        '<span>' + escapeHtml(src.name) + '</span>' +
                        '<span class="signal-source-method">' + escapeHtml(src.method) + '</span>' +
                    '</div>';
                });
                evidenceHtml += '</div>';
            }

            evidenceHtml += '</div>';
        }

        return '<div class="signal-card ' + (detected ? 'signal-detected' : '') + '" data-number="' + s.number + '">' +
            '<div class="signal-number">SIGNAL ' + s.number + '</div>' +
            '<div class="signal-card-name">' + s.name + '</div>' +
            '<span class="signal-tag" style="background:' + s.tagColor + '22;color:' + s.tagColor + '">' + s.tag + '</span>' +
            '<div class="signal-desc">' + s.description + '</div>' +
            '<div class="signal-listen">' +
                '<div class="signal-listen-label">Lyssna efter</div>' +
                '<div class="signal-listen-text">' + s.listenFor + '</div>' +
            '</div>' +
            evidenceHtml +
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

// === Analysis Areas ===
const MATURITY_LEVELS = [
    { value: 4, label: 'Arkitekturerad', description: 'Dokumenterat, ägarskap, skalbart', color: '#10b981' },
    { value: 3, label: 'Delvis byggt', description: 'Finns delar, inte komplett system', color: '#f59e0b' },
    { value: 2, label: 'Improviserat', description: 'Beror på individer/vanor', color: '#ef4444' },
    { value: 1, label: 'Saknas', description: 'Ingen struktur existerar', color: '#7f1d1d' }
];

function getAreaMaturity(areaId) {
    const data = state.areaAnswers[areaId];
    if (!data || !data.maturity) return null;
    const values = Object.values(data.maturity).filter(v => v);
    if (values.length === 0) return null;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return {
        score: avg,
        answered: values.length,
        percent: Math.round(((avg - 1) / 3) * 100)
    };
}

function getMaturityLabel(score) {
    if (score >= 3.5) return { label: 'Arkitekturerad', color: '#10b981' };
    if (score >= 2.5) return { label: 'Delvis byggt', color: '#f59e0b' };
    if (score >= 1.5) return { label: 'Improviserat', color: '#ef4444' };
    return { label: 'Ej strukturerat', color: '#7f1d1d' };
}

function renderAreas() {
    const container = document.getElementById('areas-content');
    if (!container) return;

    // Overall architecture maturity summary
    const areaScores = ANALYSIS_AREAS.map(a => ({
        area: a,
        maturity: getAreaMaturity(a.id)
    }));
    const answeredAreas = areaScores.filter(s => s.maturity);
    const overallScore = answeredAreas.length > 0
        ? answeredAreas.reduce((sum, s) => sum + s.maturity.score, 0) / answeredAreas.length
        : null;

    let summaryHtml = '<div class="areas-scorecard">';
    summaryHtml += '<div class="areas-scorecard-header">';
    summaryHtml += '<div><h3>Arkitekturell mognad</h3><p class="areas-scorecard-sub">Sammanvägd bedömning per område. Låga värden indikerar strukturella brister i den kommersiella arkitekturen.</p></div>';
    if (overallScore !== null) {
        const lbl = getMaturityLabel(overallScore);
        summaryHtml += '<div class="areas-overall"><div class="areas-overall-value" style="color:' + lbl.color + '">' +
            Math.round(((overallScore - 1) / 3) * 100) + '%</div>' +
            '<div class="areas-overall-label" style="color:' + lbl.color + '">' + lbl.label + '</div></div>';
    }
    summaryHtml += '</div>';

    summaryHtml += '<div class="areas-scorecard-grid">';
    areaScores.forEach(({area, maturity}) => {
        const pct = maturity ? maturity.percent : 0;
        const lbl = maturity ? getMaturityLabel(maturity.score) : { label: 'Ej bedömd', color: '#6b7280' };
        summaryHtml += '<a href="#area-' + area.id + '" class="areas-score-chip" style="border-color:' + lbl.color + '33">' +
            '<div class="areas-score-chip-top">' +
                '<span class="areas-score-icon" style="color:' + area.color + '">' + area.icon + '</span>' +
                '<span class="areas-score-name">' + area.name + '</span>' +
            '</div>' +
            '<div class="areas-score-bar"><div class="areas-score-fill" style="width:' + pct + '%;background:' + lbl.color + '"></div></div>' +
            '<div class="areas-score-bottom">' +
                '<span style="color:' + lbl.color + '">' + (maturity ? pct + '%' : '—') + '</span>' +
                '<span class="areas-score-status">' + lbl.label + '</span>' +
            '</div>' +
        '</a>';
    });
    summaryHtml += '</div></div>';

    // Area cards
    let areasHtml = '';
    ANALYSIS_AREAS.forEach(area => {
        const maturity = getAreaMaturity(area.id);
        const data = state.areaAnswers[area.id] || { answers: {}, maturity: {} };
        const lbl = maturity ? getMaturityLabel(maturity.score) : null;

        areasHtml += '<div class="area-card" id="area-' + area.id + '" style="border-left-color:' + area.color + '">';
        areasHtml += '<div class="area-card-header">';
        areasHtml += '<div class="area-card-title">';
        areasHtml += '<span class="area-icon" style="background:' + area.color + '1f;color:' + area.color + '">' + area.icon + '</span>';
        areasHtml += '<div><h3>' + area.name + '</h3><p class="area-purpose">' + escapeHtml(area.purpose) + '</p></div>';
        areasHtml += '</div>';
        if (maturity) {
            areasHtml += '<div class="area-score"><div class="area-score-value" style="color:' + lbl.color + '">' +
                maturity.percent + '%</div><div class="area-score-label" style="color:' + lbl.color + '">' + lbl.label + '</div></div>';
        }
        areasHtml += '</div>';

        areasHtml += '<div class="area-lens"><span class="area-lens-label">Arkitekturlins</span>' +
            '<span class="area-lens-text">' + escapeHtml(area.architecturalLens) + '</span></div>';

        // Related signals + tags
        areasHtml += '<div class="area-related">';
        if (area.relatedSignals && area.relatedSignals.length) {
            areasHtml += '<div class="area-related-group"><span class="area-related-label">Relaterade signaler:</span>';
            area.relatedSignals.forEach(sid => {
                const sig = DIAGNOSTIC_SIGNALS.find(s => s.id === sid);
                if (sig) {
                    const detected = state.detectedSignals[sig.id];
                    areasHtml += '<span class="area-sig-chip ' + (detected ? 'detected' : '') + '" style="background:' + sig.tagColor + '1f;color:' + sig.tagColor + '">' +
                        (detected ? '&#9679; ' : '') + escapeHtml(sig.name) + '</span>';
                }
            });
            areasHtml += '</div>';
        }
        if (area.relatedTags && area.relatedTags.length) {
            areasHtml += '<div class="area-related-group"><span class="area-related-label">RAP-moduler:</span>';
            area.relatedTags.forEach(tid => {
                const tag = GAP_TAGS.find(t => t.id === tid);
                if (tag) {
                    areasHtml += '<span class="area-tag-chip" style="background:' + tag.color + '1f;color:' + tag.color + '">' + tag.module + '</span>';
                }
            });
            areasHtml += '</div>';
        }
        areasHtml += '</div>';

        // Questions
        areasHtml += '<div class="area-questions">';
        area.questions.forEach((q, idx) => {
            const currentAnswer = (data.answers && data.answers[idx]) || '';
            const currentMaturity = (data.maturity && data.maturity[idx]) || 0;
            areasHtml += '<div class="area-question">';
            areasHtml += '<div class="area-q-num">Q' + (idx + 1) + '</div>';
            areasHtml += '<div class="area-q-content">';
            areasHtml += '<div class="area-q-text">' + escapeHtml(q) + '</div>';
            areasHtml += '<textarea class="area-q-answer" placeholder="Dokumentera kundens svar — lyssna efter arkitektur vs. improvisation" ' +
                'onchange="updateAreaAnswer(\'' + area.id + '\', ' + idx + ', this.value)">' + escapeHtml(currentAnswer) + '</textarea>';
            areasHtml += '<div class="area-maturity"><span class="area-maturity-label">Arkitekturell mognad:</span>';
            MATURITY_LEVELS.forEach(m => {
                const active = currentMaturity === m.value;
                areasHtml += '<button class="area-maturity-btn ' + (active ? 'active' : '') + '" ' +
                    'style="' + (active ? 'background:' + m.color + ';color:white;border-color:' + m.color : 'color:' + m.color + ';border-color:' + m.color + '55') + '" ' +
                    'onclick="updateAreaMaturity(\'' + area.id + '\', ' + idx + ', ' + m.value + ')" ' +
                    'title="' + escapeHtml(m.description) + '">' + m.label + '</button>';
            });
            areasHtml += '</div>';
            areasHtml += '</div></div>';
        });
        areasHtml += '</div></div>';
    });

    container.innerHTML = summaryHtml + areasHtml;
}

function updateAreaAnswer(areaId, qIndex, value) {
    if (!state.areaAnswers[areaId]) state.areaAnswers[areaId] = { answers: {}, maturity: {} };
    if (!state.areaAnswers[areaId].answers) state.areaAnswers[areaId].answers = {};
    state.areaAnswers[areaId].answers[qIndex] = value;
    saveState();
}

function updateAreaMaturity(areaId, qIndex, value) {
    if (!state.areaAnswers[areaId]) state.areaAnswers[areaId] = { answers: {}, maturity: {} };
    if (!state.areaAnswers[areaId].maturity) state.areaAnswers[areaId].maturity = {};
    // Toggle: clicking same value clears it
    if (state.areaAnswers[areaId].maturity[qIndex] === value) {
        delete state.areaAnswers[areaId].maturity[qIndex];
    } else {
        state.areaAnswers[areaId].maturity[qIndex] = value;
        const area = ANALYSIS_AREAS.find(a => a.id === areaId);
        const level = MATURITY_LEVELS.find(m => m.value === value);
        if (area && level && value <= 2) {
            addActivity('Arkitekturbrist noterad i <strong>' + area.name + '</strong> (' + level.label + ')',
                area.color + '22', area.color, area.icon);
        }
    }
    saveState();
    renderAreas();
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
        const scores = gap.severityScores || null;
        let scoresHtml = '';
        if (scores) {
            const sum = SEVERITY_CRITERIA.reduce((acc, c) => acc + (scores[c.id] || 0), 0);
            scoresHtml = '<div class="gap-sev-breakdown">' +
                '<span class="gap-sev-sum">Severity-summa: <strong>' + sum + '/12</strong></span>' +
                SEVERITY_CRITERIA.map(c => {
                    const v = scores[c.id] || 0;
                    const level = c.levels.find(l => l.value === v);
                    return '<span class="gap-sev-dim" title="' + escapeHtml(c.question) + '">' +
                        '<span class="gap-sev-dim-label">' + c.label + '</span>' +
                        '<span class="gap-sev-dim-val dim-' + v + '">' + v + '</span>' +
                        (level ? '<span class="gap-sev-dim-desc">' + escapeHtml(level.label) + '</span>' : '') +
                    '</span>';
                }).join('') +
            '</div>';
        }
        return '<div class="gap-card">' +
            '<div class="gap-header">' +
                '<span class="gap-title">' + escapeHtml(gap.title) + autoLabel + '</span>' +
                '<div class="gap-badges">' +
                    '<span class="gap-severity ' + gap.severity + '">' + getSeverityLabel(gap.severity) + '</span>' +
                    (tagData ? '<span class="gap-tag-badge" style="background:' + tagData.color + '22;color:' + tagData.color + '">' + tagData.label + '</span>' : '') +
                '</div>' +
            '</div>' +
            (gap.evidence ? '<div class="gap-evidence">' + escapeHtml(gap.evidence) + '</div>' : '') +
            scoresHtml +
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

    const scores = gap.severityScores || {};

    let sevCriteriaHtml = '<div class="form-group"><label>Severity-bedömning (4 dimensioner)</label>' +
        '<p class="form-help">Välj en nivå per dimension. Severity beräknas som summa: 10-12 = Hög, 7-9 = Medium, 4-6 = Låg.</p>';
    SEVERITY_CRITERIA.forEach(crit => {
        sevCriteriaHtml += '<div class="sev-criterion">' +
            '<div class="sev-crit-header"><span class="sev-crit-label">' + crit.label + '</span>' +
            '<span class="sev-crit-question">' + crit.question + '</span></div>' +
            '<div class="sev-crit-options">';
        crit.levels.forEach(lvl => {
            const active = scores[crit.id] === lvl.value;
            sevCriteriaHtml += '<button type="button" class="sev-level ' + (active ? 'active' : '') + '" ' +
                'data-crit="' + crit.id + '" data-value="' + lvl.value + '" ' +
                'onclick="selectSevLevel(\'' + crit.id + '\', ' + lvl.value + ')" ' +
                'title="' + escapeHtml(lvl.description) + '">' +
                '<span class="sev-level-num">' + lvl.value + '</span>' +
                '<span class="sev-level-label">' + lvl.label + '</span>' +
                '<span class="sev-level-desc">' + lvl.description + '</span>' +
            '</button>';
        });
        sevCriteriaHtml += '</div></div>';
    });
    sevCriteriaHtml += '<div class="sev-computed" id="sev-computed-display">' + renderSevComputed(scores) + '</div></div>';

    body.innerHTML =
        '<div class="form-group"><label>Gap-titel</label><input type="text" id="gap-form-title" value="' + escapeHtml(gap.title || '') + '" placeholder="T.ex. \'No Defined Pipeline Qualification Framework\'"></div>' +
        '<div class="form-group"><label>Evidens (verbatim citat eller observerat mönster)</label><textarea id="gap-form-evidence" placeholder="T.ex. \'Tre separata stakeholders beskrev kvalificering som magkänsla\'">' + escapeHtml(gap.evidence || '') + '</textarea></div>' +
        '<div class="form-group"><label>Gap-tagg / RAP-modul</label><select id="gap-form-tag">' + tagOptions + '</select></div>' +
        sevCriteriaHtml +
        '<div class="form-group"><label>Affärsimplikation</label><textarea id="gap-form-implication" placeholder="Vilken strukturell konsekvens skapar detta? Var specifik.">' + escapeHtml(gap.implication || '') + '</textarea></div>' +
        '<div class="modal-actions">' +
            '<button class="btn-ghost" onclick="closeModal()">Avbryt</button>' +
            '<button class="btn-primary" onclick="saveGap(' + (isEdit ? editIdx : -1) + ')">Spara</button>' +
        '</div>';

    // Keep working copy of scores on the modal itself
    document.getElementById('modal-overlay').dataset.sevScores = JSON.stringify(scores);
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function renderSevComputed(scores) {
    const values = SEVERITY_CRITERIA.map(c => scores[c.id] || 0);
    const answered = values.filter(v => v > 0).length;
    const sum = values.reduce((a, b) => a + b, 0);
    if (answered < 4) {
        return '<span class="sev-computed-empty">Bedöm alla 4 dimensioner för att beräkna severity (' + answered + '/4 klart)</span>';
    }
    const sev = computeSeverityFromScores(scores);
    const sevData = SEVERITY_LEVELS.find(s => s.id === sev);
    return '<span class="sev-computed-label">Beräknad severity:</span> ' +
        '<span class="gap-severity ' + sev + '">' + sevData.label + '</span> ' +
        '<span class="sev-computed-sum">(summa: ' + sum + '/12)</span>';
}

function selectSevLevel(critId, value) {
    const overlay = document.getElementById('modal-overlay');
    const scores = JSON.parse(overlay.dataset.sevScores || '{}');
    scores[critId] = value;
    overlay.dataset.sevScores = JSON.stringify(scores);

    // Update visual state of buttons for this criterion
    document.querySelectorAll('.sev-level[data-crit="' + critId + '"]').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === value);
    });

    // Update the computed display
    document.getElementById('sev-computed-display').innerHTML = renderSevComputed(scores);
}

function saveGap(editIdx) {
    const scores = JSON.parse(document.getElementById('modal-overlay').dataset.sevScores || '{}');
    const computedSev = computeSeverityFromScores(scores);

    const gap = {
        title: document.getElementById('gap-form-title').value.trim(),
        evidence: document.getElementById('gap-form-evidence').value.trim(),
        tag: document.getElementById('gap-form-tag').value,
        severityScores: scores,
        severity: computedSev || 'medium',
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
                const val = state.reportData[section.id + '_' + f.key] || '';
                const autoLabel = val ? '<span class="rs-auto-badge">AUTO</span>' : '';
                return '<div class="rs-field"><label>' + f.label + ' ' + autoLabel + '</label>' +
                    '<textarea placeholder="' + f.placeholder + '" onchange="saveReportField(\'' + section.id + '\',\'' + f.key + '\',this.value)">' + escapeHtml(val) + '</textarea></div>';
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
