import app from 'flarum/admin/app';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';

const t = (key) => app.translator.trans(`ernestdefoe-header-nav.admin.${key}`);

/**
 * The editor lives on the forum, where the forum's navigation actually exists;
 * the admin panel loads none of the forum's JavaScript and cannot see it. This
 * page says so and takes you there.
 *
 * 🚨 A page of its own, not a registered setting.
 *
 * Any registered setting makes core draw "Save Changes" and "Reset Settings"
 * under it — two buttons here that would save and reset nothing.
 */
class HeaderNavPage extends ExtensionPage {
  content() {
    return (
      <div className="ExtensionPage-settings">
        <div className="container">
          <div className="Form-group HeaderNavAdmin">
            <p className="helpText">{t('intro')}</p>
            <a className="Button Button--primary" href={`${app.forum.attribute('baseUrl')}/header-nav`} target="_blank" rel="noopener">
              {t('open_editor')}
            </a>
          </div>
        </div>
      </div>
    );
  }
}

app.initializers.add('ernestdefoe-header-nav', () => {
  app.registry.for('ernestdefoe-header-nav').registerPage(HeaderNavPage);
});
