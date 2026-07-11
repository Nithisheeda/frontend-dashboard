const API_BASE = 'http://127.0.0.1:8000';

const state = {
  tasks: [],
  filter: 'all',
  search: '',
};

async function apiFetchTasks() {
  const res = await fetch(`${API_BASE}/tasks`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

async function apiAddTask({ title, priority, due }) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority, due: due || null }),
  });
  if (!res.ok) throw new Error('Failed to add task');
  return res.json();
}

async function apiUpdateTask(id, changes) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

async function apiDeleteTask(id) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete task');
  return true;
}

async function apiClearCompleted(ids) {
  await Promise.all(ids.map((id) => apiDeleteTask(id)));
  return true;
}

const els = {
  form: document.getElementById('taskForm'),
  title: document.getElementById('taskTitle'),
  priority: document.getElementById('taskPriority'),
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
};

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

    li.innerHTML = `
      <button class="task-checkbox${task.completed ? ' checked' : ''}" aria-label="Toggle complete">
        ${task.completed ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : ''}
      </button>
      <div class="task-body">
        <span class="task-title"></span>
        <div class="task-meta">
          <span class="priority-badge priority-${task.priority}">${task.priority}</span>
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
  els.loadStatus.textContent = 'Connecting to API…';
  try {
    const tasks = await apiFetchTasks();
    state.tasks = tasks.sort((a, b) => b.id - a.id);
    els.loadStatus.textContent = `Task API · ${state.tasks.length} task${state.tasks.length === 1 ? '' : 's'} loaded`;
  } catch (err) {
    els.loadStatus.textContent = 'Could not reach the API. Is the backend running on http://127.0.0.1:8000?';
  }
  render();
}

async function handleAddTask(e) {
  e.preventDefault();
  const title = els.title.value.trim();
  if (!title) return;

  const submitBtn = els.form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const task = await apiAddTask({
      title,
      priority: els.priority.value,
      due: els.due.value,
    });
    state.tasks.unshift(task);
    render();
    showToast('Task added');
    els.form.reset();
    els.priority.value = 'medium';
    els.title.focus();
  } catch (err) {
    showToast('Could not add task — check the API connection');
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleListClick(e) {
  const item = e.target.closest('.task-item');
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.closest('.task-checkbox')) {
    const task = state.tasks.find((t) => String(t.id) === id);
    const updated = await apiUpdateTask(id, { completed: !task.completed });
    Object.assign(task, updated);
    render();
  }

  if (e.target.closest('.task-delete')) {
    item.style.opacity = '0';
    await apiDeleteTask(id);
    state.tasks = state.tasks.filter((t) => String(t.id) !== id);
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
  const completed = state.tasks.filter((t) => t.completed);
  if (completed.length === 0) return;
  await apiClearCompleted(completed.map((t) => t.id));
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
}

init();
