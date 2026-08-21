<?php
/**Verify security headers are present on API responses.
 * Run: php scripts/header_check.php
 */
$base = 'http://127.0.0.1:8000/api/v1';

$ch = curl_init($base . '/auth/me');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_NOBODY, false);
$response = curl_exec($ch);
$headerStr = substr($response, 0, strpos($response, "\r\n\r\n"));
curl_close($ch);

$expected = [
    'X-Content-Type-Options' => 'nosniff',
    'X-Frame-Options' => 'DENY',
    'Referrer-Policy' => 'strict-origin-when-cross-origin',
    'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
];

echo "=== Security Headers Check ===\n";
foreach ($expected as $name => $value) {
    // Headers are case-insensitive; check presence.
    $found = preg_match('/^' . preg_quote($name, '/') . ': (.*)$/mi', $headerStr, $m);
    if ($found) {
        $status = (stripos($m[1], $value) !== false) ? 'PASS' : "CHECK (got: {$m[1]})";
    } else {
        $status = 'MISSING';
    }
    echo str_pad($name, 28) . " => {$status}\n";
}

echo "\n=== Raw headers ===\n";
echo $headerStr . "\n";
