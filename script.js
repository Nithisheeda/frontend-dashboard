const state = {
  tasks: [],
  filter: 'all',
  search: '',
  expandedTaskIds: new Set(),
  selectedTaskId: null,
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
  streakIndicator: document.getElementById('streakIndicator'),
  streakCount: document.getElementById('streakCount'),
  smartHint: document.getElementById('smartHint'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsMenu: document.getElementById('settingsMenu'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  importFileInput: document.getElementById('importFileInput'),
};

const STREAK_KEY = 'taskboard.streak.v1';

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

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function todayStr() {
  return dateStr(new Date());
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateStr(d);
}

function loadStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lastCompletionDate: null };
  } catch {
    return { count: 0, lastCompletionDate: null };
  }
}

function saveStreak(streak) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
}

function renderStreak(count) {
  els.streakCount.textContent = count;
  els.streakIndicator.classList.toggle('active', count > 0);
}

function initStreak() {
  const streak = loadStreak();
  // A streak only stays "alive" on screen if the last completion was today or
  // yesterday; a bigger gap means it's already broken, so show 0 immediately
  // rather than displaying a stale count until the next completion resets it.
  const stillAlive = streak.lastCompletionDate === todayStr() || streak.lastCompletionDate === yesterdayStr();
  renderStreak(stillAlive ? streak.count : 0);
}

function recordStreakCompletion() {
  const streak = loadStreak();
  const today = todayStr();
  if (streak.lastCompletionDate === today) {
    // already have a completion logged for today — no change
  } else if (streak.lastCompletionDate === yesterdayStr()) {
    streak.count += 1;
    streak.lastCompletionDate = today;
  } else {
    streak.count = 1;
    streak.lastCompletionDate = today;
  }
  saveStreak(streak);
  renderStreak(streak.count);
}

