<?php

use ErnestDefoe\HeaderNav\Api\ShowMegaController;
use ErnestDefoe\HeaderNav\MegaMenus;
use ErnestDefoe\HeaderNav\ValidateMegaOnSave;
use Flarum\Api\Context;
use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Schema;
use Flarum\Extend;
use Flarum\Settings\Event\Saving;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        // The nav editor (and SortableJS with it) is its own chunk, loaded
        // only on /header-nav; this publishes it.
        ->jsDirectory(__DIR__.'/js/dist/forum')
        ->css(__DIR__.'/less/forum.less')
        ->route('/header-nav', 'ernestdefoe-header-nav.editor'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    new Extend\Locales(__DIR__.'/locale'),

    // The saved navigation, to every visitor: the header and the menu are drawn
    // from it on every page. Null until a forum saves one, and the starting
    // navigation applies.
    (new Extend\Settings())
        ->serializeToForum('headerNav', 'ernestdefoe-header-nav.config', function ($value) {
            if (! is_string($value) || $value === '') {
                return null;
            }

            $decoded = json_decode($value, true);

            return is_array($decoded) ? $decoded : null;
        }),

    // ── Mega menus ──────────────────────────────────────────────────────────
    // Checked and compacted whenever the setting is saved, from anywhere.
    (new Extend\Event())
        ->listen(Saving::class, ValidateMegaOnSave::class),

    // The whole configuration, admins only, for the editor.
    (new Extend\Routes('api'))
        ->get('/header-nav/mega', 'ernestdefoe-header-nav.mega', ShowMegaController::class),

    // Each reader gets only the menus, categories and links meant for them,
    // without the rules that chose them. Absent altogether until a forum
    // makes a mega menu, so the payload is unchanged until then.
    (new Extend\ApiResource(ForumResource::class))
        ->fields(fn () => [
            Schema\Attribute::make('headerNavMega')
                ->visible(fn ($forum, Context $context) => resolve(MegaMenus::class)->hasAny())
                ->get(fn ($forum, Context $context) => resolve(MegaMenus::class)->forActor($context->getActor())),
        ]),
];
