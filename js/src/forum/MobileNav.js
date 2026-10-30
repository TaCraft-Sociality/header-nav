import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Icon from 'flarum/common/components/Icon';
import Link from 'flarum/common/components/Link';
import MegaMenu from './mega';

const t = (key) => app.translator.trans(`ernestdefoe-header-nav.forum.${key}`);

/**
 * The header links on a phone, as one collapsed section at the bottom of
 * Flarum's drawer.
 *
 * 🚨 The drawer already has the forum's search field and its own account
 * controls; repeating every header link above them buried them under a list
 * that grew with the forum. The section sits after all of those (it is added
 * to HeaderSecondary at the lowest priority), so the drawer opens on the
 * controls people use every day, and the navigation is one tap away.
 */
export default class MobileNav extends Component {
  view() {
    const { items, open, ontoggle, onclose } = this.attrs;

    return (
      <div className="HeaderNav-mobile">
        <button
          type="button"
          className="HeaderNav-link HeaderNav-mobileToggle"
          aria-expanded={open ? 'true' : 'false'}
          aria-controls="ernestdefoe-header-nav-mobile-list"
          onclick={ontoggle}
        >
          <Icon name="fas fa-bars" className="HeaderNav-icon" />
          <span className="HeaderNav-label">{t('mobile_menu')}</span>
          <Icon name={open ? 'fas fa-chevron-up' : 'fas fa-chevron-down'} className="HeaderNav-mobileCaret" />
        </button>

        {open ? (
          <ul id="ernestdefoe-header-nav-mobile-list" className="HeaderNav-mobileList">
            {items.map(({ it, mega, label, icon, href, external }) => (
              <li className="HeaderNav-mobileItem" key={it.key}>
                {mega ? (
                  <MegaMenu menu={mega} label={label} icon={icon} href={href} />
                ) : (
                  <Link
                    href={href}
                    external={external}
                    target={it.custom && it.newTab ? '_blank' : undefined}
                    rel={it.custom && it.newTab ? 'noopener noreferrer' : undefined}
                    className="HeaderNav-link"
                    onclick={onclose}
                  >
                    {icon ? <Icon name={icon} className="HeaderNav-icon" /> : null}
                    <span className="HeaderNav-label">{label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
}
