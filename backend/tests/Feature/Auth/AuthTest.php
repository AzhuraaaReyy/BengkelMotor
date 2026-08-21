<?php

namespace Tests\Feature\Auth;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_login_succeeds_with_valid_credentials_and_never_returns_password(): void
    {
        $user = User::factory()->cashier()->create([
            'email' => 'kasir1@bengkel.test',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'kasir1@bengkel.test',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.email', 'kasir1@bengkel.test')
            ->assertJsonPath('data.role', 'CASHIER')
            ->assertJsonMissing(['password']);

        $this->assertArrayNotHasKey('password', $response->json('data'));
        $this->assertTrue(
            AuditLog::where('action', AuditLog::ACTION_LOGIN)->where('entity_id', $user->id)->exists()
        );
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_failed_login_attempts_are_audited_without_storing_password(): void
    {
        $user = User::factory()->cashier()->create(['email' => 'audit-fail@bengkel.test', 'password' => Hash::make('secret123')]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'audit-fail@bengkel.test',
            'password' => 'wrong-password-xyz',
        ])->assertStatus(422);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'unknown-user@bengkel.test',
            'password' => 'whatever',
        ])->assertStatus(422);

        $logs = AuditLog::where('action', AuditLog::ACTION_LOGIN_FAILED)->get();
        $this->assertSame(2, $logs->count());

        $knownUserLog = $logs->firstWhere('entity_id', $user->id);
        $this->assertNotNull($knownUserLog);
        $this->assertSame('Password salah', $knownUserLog->reason);

        $unknownUserLog = $logs->firstWhere('entity_id', null);
        $this->assertNotNull($unknownUserLog);
        $this->assertSame('Email tidak terdaftar', $unknownUserLog->reason);

        foreach ($logs as $log) {
            $payload = json_encode([$log->before_data, $log->after_data, $log->reason]);
            $this->assertStringNotContainsString('wrong-password-xyz', $payload);
            $this->assertStringNotContainsString('secret123', $payload);
        }
    }

    public function test_login_fails_with_generic_message_and_does_not_leak_account_existence(): void
    {
        User::factory()->cashier()->create(['email' => 'kasir2@bengkel.test', 'password' => Hash::make('secret123')]);

        $wrongPassword = $this->postJson('/api/v1/auth/login', [
            'email' => 'kasir2@bengkel.test',
            'password' => 'wrong-password',
        ]);
        $unknownUser = $this->postJson('/api/v1/auth/login', [
            'email' => 'does-not-exist@bengkel.test',
            'password' => 'whatever',
        ]);

        $wrongPassword->assertStatus(422);
        $unknownUser->assertStatus(422);
        $this->assertSame(
            $wrongPassword->json('errors.email.0'),
            $unknownUser->json('errors.email.0')
        );
    }

    public function test_inactive_user_cannot_login(): void
    {
        User::factory()->cashier()->inactive()->create([
            'email' => 'nonaktif@bengkel.test',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'nonaktif@bengkel.test',
            'password' => 'secret123',
        ]);

        $response->assertStatus(422);
    }

    public function test_login_is_rate_limited_after_repeated_failures(): void
    {
        User::factory()->cashier()->create(['email' => 'kasir3@bengkel.test', 'password' => Hash::make('secret123')]);

        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'kasir3@bengkel.test', 'password' => 'wrong'])
                ->assertStatus(422);
        }

        $this->postJson('/api/v1/auth/login', ['email' => 'kasir3@bengkel.test', 'password' => 'wrong'])
            ->assertStatus(429);
    }

    public function test_rate_limit_response_has_friendly_message_and_retry_after_header(): void
    {
        User::factory()->cashier()->create(['email' => 'kasir4@bengkel.test', 'password' => Hash::make('secret123')]);

        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'kasir4@bengkel.test', 'password' => 'wrong']);
        }

        $response = $this->postJson('/api/v1/auth/login', ['email' => 'kasir4@bengkel.test', 'password' => 'wrong']);

        $response->assertStatus(429)
            ->assertJsonPath('message', 'Terlalu banyak permintaan. Mohon tunggu beberapa saat sebelum mencoba lagi.')
            ->assertHeader('Retry-After');
        $this->assertIsInt((int) $response->headers->get('Retry-After'));
    }

    public function test_login_with_remember_sets_remember_token(): void
    {
        $user = User::factory()->cashier()->create([
            'email' => 'kasir-remember@bengkel.test',
            'password' => Hash::make('secret123'),
            'remember_token' => null,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'kasir-remember@bengkel.test',
            'password' => 'secret123',
            'remember' => true,
        ]);

        $response->assertStatus(200);
        $this->assertNotNull($user->fresh()->remember_token);
    }

    public function test_login_without_remember_does_not_set_remember_token(): void
    {
        $user = User::factory()->cashier()->create([
            'email' => 'kasir-session@bengkel.test',
            'password' => Hash::make('secret123'),
            'remember_token' => null,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'kasir-session@bengkel.test',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200);
        $this->assertNull($user->fresh()->remember_token);
    }

    public function test_logout_rotates_remember_token(): void
    {
        $user = User::factory()->cashier()->create([
            'email' => 'kasir-logout-remember@bengkel.test',
            'password' => Hash::make('secret123'),
            'remember_token' => null,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'kasir-logout-remember@bengkel.test',
            'password' => 'secret123',
            'remember' => true,
        ])->assertStatus(200);
        $tokenBefore = $user->fresh()->remember_token;
        $this->assertNotNull($tokenBefore);

        $this->postJson('/api/v1/auth/logout')->assertStatus(200);

        $tokenAfter = $user->fresh()->remember_token;
        $this->assertNotNull($tokenAfter);
        $this->assertNotSame($tokenBefore, $tokenAfter);
    }

    public function test_unauthenticated_request_to_protected_endpoint_returns_401(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
        $this->getJson('/api/v1/sales')->assertStatus(401);
    }

    public function test_me_returns_authenticated_user_without_password(): void
    {
        $admin = $this->admin();

        $response = $this->actingAs($admin)->getJson('/api/v1/auth/me');

        $response->assertStatus(200)->assertJsonPath('data.role', 'ADMIN');
        $this->assertArrayNotHasKey('password', $response->json('data'));
    }

    public function test_logout_invalidates_session_and_is_audited(): void
    {
        $user = $this->cashier();
        $this->actingAs($user);

        $this->postJson('/api/v1/auth/logout')->assertStatus(200);

        $this->assertGuest('web');
        $this->assertTrue(
            AuditLog::where('action', AuditLog::ACTION_LOGOUT)->where('entity_id', $user->id)->exists()
        );
    }
}
