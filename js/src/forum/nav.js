import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import extractText from 'flarum/common/utils/extractText';
import { isManageable } from './config';

/**
 * While this is true the sidebar is being read, not drawn, so the nav filter
 * leaves it alone — otherwise the editor could never see what it had hidden.
 */
let reading = false;

export function isReading() {
  return reading;
}

/**
 * Every destination the forum's own nav offers, in its own order.
 *
 * 🚨 Read from IndexSidebar.navItems(), not from the page.
 *
 * The first version read `.IndexPage-nav` out of the DOM, which only exists on
 * the discussion list, renders after the header, and is replaced outright by
 * some themes (Bespoke draws its own row). Asking the component for its items
 * works on every page, before anything has rendered, under any theme — and it
 * is the same list every theme builds its pills or tiles from.
 *
 * Separators, the per-tag links and "More tags…" are the sidebar's structure
 * and are never offered. Everything else is: a LINK can go in the header; an
 * entry that is not a link (a button such as "Mark all as read") can only be
 * kept in the menu or hidden, because there is nothing to send a visitor to.
 */
export function readNav() {
  reading = true;

  try {
    const sidebar = Object.create(IndexSidebar.prototype);
    sidebar.attrs = {};

    const list = IndexSidebar.prototype.navItems.call(sidebar);

    return (
      list
        .toArray()
        .filter((v) => v && v.itemName && isManageable(v.itemName) && v.attrs)
        .map((v) => {
          const link = typeof v.attrs.href === 'string';

          return {
            key: v.itemName,
            link,
            href: link ? v.attrs.href : null,
            icon: typeof v.attrs.icon === 'string' ? v.attrs.icon : '',
            label: extractText(v.children) || v.itemName,
          };
        })
        // An entry with no visible name is layout, not a destination.
        .filter((n) => (n.label && n.label !== n.key) || n.link)
    );
  } catch (e) {
    // A nav extension that cannot be called outside its page must not take
    // the header with it.
    return [];
  } finally {
    reading = false;
  }
}
