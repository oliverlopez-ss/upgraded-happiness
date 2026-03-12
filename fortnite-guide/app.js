// Fortnite Pro Guide - App Logic
(function() {
  'use strict';

  // State
  const state = {
    currentView: 'home',
    currentCategory: null,
    currentGuide: null,
    isPremium: false,
    completedGuides: JSON.parse(localStorage.getItem('fn_completed') || '[]'),
    history: []
  };

  // DOM refs
  const $ = id => document.getElementById(id);
  const homeView = $('homeView');
  const categoryView = $('categoryView');
  const guideView = $('guideView');
  const headerBack = $('headerBack');
  const headerTitle = $('headerTitle');
  const premiumModal = $('premiumModal');
  const searchOverlay = $('searchOverlay');
  const progressOverlay = $('progressOverlay');
  const searchInput = $('searchInput');

  // ===== INIT =====
  function init() {
    renderCategories();
    updateStats();
    bindEvents();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  // ===== RENDER CATEGORIES =====
  function renderCategories() {
    const grid = $('categoriesGrid');
    grid.innerHTML = GUIDE_DATA.categories.map(cat => `
      <div class="category-card" data-cat="${cat.id}" style="--card-accent: ${cat.color}">
        <span class="category-icon">${cat.icon}</span>
        <div class="category-title">${cat.title}</div>
        <div class="category-desc">${cat.description}</div>
        <div class="category-count">
          <span>${cat.guides.length} guider</span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const catId = card.dataset.cat;
        navigateTo('category', catId);
      });
    });
  }

  // ===== RENDER CATEGORY VIEW =====
  function renderCategory(catId) {
    const cat = GUIDE_DATA.categories.find(c => c.id === catId);
    if (!cat) return;

    state.currentCategory = cat;

    $('categoryHeader').innerHTML = `
      <span class="cat-icon">${cat.icon}</span>
      <div class="cat-title">${cat.title}</div>
      <div class="cat-desc">${cat.description}</div>
    `;

    const list = $('guidesList');
    list.innerHTML = cat.guides.map(guide => {
      const isRead = state.completedGuides.includes(guide.id);
      const diffClass = guide.difficulty === 'Nybörjare' ? 'beginner' :
                        guide.difficulty === 'Medel' ? 'medium' : 'advanced';

      return `
        <div class="guide-card" data-guide="${guide.id}">
          <div class="guide-card-icon">${guide.icon}</div>
          <div class="guide-card-info">
            <div class="guide-card-title">${guide.title}</div>
            <div class="guide-card-meta">
              <span class="difficulty-badge ${diffClass}">${guide.difficulty}</span>
              ${guide.isPremium && !state.isPremium ?
                '<span class="premium-lock">🔒 PRO</span>' :
                ''}
              ${isRead ? '<span class="read-check">✓</span>' : ''}
            </div>
          </div>
          <div class="guide-card-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.guide-card').forEach(card => {
      card.addEventListener('click', () => {
        const guideId = card.dataset.guide;
        const guide = cat.guides.find(g => g.id === guideId);
        if (guide.isPremium && !state.isPremium) {
          showPremiumModal();
        } else {
          navigateTo('guide', guideId);
        }
      });
    });
  }

  // ===== RENDER GUIDE VIEW =====
  function renderGuide(guideId) {
    let guide = null;
    let parentCat = null;

    for (const cat of GUIDE_DATA.categories) {
      const found = cat.guides.find(g => g.id === guideId);
      if (found) {
        guide = found;
        parentCat = cat;
        break;
      }
    }

    if (!guide) return;

    if (guide.isPremium && !state.isPremium) {
      $('guideContent').innerHTML = `
        <div class="locked-overlay">
          <span class="locked-icon">🔒</span>
          <div class="locked-title">Pro Pass krävs</div>
          <div class="locked-text">Denna guide är exklusiv för Pro Pass-medlemmar</div>
          <button class="locked-btn" onclick="document.getElementById('premiumModal').classList.remove('hidden')">
            ⚡ Lås upp med Pro Pass
          </button>
        </div>
      `;
      return;
    }

    state.currentGuide = guide;
    const isCompleted = state.completedGuides.includes(guide.id);
    const diffClass = guide.difficulty === 'Nybörjare' ? 'beginner' :
                      guide.difficulty === 'Medel' ? 'medium' : 'advanced';

    const sectionsHtml = guide.content.map(section => {
      if (section.type === 'intro') {
        return `
          <div class="guide-section intro">
            <div class="section-text">${section.text}</div>
          </div>
        `;
      } else if (section.type === 'tip') {
        const keysHtml = section.keys ?
          `<div class="section-keys">${section.keys.split(' → ').map(k =>
            `<span class="key-badge">${k}</span>`).join('<span style="color:var(--text-muted)">→</span>')
          }</div>` : '';

        return `
          <div class="guide-section tip">
            <div class="section-label tip-label">💡 Tips</div>
            <div class="section-title">${section.title}</div>
            <div class="section-text">${section.text}</div>
            ${keysHtml}
          </div>
        `;
      } else if (section.type === 'pro') {
        return `
          <div class="guide-section pro">
            <div class="section-label pro-label">⚡ Pro Tips</div>
            <div class="section-title">${section.title}</div>
            <div class="section-text">${section.text.replace(/\n/g, '<br>')}</div>
          </div>
        `;
      }
      return '';
    }).join('');

    $('guideContent').innerHTML = `
      <div class="guide-title-section">
        <span class="guide-title-icon">${guide.icon}</span>
        <h2 class="guide-title">${guide.title}</h2>
        <span class="guide-difficulty difficulty-badge ${diffClass}">${guide.difficulty}</span>
      </div>
      <div class="guide-sections">
        ${sectionsHtml}
      </div>
      <button class="guide-complete-btn ${isCompleted ? 'completed' : 'not-completed'}"
              id="completeBtn" data-guide="${guide.id}">
        ${isCompleted ? '✓ Markerad som läst' : '✓ Markera som läst'}
      </button>
    `;

    $('completeBtn').addEventListener('click', () => toggleComplete(guide.id));
  }

  // ===== NAVIGATION =====
  function navigateTo(view, id) {
    state.history.push({ view: state.currentView, category: state.currentCategory?.id });

    hideAllViews();

    switch (view) {
      case 'home':
        homeView.classList.remove('hidden');
        headerBack.style.display = 'none';
        headerTitle.innerHTML = '<span class="logo-icon">🎮</span><span class="logo-text">FN Pro Guide</span>';
        state.currentView = 'home';
        break;

      case 'category':
        categoryView.classList.remove('hidden');
        renderCategory(id);
        headerBack.style.display = '';
        headerTitle.innerHTML = `<span class="logo-text">${state.currentCategory?.title || ''}</span>`;
        state.currentView = 'category';
        break;

      case 'guide':
        guideView.classList.remove('hidden');
        renderGuide(id);
        headerBack.style.display = '';
        headerTitle.innerHTML = `<span class="logo-text">${state.currentGuide?.title || ''}</span>`;
        state.currentView = 'guide';
        break;
    }

    window.scrollTo(0, 0);
  }

  function goBack() {
    const prev = state.history.pop();
    if (!prev) {
      navigateTo('home');
      state.history = [];
      return;
    }

    // Don't push to history again
    hideAllViews();

    switch (prev.view) {
      case 'home':
        homeView.classList.remove('hidden');
        headerBack.style.display = 'none';
        headerTitle.innerHTML = '<span class="logo-icon">🎮</span><span class="logo-text">FN Pro Guide</span>';
        state.currentView = 'home';
        break;

      case 'category':
        categoryView.classList.remove('hidden');
        renderCategory(prev.category);
        headerBack.style.display = '';
        headerTitle.innerHTML = `<span class="logo-text">${state.currentCategory?.title || ''}</span>`;
        state.currentView = 'category';
        break;

      default:
        homeView.classList.remove('hidden');
        headerBack.style.display = 'none';
        headerTitle.innerHTML = '<span class="logo-icon">🎮</span><span class="logo-text">FN Pro Guide</span>';
        state.currentView = 'home';
        break;
    }

    window.scrollTo(0, 0);
  }

  function hideAllViews() {
    homeView.classList.add('hidden');
    categoryView.classList.add('hidden');
    guideView.classList.add('hidden');
    searchOverlay.classList.add('hidden');
    progressOverlay.classList.add('hidden');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  }

  // ===== COMPLETION =====
  function toggleComplete(guideId) {
    const idx = state.completedGuides.indexOf(guideId);
    if (idx > -1) {
      state.completedGuides.splice(idx, 1);
    } else {
      state.completedGuides.push(guideId);
    }
    localStorage.setItem('fn_completed', JSON.stringify(state.completedGuides));
    renderGuide(guideId);
    updateStats();
  }

  // ===== STATS =====
  function updateStats() {
    let totalGuides = 0;
    let totalTips = 0;

    GUIDE_DATA.categories.forEach(cat => {
      totalGuides += cat.guides.length;
      cat.guides.forEach(g => {
        totalTips += g.content.filter(c => c.type === 'tip' || c.type === 'pro').length;
      });
    });

    $('totalGuides').textContent = totalGuides;
    $('totalTips').textContent = totalTips;
    $('completedGuides').textContent = state.completedGuides.length;
  }

  // ===== SEARCH =====
  function openSearch() {
    hideAllViews();
    searchOverlay.classList.remove('hidden');
    $('navSearch').classList.add('active');
    searchInput.focus();
    renderSearchResults('');
  }

  function closeSearch() {
    searchOverlay.classList.add('hidden');
    searchInput.value = '';
    navigateTo('home');
    state.history = [];
    $('navHome').classList.add('active');
  }

  function renderSearchResults(query) {
    const results = $('searchResults');
    if (!query.trim()) {
      results.innerHTML = `
        <div class="search-empty">
          <span class="search-empty-icon">🔍</span>
          <div>Sök efter guider, tips och tricks</div>
        </div>
      `;
      return;
    }

    const q = query.toLowerCase();
    const matches = [];

    GUIDE_DATA.categories.forEach(cat => {
      cat.guides.forEach(guide => {
        const titleMatch = guide.title.toLowerCase().includes(q);
        const contentMatch = guide.content.some(s =>
          (s.title && s.title.toLowerCase().includes(q)) ||
          s.text.toLowerCase().includes(q)
        );

        if (titleMatch || contentMatch) {
          matches.push({ guide, cat });
        }
      });
    });

    if (matches.length === 0) {
      results.innerHTML = `
        <div class="search-empty">
          <span class="search-empty-icon">😕</span>
          <div>Inga resultat för "${query}"</div>
        </div>
      `;
      return;
    }

    results.innerHTML = matches.map(({ guide, cat }) => {
      const diffClass = guide.difficulty === 'Nybörjare' ? 'beginner' :
                        guide.difficulty === 'Medel' ? 'medium' : 'advanced';
      return `
        <div class="guide-card" data-guide="${guide.id}" data-cat="${cat.id}">
          <div class="guide-card-icon">${guide.icon}</div>
          <div class="guide-card-info">
            <div class="guide-card-title">${guide.title}</div>
            <div class="guide-card-meta">
              <span class="difficulty-badge ${diffClass}">${guide.difficulty}</span>
              ${guide.isPremium && !state.isPremium ? '<span class="premium-lock">🔒 PRO</span>' : ''}
            </div>
          </div>
          <div class="guide-card-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
      `;
    }).join('');

    results.querySelectorAll('.guide-card').forEach(card => {
      card.addEventListener('click', () => {
        const guide = findGuide(card.dataset.guide);
        if (guide && guide.isPremium && !state.isPremium) {
          showPremiumModal();
        } else {
          searchOverlay.classList.add('hidden');
          searchInput.value = '';
          state.currentCategory = GUIDE_DATA.categories.find(c => c.id === card.dataset.cat);
          navigateTo('guide', card.dataset.guide);
        }
      });
    });
  }

  function findGuide(guideId) {
    for (const cat of GUIDE_DATA.categories) {
      const g = cat.guides.find(g => g.id === guideId);
      if (g) return g;
    }
    return null;
  }

  // ===== PROGRESS =====
  function openProgress() {
    hideAllViews();
    progressOverlay.classList.remove('hidden');
    $('navProgress').classList.add('active');
    renderProgress();
  }

  function renderProgress() {
    const content = $('progressContent');

    content.innerHTML = GUIDE_DATA.categories.map(cat => {
      const total = cat.guides.length;
      const done = cat.guides.filter(g => state.completedGuides.includes(g.id)).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      return `
        <div class="progress-category">
          <div class="progress-cat-header">
            <div class="progress-cat-title">
              <span>${cat.icon}</span>
              <span>${cat.title}</span>
            </div>
            <span class="progress-cat-count">${done}/${total}</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${pct}%;background:${cat.color}"></div>
          </div>
          <div class="progress-guides">
            ${cat.guides.map(g => {
              const isDone = state.completedGuides.includes(g.id);
              return `
                <div class="progress-guide-item">
                  <div class="progress-guide-check ${isDone ? 'done' : ''}">${isDone ? '✓' : ''}</div>
                  <span class="progress-guide-name ${isDone ? 'done' : ''}">${g.icon} ${g.title}</span>
                  ${g.isPremium && !state.isPremium ? '<span class="premium-lock">🔒</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // ===== PREMIUM MODAL =====
  function showPremiumModal() {
    const features = $('modalFeatures');
    features.innerHTML = GUIDE_DATA.premium.features
      .map(f => `<li>${f}</li>`).join('');
    $('ctaPrice').textContent = `Köp Pro Pass - ${GUIDE_DATA.premium.price}`;
    premiumModal.classList.remove('hidden');
  }

  function hidePremiumModal() {
    premiumModal.classList.add('hidden');
  }

  // ===== EVENT BINDINGS =====
  function bindEvents() {
    // Back button
    headerBack.addEventListener('click', goBack);

    // Pro button
    $('proButton').addEventListener('click', showPremiumModal);

    // Modal
    $('modalClose').addEventListener('click', hidePremiumModal);
    premiumModal.addEventListener('click', (e) => {
      if (e.target === premiumModal) hidePremiumModal();
    });

    // Modal CTA (simulate purchase for demo)
    $('modalCta').addEventListener('click', () => {
      state.isPremium = true;
      localStorage.setItem('fn_premium', 'true');
      hidePremiumModal();
      // Re-render current view
      if (state.currentView === 'category' && state.currentCategory) {
        renderCategory(state.currentCategory.id);
      } else if (state.currentView === 'guide' && state.currentGuide) {
        renderGuide(state.currentGuide.id);
      }
    });

    // Restore purchase
    $('modalRestore').addEventListener('click', () => {
      const restored = localStorage.getItem('fn_premium') === 'true';
      if (restored) {
        state.isPremium = true;
        hidePremiumModal();
        alert('Ditt köp har återställts!');
      } else {
        alert('Inget tidigare köp hittades.');
      }
    });

    // Bottom nav
    $('navHome').addEventListener('click', () => {
      hideAllViews();
      homeView.classList.remove('hidden');
      $('navHome').classList.add('active');
      headerBack.style.display = 'none';
      headerTitle.innerHTML = '<span class="logo-icon">🎮</span><span class="logo-text">FN Pro Guide</span>';
      state.currentView = 'home';
      state.history = [];
    });

    $('navSearch').addEventListener('click', openSearch);
    $('searchCancel').addEventListener('click', closeSearch);

    searchInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });

    $('navProgress').addEventListener('click', openProgress);

    // Check premium status
    if (localStorage.getItem('fn_premium') === 'true') {
      state.isPremium = true;
    }
  }

  // Start
  init();
})();