function updateSmartHint() {
  const raw = els.title.value;
  if (!raw.trim()) {
    els.smartHint.hidden = true;
    return;
  }
  const parsed = nlpParser.parse(raw);
  if (parsed.due) els.due.value = parsed.due;
  if (parsed.category) els.category.value = parsed.category;

  if (!parsed.due && !parsed.category) {
    els.smartHint.hidden = true;
    return;
  }
  const parts = [];
  if (parsed.due) parts.push(`📅 ${formatDue(parsed.due)}`);
  if (parsed.category) parts.push(`🏷️ ${parsed.category}`);
  els.smartHint.textContent = `Detected: ${parts.join(' · ')}`;
  els.smartHint.hidden = false;
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

function buildSubtaskPanelHTML(subtasks) {
  const items = subtasks
    .map(
      (s) => `
    <li class="subtask-item" data-subtask-id="${s.id}">
      <button class="subtask-checkbox${s.completed ? ' checked' : ''}" aria-label="Toggle subtask">
        ${s.completed ? '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : ''}
      </button>
      <span class="subtask-text${s.completed ? ' completed' : ''}"></span>
      <button class="subtask-delete" aria-label="Delete subtask">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </li>`
    )
    .join('');

  return `
    <div class="subtask-panel">
      <ul class="subtask-list">${items}</ul>
      <div class="subtask-add-row">
        <input type="text" class="subtask-add-input" placeholder="Add a micro-step…" maxlength="120">
        <button type="button" class="subtask-add-btn">Add</button>
      </div>
    </div>`;
}

function render() {
  const filtered = getFilteredTasks();
  els.list.innerHTML = '';
  els.empty.hidden = filtered.length > 0;

  filtered.forEach((task) => {
    const li = document.createElement('li');
    const isExpanded = state.expandedTaskIds.has(task.id);
    const isSelected = state.selectedTaskId === task.id;
    li.className = 'task-item' + (task.completed ? ' completed' : '') + (isSelected ? ' selected' : '');
    li.dataset.id = task.id;

    const dueLabel = formatDue(task.due);
    const overdue = isOverdue(task.due, task.completed);
    const completedEarly = isCompletedEarly(task.due, task.completed);
    const subtasks = task.subtasks || [];
    const doneSubtasks = subtasks.filter((s) => s.completed).length;

    li.innerHTML = `
      <div class="task-row">
        <button class="task-checkbox${task.completed ? ' checked' : ''}" aria-label="Toggle complete">
          ${task.completed ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : ''}
        </button>
        <div class="task-body">
          <div class="task-title-row">
            <span class="task-title"></span>
            <button class="expand-toggle${isExpanded ? ' expanded' : ''}" aria-label="Toggle subtasks" aria-expanded="${isExpanded}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </div>
          <div class="task-meta">
            <span class="priority-badge priority-${task.priority}">${task.priority}</span>
            <span class="category-badge category-${task.category || 'personal'}">${task.category || 'personal'}</span>
            ${subtasks.length > 0 ? `<span class="subtask-badge">${doneSubtasks}/${subtasks.length} subtasks</span>` : ''}
            ${completedEarly ? '<span class="early-badge" title="Marked complete before its due date">⏱ Early</span>' : ''}
            ${dueLabel ? `<span style="${overdue ? 'color: var(--danger); font-weight:600;' : ''}">${overdue ? 'Overdue · ' : 'Due '}${dueLabel}</span>` : ''}
          </div>
        </div>
        <button class="task-delete" aria-label="Delete task">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </div>
      ${isExpanded ? buildSubtaskPanelHTML(subtasks) : ''}
    `;
    li.querySelector('.task-title').textContent = task.title;
    if (isExpanded) {
      li.querySelectorAll('.subtask-item').forEach((subEl, idx) => {
        subEl.querySelector('.subtask-text').textContent = subtasks[idx].text;
      });
    }
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
  const rawTitle = els.title.value.trim();
  if (!rawTitle) return;

  const parsed = nlpParser.parse(rawTitle);
  const title = parsed.title || rawTitle;
  const due = parsed.due || els.due.value;
  const category = parsed.category || els.category.value;

  const submitBtn = els.form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const task = await mockApi.addTask({
      title,
      priority: els.priority.value,
      category,
      due,
    });
    state.tasks.unshift(task);
    render();
    showToast('Task added');
    els.form.reset();
    els.priority.value = 'medium';
    els.category.value = 'personal';
    els.smartHint.hidden = true;
    els.title.focus();
  } finally {
    submitBtn.disabled = false;
  }
}

function toggleExpand(taskId) {
  if (state.expandedTaskIds.has(taskId)) state.expandedTaskIds.delete(taskId);
  else state.expandedTaskIds.add(taskId);
  render();
}

async function addSubtaskFromRow(item, taskId) {
  const input = item.querySelector('.subtask-add-input');
  const text = input.value.trim();
  if (!text) return;
  const task = state.tasks.find((t) => t.id === taskId);
  const updated = await mockApi.addSubtask(taskId, text);
  Object.assign(task, updated);
  render();
  const freshInput = els.list.querySelector(`.task-item[data-id="${taskId}"] .subtask-add-input`);
  if (freshInput) freshInput.focus();
}

async function handleListClick(e) {
  const item = e.target.closest('.task-item');
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.closest('.expand-toggle')) {
    toggleExpand(id);
    return;
  }

  if (e.target.closest('.subtask-checkbox')) {
    const subtaskId = e.target.closest('.subtask-item').dataset.subtaskId;
    const task = state.tasks.find((t) => t.id === id);
    const updated = await mockApi.toggleSubtask(id, subtaskId);
    Object.assign(task, updated);
    render();
    return;
  }

  if (e.target.closest('.subtask-delete')) {
    const subtaskId = e.target.closest('.subtask-item').dataset.subtaskId;
    const task = state.tasks.find((t) => t.id === id);
    const updated = await mockApi.deleteSubtask(id, subtaskId);
    Object.assign(task, updated);
    render();
    return;
  }

  if (e.target.closest('.subtask-add-btn')) {
    await addSubtaskFromRow(item, id);
    return;
  }

  if (e.target.closest('.task-checkbox')) {
    const task = state.tasks.find((t) => t.id === id);
    const wasCompleted = task.completed;
    const updated = await mockApi.updateTask(id, { completed: !task.completed });
    Object.assign(task, updated);
    render();
    if (!wasCompleted && task.completed) {
      showFlashcard(task);
      recordStreakCompletion();
    }
    return;
  }

  if (e.target.closest('.task-delete')) {
    item.style.opacity = '0';
    await mockApi.deleteTask(id);
    state.tasks = state.tasks.filter((t) => t.id !== id);
    render();
    showToast('Task deleted');
  }
}

function handleListKeydown(e) {
  if (e.key === 'Enter' && e.target.classList.contains('subtask-add-input')) {
    e.preventDefault();
    const item = e.target.closest('.task-item');
    addSubtaskFromRow(item, item.dataset.id);
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

function toggleSettingsMenu(forceOpen) {
  const isOpen = !els.settingsMenu.hidden;
  const next = forceOpen === undefined ? !isOpen : forceOpen;
  els.settingsMenu.hidden = !next;
  els.settingsBtn.setAttribute('aria-expanded', String(next));
}

function handleDocumentClick(e) {
  if (!els.settingsMenu.hidden && !e.target.closest('.settings-wrapper')) {
    toggleSettingsMenu(false);
  }
}

async function handleExport() {
  const tasks = await mockApi.exportTasks();
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taskboard-export-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Tasks exported');
  toggleSettingsMenu(false);
}

function handleImportClick() {
  toggleSettingsMenu(false);
  els.importFileInput.click();
}

async function handleImportFile(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    state.tasks = await mockApi.importTasks(parsed);
    state.selectedTaskId = null;
    state.expandedTaskIds.clear();
    render();
    showToast(`Imported ${state.tasks.length} task${state.tasks.length === 1 ? '' : 's'}`);
  } catch (err) {
    console.error('Import failed:', err);
    showToast('Import failed — invalid file');
  }
}

function isTypingTarget(el) {
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

function moveSelection(delta) {
  const filtered = getFilteredTasks();
  if (filtered.length === 0) return;
  let idx = filtered.findIndex((t) => t.id === state.selectedTaskId);
  idx = idx === -1 ? 0 : Math.min(Math.max(idx + delta, 0), filtered.length - 1);
  state.selectedTaskId = filtered[idx].id;
  render();
  const el = els.list.querySelector(`.task-item[data-id="${state.selectedTaskId}"]`);
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function handleGlobalKeydown(e) {
  if (e.key === 'Escape') {
    if (!els.settingsMenu.hidden) {
      toggleSettingsMenu(false);
      return;
    }
    if (document.activeElement === els.title) {
      els.title.value = '';
      updateSmartHint();
      els.title.blur();
    }
    return;
  }

  if (isTypingTarget(document.activeElement)) return;

  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    els.title.focus();
    return;
  }

  if (e.key === 'j' || e.key === 'J') {
    e.preventDefault();
    moveSelection(1);
    return;
  }

  if (e.key === 'k' || e.key === 'K') {
    e.preventDefault();
    moveSelection(-1);
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  navigator.serviceWorker.register('sw.js').catch((err) => {
    console.error('Service worker registration failed:', err);
  });
}

function init() {
  initTheme();
  initStreak();
  els.themeToggle.addEventListener('click', toggleTheme);
  els.form.addEventListener('submit', handleAddTask);
  els.title.addEventListener('input', updateSmartHint);
  els.list.addEventListener('click', handleListClick);
  els.list.addEventListener('keydown', handleListKeydown);
  els.filters.addEventListener('click', handleFilterClick);
  els.search.addEventListener('input', handleSearch);
  els.clearCompleted.addEventListener('click', handleClearCompleted);
  els.settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSettingsMenu();
  });
  document.addEventListener('click', handleDocumentClick);
  els.exportBtn.addEventListener('click', handleExport);
  els.importBtn.addEventListener('click', handleImportClick);
  els.importFileInput.addEventListener('change', handleImportFile);
  document.addEventListener('keydown', handleGlobalKeydown);
  loadTasks();
  loadWeather();
  registerServiceWorker();
}

init();
