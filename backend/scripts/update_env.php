<?php

// One-off helper to set MySQL DB config in .env
// Usage: php scripts/update_env.php

$path = __DIR__ . '/../.env';
if (!file_exists($path)) {
    fwrite(STDERR, ".env not found\n");
    exit(1);
}

$content = file_get_contents($path);

$replacements = [
    'DB_CONNECTION=sqlite' => 'DB_CONNECTION=mysql',
    'DB_HOST=127.0.0.1' => 'DB_HOST=127.0.0.1',
    'DB_PORT=3306' => 'DB_PORT=3306',
    'DB_DATABASE=laravel' => 'DB_DATABASE=bengkel_motor',
    'DB_USERNAME=root' => 'DB_USERNAME=root',
    'DB_PASSWORD=' => 'DB_PASSWORD=',
];

foreach ($replacements as $search => $replace) {
    if (str_contains($content, $search)) {
        $content = str_replace($search, $replace, $content);
    }
}

// Ensure SESSION_DRIVER is database (for Sanctum SPA)
if (str_contains($content, 'SESSION_DRIVER=')) {
    $content = preg_replace('/^SESSION_DRIVER=.*$/m', 'SESSION_DRIVER=database', $content);
}

file_put_contents($path, $content);
echo "Updated .env to MySQL (bengkel_motor)\n";
