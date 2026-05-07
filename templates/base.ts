export interface TemplateData {
  title: string;
  body: string;
  /** ISO date string, e.g. "2026-01-23" */
  date?: string;
  /** ISO date string; suppressed when equal to date */
  revisedDate?: string | null;
  tags?: string[];
  /**
   * Pre-rendered series bar HTML, or null/undefined when the piece
   * does not belong to a series.  Rendered at the top and bottom of
   * the article body.  Generation is deferred to a later phase; pass
   * nothing here until then.
   */
  seriesBar?: string | null;
  /**
   * True for the home/index page.  Adjusts header size (1.35rem site
   * name), omits the article wrapper / h1 / dateline / tags, and
   * renders the body directly inside the column.
   */
  isHome?: boolean;
}

/* ─── helpers ─────────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  // Accepts "YYYY-MM-DD" or any Date-parseable string.
  // Falls back to the raw string if parsing fails.
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function renderDateline(date?: string, revisedDate?: string | null): string {
  if (!date) return "";
  const pub = formatDate(date);
  // Suppress revisedDate when it is absent or identical to date.
  const showRevised = revisedDate && revisedDate !== date;
  const inner = showRevised
    ? `${pub} · revised ${formatDate(revisedDate!)}`
    : pub;
  return `<p class="aw-dateline">${inner}</p>`;
}

function renderTags(tags?: string[]): string {
  if (!tags || tags.length === 0) return "";
  const items = tags.map((t) => `<li class="aw-tag">${t}</li>`).join("\n      ");
  return `<ul class="aw-tags">\n      ${items}\n    </ul>`;
}

function renderSeriesBar(seriesBar?: string | null): string {
  // Stub: renders nothing until series metadata generation is implemented.
  if (!seriesBar) return "";
  return seriesBar;
}

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Home",  href: "/" },
  { label: "Notes", href: "/notes/" },
  { label: "About", href: "/about/" },
];

function renderNav(currentPath?: string): string {
  const items = NAV_ITEMS.map(({ label, href }) => {
    const current = currentPath === href ? ' aria-current="page"' : "";
    return `<li><a href="${href}"${current}>${label}</a></li>`;
  }).join("\n        ");
  return `<nav class="aw-nav" aria-label="Site navigation">
      <ul class="aw-nav__list">
        ${items}
      </ul>
    </nav>`;
}

/* ─── template ────────────────────────────────────────────────────────── */

export function baseTemplate({
  title,
  body,
  date,
  revisedDate,
  tags,
  seriesBar,
  isHome = false,
}: TemplateData): string {
  const dateline = renderDateline(date, revisedDate);
  const tagsHtml = renderTags(tags);
  const seriesBarHtml = renderSeriesBar(seriesBar);
  const headerClass = isHome
    ? "aw-site-header aw-site-header--home"
    : "aw-site-header";

  /* Main content differs between home and article pages */
  const mainInner = isHome
    ? body
    : `${seriesBarHtml}

      <article>
        <header class="aw-article-header">
          <h1>${title}</h1>
          ${dateline}
          ${tagsHtml}
        </header>

        <div class="aw-prose">
          ${body}
        </div>
      </article>

      ${seriesBarHtml}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — amanuensiswake</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>

  <header class="${headerClass}">
    <div class="aw-column aw-site-header__inner">
      <div class="aw-site-id">
        <a class="aw-site-name" href="/">amanuensiswake</a>
        <p class="aw-byline">by Lander M. Kerbey</p>
      </div>
      ${renderNav()}
    </div>
  </header>

  <main class="aw-main">
    <div class="aw-column">
      ${mainInner}
    </div>
  </main>

  <footer class="aw-footer">
    <a href="/">amanuensiswake</a>
  </footer>

</body>
</html>`;
}
