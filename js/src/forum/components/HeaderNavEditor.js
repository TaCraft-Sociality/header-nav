import app from 'flarum/forum/app';
import Page from 'flarum/common/components/Page';
import Button from 'flarum/common/components/Button';
import Icon from 'flarum/common/components/Icon';
import extractText from 'flarum/common/utils/extractText';
import Sortable from 'sortablejs';
import { readNav } from '../nav';
import { applyLogo } from '../logo';
import { current, defaults, isSaved, prepare, newCustomKey, safeHref, safeIcon, PLACES } from '../config';
import MegaBuilder from './MegaBuilder';
import { LIMITS, fill, newId, starter, serialise, problems, exportMenu, importMenu } from '../editor/megaModel';
import styles from '../editor/styles';

const MEGA_KEY = 'ernestdefoe-header-nav.mega';

const t = (key, params) => app.translator.trans(`ernestdefoe-header-nav.forum.editor.${key}`, params);

/**
 * The navigation editor.
 *
 * 🚨 On the forum, not in the admin panel.
 *
 * The admin panel does not load the forum's JavaScript, so it cannot know what
 * the forum's nav contains — the pick'em, the knowledge base, Page Builder's
 * content types all add themselves there. Here the editor reads the real list,
 * names every entry the way visitors see it, and a save shows up in the header
 * behind it straight away.
 */
export default class HeaderNavEditor extends Page {
  oninit(vnode) {
    super.oninit(vnode);

    app.setTitle(extractText(t('title')));
    this.saving = false;
    this.editing = null;
    this.load(current());

    // The editor's styles travel with its chunk, not in every page's CSS.
    if (!document.getElementById('header-nav-editor-css')) {
      const style = document.createElement('style');
      style.id = 'header-nav-editor-css';
      style.textContent = styles;
      document.head.appendChild(style);
    }

    /*
     * The mega menus, whole (audience rules included), from an admin-only
     * endpoint: visitors only ever receive their own filtered copy. Until it
     * has arrived nothing can be saved, so a slow request can never save an
     * empty set over the real one.
     */
    this.mega = null;
    if (app.session.user && app.session.user.isAdmin()) {
      app
        .request({ method: 'GET', url: `${app.forum.attribute('apiUrl')}/header-nav/mega` })
        .then((cfg) => {
          this.mega = (cfg.menus || []).map(fill);
        })
        .catch(() => (this.megaFailed = true))
        .finally(() => m.redraw());
    }
  }

  /** Build the working rows: the saved order, then anything new the forum offers. */
  load(cfg, fromSaved = isSaved()) {
    const offered = readNav();
    const byKey = new Map(offered.map((n) => [n.key, n]));
    const listed = new Set(cfg.items.map((it) => it.key));

    // 🚨 "Not offered" rows only for a navigation someone SAVED.
    //
    // The starting list names destinations from several extensions so it works
    // on any forum; on a forum without them, listing each as unavailable is
    // noise about extensions nobody here installed. Once a forum saves, an
    // entry that goes missing is worth showing — its extension was disabled,
    // and the row says so instead of the setting silently vanishing.
    const keep = fromSaved ? () => true : (it) => it.custom || byKey.has(it.key);

    this.direct = cfg.direct;
    this.logo = cfg.logo || '';
    this.offered = offered;
    this.rows = [
      // A mega menu's own row stays only while its menu exists.
      ...cfg.items.filter(keep).map((it) => {
        const offered = it.custom ? null : byKey.get(it.key) || null;
        return { ...it, place: offered && !offered.link && it.place === 'header' ? 'menu' : it.place, offered };
      }),
      ...offered.filter((n) => !listed.has(n.key)).map((n) => ({ key: n.key, place: 'menu', label: '', icon: '', offered: n })),
    ];
    this.dirty = false;
  }

  // ── Mega menus ────────────────────────────────────────────────────────────

  megaFor(key) {
    return (this.mega || []).find((menu) => menu.attach === key);
  }

  changed() {
    this.dirty = true;
  }

  canAddMenu() {
    return !!this.mega && this.mega.length < LIMITS.menus;
  }

