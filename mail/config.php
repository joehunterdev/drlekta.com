<?php
/**
 * Mail handler config. 2.03
 *
 * Copy this file to config.php (git-ignored) and fill in SMTP details.
 * If config.php is missing, this sample is used and mail is sent with
 * PHP's built-in mail() instead of SMTP.
 */
return [
    // Where enquiries are delivered (never shown on the website)
     'to_email'   => 'staleair1234@gmail.com',
    //'to_email'   => 'joe.hunter.dev@gmail.com',

    'to_name'    => 'Mixing & Mastering',

    // Sender — should be an address on the site's own domain (SPF/DKIM)
    'from_email' => 'no-reply@drlekta.com',
    'from_name'  => 'Dr Lekta Website',

    // Hosts allowed to post the form (Origin / Referer check)
    'allowed_hosts' => ['drlekta.com', 'drlekta.com', 'localhost', '127.0.0.1'],

    // SMTP — leave host empty to fall back to PHP mail()
    'smtp' => [
        'host'   => '',
        'port'   => 587,
        'user'   => '',
        'pass'   => '',
        'secure' => 'tls', // 'tls' (STARTTLS, port 587) or 'ssl' (port 465)
    ],

    // Throttling
    'rate' => [
        'min_interval'  => 60,   // seconds between submissions from one IP
        'ip_window'     => 3600, // seconds
        'ip_max'        => 3,    // max submissions per IP per window
        'global_window' => 3600, // seconds
        'global_max'    => 20,   // max submissions site-wide per window
    ],

    // Bot time-trap: reject forms filled faster than this (seconds)
    'min_fill_seconds' => 4,

    // Where rate-limit data lives (must be writable, must NOT be web-readable)
    'storage_dir' => __DIR__ . '/storage',

    // Set to e.g. 'HTTP_CF_CONNECTING_IP' only if behind Cloudflare / a trusted proxy
    'ip_header' => null,

    // Random string used to hash IP addresses — change it in config.php
    'secret' => 'change-me',
];
