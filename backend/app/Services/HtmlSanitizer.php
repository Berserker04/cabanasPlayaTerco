<?php

namespace App\Services;

use HTMLPurifier;
use HTMLPurifier_Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class HtmlSanitizer
{
    private HTMLPurifier $purifier;

    public function __construct()
    {
        $cachePath = storage_path('framework/cache/htmlpurifier');
        File::ensureDirectoryExists($cachePath);

        $config = HTMLPurifier_Config::createDefault();
        $config->set('Cache.SerializerPath', $cachePath);
        $config->set('Core.Encoding', 'UTF-8');
        $config->set('HTML.Doctype', 'HTML 4.01 Transitional');
        $config->set('HTML.DefinitionID', 'cabanas_blog_content');
        $config->set('HTML.DefinitionRev', 1);
        $config->set('HTML.SafeIframe', true);
        $config->set('URI.SafeIframeRegexp', '%^(https?:)?//(www\.youtube\.com/embed/|player\.vimeo\.com/video/)%');
        $config->set('Attr.AllowedFrameTargets', ['_blank']);
        $config->set('CSS.AllowedProperties', ['text-align']);
        $config->set(
            'HTML.Allowed',
            implode(',', [
                'p[style]',
                'br',
                'strong',
                'b',
                'em',
                'i',
                'u',
                's',
                'a[href|target|rel|title]',
                'ul',
                'ol',
                'li',
                'blockquote',
                'h2[style]',
                'h3[style]',
                'h4[style]',
                'hr',
                'pre',
                'code',
                'img[src|alt|title|width|height]',
                'video[src|controls|poster|width|height|preload]',
                'source[src|type]',
                'iframe[src|width|height|frameborder]',
            ]),
        );

        if ($definition = $config->maybeGetRawHTMLDefinition()) {
            $definition->addElement('video', 'Block', 'Optional: (source)*', 'Common', [
                'src' => 'URI',
                'controls' => 'Bool',
                'poster' => 'URI',
                'width' => 'Length',
                'height' => 'Length',
                'preload' => 'Enum#none,metadata,auto',
            ]);
            $definition->addElement('source', 'Block', 'Empty', 'Common', [
                'src' => 'URI',
                'type' => 'Text',
            ]);
        }

        $this->purifier = new HTMLPurifier($config);
    }

    public function sanitize(?string $html): string
    {
        return trim($this->purifier->purify((string) $html));
    }

    public function plainText(?string $html, int $limit = 240): string
    {
        return Str::limit(trim(preg_replace('/\s+/', ' ', strip_tags((string) $html)) ?: ''), $limit);
    }
}
