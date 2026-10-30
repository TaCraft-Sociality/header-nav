<?php

namespace ErnestDefoe\HeaderNav;

use Flarum\Foundation\ValidationException;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\User;

/**
 * The mega menus: one setting, validated on the way in, filtered per reader on
 * the way out.
 *
 * 🚨 One setting, not a table.
 *
 * Flarum loads every setting in one query at the start of a request, so a menu
 * stored there costs a visitor no query at all; a table would add one to every
 * page (or a cache read that costs about the same as decoding this). The value
 * column is TEXT, 64 KB on MySQL, so a configuration that does not fit as plain
 * JSON is stored deflated (JSON compresses five to ten times), which is room
 * for all 32 menus with realistic content. Anything larger is refused on save.
 *
 * Stored compact: a value equal to its default is left out, and so is an
 * empty one. The editor fills the defaults back in; the forum's renderer knows
 * them too.
 */
class MegaMenus
{
    public const KEY = 'ernestdefoe-header-nav.mega';

    public const MAX_MENUS = 32;

    /** What the settings column holds on MySQL, with a little room spare. */
    private const MAX_STORED = 65000;

    public const STYLES = ['classic', 'soft', 'rails', 'raised', 'bands', 'underline', 'inset'];

    public const TEXTURES = ['none', 'grain', 'linen', 'dots', 'weave', 'graph', 'brushed', 'contour', 'paper', 'canvas', 'crosshatch', 'herringbone', 'honeycomb', 'waves'];

    /*
     * Each field: [type, ...]. An enum's default is its first value, a bool's
     * is false, an int's is the third entry, text's is empty. A field that is
     * not listed here is dropped.
     */
    private const LINK = [
        'title' => ['text', 80],
        'desc' => ['text', 200],
        'icon' => ['icon'],
        'iconColor' => ['color'],
        'badge' => ['text', 24],
        'badgeColor' => ['color'],
        'href' => ['href'],
        'dest' => ['dest'],
        'newTab' => ['bool'],
        'aud' => ['aud'],
    ];

    private const SECTION = [
        'title' => ['text', 80],
        'icon' => ['icon'],
        'color' => ['color'],
        'stack' => ['bool'],
        'footLabel' => ['text', 40],
        'footHref' => ['href'],
        'aud' => ['aud'],
        'links' => ['list', self::LINK, 30],
    ];

    private const ANNOUNCE = [
        'text' => ['text', 200],
        'href' => ['href'],
    ];

    private const PROMO = [
        'title' => ['text', 80],
        'text' => ['text', 300],
        'button' => ['text', 40],
        'href' => ['href'],
        'image' => ['image'],
        'aud' => ['aud'],
    ];

    private const HELP = [
        'title' => ['text', 80],
        'text' => ['text', 200],
        'label' => ['text', 40],
        'href' => ['href'],
    ];

    private const MENU = [
        'id' => ['id'],
        'attach' => ['key'],
        'off' => ['bool'],
        'title' => ['text', 60],
        'icon' => ['icon'],
        'trigger' => ['enum', ['link', 'button']],
        'open' => ['enum', ['hover', 'click']],
        'aud' => ['aud'],
        'style' => ['enum', self::STYLES],
        'band' => ['enum', ['none', 'solid', 'gradient']],
        'iconStyle' => ['enum', ['plain', 'soft', 'solid']],
        'density' => ['enum', ['comfortable', 'compact']],
        'descSize' => ['enum', ['md', 'sm', 'lg']],
        'width' => ['int', 400, 1600, 1100],
        'cols' => ['int', 1, 6, 4],
        'border' => ['enum', ['line', 'none', 'outline']],
        'shadow' => ['enum', ['soft', 'none', 'strong']],
        'divider' => ['int', 0, 4, 0],
        'dividerColor' => ['color'],
        'sep' => ['int', 0, 4, 0],
        'sepColor' => ['color'],
        'mark' => ['bool'],
        'markSize' => ['int', 40, 240, 120],
        'markOpacity' => ['int', 1, 40, 8],
        'texture' => ['enum', self::TEXTURES],
        'textureStrength' => ['int', 0, 100, 40],
        'hideDesc' => ['bool'],
        'hideLinkIcons' => ['bool'],
        'hideCatIcons' => ['bool'],
        'hideBadges' => ['bool'],
        'search' => ['bool'],
        'greet' => ['bool'],
        'greetGuest' => ['text', 160],
        'announce' => ['obj', self::ANNOUNCE],
        'promo' => ['obj', self::PROMO],
        'help' => ['obj', self::HELP],
        'sections' => ['list', self::SECTION, 6],
    ];

