<?php
$c = file_get_contents(__DIR__ . '/../.env');
foreach (['DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'SESSION_DRIVER', 'APP_KEY'] as $k) {
    echo $k . '=' . (preg_match('/^' . $k . '=(.*)$/m', $c, $m) ? trim($m[1]) : '(not set)') . PHP_EOL;
}
