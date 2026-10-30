import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import Icon from 'flarum/common/components/Icon';
import Sortable from 'sortablejs';
import MegaPanel from '../MegaPanel';
import { ENUMS, INTS, LIMITS, valid, fillLink, fillSection } from '../editor/megaModel';

const t = (key, params) => app.translator.trans(`ernestdefoe-header-nav.forum.mega_editor.${key}`, params);

const TABS = ['content', 'look', 'extras', 'behaviour'];

/**
 * One mega menu, edited: its categories and links, its look, its extras, who
 * sees it and how it opens, with a live preview of the desktop card and the
 * phone section above. Changes go into the editor's working copy; the
 * editor's Save writes everything at once.
 *
 * 🚨 Order is drag and drop. The handles are buttons as well, so the arrow
 * keys move a category or a link for anyone not using a mouse (a link moves
 * on into the next or previous category at either end), and touch drags work
 * through SortableJS.
 */
export default class MegaBuilder extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.tab = 'content';
    this.device = 'desktop';
    this.expanded = new Set();
  }

  onupdate(vnode) {
    super.onupdate(vnode);

    // After a keyboard move, the handle that moved keeps the focus.
    if (this.refocus) {
      this.element.querySelector(`[data-hkey="${this.refocus}"]`)?.focus();
      this.refocus = null;
    }
  }

  changed() {
    this.attrs.editor.changed();
  }

  view() {
    const { menu, editor } = this.attrs;

    return (
      <div className="MegaBuilder">
        <div className="MegaBuilder-bar">
          <Button className="Button" icon="fas fa-arrow-left" onclick={() => editor.closeBuilder()}>
            {t('back')}
          </Button>
          <h2>{menu.title || (menu.attach.startsWith('mega-') ? t('untitled') : editor.attachLabel(menu))}</h2>
          <label className="checkbox MegaBuilder-enabled">
            <input
              type="checkbox"
              checked={!menu.off}
              onchange={(e) => {
                menu.off = !e.target.checked;
                this.changed();
              }}
            />
            {t('enabled')}
          </label>
          <Button className="Button" icon="far fa-copy" disabled={!editor.canAddMenu()} onclick={() => editor.duplicateMenu(menu)}>
            {t('duplicate')}
          </Button>
          <Button className="Button" icon="fas fa-file-export" onclick={() => editor.exportMenu(menu)}>
            {t('export')}
          </Button>
          <Button className="Button" icon="fas fa-trash-alt" onclick={() => editor.removeMenu(menu)}>
            {t('delete')}
          </Button>
        </div>

        <section className="MegaBuilder-preview" aria-label={t('preview')}>
          <div className="ButtonGroup MegaBuilder-devices" role="group" aria-label={t('preview')}>
            {['desktop', 'phone'].map((d) => (
              <Button
                className={'Button Button--small' + (this.device === d ? ' active Button--primary' : '')}
                icon={d === 'desktop' ? 'fas fa-desktop' : 'fas fa-mobile-alt'}
                aria-pressed={this.device === d ? 'true' : 'false'}
                onclick={() => (this.device = d)}
              >
                {t(`preview_${d}`)}
              </Button>
            ))}
          </div>
          <div className={'MegaBuilder-stage MegaBuilder-stage--' + this.device + (this.device === 'phone' ? ' HeaderMega-phone' : '')}>
            {this.device === 'phone' ? (
              <div className="MegaBuilder-fakeTrigger" aria-hidden="true">
                {menu.icon ? <Icon name={menu.icon} /> : null}
                <span>{menu.title || editor.attachLabel(menu)}</span>
                <Icon name="fas fa-chevron-up" />
              </div>
            ) : null}
            <MegaPanel id="MegaBuilder-preview" menu={menu} label={menu.title || editor.attachLabel(menu)} preview />
          </div>
        </section>

        <div className="MegaBuilder-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              type="button"
              role="tab"
              id={`MegaBuilder-tab-${tab}`}
              aria-selected={this.tab === tab ? 'true' : 'false'}
              aria-controls="MegaBuilder-pane"
              className={'MegaBuilder-tab' + (this.tab === tab ? ' active' : '')}
              onclick={() => (this.tab = tab)}
            >
              {t(`tab_${tab}`)}
            </button>
          ))}
        </div>

        <div className="MegaBuilder-pane" id="MegaBuilder-pane" role="tabpanel" aria-labelledby={`MegaBuilder-tab-${this.tab}`}>
          {this[this.tab](menu)}
        </div>
      </div>
    );
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  content(menu) {
    return (
      <div>
        <ol className="MegaBuilder-sections" oncreate={(vnode) => this.sortSections(vnode.dom, menu)}>
          {menu.sections.map((section, i) => this.sectionView(menu, section, i))}
        </ol>
        <Button
          className="Button"
          icon="fas fa-plus"
          disabled={menu.sections.length >= LIMITS.sections}
          onclick={() => {
            menu.sections.push(fillSection({ title: '', links: [{}] }));
            this.changed();
          }}
        >
          {t('add_section')}
        </Button>
        <p className="helpText">{t('limits', { sections: LIMITS.sections, links: LIMITS.links })}</p>
      </div>
    );
  }

  look(menu) {
    const opts = (k) => ENUMS[k].map((v) => [v, t(`${k}_${v}`)]);
    const counts = (k) => {
      const [min, max] = INTS[k];
      return Array.from({ length: max - min + 1 }, (_, i) => [min + i, String(min + i)]);
    };

    return (
      <div className="MegaBuilder-grid">
        {this.select(menu, 'style', t('style'), opts('style'))}
        {this.select(menu, 'band', t('band'), opts('band'))}
        {this.select(menu, 'iconStyle', t('icon_style'), opts('iconStyle'))}
        {this.select(menu, 'density', t('density'), opts('density'))}
        {this.select(menu, 'descSize', t('desc_size'), opts('descSize'))}
        {this.select(menu, 'cols', t('cols'), counts('cols'), true)}
        {this.range(menu, 'width', t('width'), 10, 'px')}
        {this.select(menu, 'border', t('border'), opts('border'))}
        {this.select(menu, 'shadow', t('shadow'), opts('shadow'))}
        {this.select(menu, 'divider', t('divider'), counts('divider'), true)}
        {this.color(menu, 'dividerColor', t('divider_color'))}
        {this.select(menu, 'sep', t('sep'), counts('sep'), true)}
        {this.color(menu, 'sepColor', t('sep_color'))}
        {this.select(menu, 'texture', t('texture'), opts('texture'))}
        {this.range(menu, 'textureStrength', t('texture_strength'), 5, '%')}
        {this.check(menu, 'mark', t('mark'))}
        {menu.mark ? this.range(menu, 'markSize', t('mark_size'), 10, 'px') : null}
        {menu.mark ? this.range(menu, 'markOpacity', t('mark_opacity'), 1, '%') : null}
        <fieldset className="MegaBuilder-show">
          <legend>{t('show')}</legend>
          {this.check(menu, 'hideDesc', t('show_desc'), true)}
          {this.check(menu, 'hideLinkIcons', t('show_link_icons'), true)}
          {this.check(menu, 'hideCatIcons', t('show_cat_icons'), true)}
          {this.check(menu, 'hideBadges', t('show_badges'), true)}
        </fieldset>
      </div>
    );
  }

  extras(menu) {
    return (
      <div>
        <fieldset className="MegaBuilder-block">
          <legend>{t('greeting')}</legend>
          {this.check(menu, 'greet', t('greet'))}
          {this.text(menu, 'greetGuest', t('greet_guest'), { max: 160, placeholder: t('greet_guest_placeholder') })}
          {this.check(menu, 'search', t('search'))}
        </fieldset>

        <fieldset className="MegaBuilder-block">
          <legend>{t('announce')}</legend>
          <p className="helpText">{t('announce_help')}</p>
          <div className="MegaBuilder-grid">
            {this.text(menu.announce, 'text', t('announce_text'), { max: 200 })}
            {this.text(menu.announce, 'href', t('address'), { max: 500, check: valid.href, placeholder: t('address_placeholder') })}
          </div>
        </fieldset>

        <fieldset className="MegaBuilder-block">
          <legend>{t('promo')}</legend>
          <div className="MegaBuilder-grid">
            {this.text(menu.promo, 'title', t('promo_title'), { max: 80 })}
            {this.text(menu.promo, 'text', t('promo_text'), { max: 300 })}
            {this.text(menu.promo, 'button', t('promo_button'), { max: 40 })}
            {this.text(menu.promo, 'href', t('address'), { max: 500, check: valid.href, placeholder: t('address_placeholder') })}
            {this.text(menu.promo, 'image', t('promo_image'), { max: 500, check: valid.image, placeholder: 'https://' })}
            {this.audience(menu.promo, t('audience'))}
          </div>
        </fieldset>

        <fieldset className="MegaBuilder-block">
          <legend>{t('help')}</legend>
          <div className="MegaBuilder-grid">
            {this.text(menu.help, 'title', t('help_title'), { max: 80 })}
            {this.text(menu.help, 'text', t('help_text'), { max: 200 })}
            {this.text(menu.help, 'label', t('help_label'), { max: 40 })}
            {this.text(menu.help, 'href', t('address'), { max: 500, check: valid.href, placeholder: t('address_placeholder') })}
          </div>
        </fieldset>
      </div>
    );
  }

  behaviour(menu) {
    const own = menu.attach.startsWith('mega-');

    return (
      <div className="MegaBuilder-grid">
        {this.text(menu, 'title', t('menu_title'), { max: 60, placeholder: own ? '' : this.attrs.editor.attachLabel(menu) })}
        {this.text(menu, 'icon', t('menu_icon'), { max: 80, check: valid.icon, placeholder: 'fas fa-th-large' })}
        {this.select(
          menu,
          'trigger',
          t('trigger'),
          ENUMS.trigger.map((v) => [v, t(`trigger_${v}`)])
        )}
        {this.select(
          menu,
          'open',
          t('open'),
          ENUMS.open.map((v) => [v, t(`open_${v}`)])
        )}
        {this.audience(menu, t('audience'))}
        <p className="helpText MegaBuilder-attach">{own ? t('attached_own') : t('attached_to', { label: this.attrs.editor.attachLabel(menu) })}</p>
      </div>
    );
  }

  // ── Categories and links ──────────────────────────────────────────────────

  sectionView(menu, section, i) {
    const remove = () => {
      menu.sections.splice(menu.sections.indexOf(section), 1);
      this.changed();
    };

    return (
      <li
        key={section._k}
        className="MegaBuilder-section"
        style={section.color && valid.color(section.color) ? { '--hm-accent': section.color } : {}}
      >
        <div className="MegaBuilder-sectionHead">
          {this.handle('MegaBuilder-sectionHandle', section._k, t('drag_section'), (d) => this.move(menu.sections, section, d))}
          {this.text(section, 'title', t('section_title'), { max: 80, bare: true })}
          {this.text(section, 'icon', t('icon'), { max: 80, check: valid.icon, bare: true, placeholder: 'fas fa-folder' })}
          <Button
            className="Button Button--icon Button--link"
            icon="fas fa-trash-alt"
            aria-label={t('remove_section')}
            title={t('remove_section')}
            onclick={remove}
          />
        </div>

        <div className="MegaBuilder-grid MegaBuilder-sectionOptions">
          {this.color(section, 'color', t('accent'))}
          {i > 0 ? this.check(section, 'stack', t('stack')) : null}
          {this.text(section, 'footLabel', t('foot_label'), { max: 40 })}
          {this.text(section, 'footHref', t('foot_href'), { max: 500, check: valid.href, placeholder: t('address_placeholder') })}
          {this.audience(section, t('audience'))}
        </div>

        <ul
          className="MegaBuilder-links"
          data-sec={i}
          oncreate={(vnode) => this.sortLinks(vnode, menu)}
          onremove={(vnode) => vnode.state.sortable?.destroy()}
        >
          {section.links.map((link) => this.linkView(menu, section, link))}
        </ul>

        <Button
          className="Button Button--small"
          icon="fas fa-plus"
          disabled={section.links.length >= LIMITS.links}
          onclick={() => {
            const link = fillLink({});
            section.links.push(link);
            this.expanded.add(link._k);
            this.changed();
          }}
        >
          {t('add_link')}
        </Button>
      </li>
    );
  }

  linkView(menu, section, link) {
    const open = this.expanded.has(link._k);
    const options = this.attrs.editor.destinations();
    const known = !link.dest || options.some(([, group]) => group.some(([v]) => v === link.dest));
    const bad = (link.title || link.href || link.dest) && !(link.title && (link.href || link.dest));

    return (
      <li key={link._k} className={'MegaBuilder-link' + (bad ? ' is-invalid' : '')}>
        <div className="MegaBuilder-linkLine">
          {this.handle('MegaBuilder-linkHandle', link._k, t('drag_link'), (d) => this.moveLink(menu, section, link, d))}
          <span className="MegaBuilder-linkIcon" aria-hidden="true">
            {link.icon && valid.icon(link.icon) ? <Icon name={link.icon} /> : null}
          </span>
          {this.text(link, 'title', t('link_title'), { max: 80, bare: true })}
          <select
            className="FormControl MegaBuilder-dest"
            aria-label={t('dest')}
            value={link.dest}
            onchange={(e) => {
              link.dest = e.target.value;
              if (link.dest) link.href = '';
              // A built-in destination names itself until it is renamed.
              const picked = options.flatMap(([, g]) => g).find(([v]) => v === link.dest);
              if (picked && !link.title) link.title = picked[1];
              this.changed();
            }}
          >
            <option value="">{t('dest_address')}</option>
            {options.map(([label, group]) => (
              <optgroup label={label}>
                {group.map(([value, name]) => (
                  <option value={value}>{name}</option>
                ))}
              </optgroup>
            ))}
            {known ? null : <option value={link.dest}>{t('dest_missing', { dest: link.dest })}</option>}
          </select>
          {link.dest
            ? null
            : this.text(link, 'href', t('address'), { max: 500, check: valid.href, bare: true, placeholder: t('address_placeholder') })}
          <Button
            className="Button Button--icon Button--link"
            icon={open ? 'fas fa-chevron-up' : 'fas fa-sliders-h'}
            aria-expanded={open ? 'true' : 'false'}
            aria-label={t('link_options')}
            title={t('link_options')}
            onclick={() => (open ? this.expanded.delete(link._k) : this.expanded.add(link._k))}
          />
          <Button
            className="Button Button--icon Button--link"
            icon="fas fa-times"
            aria-label={t('remove_link')}
            title={t('remove_link')}
            onclick={() => {
              section.links.splice(section.links.indexOf(link), 1);
              this.changed();
            }}
          />
        </div>

        {bad ? <p className="MegaBuilder-error">{t('problem_link')}</p> : null}

        {open ? (
          <div className="MegaBuilder-grid MegaBuilder-linkMore">
            {this.text(link, 'desc', t('link_desc'), { max: 200 })}
            {this.text(link, 'icon', t('icon'), { max: 80, check: valid.icon, placeholder: 'fas fa-link' })}
            {this.color(link, 'iconColor', t('icon_color'))}
            {this.text(link, 'badge', t('badge'), { max: 24 })}
            {this.color(link, 'badgeColor', t('badge_color'))}
            {this.check(link, 'newTab', t('new_tab'))}
            {this.audience(link, t('audience'))}
            {menu.sections.length > 1 ? (
              <label className="MegaBuilder-field">
                <span>{t('move_to')}</span>
                <select
                  className="FormControl"
                  value={menu.sections.indexOf(section)}
                  onchange={(e) => {
                    const target = menu.sections[e.target.value];
                    if (target.links.length >= LIMITS.links) return;
                    section.links.splice(section.links.indexOf(link), 1);
                    target.links.push(link);
                    this.changed();
                  }}
                >
                  {menu.sections.map((s, i) => (
                    <option value={i}>{s.title || `${t('section')} ${i + 1}`}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
      </li>
    );
  }

  /** A drag handle that is also a button the arrow keys move. */
  handle(className, key, label, move) {
    return (
      <button
        type="button"
        className={`MegaBuilder-handle ${className}`}
        data-hkey={key}
        aria-label={label}
        title={label}
        onkeydown={(e) => {
          const d = { ArrowUp: -1, ArrowDown: 1 }[e.key];
          if (!d) return;
          e.preventDefault();
          if (move(d)) this.refocus = key;
        }}
      >
        <Icon name="fas fa-grip-vertical" />
      </button>
    );
  }

  move(list, item, d) {
    const i = list.indexOf(item);
    const j = i + d;
    if (j < 0 || j >= list.length) return false;
    list.splice(j, 0, list.splice(i, 1)[0]);
    this.changed();
    return true;
  }

  /** Up and down within a category; past either end, into the next one. */
  moveLink(menu, section, link, d) {
    if (this.move(section.links, link, d)) return true;

    const next = menu.sections[menu.sections.indexOf(section) + d];
    if (!next || next.links.length >= LIMITS.links) return false;

    section.links.splice(section.links.indexOf(link), 1);
    d > 0 ? next.links.unshift(link) : next.links.push(link);
    this.changed();
    return true;
  }

  /*
   * 🚨 As in the navigation list, Sortable's DOM move is undone before the
   * data moves, so Mithril makes the move itself and the two never disagree.
   */
  sortSections(list, menu) {
    Sortable.create(list, {
      handle: '.MegaBuilder-sectionHandle',
      animation: 150,
      onEnd: ({ oldIndex, newIndex, item, from }) => {
        if (oldIndex === newIndex) return;
        from.removeChild(item);
        from.insertBefore(item, from.children[oldIndex] || null);
        menu.sections.splice(newIndex, 0, menu.sections.splice(oldIndex, 1)[0]);
        this.changed();
        m.redraw();
      },
    });
  }

  sortLinks(vnode, menu) {
    vnode.state.sortable = Sortable.create(vnode.dom, {
      handle: '.MegaBuilder-linkHandle',
      animation: 150,
      group: { name: 'header-nav-mega-links', put: (to) => to.el.children.length < LIMITS.links },
      onEnd: ({ oldIndex, newIndex, item, from, to }) => {
        if (from === to && oldIndex === newIndex) return;
        to.removeChild(item);
        from.insertBefore(item, from.children[oldIndex] || null);
        const source = menu.sections[from.dataset.sec].links;
        const target = menu.sections[to.dataset.sec].links;
        target.splice(newIndex, 0, source.splice(oldIndex, 1)[0]);
        this.changed();
        m.redraw();
      },
    });
  }

  // ── Fields ────────────────────────────────────────────────────────────────

  set(obj, key, value) {
    obj[key] = value;
    this.changed();
  }

  text(obj, key, label, { max, check, placeholder, bare } = {}) {
    const input = (
      <input
        className={'FormControl' + (check && !check(obj[key]) ? ' is-invalid' : '')}
        type="text"
        maxlength={max}
        aria-label={bare ? label : undefined}
        placeholder={placeholder ?? (bare ? label : '')}
        value={obj[key]}
        oninput={(e) => this.set(obj, key, e.target.value)}
      />
    );

    if (bare) return input;

    return (
      <label className="MegaBuilder-field">
        <span>{label}</span>
        {input}
      </label>
    );
  }

  select(obj, key, label, options, numeric) {
    return (
      <label className="MegaBuilder-field">
        <span>{label}</span>
        <select
          className="FormControl"
          value={obj[key]}
          onchange={(e) => this.set(obj, key, numeric ? parseInt(e.target.value, 10) : e.target.value)}
        >
          {options.map(([value, name]) => (
            <option value={value}>{name}</option>
          ))}
        </select>
      </label>
    );
  }

  range(obj, key, label, step, unit) {
    const [min, max] = INTS[key];
    return (
      <label className="MegaBuilder-field">
        <span>
          {label} <output>{`${obj[key]}${unit}`}</output>
        </span>
        <input type="range" min={min} max={max} step={step} value={obj[key]} oninput={(e) => this.set(obj, key, parseInt(e.target.value, 10))} />
      </label>
    );
  }

  /** A checkbox; `inverted` shows "show X" for a stored "hide X". */
  check(obj, key, label, inverted) {
    return (
      <label className="checkbox MegaBuilder-check">
        <input
          type="checkbox"
          checked={inverted ? !obj[key] : !!obj[key]}
          onchange={(e) => this.set(obj, key, inverted ? !e.target.checked : e.target.checked)}
        />
        {label}
      </label>
    );
  }

  /** Any colour the server accepts as text, with a picker for hex. */
  color(obj, key, label) {
    const v = obj[key];
    return (
      <div className="MegaBuilder-field">
        <span>{label}</span>
        <span className="MegaBuilder-color">
          <input
            type="color"
            aria-label={label}
            value={/^#[0-9a-f]{6}$/i.test(v) ? v : '#4d698e'}
            oninput={(e) => this.set(obj, key, e.target.value)}
          />
          <input
            className={'FormControl' + (valid.color(v) ? '' : ' is-invalid')}
            type="text"
            maxlength="40"
            aria-label={label}
            placeholder={t('color_placeholder')}
            value={v}
            oninput={(e) => this.set(obj, key, e.target.value)}
          />
        </span>
      </div>
    );
  }

  audience(obj, label) {
    const mode = obj.aud === null ? 'all' : Array.isArray(obj.aud) ? 'groups' : obj.aud;
    // Guests and Members have their own choices above.
    const groups = app.store.all('groups').filter((g) => !['2', '3'].includes(g.id()));

    return (
      <div className="MegaBuilder-field MegaBuilder-aud">
        <label>
          <span>{label}</span>
          <select
            className="FormControl"
            value={mode}
            onchange={(e) => {
              const v = e.target.value;
              this.set(obj, 'aud', v === 'all' ? null : v === 'groups' ? [] : v);
            }}
          >
            {['all', 'guests', 'members', 'groups'].map((v) => (
              <option value={v}>{t(`aud_${v}`)}</option>
            ))}
          </select>
        </label>
        {mode === 'groups' ? (
          <div className={'MegaBuilder-groups' + (obj.aud.length ? '' : ' is-invalid')}>
            {groups.map((g) => {
              const id = parseInt(g.id(), 10);
              return (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={obj.aud.includes(id)}
                    onchange={(e) => this.set(obj, 'aud', e.target.checked ? [...obj.aud, id] : obj.aud.filter((x) => x !== id))}
                  />
                  {g.namePlural()}
                </label>
              );
            })}
            {obj.aud.length ? null : <p className="MegaBuilder-error">{t('problem_groups')}</p>}
          </div>
        ) : null}
      </div>
    );
  }
}