  /** What a menu hangs from, in words: its header item's name. */
  attachLabel(menu) {
    const row = this.rows.find((r) => r.key === menu.attach);
    if (!row) return menu.attach;
    return row.label || (row.offered && row.offered.label) || menu.title || extractText(t('mega_untitled'));
  }

  /** A menu with a header item of its own, added at the end of the list. */
  addOwnMenu(menu) {
    const id = newId();
    menu.id = id;
    menu.attach = `mega-${id}`;
    this.mega.push(menu);
    this.rows.push({ key: menu.attach, custom: true, mega: true, place: 'header', label: '', icon: '', offered: null });
    this.editing = menu;
    this.changed();
  }

  /** Turn a header item into a mega menu, or edit the one it has. */
  megaForRow(row) {
    this.editing = this.megaFor(row.key) || null;
    if (this.editing || !this.canAddMenu()) return;

    const menu = starter(newId(), row.key, this.offered);
    menu.title = '';
    this.mega.push(menu);
    this.editing = menu;
    this.changed();
  }

  duplicateMenu(menu) {
    const copy = importMenu(exportMenu(menu));
    copy.title = extractText(t('mega_copy_of', { title: menu.title || this.attachLabel(menu) }));
    this.addOwnMenu(copy);
  }

  removeMenu(menu) {
    if (!confirm(extractText(t('mega_delete_confirm')))) return;
    this.mega = this.mega.filter((x) => x !== menu);
    this.rows = this.rows.filter((r) => !(r.mega && r.key === menu.attach));
    this.editing = null;
    this.changed();
  }

