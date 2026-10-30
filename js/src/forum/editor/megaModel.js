import app from 'flarum/forum/app';
import extractText from 'flarum/common/utils/extractText';
import { safeHref } from '../config';

/*
 * The mega menu model, for the editor only.
 *
 * The server checks every field on save against the same allow-list (see
 * src/MegaMenus.php) and stores only what differs from these defaults. The
 * editor works on a FILLED copy, every field present, so its inputs never
 * see undefined; anything outside the list (an imported file's extras) is
 * dropped on the way in.
 */

export const LIMITS = { menus: 32, sections: 6, links: 30 };

export const ENUMS = {
  trigger: ['link', 'button'],
  open: ['hover', 'click'],
  style: ['classic', 'soft', 'rails', 'raised', 'bands', 'underline', 'inset'],
  band: ['none', 'solid', 'gradient'],
  iconStyle: ['plain', 'soft', 'solid'],
  density: ['comfortable', 'compact'],
  descSize: ['md', 'sm', 'lg'],
  border: ['line', 'none', 'outline'],
  shadow: ['soft', 'none', 'strong'],
  texture: [
    'none',
    'grain',
    'linen',
    'dots',
    'weave',
    'graph',
    'brushed',
    'contour',
    'paper',
    'canvas',
    'crosshatch',
    'herringbone',
    'honeycomb',
    'waves',
  ],
};

/** [min, max, default] */
export const INTS = {
  width: [400, 1600, 1100],
  cols: [1, 6, 4],
  divider: [0, 4, 0],
  sep: [0, 4, 0],
  markSize: [40, 240, 120],
  markOpacity: [1, 40, 8],
  textureStrength: [0, 100, 40],
};

const BOOLS = ['off', 'mark', 'hideDesc', 'hideLinkIcons', 'hideCatIcons', 'hideBadges', 'search', 'greet'];
const TEXTS = ['id', 'attach', 'title', 'icon', 'greetGuest', 'dividerColor', 'sepColor'];

const COLOR = /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([0-9.%\s,/]+\)|[a-z]{3,30})$/i;
const IMAGE = /^https:\/\/[^\s<>"'`\\()]+$/i;
const ICON = /^[a-z0-9 -]{1,80}$/i;

/** Field checks, the same rules the server applies; empty is always fine. */
export const valid = {
  href: (v) => !v || (!!safeHref(v) && !/[\s<>"'`]/.test(v)),
  color: (v) => !v || COLOR.test(v),
  image: (v) => !v || IMAGE.test(v),
  icon: (v) => !v || ICON.test(v),
};

let counter = 0;
const key = () => `k${++counter}`;

export function newId() {
  return (Date.now().toString(36) + (++counter).toString(36)).slice(-16);
}

const str = (v) => (typeof v === 'string' ? v : '');
const list = (v) => (Array.isArray(v) ? v : []);
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, str(o && o[k])]));

/** null (everyone), 'guests', 'members', or a list of group ids. */
function audience(v) {
  if (v === 'guests' || v === 'members') return v;
  if (Array.isArray(v)) return v.map((id) => parseInt(id, 10)).filter((id) => id > 0);
  return null;
}

export function fillLink(raw) {
  const l = raw && typeof raw === 'object' ? raw : {};
  return {
    _k: key(),
    ...pick(l, ['title', 'desc', 'icon', 'iconColor', 'badge', 'badgeColor', 'href', 'dest']),
    newTab: l.newTab === true,
    aud: audience(l.aud),
  };
}

export function fillSection(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    _k: key(),
    ...pick(s, ['title', 'icon', 'color', 'footLabel', 'footHref']),
    stack: s.stack === true,
    aud: audience(s.aud),
    links: list(s.links).slice(0, LIMITS.links).map(fillLink),
  };
}

/** A complete, editable copy of a stored (compact) or imported menu. */
export function fill(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const menu = {};

  TEXTS.forEach((k) => (menu[k] = str(r[k])));
  BOOLS.forEach((k) => (menu[k] = r[k] === true));
  Object.keys(ENUMS).forEach((k) => (menu[k] = ENUMS[k].includes(r[k]) ? r[k] : ENUMS[k][0]));
  Object.keys(INTS).forEach((k) => {
    const [min, max, def] = INTS[k];
    const n = parseInt(r[k], 10);
    menu[k] = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  });

  menu.aud = audience(r.aud);
  menu.announce = pick(r.announce, ['text', 'href']);
  menu.promo = { ...pick(r.promo, ['title', 'text', 'button', 'href', 'image']), aud: audience(r.promo && r.promo.aud) };
  menu.help = pick(r.help, ['title', 'text', 'label', 'href']);
  menu.sections = list(r.sections).slice(0, LIMITS.sections).map(fillSection);

  return menu;
}

