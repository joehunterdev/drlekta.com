<?php
/**
 * Mixing & Mastering enquiry handler.
 *
 * Standalone — no Composer. PHPMailer is vendored in ./lib/PHPMailer.
 * Protections: POST only, origin check, honeypot, time-trap,
 * per-IP + global throttling, header-injection safe fields, length limits.
 *
 * Responds with JSON for fetch() requests, otherwise redirects back
 * to the form page with ?enquiry=sent|error.
 */
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

require __DIR__ . '/lib/PHPMailer/Exception.php';
require __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require __DIR__ . '/lib/PHPMailer/SMTP.php';

$config = is_file(__DIR__ . '/config.php')
    ? require __DIR__ . '/config.php'
    : require __DIR__ . '/config.sample.php';

const SERVICES = ['Mixing', 'Mastering', 'Mixing & Mastering', 'Not sure yet'];
const FALLBACK_PAGE = '/services/mixing-mastering/';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

/* ── helpers ─────────────────────────────────────────────── */

function wants_json(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    return stripos($accept, 'application/json') !== false
        || ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';
}

function request_host(string $url): string
{
    return strtolower((string) parse_url($url, PHP_URL_HOST));
}

function back_url(array $config, string $status): string
{
    $ref  = $_SERVER['HTTP_REFERER'] ?? '';
    $path = FALLBACK_PAGE;
    if ($ref && in_array(request_host($ref), $config['allowed_hosts'], true)) {
        $p = (string) parse_url($ref, PHP_URL_PATH);
        if ($p !== '' && $p[0] === '/') $path = $p;
    }
    return $path . '?enquiry=' . $status . '#enquire';
}

/** Send the response and stop. */
function respond(array $config, int $code, bool $ok, string $message, array $errors = []): void
{
    if (wants_json()) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message, 'errors' => (object) $errors]);
    } else {
        header('Location: ' . back_url($config, $ok ? 'sent' : 'error'), true, 303);
    }
    exit;
}

/** Single-line field: trimmed, CR/LF and control chars removed, length capped. */
function clean_line(string $key, int $max): string
{
    $v = (string) ($_POST[$key] ?? '');
    $v = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v) ?? '';
    return mb_substr(trim($v), 0, $max);
}

/** Multi-line field: keeps newlines, strips other control chars. */
function clean_text(string $key, int $max): string
{
    $v = (string) ($_POST[$key] ?? '');
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    $v = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]+/u', '', $v) ?? '';
    return mb_substr(trim($v), 0, $max);
}

function client_ip(array $config): string
{
    $h = $config['ip_header'] ?? null;
    if ($h && !empty($_SERVER[$h])) {
        $ip = trim(explode(',', (string) $_SERVER[$h])[0]);
        if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
    }
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

/**
 * File-based throttle. Returns null if allowed (and records the hit),
 * or a user-facing message if the limit has been reached.
 */
function throttle(array $config, string $ip): ?string
{
    $dir = rtrim($config['storage_dir'], '/\\');
    if (!is_dir($dir) && !@mkdir($dir, 0750, true)) {
        error_log('[contact] storage dir not writable: ' . $dir);
        return null; // fail open rather than block real enquiries
    }

    $r      = $config['rate'];
    $now    = time();
    $ipKey  = hash('sha256', $config['secret'] . '|' . $ip);
    $result = null;

    $check = function (string $file, int $window, int $max, int $minGap) use ($now): bool {
        $fh = @fopen($file, 'c+');
        if (!$fh) return true;
        flock($fh, LOCK_EX);
        $hits = json_decode((string) stream_get_contents($fh), true);
        $hits = array_values(array_filter(is_array($hits) ? $hits : [], fn($t) => is_int($t) && $t > $now - $window));

        $last = $hits ? max($hits) : 0;
        $blocked = count($hits) >= $max || ($minGap > 0 && $now - $last < $minGap);
        if (!$blocked) $hits[] = $now;

        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($hits));
        flock($fh, LOCK_UN);
        fclose($fh);
        return !$blocked;
    };

    if (!$check("$dir/ip_$ipKey.json", $r['ip_window'], $r['ip_max'], $r['min_interval'])) {
        $result = 'You\'ve sent a few enquiries already — please wait a while before trying again.';
    } elseif (!$check("$dir/global.json", $r['global_window'], $r['global_max'], 0)) {
        $result = 'We\'re receiving a lot of enquiries right now — please try again later.';
    }

    // occasional clean-up of stale IP files
    if (random_int(1, 50) === 1) {
        foreach (glob("$dir/ip_*.json") ?: [] as $f) {
            if (@filemtime($f) < $now - 86400) @unlink($f);
        }
    }

    return $result;
}

/* ── 1. method ───────────────────────────────────────────── */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond($config, 405, false, 'Method not allowed.');
}

/* ── 2. origin check ─────────────────────────────────────── */

