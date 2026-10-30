import app from 'flarum/forum/app';

/**
 * The saved navigation: one ordered list that governs the header AND the
 * sidebar menu.
 *
 *   { v: 1, direct: 4, logo: null | 20–120, items: [
 *       { key: 'allDiscussions', place: 'header' | 'menu' | 'hidden',
 *         label?: string, icon?: string },
 *       { key: 'custom-x1y2', custom: true, place: 'header' | 'menu',
 *         label: string, href: string, icon?: string, newTab?: boolean },
 *       { key: 'mega-abc', custom: true, mega: true, place: 'header' | 'hidden' },
 *   ] }
 *
 * `key` is the name Flarum's own nav uses for the entry (the `item-<key>`
 * class), so an item belongs to whichever extension provides it and simply
 * disappears when that extension is disabled — a hardcoded link would 404.
 *
 * Anything the forum offers that is NOT in the list (an extension installed
 * after the nav was saved) stays in the menu where its extension put it.
 */

export const PLACES = ['header', 'menu', 'hidden'];

/**
 * Where a forum starts before anyone has opened the editor.
 *
 * These are the entries the first version of this extension moved into the
 * header, in its order. Each still only appears when the forum offers it, so
 * on a forum without the pick'em or the gallery they are simply absent.
 */
const STARTERS = [
  'allDiscussions',
  'picks',
  'fantasy',
  'roster',
  'knowledge-base',
  'bugtracker',
  'pagebuilder-articles',
  'atrium',
  'badges',
  'tags',
  'hashtags',
];

export const DEFAULT_DIRECT = 4;

/** Nav entries that are structure, not destinations, and never offered. */
export function isManageable(key) {
  return !(key === 'separator' || key === 'moreTags' || /^tag\d+$/.test(key));
}

/**
 * 🚨 Only three kinds of address are ever rendered.
 *
 * The URL is typed by an admin, but it ends up in an href on every page for
 * every visitor; a `javascript:` URL there is script on every page. A path on
 * this forum, an http(s) address, or mailto — anything else is dropped.
 */
export function safeHref(href) {
  // eslint-disable-next-line no-control-regex
  const h = String(href || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  // A backslash is never sent: browsers read `/\example.com` as `//example.com`.
  if (h.includes('\\')) return null;
  if (h.startsWith('/') && !h.startsWith('//')) return h;
  if (/^https?:\/\/[^\s]+$/i.test(h)) return h;
  if (/^mailto:[^\s]+$/i.test(h)) return h;
  return null;
}

/** An icon is a Font Awesome class list: letters, digits, dashes, spaces. */
export function safeIcon(icon) {
  const i = String(icon || '').trim();
  return /^[a-z0-9 -]{1,80}$/i.test(i) ? i : '';
}

function normalise(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {};
  const direct = parseInt(cfg.direct, 10);
  const seen = new Set();

  const items = (Array.isArray(cfg.items) ? cfg.items : [])
    .filter((it) => it && typeof it.key === 'string' && it.key && !seen.has(it.key) && seen.add(it.key))
    .map((it) => ({
      key: it.key,
      place: PLACES.includes(it.place) ? it.place : 'menu',
      label: typeof it.label === 'string' ? it.label.slice(0, 60) : '',
      icon: safeIcon(it.icon),
      ...(it.custom ? { custom: true, href: typeof it.href === 'string' ? it.href.slice(0, 500) : '', newTab: !!it.newTab } : {}),
      ...(it.custom && it.mega ? { mega: true } : {}),
    }))
    // A custom link cannot be "hidden" — there is nothing to hide it from. A
    // mega menu of its own lives in the header or nowhere: the sidebar has no
    // room for one.
    .map((it) => (it.mega ? { ...it, place: it.place === 'header' ? 'header' : 'hidden' } : it))
    .map((it) => (it.custom && !it.mega && it.place === 'hidden' ? { ...it, place: 'menu' } : it));

  const logo = parseInt(cfg.logo, 10);

  return {
    v: 1,
    direct: Number.isFinite(direct) ? Math.min(12, Math.max(1, direct)) : DEFAULT_DIRECT,
    // Null leaves the theme's logo exactly as it is.
    logo: Number.isFinite(logo) ? Math.min(120, Math.max(20, logo)) : null,
    items,
  };
}

/** The starting navigation, for a forum that has never saved one. */
export function defaults() {
  return normalise({
    direct: DEFAULT_DIRECT,
    items: STARTERS.map((key) => ({ key, place: 'header' })),
  });
}

/** Whether this forum has saved a navigation of its own. */
export function isSaved() {
  return !!app.forum.attribute('headerNav');
}

/** The navigation in force: the saved one, or the defaults. */
export function current() {
  const saved = app.forum.attribute('headerNav');
  return saved ? normalise(saved) : defaults();
}

export function prepare(cfg) {
  return normalise(cfg);
}

let counter = 0;
export function newCustomKey() {
  counter += 1;
  return `custom-${Date.now().toString(36)}${counter}`;
}

/**
 * The mega menus this visitor may see, as the server filtered them: never the
 * audience rules, never another group's links. Absent until a forum makes one.
 */
export function megaMenus() {
  return app.forum.attribute('headerNavMega') || [];
}
