<?php
/**
 * Plugin Name: TTG Publisher — Enable Yoast REST Writes for Editors
 * Description: Re-registers the three Yoast SEO post-meta keys so that users with the
 *              'edit_posts' capability (WordPress Editors) can write them via the core
 *              WP REST API. Without this, Yoast's default auth_callback only allows
 *              Administrators, which blocks the Google Docs → WordPress publishing
 *              tool from saving Yoast fields on behalf of an Editor account.
 *              Editors can already edit these fields through the Yoast UI; this file
 *              simply opens the REST path for the same capability.
 * Author:      Duncan Anderson (duncan.kg.anderson@gmail.com)
 * Version:     1.0.0
 *
 * Install: drop this file into wp-content/mu-plugins/ (must-use plugins). It activates
 * automatically, doesn't show up in the regular Plugins admin list, and can't be
 * disabled from the UI. To remove it, delete the file.
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('init', function () {
    $keys = [
        '_yoast_wpseo_metadesc',
        '_yoast_wpseo_focuskw',
        '_yoast_wpseo_title',
    ];

    foreach ($keys as $key) {
        // register_post_meta's last-writer-wins behaviour lets us override whatever
        // auth_callback Yoast set up earlier in the boot sequence.
        register_post_meta('post', $key, [
            'show_in_rest'  => true,
            'single'        => true,
            'type'          => 'string',
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
        ]);
    }
}, 20);
