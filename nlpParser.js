/**
 * Lightweight, regex-based "smart input" parser — no external NLP library.
 * Extracts a due date and a #category tag from free text, e.g.
 * "Review sports data tomorrow at 5 PM #work" -> { title: "Review sports data", due: "2026-07-15", category: "work" }.
 * Time phrases ("at 5 PM") are recognized and stripped from the title, but the
 * task model only stores a due *date*, so the time itself isn't persisted.
 */
const nlpParser = (() => {
  const CATEGORIES = ['work', 'personal', 'shopping'];
  const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const CATEGORY_RE = new RegExp(`#(${CATEGORIES.join('|')})\\b`, 'i');
  const NEXT_WEEKDAY_RE = new RegExp(`\\bnext\\s+(${WEEKDAYS.join('|')})\\b`, 'i');
  const WEEKDAY_RE = new RegExp(`\\b(today|tomorrow|${WEEKDAYS.join('|')})\\b`, 'i');
  const TIME_RE = /\bat\s+(\d{1,2})(:(\d{2}))?\s*(am|pm)\b/i;

  const pad = (n) => String(n).padStart(2, '0');
  const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  function resolveWeekday(word, forceNextWeek) {
    const base = startOfToday();
    const word_ = word.toLowerCase();
    if (word_ === 'today') return base;
    if (word_ === 'tomorrow') {
      base.setDate(base.getDate() + 1);
      return base;
    }
    const targetDow = WEEKDAYS.indexOf(word_);
    let diff = (targetDow - base.getDay() + 7) % 7;
    if (diff === 0 && forceNextWeek) diff = 7;
    base.setDate(base.getDate() + diff);
    return base;
  }

  function parse(rawText) {
    let text = rawText;
    let due = '';
    let category = null;

    const categoryMatch = text.match(CATEGORY_RE);
    if (categoryMatch) {
      category = categoryMatch[1].toLowerCase();
      text = text.replace(categoryMatch[0], ' ');
    }

    const nextMatch = text.match(NEXT_WEEKDAY_RE);
    const dayMatch = !nextMatch && text.match(WEEKDAY_RE);
    let targetDate = null;

    if (nextMatch) {
      targetDate = resolveWeekday(nextMatch[1], true);
      text = text.replace(nextMatch[0], ' ');
    } else if (dayMatch) {
      targetDate = resolveWeekday(dayMatch[1], false);
      text = text.replace(dayMatch[0], ' ');
    }

    const timeMatch = text.match(TIME_RE);
    if (timeMatch) {
      if (!targetDate) targetDate = startOfToday();
      text = text.replace(timeMatch[0], ' ');
    }

    if (targetDate) due = toDateStr(targetDate);

    const title = text.replace(/\s{2,}/g, ' ').trim();
    return { title, due, category };
  }

  return { parse };
})();
