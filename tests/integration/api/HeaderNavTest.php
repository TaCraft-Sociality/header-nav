<?php

namespace ErnestDefoe\HeaderNav\Tests\integration\api;

use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\Test;

class HeaderNavTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    private const KEY = 'ernestdefoe-header-nav.config';

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-header-nav');

        $this->prepareDatabase([
            User::class => [$this->normalUser()],
        ]);
    }

    /** The forum's headerNav attribute, as the given actor (a guest by default) receives it. */
    private function headerNav(?int $actor = null): mixed
    {
        $response = $this->send($this->request('GET', '/api', $actor ? ['authenticatedAs' => $actor] : []));

        $this->assertSame(200, $response->getStatusCode());

        $attributes = json_decode((string) $response->getBody(), true)['data']['attributes'];
        $this->assertArrayHasKey('headerNav', $attributes);

        return $attributes['headerNav'];
    }

    #[Test]
    public function a_forum_that_never_saved_a_navigation_sends_null()
    {
        $this->assertNull($this->headerNav(), 'Null means the starting navigation applies');
    }

    #[Test]
    public function the_saved_navigation_reaches_every_visitor_decoded()
    {
        $config = ['items' => [['key' => 'allDiscussions', 'label' => 'Home', 'hidden' => false]]];
        $this->setting(self::KEY, json_encode($config));

        $this->assertSame($config, $this->headerNav(), 'A guest gets the saved navigation as an object');
        $this->assertSame($config, $this->headerNav(2), 'So does a member');
    }

    #[Test]
    public function malformed_json_is_sent_as_null()
    {
        $this->setting(self::KEY, '{"items": [');

        $this->assertNull($this->headerNav());
    }

    #[Test]
    public function json_that_is_not_an_object_is_sent_as_null()
    {
        $this->setting(self::KEY, '"a string"');

        $this->assertNull($this->headerNav());
    }

    #[Test]
    public function the_editor_page_has_its_forum_route()
    {
        // The editor checks for an admin in the browser; the page itself is
        // the forum's ordinary shell. Rendering that shell compiles every JS
        // bundle, so the route is checked where it is registered.
        $routes = $this->app()->getContainer()->make('flarum.forum.routes');

        $this->assertSame('/header-nav', $routes->getPath('ernestdefoe-header-nav.editor'));
    }
}
