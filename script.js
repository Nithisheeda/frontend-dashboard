const state = {
  tasks: [],
  filter: 'all',
  search: '',
};

const els = {
  form: document.getElementById('taskForm'),
  title: document.getElementById('taskTitle'),
  priority: document.getElementById('taskPriority'),
  category: document.getElementById('taskCategory'),
  due: document.getElementById('taskDue'),
  list: document.getElementById('taskList'),
  empty: document.getElementById('emptyState'),
  filters: document.getElementById('filters'),
  search: document.getElementById('searchInput'),
  clearCompleted: document.getElementById('clearCompleted'),
  statTotal: document.getElementById('statTotal'),
  statPending: document.getElementById('statPending'),
  statDone: document.getElementById('statDone'),
  statProgress: document.getElementById('statProgress'),
  progressFill: document.getElementById('progressFill'),
  loadStatus: document.getElementById('loadStatus'),
  themeToggle: document.getElementById('themeToggle'),
  iconMoon: document.getElementById('iconMoon'),
  iconSun: document.getElementById('iconSun'),
  toast: document.getElementById('toast'),
  weatherIcon: document.getElementById('weatherIcon'),
  weatherText: document.getElementById('weatherText'),
  flashcard: document.getElementById('flashcard'),
  flashcardIcon: document.getElementById('flashcardIcon'),
  flashcardText: document.getElementById('flashcardText'),
  flashcardProgress: document.getElementById('flashcardProgress'),
};

const MOTIVATION = {
  high: [
    'Crushing it — high priority, high energy!',
    'Beast mode engaged. Big one down!',
    'Huge win, momentum unlocked!',
  ],
  medium: [
    'Nice work, task complete!',
    'Solid progress, keep the streak going!',
    'One more off the list!',
  ],
  low: [
    'Small win, still counts!',
    'Nice, tidying things up.',
    'Done and dusted!',
  ],
};

const CATEGORY_FLAVOR = {
  work: 'Work task handled.',
  personal: 'Personal goal reached.',
  shopping: 'Shopping list shrinking.',
};

const PRIORITY_EMOJI = { high: '🔥', medium: '💪', low: '✨' };
const PRIORITY_ACCENT = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };

function initTheme() {
  const saved = localStorage.getItem('taskboard.theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon();
}

function updateThemeIcon() {
  const explicit = document.documentElement.getAttribute('data-theme');
  const isDark = explicit ? explicit === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  els.iconMoon.style.display = isDark ? 'none' : 'block';
  els.iconSun.style.display = isDark ? 'block' : 'none';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentlyDark = current ? current === 'dark' : systemDark;
  const next = currentlyDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('taskboard.theme', next);
  updateThemeIcon();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove('show'), 1800);
}

function getMotivationalMessage(task) {
  const pool = MOTIVATION[task.priority] || MOTIVATION.medium;
  const base = pool[Math.floor(Math.random() * pool.length)];
  const flavor = CATEGORY_FLAVOR[task.category] || '';
  return flavor ? `${base} ${flavor}` : base;
}

function showFlashcard(task) {
  const accent = PRIORITY_ACCENT[task.priority] || 'var(--accent)';
  els.flashcard.style.borderLeftColor = accent;
  els.flashcardIcon.style.color = accent;
  els.flashcardIcon.textContent = PRIORITY_EMOJI[task.priority] || '🎉';
  els.flashcardText.textContent = getMotivationalMessage(task);

  els.flashcard.classList.remove('show');
  // force reflow so the progress-bar animation restarts on rapid re-triggers
  void els.flashcard.offsetWidth;
  els.flashcard.classList.add('show');

  clearTimeout(showFlashcard._t);
  showFlashcard._t = setTimeout(() => els.flashcard.classList.remove('show'), 2500);
}

async function loadWeather() {
  try {
    const { icon, label, temp } = await weatherApi.fetchLeipzigWeather();
    els.weatherIcon.textContent = icon;
    els.weatherText.textContent = `Leipzig: ${label}, ${temp}°C`;
  } catch (err) {
    els.weatherIcon.textContent = '🌡️';
    els.weatherText.textContent = 'Leipzig: weather unavailable';
  }
}

function formatDue(due) {
  if (!due) return null;
  const date = new Date(`${due}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isOverdue(due, completed) {
  if (!due || completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${due}T00:00:00`) < today;
}

