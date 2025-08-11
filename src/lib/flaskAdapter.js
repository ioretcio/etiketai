// src/lib/flaskAdapter.js
const API = process.env.NEXT_PUBLIC_ETIKETAI_API_BASE || "";

export async function listItems(datasetId) {
  const r = await fetch(`${API}/etiketai/dataset/${datasetId}/list`);
  if (!r.ok) throw new Error("list failed");
  const j = await r.json();
  // очікуємо масив об'єктів: { image_rel, label_rel, has_label }
  return j.items || [];
}

export function imageURL(datasetId, image_rel) {
  return `${API}/etiketai/dataset/${datasetId}/image?path=${encodeURIComponent(image_rel)}`;
}

export async function loadLabel(datasetId, label_rel) {
  const r = await fetch(
    `${API}/etiketai/dataset/${datasetId}/label?path=${encodeURIComponent(label_rel)}`
  );
  if (r.status === 204) return null;
  if (!r.ok) throw new Error("label get failed");
  const ct = r.headers.get("content-type") || "";
  return ct.includes("application/json") ? r.json() : r.text();
}

export async function saveLabel(datasetId, label_rel, data) {
  // data може бути рядком (YOLO) або об'єктом (JSON)
  const payload = {
    path: label_rel,
    data: typeof data === "string" ? data : data, // залишаємо як є
  };
  const r = await fetch(`${API}/etiketai/dataset/${datasetId}/label`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("label save failed");
}