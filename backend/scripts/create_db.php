<?php
// Create the bengkel_motor database if it doesn't exist.
// Uses PDO with native auth (mysqlnd in PHP 8.2 supports MySQL 8.4 caching_sha2_password).

$host = '127.0.0.1';
$port = '3306';
$user = 'root';
$pass = '';
$db   = 'bengkel_motor';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "Database '$db' ready.\n";
} catch (PDOException $e) {
    fwrite(STDERR, "DB error: " . $e->getMessage() . "\n");
    exit(1);
}
