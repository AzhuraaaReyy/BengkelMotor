<?php

namespace Tests\Feature\Users;

use App\Models\User;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    public function test_cashier_cannot_manage_users(): void
    {
        $cashier = $this->cashier();
        $other = User::factory()->cashier()->create();

        $this->actingAs($cashier)->getJson('/api/v1/users')->assertStatus(403);
        $this->actingAs($cashier)->postJson('/api/v1/users', [
            'name' => 'X', 'username' => 'x', 'password' => 'password123', 'role' => 'CASHIER',
        ])->assertStatus(403);
        $this->actingAs($cashier)->putJson("/api/v1/users/{$other->id}", ['role' => 'ADMIN'])->assertStatus(403);
    }

    public function test_cashier_cannot_elevate_own_role_via_manipulated_request(): void
    {
        $cashier = $this->cashier();

        // Role management endpoint itself is Admin-only, so a Cashier can never
        // reach it regardless of payload — this is the actual enforcement point.
        $response = $this->actingAs($cashier)->putJson("/api/v1/users/{$cashier->id}", ['role' => 'ADMIN']);

        $response->assertStatus(403);
        $this->assertSame('CASHIER', $cashier->fresh()->role);
    }

    public function test_admin_can_create_a_cashier_account(): void
    {
        $admin = $this->admin();

        $response = $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'Kasir Dua',
            'username' => 'kasirdua',
            'email' => 'kasirdua@bengkel.test',
            'password' => 'password123',
            'role' => 'CASHIER',
        ]);

        $response->assertStatus(201);
        $this->assertArrayNotHasKey('password', $response->json('data'));
        $this->assertDatabaseHas('users', ['username' => 'kasirdua', 'role' => 'CASHIER']);
    }

    public function test_email_is_required_to_create_a_user(): void
    {
        $admin = $this->admin();

        $response = $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'Tanpa Email',
            'username' => 'tanpaemail',
            'password' => 'password123',
            'role' => 'CASHIER',
        ]);

        $response->assertStatus(422);
    }

    public function test_role_must_be_admin_or_cashier(): void
    {
        $admin = $this->admin();

        $response = $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'Invalid',
            'username' => 'invalidrole',
            'email' => 'invalidrole@bengkel.test',
            'password' => 'password123',
            'role' => 'MECHANIC',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_can_deactivate_a_cashier_account(): void
    {
        $admin = $this->admin();
        $cashier = User::factory()->cashier()->create();

        $response = $this->actingAs($admin)->putJson("/api/v1/users/{$cashier->id}", ['is_active' => false]);

        $response->assertStatus(200);
        $this->assertFalse($cashier->fresh()->is_active);
    }

    public function test_deactivated_user_cannot_login_after_being_deactivated(): void
    {
        $admin = $this->admin();
        $cashier = User::factory()->cashier()->create(['password' => \Illuminate\Support\Facades\Hash::make('secret123')]);

        $this->actingAs($admin)->putJson("/api/v1/users/{$cashier->id}", ['is_active' => false])->assertStatus(200);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $cashier->email,
            'password' => 'secret123',
        ]);

        $login->assertStatus(422);
    }
}
