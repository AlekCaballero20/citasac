export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function formatDate(value, options = {}) {
  const date = toDate(value);
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: options.dateStyle || "medium",
    timeStyle: options.timeStyle || undefined
  }).format(date);
}

export function daysSince(value) {
  const date = toDate(value);
  if (!date) return null;
  const now = new Date();
  const diff = now.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor(diff / 86400000));
}

export function relativeLastDone(value) {
  const days = daysSince(value);
  if (days === null) return "Nunca lo han hecho";
  if (days === 0) return "Lo hicieron hoy";
  if (days === 1) return "Hace 1 día";
  return `Hace ${days} días`;
}

export function repeatStatus(idea) {
  const repeat = Number(idea.repeatEveryDays || 0);
  if (!repeat) return { label: "Sin frecuencia", level: "neutral", overdueBy: 0 };
  const days = daysSince(idea.lastDoneAt);
  if (days === null) return { label: `Sugerido cada ${repeat} días`, level: "hot", overdueBy: repeat };
  const remaining = repeat - days;
  if (remaining <= 0) return { label: `Toca repetirlo`, level: "hot", overdueBy: Math.abs(remaining) };
  if (remaining <= 7) return { label: `En ${remaining} días`, level: "warm", overdueBy: 0 };
  return { label: `En ${remaining} días`, level: "cool", overdueBy: 0 };
}

export function parseTags(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function tagsToText(tags) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

export function averageRating(idea) {
  const count = Number(idea.ratingCount || 0);
  if (!count) return null;
  return Number(idea.ratingSum || 0) / count;
}

export function moneyCOP(value) {
  const number = Number(value || 0);
  if (!number) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(number);
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function todayInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function scoreIdea(idea, filters = {}) {
  const status = repeatStatus(idea);
  const rating = averageRating(idea) || 0;
  let score = 0;

  if (!idea.lastDoneAt) score += 40;
  if (status.level === "hot") score += 35 + status.overdueBy;
  if (status.level === "warm") score += 15;
  if (idea.favorite) score += 12;
  score += rating * 3;
  score += Math.max(0, 8 - Number(idea.timesDone || 0));

  if (filters.energy && filters.energy !== "all" && idea.energyLevel === filters.energy) score += 10;
  if (filters.budget && filters.budget !== "all" && idea.budgetLevel === filters.budget) score += 10;
  if (filters.category && filters.category !== "all" && idea.category === filters.category) score += 10;

  return score;
}