  exportMenu(menu) {
    const a = document.createElement('a');
    const slug = (menu.title || 'menu').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = URL.createObjectURL(new Blob([exportMenu(menu)], { type: 'application/json' }));
    a.download = `mega-menu-${slug}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  importMenu(file) {
    if (!file) return;
    file.text().then((text) => {
      try {
        this.addOwnMenu(importMenu(text));
      } catch (e) {
        app.alerts.show({ type: 'error' }, t('mega_import_failed'));
      }
      m.redraw();
    });
  }

  closeBuilder() {
    this.editing = null;
  }

  /** Every built-in place a link can go, grouped for the picker. */
  destinations() {
    const tags = app.store.all('tags').filter((tag) => tag.slug && tag.slug());
    const mt = (k) => extractText(app.translator.trans(`ernestdefoe-header-nav.forum.mega_editor.${k}`));

    return [
      [mt('dest_group_nav'), this.offered.filter((n) => n.link).map((n) => [`nav:${n.key}`, n.label])],
      [mt('dest_group_account'), ['search', 'settings', 'notifications', 'login', 'signup'].map((d) => [d, mt(`dest_${d}`)])],
      ...(tags.length ? [[mt('dest_group_tags'), tags.map((tag) => [`tag:${tag.slug()}`, tag.name()])]] : []),
    ];
  }

  view() {
    if (!app.session.user || !app.session.user.isAdmin()) {
      return (
        <div className="HeaderNavEditor container">
          <p className="HeaderNavEditor-denied">{t('denied')}</p>
        </div>
      );
    }

    const actions = (
      <div className="HeaderNavEditor-actions">
        <Button
          className="Button Button--primary"
          loading={this.saving}
          disabled={!this.dirty || (!this.mega && !this.megaFailed)}
          onclick={() => this.save()}
        >
          {t('save')}
        </Button>
        {this.editing ? null : (
          <Button className="Button" disabled={this.saving} onclick={() => this.reset()}>
            {t('reset')}
          </Button>
        )}
        {this.dirty ? <span className="HeaderNavEditor-unsaved">{t('unsaved')}</span> : null}
      </div>
    );

    if (this.editing) {
      return (
        <div className="HeaderNavEditor HeaderNavEditor--mega container">
          <MegaBuilder menu={this.editing} editor={this} />
          {actions}
        </div>
      );
    }

    return (
      <div className="HeaderNavEditor container">
        <header className="HeaderNavEditor-head">
          <h1>{t('title')}</h1>
          <p className="helpText">{t('intro')}</p>
        </header>

        <div className="HeaderNavEditor-legend">
          <span>
            <strong>{t('place_header')}</strong> {t('place_header_help')}
          </span>
          <span>
            <strong>{t('place_menu')}</strong> {t('place_menu_help')}
          </span>
          <span>
            <strong>{t('place_hidden')}</strong> {t('place_hidden_help')}
          </span>
        </div>

        <ol className="HeaderNavEditor-list" oncreate={(vnode) => this.sortable(vnode.dom)}>
          {this.rows.map((row) => this.rowView(row))}
        </ol>

        <div className="HeaderNavEditor-add">
          <Button className="Button" icon="fas fa-plus" onclick={() => this.addCustom()}>
            {t('add_link')}
          </Button>
          <Button
            className="Button"
            icon="fas fa-th-large"
            disabled={!this.canAddMenu()}
            onclick={() => this.addOwnMenu(starter('', '', this.offered))}
          >
            {t('mega_add')}
          </Button>
          <label className={'Button' + (this.canAddMenu() ? '' : ' disabled')}>
            <Icon name="fas fa-file-import" className="Button-icon" />
            <span className="Button-label">{t('mega_import')}</span>
            <input
              type="file"
              accept="application/json,.json"
              hidden
              disabled={!this.canAddMenu()}
              onchange={(e) => {
                this.importMenu(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </label>
          {this.megaFailed ? <p className="HeaderNavEditor-note is-error">{t('mega_load_failed')}</p> : null}
        </div>

        <div className="Form-group HeaderNavEditor-direct">
          <label for="HeaderNavEditor-direct">{t('direct_label')}</label>
          <p className="helpText">{t('direct_help')}</p>
          <input
            id="HeaderNavEditor-direct"
            className="FormControl"
            type="number"
            min="1"
            max="12"
            value={this.direct}
            oninput={(e) => {
              this.direct = e.target.value;
              this.dirty = true;
            }}
          />
        </div>

        <div className="Form-group HeaderNavEditor-direct">
          <label for="HeaderNavEditor-logo">{t('logo_label')}</label>
          <p className="helpText">{t('logo_help')}</p>
          <input
            id="HeaderNavEditor-logo"
            className="FormControl"
            type="number"
            min="20"
            max="120"
            placeholder={t('logo_placeholder')}
            value={this.logo}
            oninput={(e) => {
              this.logo = e.target.value;
              this.dirty = true;
            }}
          />
        </div>

        {actions}
      </div>
    );
  }

  rowView(row) {
    if (row.mega) return this.megaRowView(row);

    const missing = !row.custom && !row.offered;
    const menu = this.megaFor(row.key);
    // Offered on header links (a mega menu shows only from the header), and
    // always on a row that already has one.
    const canMega = !!this.mega && (!!menu || (row.place === 'header' && ((row.offered && row.offered.link) || (row.custom && safeHref(row.href)))));
    const icon = safeIcon(row.icon) || (row.offered && row.offered.icon) || (row.custom ? 'fas fa-link' : '');
    const update = (patch) => {
      Object.assign(row, patch);
      this.dirty = true;
    };

    return (
      <li key={row.key} data-key={row.key} className={'HeaderNavEditor-row' + (missing ? ' is-missing' : '') + ` is-${row.place}`}>
        <span className="HeaderNavEditor-handle" title={t('drag')} aria-label={t('drag')}>
          <Icon name="fas fa-grip-vertical" />
        </span>

        <span className="HeaderNavEditor-preview" aria-hidden="true">
          {icon ? <Icon name={icon} /> : null}
        </span>

        <div className="HeaderNavEditor-fields">
          <div className="HeaderNavEditor-line">
            <input
              className="FormControl HeaderNavEditor-label"
              type="text"
              maxlength="60"
              aria-label={t('label')}
              placeholder={row.custom ? t('label') : row.offered ? row.offered.label : row.key}
              value={row.label}
              oninput={(e) => update({ label: e.target.value })}
            />
            <input
              className="FormControl HeaderNavEditor-icon"
              type="text"
              maxlength="80"
              aria-label={t('icon')}
              placeholder={(row.offered && row.offered.icon) || 'fas fa-link'}
              value={row.icon}
              oninput={(e) => update({ icon: e.target.value })}
            />
          </div>

          {row.custom ? (
            <div className="HeaderNavEditor-line">
              <input
                className={'FormControl HeaderNavEditor-href' + (row.href && !safeHref(row.href) ? ' is-invalid' : '')}
                type="text"
                maxlength="500"
                aria-label={t('url')}
                placeholder={t('url_placeholder')}
                value={row.href}
                oninput={(e) => update({ href: e.target.value })}
              />
              <label className="checkbox HeaderNavEditor-newTab">
                <input type="checkbox" checked={!!row.newTab} onchange={(e) => update({ newTab: e.target.checked })} />
                {t('new_tab')}
              </label>
            </div>
          ) : null}

          {missing ? <p className="HeaderNavEditor-note">{t('missing')}</p> : null}
          {menu && row.place !== 'header' ? <p className="HeaderNavEditor-note">{t('mega_needs_header')}</p> : null}
          {row.offered && !row.offered.link ? <p className="HeaderNavEditor-note">{t('not_a_link')}</p> : null}
          {row.custom && row.href && !safeHref(row.href) ? <p className="HeaderNavEditor-note is-error">{t('url_invalid')}</p> : null}
        </div>

        <div className="ButtonGroup HeaderNavEditor-place" role="group" aria-label={t('placement')}>
          {PLACES.filter((p) => !(row.custom && p === 'hidden') && !(p === 'header' && row.offered && !row.offered.link)).map((p) => (
            <Button
              className={'Button Button--small' + (row.place === p ? ' active Button--primary' : '')}
              aria-pressed={row.place === p ? 'true' : 'false'}
              onclick={() => update({ place: p })}
            >
              {t('place_' + p)}
            </Button>
          ))}
        </div>

        {canMega ? (
          <Button
            className={'Button Button--small HeaderNavEditor-mega' + (menu ? ' active' : '')}
            icon="fas fa-th-large"
            disabled={!menu && !this.canAddMenu()}
            title={t(menu ? 'mega_edit' : 'mega_make')}
            onclick={() => this.megaForRow(row)}
          >
            {t(menu ? 'mega_edit' : 'mega_make')}
          </Button>
        ) : null}

        {row.custom ? (
          <Button
            className="Button Button--icon Button--link HeaderNavEditor-remove"
            icon="fas fa-trash-alt"
            aria-label={t('remove')}
            title={t('remove')}
            onclick={() => {
              this.rows = this.rows.filter((r) => r !== row);
              // A menu hung from this link goes with it.
              if (this.mega) this.mega = this.mega.filter((x) => x.attach !== row.key);
              this.dirty = true;
            }}
          />
        ) : null}
      </li>
    );
  }

  /** A mega menu with a header item of its own: named, iconed and opened from its builder. */
  megaRowView(row) {
    const menu = this.megaFor(row.key);
    const title = (menu && menu.title) || extractText(t('mega_untitled'));

    return (
      <li key={row.key} data-key={row.key} className={`HeaderNavEditor-row HeaderNavEditor-row--mega is-${row.place}`}>
        <span className="HeaderNavEditor-handle" title={t('drag')} aria-label={t('drag')}>
          <Icon name="fas fa-grip-vertical" />
        </span>
        <span className="HeaderNavEditor-preview" aria-hidden="true">
          <Icon name={(menu && safeIcon(menu.icon)) || 'fas fa-th-large'} />
        </span>
        <div className="HeaderNavEditor-fields">
          <strong>{title}</strong>
          <p className="HeaderNavEditor-note">
            {t('mega_row_help')}
            {menu && menu.off ? ` ${extractText(t('mega_off'))}` : ''}
          </p>
        </div>
        <div className="ButtonGroup HeaderNavEditor-place" role="group" aria-label={t('placement')}>
          {['header', 'hidden'].map((p) => (
            <Button
              className={'Button Button--small' + (row.place === p ? ' active Button--primary' : '')}
              aria-pressed={row.place === p ? 'true' : 'false'}
              onclick={() => {
                row.place = p;
                this.dirty = true;
              }}
            >
              {t('place_' + p)}
            </Button>
          ))}
        </div>
        <Button className="Button Button--small HeaderNavEditor-mega active" icon="fas fa-pen" disabled={!menu} onclick={() => (this.editing = menu)}>
          {t('mega_edit')}
        </Button>
      </li>
    );
  }

  /**
   * Drag to reorder.
   *
   * 🚨 The DOM move is undone before the rows are reordered.
   *
   * Sortable moves the element itself; Mithril then redraws from `this.rows`
   * and finds the DOM already rearranged under it, which leaves the two
   * disagreeing about which node is which. Putting the node back first lets
   * Mithril make the move from the data, so they never diverge.
   */
  sortable(list) {
    Sortable.create(list, {
      handle: '.HeaderNavEditor-handle',
      animation: 150,
      onEnd: (e) => {
        const { oldIndex, newIndex, item, from } = e;
        if (oldIndex === newIndex) return;

        from.removeChild(item);
        from.insertBefore(item, from.children[oldIndex] || null);

        const [moved] = this.rows.splice(oldIndex, 1);
        this.rows.splice(newIndex, 0, moved);
        this.dirty = true;
        m.redraw();
      },
    });
  }

  addCustom() {
    this.rows.push({ key: newCustomKey(), custom: true, place: 'header', label: '', icon: '', href: '', newTab: false, offered: null });
    this.dirty = true;
  }

  reset() {
    if (!confirm(extractText(t('reset_confirm')))) return;
    this.load(defaults(), false);
    // Starting the navigation over keeps the mega menus: each one with an
    // item of its own gets that item back, at the end.
    (this.mega || [])
      .filter((menu) => menu.attach.startsWith('mega-'))
      .forEach((menu) => this.rows.push({ key: menu.attach, custom: true, mega: true, place: 'header', label: '', icon: '', offered: null }));
    this.dirty = true;
  }

  save() {
    // Say what is wrong before the server does, and where.
    for (const menu of this.mega || []) {
      const wrong = problems(menu);
      if (wrong.length) {
        this.editing = menu;
        app.alerts.show({ type: 'error' }, [t('mega_problems', { title: menu.title || this.attachLabel(menu) }), ' ', wrong.slice(0, 3).join('; ')]);
        return;
      }
    }

    const cfg = prepare({
      direct: this.direct,
      logo: this.logo,
      // A custom link with no name or no usable address has nowhere to go.
      items: this.rows
        // A mega menu's own item goes only while its menu exists.
        .filter((r) => !r.custom || (r.mega ? !this.mega || this.megaFor(r.key) : r.label.trim() && safeHref(r.href)))
        .map(({ offered, ...r }) => ({ ...r, label: r.label.trim(), icon: r.icon.trim() })),
    });

    this.saving = true;

    const body = { 'ernestdefoe-header-nav.config': JSON.stringify(cfg) };
    // Only once loaded: otherwise this save would wipe menus it never saw.
    if (this.mega) body[MEGA_KEY] = this.mega.length ? serialise({ menus: this.mega }) : '';

    const apiUrl = app.forum.attribute('apiUrl');

    return app
      .request({ method: 'POST', url: `${apiUrl}/settings`, body })
      .then(() => {
        // The header and the menu read these attributes, so they update now.
        // The menus come back from the forum as this admin would see them.
        app.forum.pushAttributes({ headerNav: cfg, headerNavMega: null });
        applyLogo();
        this.load(cfg, true);
        app.alerts.show({ type: 'success' }, t('saved'));
        return this.mega && app.request({ method: 'GET', url: apiUrl }).then((payload) => app.store.pushPayload(payload));
      })
      .catch((e) => {
        // A refused mega menu: core has already shown the server's reason.
        if (!e || e.status !== 422) app.alerts.show({ type: 'error' }, t('save_failed'));
      })
      .finally(() => {
        this.saving = false;
        m.redraw();
      });
  }
}
