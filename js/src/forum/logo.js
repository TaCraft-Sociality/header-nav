import { current } from './config';

/**
 * The optional logo height.
 *
 * 🚨 Off unless a forum sets it.
 *
 * The first version capped every logo at 56px from the stylesheet. That was
 * fbsfb's number — its wide mark at the size that left room for nine links —
 * and core's own cap is 30px, so on any other forum it nearly doubled the logo
 * and pushed the header around. A forum that wants it chooses it here; with no
 * height set, nothing below is written and the theme's logo is untouched.
 *
 * On a phone the logo is held to 40px and given the drawer's top row to itself,
 * so a wide mark cannot push the search, preferences and account controls off
 * the edge. (Measured at 390px: the drawer is 270px and the title block took
 * 165px with the controls laid out beside it, clipped.) Both halves are needed:
 * the title is a flex item that shrinks by default, so a 100% width alone is
 * shrunk straight back to make room for the controls.
 *
 * 767.98px, not 767px — Flarum's mobile layout switches at the fraction, and a
 * rule at 767px leaves a band where the drawer is in use and this is not.
 */
export function applyLogo() {
  const height = current().logo;
  let el = document.getElementById('header-nav-logo');

  if (!height) {
    if (el) el.remove();
    return;
  }

  if (!el) {
    el = document.createElement('style');
    el.id = 'header-nav-logo';
    document.head.appendChild(el);
  }

  const phone = Math.min(height, 40);
  const css =
    `.App-header .Header-logo{max-height:${height}px}` +
    `@media (max-width:767.98px){` +
    `.App-drawer .App-header>.container{flex-wrap:wrap}` +
    `.App-drawer .Header-title{flex:0 0 100%;width:100%}` +
    `.App-header .Header-logo{max-height:${phone}px}}`;

  if (el.textContent !== css) el.textContent = css;
}
