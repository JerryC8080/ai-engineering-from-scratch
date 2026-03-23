// Theme toggle
(function() {
  const toggle = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);
  updateIcon();

  toggle && toggle.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', theme);
    updateIcon();
  });

  function updateIcon() {
    if (!toggle) return;
    toggle.innerHTML = theme === 'dark'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
  }
})();

// Header scroll behavior
(function() {
  const header = document.getElementById('header');
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('header--scrolled', y > 40);
    header.classList.toggle('header--hidden', y > 300 && y > lastY);
    lastY = y;
  }, { passive: true });
})();

// Populate hero stats dynamically
(function() {
  let totalLessons = 0, totalComplete = 0;
  PHASES.forEach(p => {
    totalLessons += p.lessons.length;
    totalComplete += p.lessons.filter(l => l.status === 'complete').length;
  });
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('stat-lessons', totalLessons + '+');
  el('stat-phases', PHASES.length);
  el('stat-complete', totalComplete);
})();

// Render phase cards
(function() {
  const grid = document.getElementById('phases-grid');
  if (!grid) return;

  PHASES.forEach((phase) => {
    const total = phase.lessons.length;
    const done = phase.lessons.filter(l => l.status === 'complete').length;
    const pct = Math.round((done / total) * 100);

    const statusClass = phase.status === 'complete' ? 'phase--complete'
      : phase.status === 'in-progress' ? 'phase--progress'
      : 'phase--planned';

    const statusLabel = phase.status === 'complete' ? 'Complete'
      : phase.status === 'in-progress' ? 'In Progress'
      : 'Planned';

    const card = document.createElement('button');
    card.className = `phase-card ${statusClass}`;
    card.setAttribute('aria-label', `Phase ${phase.id}: ${phase.name}`);
    card.innerHTML = `
      <div class="phase-card__top">
        <span class="phase-card__num">${String(phase.id).padStart(2, '0')}</span>
        <span class="phase-card__status">${statusLabel}</span>
      </div>
      <h3 class="phase-card__name">${phase.name}</h3>
      <p class="phase-card__desc">${phase.desc}</p>
      <div class="phase-card__bar-wrap">
        <div class="phase-card__bar">
          <div class="phase-card__bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="phase-card__pct">${done}/${total}</span>
      </div>
    `;
    card.addEventListener('click', () => openModal(phase));
    grid.appendChild(card);
  });
})();

// Modal
const modal = document.getElementById('modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalClose = document.getElementById('modal-close');

function openModal(phase) {
  const total = phase.lessons.length;
  const done = phase.lessons.filter(l => l.status === 'complete').length;
  const pct = Math.round((done / total) * 100);

  document.getElementById('modal-phase-num').textContent = `Phase ${phase.id}`;
  document.getElementById('modal-title').textContent = phase.name;
  document.getElementById('modal-desc').textContent = phase.desc;
  document.getElementById('modal-progress-fill').style.width = pct + '%';
  document.getElementById('modal-progress-text').textContent = `${done} of ${total} lessons complete (${pct}%)`;

  const list = document.getElementById('modal-lessons');
  list.innerHTML = '';
  phase.lessons.forEach((lesson, i) => {
    const icon = lesson.status === 'complete' ? '&#10003;' : lesson.status === 'in-progress' ? '&#9679;' : '&#9675;';
    const cls = lesson.status === 'complete' ? 'lesson--done' : lesson.status === 'in-progress' ? 'lesson--wip' : 'lesson--planned';
    const row = document.createElement('div');
    row.className = `lesson-row ${cls}`;

    const content = `
      <span class="lesson-row__icon">${icon}</span>
      <span class="lesson-row__num">${String(i + 1).padStart(2, '0')}</span>
      <span class="lesson-row__name">${lesson.name}</span>
      <span class="lesson-row__type">${lesson.type}</span>
      <span class="lesson-row__lang">${lesson.lang}</span>
    `;

    if (lesson.url) {
      const a = document.createElement('a');
      a.href = lesson.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = `lesson-row ${cls}`;
      a.innerHTML = content;
      list.appendChild(a);
    } else {
      row.innerHTML = content;
      list.appendChild(row);
    }
  });

  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

modalBackdrop.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Roadmap
(function() {
  const timeline = document.getElementById('roadmap-timeline');
  const fill = document.getElementById('roadmap-fill');
  const pctEl = document.getElementById('roadmap-pct');
  if (!timeline) return;

  let totalLessons = 0;
  let totalDone = 0;

  PHASES.forEach((phase) => {
    const total = phase.lessons.length;
    const done = phase.lessons.filter(l => l.status === 'complete').length;
    totalLessons += total;
    totalDone += done;
    const pct = Math.round((done / total) * 100);

    const statusClass = phase.status === 'complete' ? 'rm--complete'
      : phase.status === 'in-progress' ? 'rm--progress'
      : 'rm--planned';

    const item = document.createElement('div');
    item.className = `rm-item ${statusClass}`;
    item.innerHTML = `
      <div class="rm-item__dot"></div>
      <div class="rm-item__body">
        <span class="rm-item__label">Phase ${phase.id}</span>
        <span class="rm-item__name">${phase.name}</span>
        <div class="rm-item__bar"><div class="rm-item__fill" style="width:${pct}%"></div></div>
        <span class="rm-item__stat">${done}/${total}</span>
      </div>
    `;
    timeline.appendChild(item);
  });

  const globalPct = Math.round((totalDone / totalLessons) * 100);
  fill.style.width = globalPct + '%';
  pctEl.textContent = globalPct + '% complete';

  const subEl = document.getElementById('roadmap-sub');
  if (subEl) subEl.textContent = `Track overall course completion. ${totalDone} of ${totalLessons}+ lessons complete.`;
})();

// Glossary
(function() {
  const grid = document.getElementById('glossary-grid');
  const search = document.getElementById('glossary-search');
  if (!grid) return;

  function render(terms) {
    grid.innerHTML = '';
    terms.forEach(t => {
      const card = document.createElement('div');
      card.className = 'gloss-card';
      card.innerHTML = `
        <h3 class="gloss-card__term">${t.term}</h3>
        <div class="gloss-card__row">
          <span class="gloss-card__label">What people say</span>
          <p>"${t.says}"</p>
        </div>
        <div class="gloss-card__row">
          <span class="gloss-card__label">What it actually means</span>
          <p>${t.means}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  render(GLOSSARY);

  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    render(GLOSSARY.filter(t =>
      t.term.toLowerCase().includes(q) ||
      t.says.toLowerCase().includes(q) ||
      t.means.toLowerCase().includes(q)
    ));
  });
})();

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Intersection Observer for fade-in
(function() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.phase-card, .diff__card, .how__step, .gloss-card, .rm-item').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });
})();
