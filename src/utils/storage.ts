import { get, set, del, keys, createStore } from "idb-keyval";

const NOTE_PREFIX = "note:";
const DRAFT_PREFIX = "draft:";

const store = createStore("kite-db", "notes");

export function getNoteContent(id: string): Promise<string | null> {
  return get<string>(`${NOTE_PREFIX}${id}`, store).then((value) => value ?? null);
}

export function setNoteContent(id: string, content: string): Promise<void> {
  return set(`${NOTE_PREFIX}${id}`, content, store);
}

export function deleteNoteContent(id: string): Promise<void> {
  return del(`${NOTE_PREFIX}${id}`, store);
}

export function getDraftContent(id: string): Promise<string | null> {
  return get<string>(`${DRAFT_PREFIX}${id}`, store).then((value) => value ?? null);
}

export function setDraftContent(id: string, content: string): Promise<void> {
  return set(`${DRAFT_PREFIX}${id}`, content, store);
}

export function deleteDraftContent(id: string): Promise<void> {
  return del(`${DRAFT_PREFIX}${id}`, store);
}

export async function getAllKeys(): Promise<string[]> {
  const all = await keys(store);
  return all
    .map((k) => (typeof k === "string" ? k : String(k)))
    .filter((k) => typeof k === "string");
}


