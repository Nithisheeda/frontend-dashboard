/**
 * Mock API layer. Simulates a backend with network latency and a promise-based
 * interface so the real API can be dropped in later without touching script.js.
 */
const mockApi = (() => {
  const STORAGE_KEY = 'taskboard.tasks.v2';
  const LATENCY_MS = 350;

  const seedTasks = () => [
    { id: crypto.randomUUID(), title: 'Design the dashboard layout', priority: 'high', category: 'work', due: '2026-07-12', completed: true, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3 },
    { id: crypto.randomUUID(), title: 'Wire up mock API calls', priority: 'medium', category: 'work', due: '2026-07-13', completed: false, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2 },
    { id: crypto.randomUUID(), title: 'Add dark mode toggle', priority: 'low', category: 'personal', due: '', completed: false, createdAt: Date.now() - 1000 * 60 * 60 * 24 },
    { id: crypto.randomUUID(), title: 'Pick up grocery order', priority: 'medium', category: 'shopping', due: '2026-07-15', completed: false, createdAt: Date.now() - 1000 * 60 * 30 },
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
  };
})();
