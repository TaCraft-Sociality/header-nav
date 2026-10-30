import Component from 'flarum/common/Component';
import Icon from 'flarum/common/components/Icon';
import classList from 'flarum/common/utils/classList';

/** The menu open right now: one at a time across the header. */
let openMenu = null;

/**
 * 🚨 The panel is its own chunk.
 *
 * Every page carries this file; most never open a menu, and a forum without
 * mega menus never has one to open. The panel's code is fetched in idle time
 * as soon as the header has a menu for this visitor, so it is there before
 * anyone hovers, and nothing is fetched at all where there is none.
 */
let Panel = null;
let loading = null;

export function loadPanel() {
  loading ||= import('./MegaPanel').then((mod) => {
    Panel = mod.default;
    m.redraw();
  });
  return loading;
}

export function prefetchPanel() {
  if (Panel || loading) return;
  (window.requestIdleCallback || setTimeout)(() => loadPanel());
}

/**
 * A header item with a mega menu: the trigger, and the panel while it is open.
 *
 * 🚨 No opening animation, by request: the panel is there or it is not.
 *
 * On a desktop the panel is a card under the header, placed from the trigger
 * when it opens. In the phone drawer, and in the header's "…" menu, there is
 * no room for a card: it opens in place, as an expanding section.
 */
export default class MegaMenu extends Component {
  view() {
    const { menu, label, icon, href } = this.attrs;
    const open = openMenu === this;
    const id = `HeaderMega-${menu.id}`;
    const hover = () => menu.open !== 'click' && !this.inline() && window.matchMedia('(hover: hover)').matches;

    return (
      <div
        className={classList('HeaderMega', open && 'is-open', open && this.inline() && 'HeaderMega--inline')}
        onmouseenter={() => {
          if (!hover()) return;
          clearTimeout(this.timer);
          if (!open) {
            this.open();
            this.byHover = true;
          }
        }}
        onmouseleave={() => {
          // Only a menu the pointer opened closes when it leaves; one that
          // was clicked open stays until it is closed.
          if (!hover() || !this.byHover) return;
          // A moment's grace to cross the gap between the trigger and the card.
          this.timer = setTimeout(() => {
            this.close();
            m.redraw();
          }, 250);
        }}
        onfocusout={(e) => {
          if (open && e.relatedTarget && !this.element.contains(e.relatedTarget)) this.close();
        }}
      >
        <button
          type="button"
          className={classList('HeaderNav-link HeaderMega-trigger', menu.trigger === 'button' && 'HeaderMega-trigger--button')}
          aria-expanded={open ? 'true' : 'false'}
          aria-controls={id}
          aria-label={label}
          title={label}
          onclick={(e) => {
            // In the "…" menu a click would otherwise close that menu too.
            if (this.element.closest('.Dropdown-menu')) e.stopPropagation();
            // Pointing at the trigger already opened it: the click keeps it open.
            if (open && this.byHover) this.byHover = false;
            else open ? this.close() : this.open();
          }}
          onkeydown={(e) => {
            if (e.key !== 'ArrowDown') return;
            e.preventDefault();
            if (!open) this.open();
            this.focusFirst = true;
          }}
        >
          {icon ? <Icon name={icon} className="HeaderNav-icon" /> : null}
          <span className="HeaderNav-label">{label}</span>
          <Icon name="fas fa-chevron-down" className="HeaderMega-caret" />
        </button>

        {open && Panel ? <Panel id={id} menu={menu} label={label} href={href} onclose={(refocus) => this.close(refocus)} /> : null}
      </div>
    );
  }

  oncreate(vnode) {
    super.oncreate(vnode);
    this.place();
  }

  onupdate(vnode) {
    super.onupdate(vnode);
    this.place();
  }

  onremove(vnode) {
    super.onremove(vnode);
    clearTimeout(this.timer);
    this.close();
  }

  /** In the phone drawer or the "…" menu, where the panel opens in place. */
  inline() {
    const el = this.element;
    return !!el && (!!el.closest('.Dropdown-menu') || (window.innerWidth < 768 && !!el.closest('.App-drawer')));
  }

  open() {
    this.byHover = false;
    if (!Panel) loadPanel();
    if (openMenu && openMenu !== this) openMenu.close();
    openMenu = this;

    this.outside ||= (e) => {
      if (!this.element.contains(e.target)) {
        this.close();
        m.redraw();
      }
    };
    this.escape ||= (e) => {
      if (e.key === 'Escape') {
        this.close(true);
        m.redraw();
      }
    };
    this.resize ||= () => this.place();

    document.addEventListener('pointerdown', this.outside);
    document.addEventListener('keydown', this.escape);
    window.addEventListener('resize', this.resize);
  }

  /** Close; with `refocus`, give focus back to the trigger so it is not lost. */
  close(refocus) {
    if (openMenu !== this) return;
    openMenu = null;

    document.removeEventListener('pointerdown', this.outside);
    document.removeEventListener('keydown', this.escape);
    window.removeEventListener('resize', this.resize);

    if (refocus) this.element?.querySelector('.HeaderMega-trigger')?.focus();
  }

  /**
   * Put the open card under the header, centred on its trigger and kept on
   * screen. Measured, then corrected by what the browser actually did: a
   * theme that gives the header a transform or a backdrop filter makes it the
   * box a fixed element is placed in, and the first guess lands offset.
   */
  place() {
    const panel = this.element.querySelector('.HeaderMega-panel');
    if (!panel) return;

    if (this.focusFirst) {
      this.focusFirst = false;
      // The search field when there is one, so typing filters straight away.
      (panel.querySelector('.HeaderMega-search') || panel.querySelector('.HeaderMega-link'))?.focus();
    }

    if (this.inline()) {
      ['top', 'left', 'width', 'maxHeight'].forEach((p) => (panel.style[p] = ''));
      return;
    }

    const header = this.element.closest('#header, .App-header');
    const top = Math.max(0, header ? header.getBoundingClientRect().bottom : this.element.getBoundingClientRect().bottom);
    const width = Math.min(this.attrs.menu.width || 1100, window.innerWidth - 32);
    const trigger = this.element.getBoundingClientRect();
    const left = Math.min(Math.max(16, trigger.left + trigger.width / 2 - width / 2), window.innerWidth - 16 - width);

    Object.assign(panel.style, { top: `${top}px`, left: `${left}px`, width: `${width}px`, maxHeight: `calc(100vh - ${top + 16}px)` });

    const placed = panel.getBoundingClientRect();
    if (Math.abs(placed.top - top) > 1 || Math.abs(placed.left - left) > 1) {
      panel.style.top = `${2 * top - placed.top}px`;
      panel.style.left = `${2 * left - placed.left}px`;
    }
  }
}
