<?php

namespace ErnestDefoe\HeaderNav\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Group\Group;
use Flarum\Post\Post;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;

class MegaMenusTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    private const KEY = 'ernestdefoe-header-nav.mega';

    private const CREW = 5;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-header-nav');

        $this->prepareDatabase([
            User::class => [
                $this->normalUser(),
                ['id' => 3, 'username' => 'crewmate', 'email' => 'crew@machine.local', 'is_email_confirmed' => 1],
            ],
            Group::class => [
                ['id' => self::CREW, 'name_singular' => 'Crew', 'name_plural' => 'Crew', 'is_hidden' => 0],
            ],
            'group_user' => [
                ['user_id' => 3, 'group_id' => self::CREW],
            ],
            Discussion::class => [
                ['id' => 1, 'title' => 'One', 'created_at' => Carbon::now(), 'user_id' => 2, 'first_post_id' => 1, 'comment_count' => 1, 'last_post_number' => 1],
                ['id' => 2, 'title' => 'Two', 'created_at' => Carbon::now(), 'user_id' => 3, 'first_post_id' => 2, 'comment_count' => 1, 'last_post_number' => 1],
            ],
            Post::class => [
                ['id' => 1, 'discussion_id' => 1, 'user_id' => 2, 'type' => 'comment', 'content' => '<t><p>One</p></t>', 'created_at' => Carbon::now(), 'number' => 1],
                ['id' => 2, 'discussion_id' => 2, 'user_id' => 3, 'type' => 'comment', 'content' => '<t><p>Two</p></t>', 'created_at' => Carbon::now(), 'number' => 1],
            ],
        ]);
    }

    private static function link(string $title, array $extra = []): array
    {
        return $extra + ['title' => $title, 'href' => '/p/'.strtolower(str_replace(' ', '-', $title))];
    }

    private static function menu(array $extra = []): array
    {
        return $extra + [
            'id' => 'm1',
            'attach' => 'allDiscussions',
            'title' => 'Explore',
            'style' => 'soft',
            'texture' => 'honeycomb',
            'sections' => [
                ['title' => 'Community', 'color' => '#336699', 'links' => [self::link('Everyone link', ['badge' => 'New', 'badgeColor' => 'rgb(20, 120, 60)'])]],
            ],
        ];
    }

    /** A realistic menu: three categories, a promotion, a greeting and the rest. */
    private static function realisticMenus(int $links = 20): array
    {
        $menus = [];
        foreach (['Explore', 'Community', 'Help'] as $n => $title) {
            $sections = [];
            for ($s = 0; $s < 3; $s++) {
                $sectionLinks = [];
                for ($l = 0; $l < intdiv($links, 3) + ($s < $links % 3 ? 1 : 0); $l++) {
                    $sectionLinks[] = self::link("Link $s $l", ['desc' => 'A short line saying what is behind this link', 'icon' => 'fas fa-star']);
                }
                if ($sectionLinks) {
                    $sections[] = ['title' => "Category $s", 'icon' => 'fas fa-folder', 'color' => '#4d698e', 'links' => $sectionLinks];
                }
            }
            $menus[] = [
                'id' => "m$n",
                'attach' => "mega-m$n",
                'title' => $title,
                'greet' => true,
                'search' => true,
                'texture' => 'grain',
                'promo' => ['title' => 'Join the league', 'text' => 'Pick a team before Friday.', 'button' => 'Join', 'href' => '/t/league'],
                'sections' => $sections,
            ];
        }

        return ['menus' => $menus];
    }

    private function save(array|string $config, int $actor = 1): \Psr\Http\Message\ResponseInterface
    {
        return $this->send($this->request('POST', '/api/settings', [
            'authenticatedAs' => $actor,
            'json' => [self::KEY => is_string($config) ? $config : json_encode($config)],
        ]));
    }

    /** The forum attributes as the given actor (a guest by default) receives them. */
    private function forum(?int $actor = null): array
    {
        $response = $this->send($this->request('GET', '/api', $actor ? ['authenticatedAs' => $actor] : []));
        $this->assertSame(200, $response->getStatusCode());

        return json_decode((string) $response->getBody(), true)['data']['attributes'];
    }

    private function stored(): mixed
    {
        return $this->database()->table('settings')->where('key', self::KEY)->value('value');
    }

    #[Test]
    public function a_forum_without_mega_menus_sends_nothing_extra()
    {
        $this->assertArrayNotHasKey('headerNavMega', $this->forum());
        $this->assertArrayNotHasKey('headerNavMega', $this->forum(1));
    }

    #[Test]
    public function a_valid_menu_is_stored_compact_and_reaches_the_editor()
    {
        $menu = self::menu(['cols' => 4, 'width' => 1100, 'trigger' => 'link', 'unknown' => 'dropped', 'search' => false]);

        $this->assertSame(204, $this->save(['menus' => [$menu]])->getStatusCode());

        $stored = json_decode($this->stored(), true);
        $saved = $stored['menus'][0];
        $this->assertArrayNotHasKey('unknown', $saved, 'Fields outside the allow-list are dropped');
        $this->assertArrayNotHasKey('cols', $saved, 'A value equal to its default is not stored');
        $this->assertArrayNotHasKey('trigger', $saved);
        $this->assertArrayNotHasKey('search', $saved);
        $this->assertSame('honeycomb', $saved['texture']);

        $editor = $this->send($this->request('GET', '/api/header-nav/mega', ['authenticatedAs' => 1]));
        $this->assertSame(200, $editor->getStatusCode());
        $this->assertSame($stored, json_decode((string) $editor->getBody(), true));
    }

    #[Test]
    public function only_an_admin_can_read_or_save_the_configuration()
    {
        $this->assertSame(403, $this->send($this->request('GET', '/api/header-nav/mega', ['authenticatedAs' => 2]))->getStatusCode());
        $this->assertContains($this->send($this->request('GET', '/api/header-nav/mega'))->getStatusCode(), [401, 403]);
        $this->assertSame(403, $this->save(['menus' => [self::menu()]], 2)->getStatusCode());
        $this->assertNull($this->stored());
    }

    public static function invalidConfigs(): array
    {
        $withLink = fn (array $link) => ['menus' => [self::menu(['sections' => [['title' => 'C', 'links' => [$link]]]])]];

        return [
            'colour that closes the declaration' => [['menus' => [self::menu(['dividerColor' => 'red;background:url(//x)'])]]],
            'colour with url()' => [['menus' => [self::menu(['sepColor' => 'url(https://x/y.png)'])]]],
            'colour with a brace' => [['menus' => [self::menu(['sections' => [['title' => 'C', 'color' => '#fff}body{', 'links' => [self::link('A')]]]])]]],
            'colour with a quote' => [$withLink(self::link('A', ['iconColor' => '"red"']))],
            'javascript: link' => [$withLink(['title' => 'X', 'href' => 'javascript:alert(1)'])],
            'javascript: hidden by a tab' => [$withLink(['title' => 'X', 'href' => "java\tscript:alert(1)"])],
            'protocol-relative link' => [$withLink(['title' => 'X', 'href' => '//evil.example'])],
            'backslash link' => [$withLink(['title' => 'X', 'href' => '/\\evil.example'])],
            'data: link' => [$withLink(['title' => 'X', 'href' => 'data:text/html,hi'])],
            'link with a quote' => [$withLink(['title' => 'X', 'href' => '/p/a"onmouseover="x'])],
            'http image' => [['menus' => [self::menu(['promo' => ['title' => 'P', 'image' => 'http://example.com/a.png']])]]],
            'image with brackets' => [['menus' => [self::menu(['promo' => ['title' => 'P', 'image' => 'https://example.com/a).png']])]]],
            'unknown destination' => [$withLink(['title' => 'X', 'dest' => 'route:admin'])],
            'link with two destinations' => [$withLink(['title' => 'X', 'href' => '/a', 'dest' => 'search'])],
            'link with no name' => [$withLink(['href' => '/a'])],
            'title too long' => [$withLink(self::link('A', ['title' => str_repeat('x', 81)]))],
            'bad icon' => [$withLink(self::link('A', ['icon' => 'fas fa-x" onclick="y']))],
            'unknown style' => [['menus' => [self::menu(['style' => 'neon'])]]],
            'width out of range' => [['menus' => [self::menu(['width' => 2000])]]],
            'columns out of range' => [['menus' => [self::menu(['cols' => 7])]]],
            'bad audience' => [['menus' => [self::menu(['aud' => ['admins']])]]],
            'empty group audience' => [['menus' => [self::menu(['aud' => []])]]],
            'too many menus' => [['menus' => array_map(fn ($i) => self::menu(['id' => "m$i"]), range(1, 33))]],
            'too many categories' => [['menus' => [self::menu(['sections' => array_fill(0, 7, ['title' => 'C', 'links' => [self::link('A')]])])]]],
            'too many links' => [['menus' => [self::menu(['sections' => [['title' => 'C', 'links' => array_fill(0, 31, self::link('A'))]]])]]],
            'two menus with one id' => [['menus' => [self::menu(), self::menu()]]],
            'menu with no attachment' => [['menus' => [array_diff_key(self::menu(), ['attach' => 1])]]],
            'not an object' => ['"menus"'],
            'malformed JSON' => ['{"menus": ['],
        ];
    }

    #[Test]
    #[DataProvider('invalidConfigs')]
    public function an_invalid_configuration_is_refused_and_nothing_is_stored(array|string $config)
    {
        $response = $this->save($config);

        $this->assertSame(422, $response->getStatusCode(), (string) $response->getBody());
        $this->assertNull($this->stored());
    }

    #[Test]
    public function control_characters_are_stripped_before_an_address_is_checked()
    {
        $menu = self::menu(['sections' => [['title' => "Com\u{200B}munity", 'links' => [['title' => 'Privacy', 'href' => "/p/\x01privacy"]]]]]);

        $this->assertSame(204, $this->save(['menus' => [$menu]])->getStatusCode());

        $section = json_decode($this->stored(), true)['menus'][0]['sections'][0];
        $this->assertSame('Community', $section['title']);
        $this->assertSame('/p/privacy', $section['links'][0]['href']);
    }

    #[Test]
    public function an_empty_configuration_clears_the_setting()
    {
        $this->save(['menus' => [self::menu()]]);
        $response = $this->save(['menus' => []]);
        $this->assertSame(204, $response->getStatusCode(), (string) $response->getBody());

        $this->assertEmpty($this->stored());
        $this->assertArrayNotHasKey('headerNavMega', $this->forum());
    }

    #[Test]
    public function a_large_configuration_is_stored_deflated_and_still_read()
    {
        $long = str_repeat('A long description of this link. ', 6);
        $menus = [];
        for ($m = 0; $m < 32; $m++) {
            $sections = [];
            for ($s = 0; $s < 4; $s++) {
                $sections[] = ['title' => "Category $s", 'links' => array_map(fn ($l) => self::link("Link $m $s $l", ['desc' => substr($long, 0, 200)]), range(1, 6))];
            }
            $menus[] = ['id' => "m$m", 'attach' => "mega-m$m", 'title' => "Menu $m", 'sections' => $sections];
        }

        $this->assertSame(204, $this->save(['menus' => $menus])->getStatusCode());

        $stored = $this->stored();
        $this->assertStringStartsWith('z:', $stored);
        $this->assertLessThan(65000, strlen($stored), 'Fits a MySQL TEXT column');
        $this->assertCount(32, $this->forum()['headerNavMega']);
    }

    private function audienceConfig(): array
    {
        return ['menus' => [
            self::menu(['sections' => [
                ['title' => 'Open', 'links' => [
                    self::link('Everyone link'),
                    self::link('Guest link', ['aud' => 'guests']),
                    self::link('Member link', ['aud' => 'members']),
                    self::link('Crew link', ['aud' => [self::CREW]]),
                    self::link('Admin link', ['aud' => [1]]),
                ]],
                ['title' => 'Crew category', 'aud' => [self::CREW], 'links' => [self::link('Crew category link')]],
                ['title' => 'Category whose links are all hidden', 'links' => [self::link('Hidden-by-link', ['aud' => [4]])]],
            ], 'promo' => ['title' => 'Crew promo', 'aud' => [self::CREW]]]),
            self::menu(['id' => 'm2', 'title' => 'Crew menu', 'aud' => [self::CREW], 'sections' => [['title' => 'Crew', 'links' => [self::link('Crew menu link')]]]]),
            self::menu(['id' => 'm3', 'title' => 'Switched off', 'off' => true]),
            self::menu(['id' => 'm4', 'title' => 'Guest menu', 'aud' => 'guests']),
        ]];
    }

    public static function readers(): array
    {
        return [
            'guest' => [null, ['Everyone link', 'Guest link'], ['Explore', 'Guest menu']],
            'member' => [2, ['Everyone link', 'Member link'], ['Explore']],
            'group member' => [3, ['Everyone link', 'Member link', 'Crew link', 'Crew category link', 'Crew menu link'], ['Explore', 'Crew menu']],
            'admin' => [1, ['Everyone link', 'Member link', 'Admin link'], ['Explore']],
        ];
    }

    #[Test]
    #[DataProvider('readers')]
    public function each_reader_receives_only_what_they_may_see(?int $actor, array $links, array $menus)
    {
        $this->assertSame(204, $this->save($this->audienceConfig())->getStatusCode());

        $response = $this->send($this->request('GET', '/api', $actor ? ['authenticatedAs' => $actor] : []));
        $body = (string) $response->getBody();
        $mega = json_decode($body, true)['data']['attributes']['headerNavMega'];

        $this->assertSame($menus, array_column($mega, 'title'));

        $explore = $mega[0];
        $seen = array_merge(...array_map(fn ($s) => array_column($s['links'], 'title'), $explore['sections']));
        $this->assertSame(array_values(array_intersect(['Everyone link', 'Guest link', 'Member link', 'Crew link', 'Admin link', 'Crew category link'], $links)), $seen);

        // What is not theirs is not in the response at all, and neither are the rules.
        foreach (['Everyone link', 'Guest link', 'Member link', 'Crew link', 'Admin link', 'Crew category link', 'Crew menu link', 'Guest menu', 'Crew menu'] as $text) {
            if (! in_array($text, $links, true) && ! in_array($text, $menus, true)) {
                $this->assertStringNotContainsString($text, $body);
            }
        }
        $this->assertStringNotContainsString('Switched off', $body);
        $this->assertStringNotContainsString('Hidden-by-link', $body);
        $this->assertStringNotContainsString('whose links are all hidden', $body, 'A category with nothing visible is dropped');
        $this->assertStringNotContainsString('"aud"', $body);
        $this->assertStringNotContainsString('"off"', $body);
        $this->assertSame($actor === 3, str_contains($body, 'Crew promo'));
    }

    #[Test]
    public function the_payload_for_three_realistic_menus_is_small()
    {
        $this->save(self::realisticMenus());

        $mega = json_encode($this->forum()['headerNavMega'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        // Reported by the release check; PHPUnit's isolated processes may not print.
        file_put_contents(sys_get_temp_dir().'/header-nav-mega-payload.txt', sprintf("%d bytes, %d gzipped\n", strlen($mega), strlen(gzencode($mega, 9))));
        $this->assertLessThan(16000, strlen($mega));
    }

    private function countQueries(string $path, ?int $actor): int
    {
        $db = $this->database();
        $db->flushQueryLog();
        $db->enableQueryLog();
        $response = $this->send($this->request('GET', $path, $actor ? ['authenticatedAs' => $actor] : []));
        $count = count($db->getQueryLog());
        $db->disableQueryLog();

        $this->assertSame(200, $response->getStatusCode());

        return $count;
    }

    #[Test]
    public function menus_add_no_queries_to_the_forum_or_the_discussion_list()
    {
        $paths = ['/api', '/api/discussions'];
        $measure = function () use ($paths) {
            $counts = [];
            foreach ([null, 1, 3] as $actor) {
                foreach ($paths as $path) {
                    // Warm once, so a first-request cache fill is not counted.
                    $this->countQueries($path, $actor);
                    $counts[($actor ?? 'guest').' '.$path] = $this->countQueries($path, $actor);
                }
            }

            return $counts;
        };

        $none = $measure();

        $this->save(self::realisticMenus(1));
        $one = $measure();

        $this->save(self::realisticMenus(20));
        $twenty = $measure();

        $this->assertSame($none, $one, 'One link adds no query');
        $this->assertSame($none, $twenty, 'Twenty links add no query');
    }
}