$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
if ($origin === '' || !in_array(request_host($origin), $config['allowed_hosts'], true)) {
    respond($config, 403, false, 'This form can only be sent from the website.');
}

/* ── 3. honeypot — silently "succeed" so bots learn nothing ── */

if (trim((string) ($_POST['website'] ?? '')) !== '') {
    respond($config, 200, true, 'Thanks — your enquiry has been sent.');
}

/* ── 4. time-trap (set by JS: seconds since the form was shown) ─ */

$elapsed = filter_var($_POST['_elapsed'] ?? '', FILTER_VALIDATE_INT);
if ($elapsed === false) {
    respond($config, 400, false, 'Please enable JavaScript to send this form.');
}
if ($elapsed < (int) $config['min_fill_seconds']) {
    respond($config, 200, true, 'Thanks — your enquiry has been sent.');
}

/* ── 5. validate ─────────────────────────────────────────── */

$name    = clean_line('name', 80);
$email   = clean_line('email', 254);
$artist  = clean_line('artist', 100);
$service = clean_line('service', 40);
$tracks  = clean_line('tracks', 3);
$genre   = clean_line('genre', 60);
$link    = clean_line('link', 300);
$message = clean_text('message', 3000);

$errors = [];

if (mb_strlen($name) < 2) {
    $errors['name'] = 'Please tell us your name.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Please enter a valid email address.';
}
if (!in_array($service, SERVICES, true)) {
    $errors['service'] = 'Please choose a service.';
}
if ($tracks !== '' && (filter_var($tracks, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100]]) === false)) {
    $errors['tracks'] = 'Number of tracks should be between 1 and 100.';
}
if ($link !== '' && (!filter_var($link, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $link))) {
    $errors['link'] = 'Links should start with http:// or https://';
}
if (mb_strlen($message) < 20) {
    $errors['message'] = 'Tell us a little more about your project (20 characters minimum).';
} elseif (preg_match_all('#https?://#i', $message) > 3) {
    $errors['message'] = 'Too many links in the message — use the link field for your music.';
}

if ($errors) {
    respond($config, 422, false, 'Please check the highlighted fields.', $errors);
}

/* ── 6. throttle ─────────────────────────────────────────── */

if ($limited = throttle($config, client_ip($config))) {
    header('Retry-After: ' . (int) $config['rate']['min_interval']);
    respond($config, 429, false, $limited);
}

/* ── 7. build + send ─────────────────────────────────────── */

$rows = [
    'Name'         => $name,
    'Email'        => $email,
    'Artist / Act' => $artist ?: '—',
    'Service'      => $service,
    'Tracks'       => $tracks ?: '—',
    'Genre'        => $genre ?: '—',
    'Music link'   => $link ?: '—',
];

$text = "New Mixing & Mastering enquiry from drlekta.com\n\n";
foreach ($rows as $k => $v) $text .= str_pad($k . ':', 14) . $v . "\n";
$text .= "\nMessage:\n" . $message . "\n";

$e = fn(string $s) => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$html = '<h2 style="font-family:Arial,sans-serif">New Mixing &amp; Mastering enquiry</h2>'
      . '<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">';
foreach ($rows as $k => $v) {
    $html .= '<tr><td style="color:#666;vertical-align:top"><strong>' . $e($k) . '</strong></td><td>' . $e($v) . '</td></tr>';
}
$html .= '</table><p style="font-family:Arial,sans-serif;font-size:14px"><strong>Message</strong><br>'
       . nl2br($e($message)) . '</p>';

$mail = new PHPMailer(true);
try {
    $mail->CharSet = PHPMailer::CHARSET_UTF8;

    $smtp = $config['smtp'] ?? [];
    if (!empty($smtp['host'])) {
        $mail->isSMTP();
        $mail->Host       = $smtp['host'];
        $mail->Port       = (int) $smtp['port'];
        $mail->SMTPAuth   = $smtp['user'] !== '';
        $mail->Username   = $smtp['user'];
        $mail->Password   = $smtp['pass'];
        $mail->SMTPSecure = $smtp['secure'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Timeout    = 15;
    } else {
        $mail->isMail();
    }

    $mail->setFrom($config['from_email'], $config['from_name']);
    $mail->addAddress($config['to_email'], $config['to_name']);
    $mail->addReplyTo($email, $name);

    $mail->Subject = 'Mixing & Mastering enquiry — ' . $name . ($artist ? " ($artist)" : '');
    $mail->isHTML(true);
    $mail->Body    = $html;
    $mail->AltBody = $text;

    $mail->send();
} catch (MailException $ex) {
    error_log('[contact] send failed: ' . $mail->ErrorInfo);
    respond($config, 500, false, 'Sorry, something went wrong sending your enquiry. Please try again later.');
}

respond($config, 200, true, 'Thanks — your enquiry has been sent. We\'ll be in touch with a quote.');
