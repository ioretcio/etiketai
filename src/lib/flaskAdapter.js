// src/lib/flaskAdapter.js
const API = process.env.NEXT_PUBLIC_ETIKETAI_API_BASE || "";

// Тепер listItems повертає тільки чисті імена файлів та лейблів
export async function listItems(datasetId) {
  const r = await fetch(`${API}/datasets/${datasetId}/list`);
  if (!r.ok) throw new Error("list failed");
  const j = await r.json();
  // Перетворюємо image_rel і label_rel у чисті назви файлів
  return (j.items || []).map(item => ({
    ...item,
    image_rel: item.image_rel.split("/").pop(),
    label_rel: item.label_rel.split("/").pop()
  }));
}

// Формує URL для отримання зображення
export function imageURL(datasetId, image_rel) {
  return `${API}/datasets/${datasetId}/image?path=${encodeURIComponent(image_rel)}`;
}

// Завантаження розмітки
export async function loadLabel(datasetId, label_rel) {
  const r = await fetch(
    `${API}/datasets/${datasetId}/label?path=${encodeURIComponent(label_rel)}`
  );
  if (r.status === 204) return null;
  if (!r.ok) throw new Error("label get failed");
  const ct = r.headers.get("content-type") || "";
  return ct.includes("application/json") ? r.json() : r.text();
}

// Збереження розмітки
export async function saveLabel(datasetId, label_rel, data) {
  const payload = {
    path: label_rel,
    data: typeof data === "string" ? data : data,
  };
  const r = await fetch(`${API}/datasets/${datasetId}/label`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("label save failed");
}
