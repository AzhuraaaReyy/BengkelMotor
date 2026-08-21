<?php

function readXsrfToken(string $cookieFile): ?string
{
    if (!file_exists($cookieFile)) {
        return null;
    }
    $lines = file($cookieFile);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $parts = preg_split('/\t/', $line);
        // Netscape cookie format: domain, includeSubdomains, path, secure,
        // expiry, name, value
        if (count($parts) >= 7 && strtolower($parts[5]) === 'xsrf-token') {
            return rawurldecode($parts[6]);
        }
    }
    return null;
}

function apiRequest(string $method, string $url, array $data = [], ?string $cookieFile = null, ?string $xsrfToken = null): array
{
    $ch = curl_init($url);
    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
        'Origin: http://localhost:5173',
        'Referer: http://localhost:5173/',
    ];
    if ($xsrfToken) {
        $headers[] = 'X-XSRF-TOKEN: ' . $xsrfToken;
    }
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CUSTOMREQUEST => $method,
    ];

    if (!empty($data)) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($data);
    }

    if ($cookieFile) {
        $opts[CURLOPT_COOKIEJAR] = $cookieFile;
        $opts[CURLOPT_COOKIEFILE] = $cookieFile;
    }

    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    $parts = explode("\r\n\r\n", $raw, 2);
    $headersRaw = $parts[0] ?? '';
    $body = $parts[1] ?? '';

    return ['code' => $code, 'body' => $body, 'error' => $error, 'headers' => $headersRaw];
}

$base = 'http://127.0.0.1:8000';
$api = "$base/api/v1";
$cookie = sys_get_temp_dir() . '/bengkel_cookie.txt';
$cookie2 = sys_get_temp_dir() . '/bengkel_cookie2.txt';
@unlink($cookie);
@unlink($cookie2);

echo "=== A. CSRF cookie (admin session) ===\n";
$r = apiRequest('GET', "$base/sanctum/csrf-cookie", [], $cookie);
echo "HTTP {$r['code']}\n";
$xsrf = readXsrfToken($cookie);
echo "XSRF token loaded: " . ($xsrf ? 'yes' : 'no') . "\n\n";

echo "=== B. Login Admin ===\n";
$r = apiRequest('POST', "$api/auth/login", ['username' => 'admin', 'password' => 'admin123'], $cookie, $xsrf);
echo "HTTP {$r['code']}: {$r['body']}\n\n";

echo "=== C. GET /auth/me (admin) ===\n";
$r = apiRequest('GET', "$api/auth/me", [], $cookie);
echo "HTTP {$r['code']}: {$r['body']}\n\n";

echo "=== D. GET /dashboard (admin) ===\n";
$r = apiRequest('GET', "$api/dashboard", [], $cookie);
echo "HTTP {$r['code']}: " . substr($r['body'], 0, 1200) . "\n\n";

echo "=== E. GET /products (admin - should include purchase_price) ===\n";
$r = apiRequest('GET', "$api/products?per_page=2", [], $cookie);
echo "HTTP {$r['code']}: " . substr($r['body'], 0, 800) . "\n\n";

echo "=== F. CSRF cookie (cashier session) ===\n";
$r = apiRequest('GET', "$base/sanctum/csrf-cookie", [], $cookie2);
echo "HTTP {$r['code']}\n";
$xsrf2 = readXsrfToken($cookie2);
echo "XSRF token loaded: " . ($xsrf2 ? 'yes' : 'no') . "\n\n";

echo "=== G. Login Cashier ===\n";
$r = apiRequest('POST', "$api/auth/login", ['username' => 'kasir', 'password' => 'kasir123'], $cookie2, $xsrf2);
echo "HTTP {$r['code']}: {$r['body']}\n\n";

echo "=== H. Cashier GET /dashboard (should be 403) ===\n";
$r = apiRequest('GET', "$api/dashboard", [], $cookie2);
echo "HTTP {$r['code']}: {$r['body']}\n\n";

echo "=== I. Cashier GET /products (should NOT include purchase_price) ===\n";
$r = apiRequest('GET', "$api/products?per_page=2", [], $cookie2);
echo "HTTP {$r['code']}: " . substr($r['body'], 0, 800) . "\n\n";

echo "=== J. Cashier create expense (should be 403, with CSRF) ===\n";
$r = apiRequest('POST', "$api/expenses", ['expense_date' => '2025-01-01', 'category' => 'Test', 'amount' => 1000], $cookie2, $xsrf2);
echo "HTTP {$r['code']}: " . substr($r['body'], 0, 400) . "\n\n";

echo "=== K. Cashier GET /expenses (should be 403) ===\n";
$r = apiRequest('GET', "$api/expenses", [], $cookie2);
echo "HTTP {$r['code']}: {$r['body']}\n\n";

echo "=== L. Admin GET /expenses (should be 200) ===\n";
$r = apiRequest('GET', "$api/expenses", [], $cookie);
echo "HTTP {$r['code']}: " . substr($r['body'], 0, 400) . "\n\n";

echo "=== M. Cashier GET /reports/finance (should be 403) ===\n";
$r = apiRequest('GET', "$api/reports/finance", [], $cookie2);
echo "HTTP {$r['code']}: {$r['body']}\n\n";

echo "=== N. Cashier GET /audit-logs (should be 403) ===\n";
$r = apiRequest('GET', "$api/audit-logs", [], $cookie2);
echo "HTTP {$r['code']}: {$r['body']}\n\n";
