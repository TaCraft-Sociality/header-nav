<?php

namespace ErnestDefoe\HeaderNav;

use Flarum\Settings\Event\Saving;

/**
 * 🚨 Every way in is checked.
 *
 * The editor saves the mega menus through Flarum's own settings endpoint, as
 * the rest of the navigation is saved, so one Save writes both. That endpoint
 * takes any value from any admin tool, so the check sits on the save itself:
 * a configuration that does not pass is refused with a 422, and one that does
 * is stored in its checked, compact form, never as it arrived.
 */
class ValidateMegaOnSave
{
    public function handle(Saving $event): void
    {
        if (! array_key_exists(MegaMenus::KEY, $event->settings)) {
            return;
        }

        $raw = $event->settings[MegaMenus::KEY];

        if ($raw === null || $raw === '') {
            // Core's settings events take strings only; empty means none.
            $event->settings[MegaMenus::KEY] = '';

            return;
        }

        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;

        $event->settings[MegaMenus::KEY] = MegaMenus::encode(MegaMenus::validate($decoded));
    }
}
