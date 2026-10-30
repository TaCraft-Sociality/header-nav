<?php

namespace ErnestDefoe\HeaderNav\Api;

use ErnestDefoe\HeaderNav\MegaMenus;
use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * The whole mega menu configuration, audience rules and all, for the editor.
 * Only an admin gets it; visitors only ever receive their filtered copy with
 * the forum.
 */
class ShowMegaController implements RequestHandlerInterface
{
    public function __construct(private MegaMenus $menus)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        return new JsonResponse($this->menus->all());
    }
}
