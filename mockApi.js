/**
 * Mock API layer. Simulates a backend with network latency and a promise-based
 * interface so the real API can be dropped in later without touching script.js.
 */
const mockApi = (() => {
  const STORAGE_KEY = 'taskboard.tasks.v3';
  const LATENCY_MS = 350;
  const PRIORITIES = ['low', 'medium', 'high'];
  const CATEGORIES = ['personal', 'work', 'shopping'];

  const seedTasks = () => [
    {
      id: crypto.randomUUID(),
      title: 'Design the dashboard layout',
      priority: 'high',
      category: 'work',
      due: '2026-07-12',
      completed: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
      subtasks: [
        { id: crypto.randomUUID(), text: 'Sketch wireframe', completed: true },
        { id: crypto.randomUUID(), text: 'Pick color palette', completed: true },
      ],
    },
    {
      id: crypto.randomUUID(),
      title: 'Wire up mock API calls',
      priority: 'medium',
      category: 'work',
      due: '2026-07-13',
      completed: false,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
      subtasks: [
        { id: crypto.randomUUID(), text: 'Add task CRUD', completed: true },
        { id: crypto.randomUUID(), text: 'Add subtask CRUD', completed: false },
      ],
    },
    { id: crypto.randomUUID(), title: 'Add dark mode toggle', priority: 'low', category: 'personal', due: '', completed: false, createdAt: Date.now() - 1000 * 60 * 60 * 24, subtasks: [] },
    { id: crypto.randomUUID(), title: 'Pick up grocery order', priority: 'medium', category: 'shopping', due: '2026-07-15', completed: false, createdAt: Date.now() - 1000 * 60 * 30, subtasks: [] },
  ];

  const load = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const save = (tasks) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

  const delay = (value) => new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));

  const sanitizeSubtask = (s) => ({
    id: (s && s.id) || crypto.randomUUID(),
    text: String((s && s.text) || '').trim(),
    completed: Boolean(s && s.completed),
  });

  const sanitizeTask = (t) => ({
    id: (t && t.id) || crypto.randomUUID(),
    title: String((t && t.title) || '').trim(),
    priority: PRIORITIES.includes(t && t.priority) ? t.priority : 'medium',
    category: CATEGORIES.includes(t && t.category) ? t.category : 'personal',
    due: (t && t.due) || '',
    completed: Boolean(t && t.completed),
    createdAt: typeof (t && t.createdAt) === 'number' ? t.createdAt : Date.now(),
    subtasks: Array.isArray(t && t.subtasks) ? t.subtasks.map(sanitizeSubtask) : [],
  });

  let tasks = load();
  if (!tasks) {
    tasks = seedTasks();
    save(tasks);
  }

  return {
    async fetchTasks() {
      return delay([...tasks].sort((a, b) => b.createdAt - a.createdAt));
    },

    async addTask({ title, priority, category, due }) {
      const task = {
        id: crypto.randomUUID(),
        title: title.trim(),
        priority,
        category: category || 'personal',
        due: due || '',
        completed: false,
        createdAt: Date.now(),
        subtasks: [],
      };
      tasks.push(task);
      save(tasks);
      return delay(task);
    },

    async updateTask(id, changes) {
      const task = tasks.find((t) => t.id === id);
      if (!task) throw new Error('Task not found');
      Object.assign(task, changes);
      save(tasks);
      return delay(task);
    },

    async deleteTask(id) {
      tasks = tasks.filter((t) => t.id !== id);
      save(tasks);
      return delay(true);
    },

    async clearCompleted() {
      tasks = tasks.filter((t) => !t.completed);
      save(tasks);
      return delay(true);
    },

    async addSubtask(taskId, text) {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) throw new Error('Task not found');
      const trimmed = text.trim();
      if (!trimmed) throw new Error('Subtask text cannot be empty');
      if (!task.subtasks) task.subtasks = [];
      const subtask = { id: crypto.randomUUID(), text: trimmed, completed: false };
      task.subtasks.push(subtask);
      save(tasks);
      return delay(task);
    },

    async toggleSubtask(taskId, subtaskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) throw new Error('Task not found');
      const subtask = (task.subtasks || []).find((s) => s.id === subtaskId);
      if (!subtask) throw new Error('Subtask not found');
      subtask.completed = !subtask.completed;
      save(tasks);
      return delay(task);
    },

    async deleteSubtask(taskId, subtaskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) throw new Error('Task not found');
      task.subtasks = (task.subtasks || []).filter((s) => s.id !== subtaskId);
      save(tasks);
      return delay(task);
    },

    async exportTasks() {
      return JSON.parse(JSON.stringify(tasks));
    },

    async importTasks(rawTasks) {
      if (!Array.isArray(rawTasks)) throw new Error('Import data must be an array of tasks');
      tasks = rawTasks.map(sanitizeTask).filter((t) => t.title.length > 0);
      save(tasks);
      return delay([...tasks].sort((a, b) => b.createdAt - a.createdAt));
    },
  };
})();
