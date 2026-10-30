/*
 * The open mega menu's contents: a chunk of its own, fetched once a visitor
 * has a menu (see mega.js), so a forum without one never downloads it.
 */
import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Icon from 'flarum/common/components/Icon';
import Link from 'flarum/common/components/Link';
import Avatar from 'flarum/common/components/Avatar';
import username from 'flarum/common/helpers/username';
import classList from 'flarum/common/utils/classList';
import { readNav } from './nav';
import { safeHref } from './config';

const t = (key, params) => app.translator.trans(`ernestdefoe-header-nav.forum.mega.${key}`, params);

/*
 * 🚨 The server checked every colour and image address on save; these checks
 * are the same allow-lists again, so a value written to the setting by some
 * other route still never reaches a style or a src.
 */
const COLOR = /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([0-9.%\s,/]+\)|[a-z]{3,30})$/i;
const IMAGE = /^https:\/\/[^\s<>"'`\\()]+$/i;
const colour = (c) => (c && COLOR.test(c) ? c : null);

/** A style object of CSS custom properties, without the empty ones. */
function vars(map) {
  const out = {};
  Object.keys(map).forEach((k) => map[k] != null && map[k] !== '' && (out[k] = String(map[k])));
  return out;
}

/**
 * Where a link goes, for this visitor, on this forum: `{ href, external }`, or
 * `{ run }` for a destination that is an action, or null when it is not
 * available here (an extension that is not enabled, Log in for a member).
 * `nav` is the forum's own navigation, read once per open menu.
 */
export function destination(link, nav) {
  if (link.href) {
    const href = safeHref(link.href);
    return href ? { href, external: !href.startsWith('/') } : null;
  }

  const dest = link.dest || '';
  const user = app.session.user;

  if (dest.startsWith('nav:')) {
    const item = nav().get(dest.slice(4));
    return item && item.link ? { href: item.href } : null;
  }
  if (dest.startsWith('tag:')) return app.routes.tag ? { href: app.route('tag', { tags: dest.slice(4) }) } : null;
  if (dest === 'settings' || dest === 'notifications') return user ? { href: app.route(dest) } : null;
  if (dest === 'login') return user ? null : { run: () => app.modal.show(() => import('flarum/forum/components/LogInModal')) };
  if (dest === 'signup') {
    return user || !app.forum.attribute('allowSignUp') ? null : { run: () => app.modal.show(() => import('flarum/forum/components/SignUpModal')) };
  }
  // The forum's own search: its header control opens the search window.
  if (dest === 'search') return { run: () => document.querySelector('#header .Search-input')?.click() };

  return null;
}

/** A short, stable fingerprint of an announcement, so a new one shows again. */
function fingerprint(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/**
 * The open menu's contents. Also drawn by the editor's live preview, with
 * `preview` set: every link shows there, even one this admin would not get.
 */
export default class MegaPanel extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.query = '';
    this.navMap = null;
  }

  view() {
    const { menu, id, label, href, preview } = this.attrs;
    const q = this.query.trim().toLowerCase();
    const nav = () => (this.navMap ||= new Map(readNav().map((n) => [n.key, n])));

    const sections = (menu.sections || [])
      .map((section) => ({
        ...section,
        links: (section.links || [])
          .map((link) => ({ link, to: destination(link, nav) || (preview ? { run() {} } : null) }))
          .filter(({ link, to }) => to && link.title && (!q || `${link.title} ${link.desc || ''}`.toLowerCase().includes(q))),
      }))
      .filter((section) => section.links.length);

    // A category marked "stack" goes under the one before it, in its column.
    const columns = [];
    sections.forEach((section) => (section.stack && columns.length ? columns[columns.length - 1].push(section) : columns.push([section])));

    // A block with nothing in it (the editor's preview of an empty one) is not drawn.
    const said = (block) => block && (block.title || block.text);
    const promo = said(menu.promo) && !q ? this.promo(menu.promo) : null;

    return (
      <div
        id={id}
        role="region"
        aria-label={menu.title || label}
        className={classList(
          'HeaderMega-panel',
          `HeaderMega--${menu.style || 'classic'}`,
          menu.band && `HeaderMega--band-${menu.band}`,
          menu.iconStyle && `HeaderMega--icon-${menu.iconStyle}`,
          menu.density && `HeaderMega--${menu.density}`,
          menu.descSize && `HeaderMega--desc-${menu.descSize}`,
          menu.border && `HeaderMega--border-${menu.border}`,
          menu.shadow && `HeaderMega--shadow-${menu.shadow}`,
          menu.texture && menu.texture !== 'none' && `HeaderMega--tex HeaderMega--tex-${menu.texture}`,
          menu.mark && 'HeaderMega--mark',
          menu.divider && 'HeaderMega--dividers',
          menu.sep && 'HeaderMega--seps'
        )}
        style={vars({
          '--hm-width': `${menu.width || 1100}px`,
          '--hm-cols': Math.min(menu.cols || 4, columns.length + (promo ? 1 : 0)) || 1,
          '--hm-tex': (menu.textureStrength ?? 40) / 100,
          '--hm-div': menu.divider && `${menu.divider}px`,
          '--hm-div-color': colour(menu.dividerColor),
          '--hm-sep': menu.sep && `${menu.sep}px`,
          '--hm-sep-color': colour(menu.sepColor),
          '--hm-mark-size': `${menu.markSize || 120}px`,
          '--hm-mark-opacity': (menu.markOpacity || 8) / 100,
        })}
      >
        {this.announcement(menu)}

        <div className="HeaderMega-head">
          {menu.greet ? this.greeting(menu) : null}
          {href ? (
            <Link className="HeaderMega-all" href={href} onclick={() => this.attrs.onclose?.()}>
              {t('go_to', { label })}
              <Icon name="fas fa-arrow-right" />
            </Link>
          ) : null}
          {menu.search ? (
            <input
              type="search"
              className="FormControl HeaderMega-search"
              placeholder={t('search_placeholder')}
              aria-label={t('search_label')}
              value={this.query}
              oninput={(e) => (this.query = e.target.value)}
            />
          ) : null}
          <button
            type="button"
            className="Button Button--icon Button--link HeaderMega-close"
            aria-label={t('close')}
            onclick={() => this.attrs.onclose?.(true)}
          >
            <Icon name="fas fa-times" />
          </button>
        </div>

        <div className="HeaderMega-grid">
          {columns.map((column) => (
            <div className="HeaderMega-col">{column.map((section) => this.section(section, menu))}</div>
          ))}
          {promo}
        </div>

        {q && !sections.length ? <p className="HeaderMega-empty">{t('no_results')}</p> : null}
        {said(menu.help) && !q ? this.help(menu.help) : null}
      </div>
    );
  }

  section(section, menu) {
    return (
      <section className="HeaderMega-cat" style={vars({ '--hm-accent': colour(section.color) })}>
        {section.title ? (
          <h3 className="HeaderMega-catTitle">
            {section.icon && !menu.hideCatIcons ? <Icon name={section.icon} /> : null}
            <span>{section.title}</span>
          </h3>
        ) : null}
        <ul className="HeaderMega-links">
          {section.links.map(({ link, to }) => (
            <li>{this.link(link, to, menu)}</li>
          ))}
        </ul>
        {section.footLabel && safeHref(section.footHref) ? (
          <Link className="Button Button--small HeaderMega-catFoot" href={safeHref(section.footHref)} external={!section.footHref.startsWith('/')}>
            {section.footLabel}
          </Link>
        ) : null}
        {menu.mark && section.icon ? <Icon name={section.icon} className="HeaderMega-mark" /> : null}
      </section>
    );
  }

  link(link, to, menu) {
    const close = () => this.attrs.onclose?.();
    const inner = [
      link.icon && !menu.hideLinkIcons ? (
        <span className="HeaderMega-icon" style={vars({ '--hm-icon': colour(link.iconColor) })}>
          <Icon name={link.icon} />
        </span>
      ) : null,
      <span className="HeaderMega-text">
        <span className="HeaderMega-title">
          {link.title}
          {link.badge && !menu.hideBadges ? (
            <span className="HeaderMega-badge" style={vars({ '--hm-badge': colour(link.badgeColor) })}>
              {link.badge}
            </span>
          ) : null}
        </span>
        {link.desc && !menu.hideDesc ? <span className="HeaderMega-desc">{link.desc}</span> : null}
      </span>,
    ];

    if (to.run) {
      return (
        <button
          type="button"
          className="HeaderMega-link"
          onclick={() => {
            close();
            to.run();
          }}
        >
          {inner}
        </button>
      );
    }

    return (
      <Link
        className="HeaderMega-link"
        href={to.href}
        external={to.external}
        target={link.newTab ? '_blank' : undefined}
        rel={link.newTab ? 'noopener noreferrer' : undefined}
        onclick={close}
      >
        {inner}
      </Link>
    );
  }

  greeting(menu) {
    const user = app.session.user;

    if (!user) {
      return (
        <div className="HeaderMega-greet">
          <span className="HeaderMega-greetText">{menu.greetGuest || t('greeting_guest')}</span>
        </div>
      );
    }

    // The visitor's own clock: "good morning" is about where they are.
    const hour = new Date().getHours();
    const part = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';

    return (
      <div className="HeaderMega-greet">
        <Avatar user={user} className="HeaderMega-avatar" />
        <span className="HeaderMega-greetText">{t(`greeting_${part}`, { name: username(user) })}</span>
      </div>
    );
  }

  /**
   * Dismissed per visitor, in this browser, for this wording: changing the
   * text or its link makes it a new announcement that shows again.
   */
  announcement(menu) {
    const a = menu.announce;
    if (!a || !a.text) return null;

    const key = `ernestdefoe-header-nav.mega.${menu.id}`;
    const sig = fingerprint(`${a.text}|${a.href || ''}`);

    if (this.dismissed === undefined) {
      try {
        this.dismissed = !this.attrs.preview && localStorage.getItem(key) === sig;
      } catch (e) {
        this.dismissed = false;
      }
    }
    if (this.dismissed) return null;

    const href = safeHref(a.href);

    return (
      <div className="HeaderMega-announce" role="note">
        <Icon name="fas fa-bullhorn" />
        {href ? (
          <Link href={href} external={!href.startsWith('/')}>
            {a.text}
          </Link>
        ) : (
          <span>{a.text}</span>
        )}
        <button
          type="button"
          className="Button Button--icon Button--link HeaderMega-dismiss"
          aria-label={t('dismiss')}
          onclick={() => {
            this.dismissed = true;
            try {
              if (!this.attrs.preview) localStorage.setItem(key, sig);
            } catch (e) {
              // Private windows: it shows again next time, which is fine.
            }
          }}
        >
          <Icon name="fas fa-times" />
        </button>
      </div>
    );
  }

  promo(p) {
    const image = p.image && IMAGE.test(p.image) ? p.image : null;
    const href = safeHref(p.href);

    return (
      <aside className={classList('HeaderMega-promo', image && 'HeaderMega-promo--image')}>
        {image ? <img className="HeaderMega-promoImg" src={image} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" /> : null}
        <div className="HeaderMega-promoBody">
          {p.title ? <h3 className="HeaderMega-promoTitle">{p.title}</h3> : null}
          {p.text ? <p>{p.text}</p> : null}
          {p.button && href ? (
            <Link className="Button Button--primary" href={href} external={!href.startsWith('/')}>
              {p.button}
            </Link>
          ) : null}
        </div>
      </aside>
    );
  }

  help(h) {
    const href = safeHref(h.href);

    return (
      <div className="HeaderMega-help">
        <Icon name="fas fa-life-ring" />
        <div className="HeaderMega-helpText">
          {h.title ? <strong>{h.title}</strong> : null}
          {h.text ? <span>{h.text}</span> : null}
        </div>
        {h.label && href ? (
          <Link className="Button Button--small" href={href} external={!href.startsWith('/')}>
            {h.label}
          </Link>
        ) : null}
      </div>
    );
  }
}
