import type { EntryMeta } from "../src/builder/collect-entries.js";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function renderWritingEntry(entry: EntryMeta): string {
  const meta = formatDate(entry.date);
  const tags = entry.tags
    .map((t) => `<li class="aw-tag">${t}</li>`)
    .join("\n          ");
  const tagsHtml = tags
    ? `<ul class="aw-tags">\n          ${tags}\n        </ul>`
    : "";

  return `<div class="aw-entry">
      <span class="aw-entry-meta">${meta}</span>
      <div class="aw-entry-body">
        <a class="aw-entry-title" href="/${entry.slug}/">${entry.title}</a>
        ${tagsHtml}
      </div>
    </div>`;
}

function renderNoteEntry(entry: EntryMeta): string {
  const date = formatDate(entry.date);
  return `<div class="aw-note-item">
      <a class="aw-note-item-title" href="/${entry.slug}/">${entry.title}</a>
      <span class="aw-note-item-date">${date}</span>
    </div>`;
}

function renderNotesBlock(notes: EntryMeta[]): string {
  if (notes.length === 0) return "";
  const items = notes.map(renderNoteEntry).join("\n    ");
  return `<div class="aw-notes-block">
    <p class="aw-note-head">Notes</p>
    <p class="aw-note-subhead">Unfinished thoughts, open questions, process material. Not intended as finished work — for readers interested in the workshop.</p>
    ${items}
  </div>`;
}

export function indexTemplate(ledeHtml: string, entries: EntryMeta[]): string {
  const writings = entries.filter((e) => !e.isNote);
  const notes = entries.filter((e) => e.isNote);

  const writingsHtml = writings.map(renderWritingEntry).join("\n    ");
  const notesHtml = renderNotesBlock(notes);

  return `<div class="aw-index">
    <div class="aw-lede">${ledeHtml}</div>
    <div class="aw-section-label">Writings</div>
    ${writingsHtml}
    ${notesHtml}
  </div>`;
}