function isCompletedEarly(due, completed) {
  if (!due || !completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${due}T00:00:00`) > today;
}

function getFilteredTasks() {
  return state.tasks.filter((task) => {
    if (state.filter === 'pending' && task.completed) return false;
    if (state.filter === 'completed' && !task.completed) return false;
    if (state.search && !task.title.toLowerCase().includes(state.search.toLowerCase())) return false;
    return true;
  });
}

function render() {
  const filtered = getFilteredTasks();
  els.list.innerHTML = '';
  els.empty.hidden = filtered.length > 0;

  filtered.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' completed' : '');
    li.dataset.id = task.id;

    const dueLabel = formatDue(task.due);
    const overdue = isOverdue(task.due, task.completed);
    const completedEarly = isCompletedEarly(task.due, task.completed);

    li.innerHTML = `
      <button class="task-checkbox${task.completed ? ' checked' : ''}" aria-label="Toggle complete">
        ${task.completed ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : ''}
      </button>
      <div class="task-body">
        <span class="task-title"></span>
        <div class="task-meta">
          <span class="priority-badge priority-${task.priority}">${task.priority}</span>
          <span class="category-badge category-${task.category || 'personal'}">${task.category || 'personal'}</span>
          ${completedEarly ? '<span class="early-badge" title="Marked complete before its due date">⏱ Early</span>' : ''}
          ${dueLabel ? `<span style="${overdue ? 'color: var(--danger); font-weight:600;' : ''}">${overdue ? 'Overdue · ' : 'Due '}${dueLabel}</span>` : ''}
        </div>
      </div>
      <button class="task-delete" aria-label="Delete task">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
      </button>
    `;
    li.querySelector('.task-title').textContent = task.title;
    els.list.appendChild(li);
  });

  updateStats();
}

function updateStats() {
  const total = state.tasks.length;
  const done = state.tasks.filter((t) => t.completed).length;
  const pending = total - done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  els.statTotal.textContent = total;
  els.statPending.textContent = pending;
  els.statDone.textContent = done;
  els.statProgress.textContent = `${pct}%`;
  els.progressFill.style.width = `${pct}%`;
}

async function loadTasks() {
  els.loadStatus.textContent = 'Loading mock data…';
  try {
    state.tasks = await mockApi.fetchTasks();
    els.loadStatus.textContent = `Mock API · ${state.tasks.length} task${state.tasks.length === 1 ? '' : 's'} loaded`;
    render();
  } catch (err) {
    console.error('Failed to load mock tasks:', err);
    els.loadStatus.textContent = 'Could not load mock data — see console for details.';
  }
}

async function handleAddTask(e) {
  e.preventDefault();
  const title = els.title.value.trim();
  if (!title) return;

  const submitBtn = els.form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const task = await mockApi.addTask({
      title,
      priority: els.priority.value,
      category: els.category.value,
      due: els.due.value,
    });
    state.tasks.unshift(task);
    render();
    showToast('Task added');
    els.form.reset();
    els.priority.value = 'medium';
    els.category.value = 'personal';
    els.title.focus();
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleListClick(e) {
  const item = e.target.closest('.task-item');
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.closest('.task-checkbox')) {
    const task = state.tasks.find((t) => t.id === id);
    const wasCompleted = task.completed;
    const updated = await mockApi.updateTask(id, { completed: !task.completed });
    Object.assign(task, updated);
    render();
    if (!wasCompleted && task.completed) showFlashcard(task);
  }

  if (e.target.closest('.task-delete')) {
    item.style.opacity = '0';
    await mockApi.deleteTask(id);
    state.tasks = state.tasks.filter((t) => t.id !== id);
    render();
    showToast('Task deleted');
  }
}

function handleFilterClick(e) {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  state.filter = btn.dataset.filter;
  [...els.filters.children].forEach((c) => c.classList.toggle('active', c === btn));
  render();
}

let searchTimeout;
function handleSearch(e) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.search = e.target.value;
    render();
  }, 150);
}

async function handleClearCompleted() {
  const hasCompleted = state.tasks.some((t) => t.completed);
  if (!hasCompleted) return;
  await mockApi.clearCompleted();
  state.tasks = state.tasks.filter((t) => !t.completed);
  render();
  showToast('Completed tasks cleared');
}

function init() {
  initTheme();
  els.themeToggle.addEventListener('click', toggleTheme);
  els.form.addEventListener('submit', handleAddTask);
  els.list.addEventListener('click', handleListClick);
  els.filters.addEventListener('click', handleFilterClick);
  els.search.addEventListener('input', handleSearch);
  els.clearCompleted.addEventListener('click', handleClearCompleted);
  loadTasks();
  loadWeather();
}

init();
