import { get, set, del } from "idb-keyval";

const NOTE_PREFIX = "note:";
const DRAFT_PREFIX = "draft:";

export function getNoteContent(id: string): Promise<string | null> {
  return get<string>(`${NOTE_PREFIX}${id}`).then((value) => value ?? null);
}

export function setNoteContent(id: string, content: string): Promise<void> {
  return set(`${NOTE_PREFIX}${id}`, content);
}

export function deleteNoteContent(id: string): Promise<void> {
  return del(`${NOTE_PREFIX}${id}`);
}

export function getDraftContent(id: string): Promise<string | null> {
  return get<string>(`${DRAFT_PREFIX}${id}`).then((value) => value ?? null);
}

export function setDraftContent(id: string, content: string): Promise<void> {
  return set(`${DRAFT_PREFIX}${id}`, content);
}

export function deleteDraftContent(id: string): Promise<void> {
  return del(`${DRAFT_PREFIX}${id}`);
}


