(function() {
  var header = document.getElementById('header');
  var lastY = 0;
  window.addEventListener('scroll', function() {
    var y = window.scrollY;
    header.classList.toggle('header--scrolled', y > 40);
    header.classList.toggle('header--hidden', y > 300 && y > lastY);
    lastY = y;
  }, { passive: true });
})();

(function() {
  var totalLessons = 0, totalComplete = 0;
  PHASES.forEach(function(p) {
    totalLessons += p.lessons.length;
    totalComplete += p.lessons.filter(function(l) { return l.status === 'complete'; }).length;
  });

  function setVal(id, val) {
    var el = document.getElementById(id);
    if (!el) return;
    var target = parseInt(val, 10);
    el.setAttribute('data-target', target);
    el.textContent = val;
  }

  setVal('stat-lessons', totalLessons + '+');
  setVal('stat-phases', PHASES.length);
  setVal('stat-complete', totalComplete);

  var prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  var nums = document.querySelectorAll('.stat__num[data-target]');
  var animated = false;

  function animateCounters() {
    if (animated) return;
    animated = true;
    nums.forEach(function(el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      if (!target || target === 0) return;
      var suffix = el.textContent.includes('+') ? '+' : '';
      var start = 0;
      var duration = 1200;
      var startTime = null;

      function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.round(start + (target - start) * eased);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }

      el.textContent = '0' + suffix;
      requestAnimationFrame(step);
    });
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        animateCounters();
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  var statsEl = document.querySelector('.hero__stats');
  if (statsEl) observer.observe(statsEl);
})();

(function() {
  var grid = document.getElementById('phases-grid');
  if (!grid) return;

  var rotations = [-1.5, 0.8, -0.5, 1.2, -1, 0.5, 1.5, -0.8, 0.3, -1.2, 0.7, -0.4, 1, -0.6, 0.9, -1.1, 0.4, -0.9, 1.3, -0.7];

  PHASES.forEach(function(phase, idx) {
    var total = phase.lessons.length;
    var done = phase.lessons.filter(function(l) { return l.status === 'complete'; }).length;
    var pct = Math.round((done / total) * 100);

    var statusClass = phase.status === 'complete' ? 'phase--complete'
      : phase.status === 'in-progress' ? 'phase--progress'
      : 'phase--planned';

    var statusLabel = phase.status === 'complete' ? 'Complete'
      : phase.status === 'in-progress' ? 'In Progress'
      : 'Planned';

    var rotation = rotations[idx % rotations.length];

    var card = document.createElement('button');
    card.className = 'phase-card ' + statusClass;
    card.setAttribute('aria-label', 'Phase ' + phase.id + ': ' + phase.name);
    card.style.transform = 'rotate(' + rotation + 'deg)';
    card.innerHTML =
      '<div class="phase-card__top">' +
        '<span class="phase-card__num">' + String(phase.id).padStart(2, '0') + '</span>' +
        '<span class="phase-card__status">' + statusLabel + '</span>' +
      '</div>' +
      '<h3 class="phase-card__name">' + phase.name + '</h3>' +
      '<p class="phase-card__desc">' + phase.desc + '</p>' +
      '<div class="phase-card__bar-wrap">' +
        '<div class="phase-card__bar">' +
          '<div class="phase-card__bar-fill" style="width:' + pct + '%"></div>' +
        '</div>' +
        '<span class="phase-card__pct">' + done + '/' + total + '</span>' +
      '</div>';

    card.addEventListener('mouseenter', function() {
      card.style.transform = 'rotate(0deg) translate(-2px, -2px)';
    });
    card.addEventListener('mouseleave', function() {
      card.style.transform = 'rotate(' + rotation + 'deg)';
    });
    card.addEventListener('click', function() { openModal(phase); });
    grid.appendChild(card);
  });
})();

var modal = document.getElementById('modal');
var modalBackdrop = document.getElementById('modal-backdrop');
var modalClose = document.getElementById('modal-close');

