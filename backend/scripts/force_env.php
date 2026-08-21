<?php
// Force-set MySQL DB + session config in .env (handles missing/duplicate lines and CRLF).

$path = __DIR__ . '/../.env';
$content = file_get_contents($path);
$content = str_replace(["\r\n", "\r"], "\n", $content); // normalize newlines

$pairs = [
    'DB_CONNECTION' => 'mysql',
    'DB_HOST'       => '127.0.0.1',
    'DB_PORT'       => '3306',
    'DB_DATABASE'   => 'bengkel_motor',
    'DB_USERNAME'   => 'root',
    'DB_PASSWORD'   => '',
    'SESSION_DRIVER' => 'database',
    'SESSION_LIFETIME' => '120',
];

$lines = explode("\n", $content);
$out = [];
foreach ($lines as $line) {
    $matched = false;
    foreach ($pairs as $key => $val) {
        if (preg_match('/^' . $key . '=/', $line)) {
            $out[] = $key . '=' . $val;
            $matched = true;
            unset($pairs[$key]); // remove so it won't be appended twice
            break;
        }
    }
    if (!$matched) {
        $out[] = $line;
    }
}

// Append any keys not present in the file
foreach ($pairs as $key => $val) {
    $out[] = $key . '=' . $val;
}

file_put_contents($path, implode("\n", $out) . "\n");
echo "Done.\n";