/** JSON without the editor's own row keys. */
export function serialise(value, space) {
  return JSON.stringify(value, (k, v) => (k === '_k' ? undefined : v), space);
}

/**
 * The fields of one menu with something wrong, as "where: what" strings, so
 * the editor can say what stops a save before the server does.
 */
export function problems(menu) {
  const out = [];
  const t = (k) => extractText(app.translator.trans(`ernestdefoe-header-nav.forum.mega_editor.${k}`));
  const check = (ok, where) => ok || out.push(where);
  const groups = (aud, where) => check(!Array.isArray(aud) || aud.length, `${where}: ${t('problem_groups')}`);

  check(valid.icon(menu.icon), t('menu_icon'));
  check(valid.color(menu.dividerColor) && valid.color(menu.sepColor), t('tab_look'));
  check(valid.href(menu.announce.href), t('announce'));
  check(valid.href(menu.promo.href) && valid.image(menu.promo.image), t('promo'));
  check(valid.href(menu.help.href), t('help'));
  groups(menu.aud, t('tab_behaviour'));
  groups(menu.promo.aud, t('promo'));

  menu.sections.forEach((s, i) => {
    const where = s.title || `${t('section')} ${i + 1}`;
    check(valid.icon(s.icon) && valid.color(s.color) && valid.href(s.footHref), where);
    groups(s.aud, where);

    s.links.forEach((l, j) => {
      const at = `${where} › ${l.title || `${t('link')} ${j + 1}`}`;
      const empty = !l.title && !l.href && !l.dest;
      check(empty || (l.title && (l.href || l.dest)), `${at}: ${t('problem_link')}`);
      check(valid.href(l.href) && valid.icon(l.icon) && valid.color(l.iconColor) && valid.color(l.badgeColor), at);
      groups(l.aud, at);
    });
  });

  return out;
}

/**
 * A new menu's starting layout: something to edit rather than an empty page.
 * Only destinations this forum offers are used.
 */
export function starter(id, attach, offered) {
  const t = (k) => extractText(app.translator.trans(`ernestdefoe-header-nav.forum.mega_editor.starter.${k}`));
  const has = new Set(offered.filter((n) => n.link).map((n) => n.key));
  const nav = (k, title, desc, icon) => has.has(k) && { title, desc, icon, dest: `nav:${k}` };

  return fill({
    id,
    attach,
    title: t('title'),
    greet: true,
    search: true,
    style: 'soft',
    iconStyle: 'soft',
    sections: [
      {
        title: t('discuss'),
        icon: 'fas fa-comments',
        links: [
          nav('allDiscussions', t('all'), t('all_desc'), 'far fa-comments'),
          nav('following', t('following'), t('following_desc'), 'fas fa-star'),
          nav('tags', t('tags'), t('tags_desc'), 'fas fa-th-large'),
        ].filter(Boolean),
      },
      {
        title: t('account'),
        icon: 'fas fa-user',
        links: [
          { title: t('settings'), desc: t('settings_desc'), icon: 'fas fa-cog', dest: 'settings' },
          { title: t('notifications'), desc: t('notifications_desc'), icon: 'fas fa-bell', dest: 'notifications' },
          { title: t('login'), icon: 'fas fa-sign-in-alt', dest: 'login' },
          { title: t('signup'), icon: 'fas fa-user-plus', dest: 'signup' },
        ],
      },
      {
        title: t('find'),
        icon: 'fas fa-search',
        links: [{ title: t('search'), desc: t('search_desc'), icon: 'fas fa-search', dest: 'search' }],
      },
    ],
  });
}

/** The file a menu is exported as, and read back from. */
export function exportMenu(menu) {
  const { id, attach, ...rest } = menu;
  return serialise({ headerNavMega: 1, menu: rest }, 2);
}

export function importMenu(text) {
  const data = JSON.parse(text);
  const raw = data && data.headerNavMega && data.menu;
  if (!raw || typeof raw !== 'object') throw new Error('not a mega menu');
  return fill(raw);
}