function openModal(phase) {
  var total = phase.lessons.length;
  var done = phase.lessons.filter(function(l) { return l.status === 'complete'; }).length;
  var pct = Math.round((done / total) * 100);

  document.getElementById('modal-phase-num').textContent = 'Phase ' + phase.id;
  document.getElementById('modal-title').textContent = phase.name;
  document.getElementById('modal-desc').textContent = phase.desc;
  document.getElementById('modal-progress-fill').style.width = pct + '%';
  document.getElementById('modal-progress-text').textContent = done + ' of ' + total + ' lessons complete (' + pct + '%)';

  var list = document.getElementById('modal-lessons');
  list.innerHTML = '';
  phase.lessons.forEach(function(lesson, i) {
    var icon = lesson.status === 'complete' ? '&#10003;' : lesson.status === 'in-progress' ? '&#9679;' : '&#9675;';
    var cls = lesson.status === 'complete' ? 'lesson--done' : lesson.status === 'in-progress' ? 'lesson--wip' : 'lesson--planned';

    var content =
      '<span class="lesson-row__icon">' + icon + '</span>' +
      '<span class="lesson-row__num">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="lesson-row__name">' + lesson.name + '</span>' +
      '<span class="lesson-row__type">' + lesson.type + '</span>' +
      '<span class="lesson-row__lang">' + lesson.lang + '</span>';

    if (lesson.url) {
      var a = document.createElement('a');
      a.href = lesson.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'lesson-row ' + cls;
      a.innerHTML = content;
      list.appendChild(a);
    } else {
      var row = document.createElement('div');
      row.className = 'lesson-row ' + cls;
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
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

(function() {
  var timeline = document.getElementById('roadmap-timeline');
  var fill = document.getElementById('roadmap-fill');
  var pctEl = document.getElementById('roadmap-pct');
  if (!timeline) return;

  var totalLessons = 0;
  var totalDone = 0;

  PHASES.forEach(function(phase) {
    var total = phase.lessons.length;
    var done = phase.lessons.filter(function(l) { return l.status === 'complete'; }).length;
    totalLessons += total;
    totalDone += done;
    var pct = Math.round((done / total) * 100);

    var statusClass = phase.status === 'complete' ? 'rm--complete'
      : phase.status === 'in-progress' ? 'rm--progress'
      : 'rm--planned';

    var item = document.createElement('div');
    item.className = 'rm-item ' + statusClass;
    item.innerHTML =
      '<div class="rm-item__dot"></div>' +
      '<div class="rm-item__body">' +
        '<span class="rm-item__label">Phase ' + phase.id + '</span>' +
        '<span class="rm-item__name">' + phase.name + '</span>' +
        '<div class="rm-item__bar"><div class="rm-item__fill" style="width:' + pct + '%"></div></div>' +
        '<span class="rm-item__stat">' + done + '/' + total + '</span>' +
      '</div>';
    timeline.appendChild(item);
  });

  var globalPct = Math.round((totalDone / totalLessons) * 100);
  fill.style.width = globalPct + '%';
  pctEl.textContent = globalPct + '% complete';

  var subEl = document.getElementById('roadmap-sub');
  if (subEl) subEl.textContent = 'Track overall course completion. ' + totalDone + ' of ' + totalLessons + '+ lessons complete.';
})();

(function() {
  var preview = document.getElementById('glossary-preview');
  var countEl = document.getElementById('glossary-count');
  if (!preview || typeof GLOSSARY === 'undefined') return;

  if (countEl) countEl.textContent = GLOSSARY.length;

  var sample = GLOSSARY.slice(0, 12);
  sample.forEach(function(t) {
    var tag = document.createElement('span');
    tag.className = 'glossary-callout__tag';
    tag.textContent = t.term;
    preview.appendChild(tag);
  });

  var more = document.createElement('a');
  more.href = 'glossary.html';
  more.className = 'glossary-callout__tag';
  more.textContent = '+' + (GLOSSARY.length - 12) + ' more';
  more.style.borderColor = 'var(--color-accent)';
  more.style.color = 'var(--color-accent)';
  preview.appendChild(more);
})();

document.querySelectorAll('a[href^="#"]').forEach(function(a) {
  a.addEventListener('click', function(e) {
    var target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

(function() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.fade-in, .phase-card, .diff__card, .how__step, .gloss-card, .rm-item').forEach(function(el) {
    if (!el.classList.contains('fade-in')) el.classList.add('fade-in');
    observer.observe(el);
  });
})();