    public function __construct(private SettingsRepositoryInterface $settings)
    {
    }

    /**
     * Check a configuration from the editor and return it as it is stored.
     *
     * @throws ValidationException naming the first field that is not valid
     */
    public static function validate(mixed $input): array
    {
        if (! is_array($input) || ! array_is_list($input['menus'] ?? null)) {
            self::fail('menus');
        }

        if (count($input['menus']) > self::MAX_MENUS) {
            self::fail('menus', 'too_many');
        }

        $menus = [];
        $ids = [];

        foreach ($input['menus'] as $i => $menu) {
            $clean = self::object($menu, self::MENU, "menus.$i");

            if (! isset($clean['id'], $clean['attach']) || isset($ids[$clean['id']])) {
                self::fail("menus.$i.id");
            }

            $ids[$clean['id']] = true;
            $menus[] = $clean;
        }

        return ['menus' => $menus];
    }

    /** The stored form of a validated configuration. */
    public static function encode(array $config): string
    {
        if (! $config['menus']) {
            return '';
        }

        $json = json_encode($config, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if (strlen($json) > self::MAX_STORED) {
            $json = 'z:'.base64_encode(gzdeflate($json, 9));
        }

        if (strlen($json) > self::MAX_STORED) {
            self::fail('menus', 'too_large');
        }

        return $json;
    }

    public static function decode(mixed $stored): array
    {
        if (! is_string($stored) || $stored === '') {
            return ['menus' => []];
        }

        if (str_starts_with($stored, 'z:')) {
            $stored = @gzinflate((string) base64_decode(substr($stored, 2), true));
        }

        $config = is_string($stored) ? json_decode($stored, true) : null;

        return is_array($config) && is_array($config['menus'] ?? null) ? $config : ['menus' => []];
    }

    /** The whole configuration, for the editor. */
    public function all(): array
    {
        return self::decode($this->settings->get(self::KEY));
    }

    public function hasAny(): bool
    {
        return (bool) $this->settings->get(self::KEY);
    }

    /**
     * What this reader may see: switched-off menus, and every menu, category,
     * link and promotion outside their audience, are left out; so are the
     * audience rules themselves. A category left with no links goes too.
     *
     * 🚨 No queries. permissionGroupIds() reads the actor's groups, which
     * Flarum has already loaded to work out their permissions for this page.
     */
    public function forActor(User $actor): ?array
    {
        $config = $this->all();

        if (! $config['menus']) {
            return null;
        }

        $groups = null;
        $sees = function (mixed $aud) use ($actor, &$groups): bool {
            if ($aud === null) {
                return true;
            }
            if ($aud === 'guests' || $aud === 'members') {
                return $actor->isGuest() === ($aud === 'guests');
            }
            $groups ??= array_map('intval', $actor->permissionGroupIds());

            return is_array($aud) && (bool) array_intersect($aud, $groups);
        };

        $out = [];

        foreach ($config['menus'] as $menu) {
            if (! empty($menu['off']) || ! $sees($menu['aud'] ?? null)) {
                continue;
            }

            unset($menu['off'], $menu['aud']);

            if (isset($menu['promo'])) {
                if ($sees($menu['promo']['aud'] ?? null)) {
                    unset($menu['promo']['aud']);
                } else {
                    unset($menu['promo']);
                }
            }

            $sections = [];

            foreach ($menu['sections'] ?? [] as $section) {
                if (! $sees($section['aud'] ?? null)) {
                    continue;
                }

                $links = [];
                foreach ($section['links'] ?? [] as $link) {
                    if ($sees($link['aud'] ?? null)) {
                        unset($link['aud']);
                        $links[] = $link;
                    }
                }

                if (! $links) {
                    continue;
                }

                unset($section['aud']);
                $section['links'] = $links;
                $sections[] = $section;
            }

            $menu['sections'] = $sections;
            $out[] = $menu;
        }

        return $out ?: null;
    }

    private static function object(mixed $value, array $spec, string $path): array
    {
        if (! is_array($value) || ($value && array_is_list($value))) {
            self::fail($path);
        }

        $out = [];

        foreach ($spec as $name => $rule) {
            if (! array_key_exists($name, $value) || $value[$name] === null) {
                continue;
            }

            $clean = self::field($value[$name], $rule, "$path.$name");

            // Defaults and empty values are not stored.
            $default = match ($rule[0]) {
                'enum' => $rule[1][0],
                'bool' => false,
                'int' => $rule[3],
                'list', 'obj' => [],
                default => '',
            };

            if ($clean !== $default && $clean !== null) {
                $out[$name] = $clean;
            }
        }

        if (isset($spec['dest']) && $out && (! isset($out['title']) || (isset($out['href']) === isset($out['dest'])))) {
            // A link needs a name and exactly one place to go.
            self::fail($path);
        }

        return $out;
    }

    private static function field(mixed $value, array $rule, string $path): mixed
    {
        $type = $rule[0];

        if ($type === 'bool') {
            return is_bool($value) ? $value : self::fail($path);
        }

        if ($type === 'int') {
            return is_int($value) && $value >= $rule[1] && $value <= $rule[2] ? $value : self::fail($path);
        }

        if ($type === 'list') {
            if (! is_array($value) || ! array_is_list($value) || count($value) > $rule[2]) {
                self::fail($path);
            }

            $items = [];
            foreach ($value as $i => $item) {
                $clean = self::object($item, $rule[1], "$path.$i");
                // An empty row the editor left behind is not an error.
                if ($clean) {
                    $items[] = $clean;
                }
            }

            return $items;
        }

        if ($type === 'obj') {
            $clean = self::object($value, $rule[1], $path);

            // A block with nothing to say is no block.
            return isset($clean['title']) || isset($clean['text']) ? $clean : [];
        }

        if ($type === 'aud') {
            return self::audience($value, $path);
        }

        if (! is_string($value)) {
            self::fail($path);
        }

        // Control and invisible formatting characters never mean anything here.
        $value = trim((string) preg_replace('/[\p{Cc}\p{Cf}]/u', '', $value));

        if ($value === '') {
            return '';
        }

        $ok = match ($type) {
            'text' => mb_strlen($value) <= $rule[1],
            'enum' => in_array($value, $rule[1], true),
            'id' => (bool) preg_match('/^[a-z0-9]{1,16}$/', $value),
            'key' => (bool) preg_match('/^[A-Za-z0-9_.:-]{1,100}$/', $value),
            'icon' => (bool) preg_match('/^[a-z0-9 -]{1,80}$/i', $value),
            'color' => self::isColor($value),
            'href' => self::isHref($value),
            'image' => strlen($value) <= 500 && preg_match('#^https://[^\s<>"\'`\\\\()]+$#i', $value),
            'dest' => (bool) preg_match('/^(nav:[A-Za-z0-9_.:-]{1,100}|tag:[\p{L}\p{N}_-]{1,100}|search|settings|notifications|login|signup)$/u', $value),
            default => false,
        };

        return $ok ? $value : self::fail($path);
    }

    /**
     * 🚨 A colour is written into a style, so only a colour gets there: hex,
     * rgb()/rgba() made of numbers, or a plain colour name. Nothing that could
     * close the declaration, open a url() or start another rule.
     */
    public static function isColor(string $value): bool
    {
        return strlen($value) <= 40 && (bool) preg_match('/^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([0-9.%\s,\/]+\)|[a-z]{3,30})$/i', $value);
    }

    /**
     * A path on this forum, an http(s) address or mailto — nothing else. A
     * backslash is refused outright: browsers read `/\example.com` as
     * `//example.com`, another site.
     */
    public static function isHref(string $value): bool
    {
        return strlen($value) <= 500
            && ! preg_match('/[\s<>"\'`\\\\]/', $value)
            && (bool) preg_match('#^(/(?!/)|https?://[^/]|mailto:.)#i', $value);
    }

    private static function audience(mixed $value, string $path): mixed
    {
        if ($value === 'all') {
            return null;
        }

        if ($value === 'guests' || $value === 'members') {
            return $value;
        }

        if (is_array($value) && $value && count($value) <= 50 && array_is_list($value)) {
            foreach ($value as $id) {
                if (! is_int($id) || $id < 1) {
                    self::fail($path);
                }
            }

            return array_values(array_unique($value));
        }

        return self::fail($path);
    }

    private static function fail(string $path, string $reason = 'invalid'): never
    {
        throw new ValidationException([self::KEY => resolve('translator')->trans("ernestdefoe-header-nav.api.mega_$reason", ['field' => $path])]);
    }
}
