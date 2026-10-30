import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import OverflowingList from 'flarum/common/components/OverflowingList';
import Link from 'flarum/common/components/Link';
import Icon from 'flarum/common/components/Icon';
import LinkButton from 'flarum/common/components/LinkButton';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import { readNav, isReading } from './forum/nav';
import { current, safeHref, megaMenus } from './forum/config';
import MegaMenu, { prefetchPanel } from './forum/mega';
import MobileNav from './forum/MobileNav';
import { applyLogo } from './forum/logo';

let mobileNavOpen = false;

/**
 * The links this visitor gets in the header, as the pieces the header row and
 * the phone section both draw.
 */
function headerItems() {
  const cfg = current();
  const offered = new Map(readNav().map((n) => [n.key, n]));

  const megas = new Map();
  megaMenus().forEach((menu) => megas.has(menu.attach) || megas.set(menu.attach, menu));
  if (megas.size) prefetchPanel();

  return cfg.items
    .filter((it) => it.place === 'header')
    .map((it) => {
      const mega = megas.get(it.key);

      if (it.mega) {
        if (!mega) return null;
        return { it, mega, label: it.label || mega.title, icon: it.icon || mega.icon || 'fas fa-th-large', href: null };
      }

      if (it.custom) {
        const href = safeHref(it.href);
        if (!href || !it.label) return null;
        return { it, mega, label: it.label, icon: it.icon || 'fas fa-link', href, external: !href.startsWith('/') };
      }

      const n = offered.get(it.key);
      if (!n || !n.link) return null;
      return { it, mega, label: it.label || n.label, icon: it.icon || n.icon, href: n.href, external: !n.href.startsWith('/') };
    })
    .filter(Boolean);
}

app.initializers.add('ernestdefoe-header-nav', () => {
  override(OverflowingList.prototype, 'recalculate', function (original) {
    const count = (this.attrs.items || []).length;

    if (this.element?.closest('#header-primary') && this.visibleCount !== null && this.itemWidths.length !== count) {
      this.visibleCount = null;
      this.itemWidths = [];
      m.redraw();
      return;
    }

    return original();
  });

  override(OverflowingList.prototype, 'availableWidth', function (original, list) {
    const free = original(list);

    const DIRECT = current().direct;

    if (!list.closest('#header-primary') || (list.closest('.App-drawer') && window.innerWidth < 768) || this.itemWidths.length <= DIRECT) return free;

    const direct = this.itemWidths.slice(0, DIRECT).reduce((sum, width) => sum + width, 0);

    return Math.min(free, Math.ceil(direct + (this.toggleWidth || 48)) + 1);
  });

  extend('flarum/forum/components/HeaderPrimary', 'items', function (items) {
    applyLogo();

    // On a phone the header row lives in Flarum's drawer. Its links are not
    // rows at the top there: they are one folded section at the bottom, added
    // to HeaderSecondary below, under the search field and the native account
    // controls.
    if (window.innerWidth < 768) return;

    headerItems().forEach(({ it, mega, label, icon, href, external }, i) => {
      if (mega) {
        items.add(`ernestdefoe-header-nav-${it.key}`, m(MegaMenu, { menu: mega, label, icon, href }), 100 - i);
      } else {
        items.add(
          `ernestdefoe-header-nav-${it.key}`,
          m(
            Link,
            {
              href,
              external,
              target: it.custom && it.newTab ? '_blank' : undefined,
              rel: it.custom && it.newTab ? 'noopener noreferrer' : undefined,
              className: 'HeaderNav-link',
              title: label,
              'aria-label': label,
            },
            [icon ? m(Icon, { name: icon, className: 'HeaderNav-icon' }) : null, m('span', { className: 'HeaderNav-label' }, label)]
          ),
          100 - i
        );
      }
    });
  });

  /*
   * 🚨 The phone menu goes in HeaderSecondary, not HeaderPrimary.
   *
   * The drawer is laid out as the logo, then HeaderPrimary's links, then
   * HeaderSecondary's search and account controls. Adding the section to
   * HeaderPrimary put it above the search field and pushed everything Flarum
   * itself puts in the drawer below it. HeaderSecondary is the last block in
   * the drawer, so an item at the lowest priority sits under all of it.
   */
  extend('flarum/forum/components/HeaderSecondary', 'items', function (items) {
    if (window.innerWidth >= 768) return;

    const links = headerItems();
    if (!links.length) return;

    items.add(
      'ernestdefoe-header-nav-mobile',
      m(MobileNav, {
        items: links,
        open: mobileNavOpen,
        ontoggle: () => {
          mobileNavOpen = !mobileNavOpen;
          m.redraw();
        },
        onclose: () => {
          mobileNavOpen = false;
          m.redraw();
        },
      }),
      -1000
    );
  });

  app.routes['ernestdefoe-header-nav.editor'] = { path: '/header-nav', component: () => import('./forum/components/HeaderNavEditor') };
});

app.initializers.add(
  'ernestdefoe-header-nav-menu',
  () => {
    extend(IndexSidebar.prototype, 'navItems', function (items) {
      if (isReading()) return;

      const cfg = current();

      cfg.items.forEach((it, i) => {
        const priority = 1000 - i;

        if (it.custom) {
          const href = safeHref(it.href);
          if (it.place !== 'menu' || !href || !it.label) return;

          items.add(
            it.key,
            m(
              LinkButton,
              {
                href,
                icon: it.icon || 'fas fa-link',
                external: !href.startsWith('/'),
                target: it.newTab ? '_blank' : undefined,
                rel: it.newTab ? 'noopener noreferrer' : undefined,
              },
              it.label
            ),
            priority
          );
          return;
        }

        if (!items.has(it.key)) return;

        if (it.place !== 'menu') {
          items.remove(it.key);
          return;
        }

        const v = items.get(it.key);
        if ((it.label || it.icon) && v && v.tag && v.attrs) {
          items.setContent(it.key, m(v.tag, { ...v.attrs, icon: it.icon || v.attrs.icon }, it.label || v.children));
        }
        items.setPriority(it.key, priority);
      });
    });
  },
  -1000
);
