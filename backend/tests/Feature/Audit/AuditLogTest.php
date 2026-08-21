<?php

namespace Tests\Feature\Audit;

use App\Models\AuditLog;
use App\Models\Product;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    public function test_cashier_cannot_read_audit_log(): void
    {
        $cashier = $this->cashier();

        $this->actingAs($cashier)->getJson('/api/v1/audit-logs')->assertStatus(403);
    }

    public function test_admin_can_read_audit_log(): void
    {
        $admin = $this->admin();
        AuditLog::create([
            'user_id' => $admin->id,
            'action' => AuditLog::ACTION_PRODUCT_CREATED,
            'entity_type' => 'product',
            'entity_id' => 1,
            'created_at' => now(),
        ]);

        $this->actingAs($admin)->getJson('/api/v1/audit-logs')->assertStatus(200);
    }

    public function test_stock_adjustment_by_admin_creates_audit_entry(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create(['current_stock' => 10]);

        $this->actingAs($admin)->postJson("/api/v1/products/{$product->id}/adjust-stock", [
            'quantity' => 10,
            'type' => 'PURCHASE',
            'note' => 'Restock',
        ])->assertStatus(200);

        $this->assertTrue(
            AuditLog::where('entity_type', 'product')->where('entity_id', $product->id)->exists()
        );
    }

    public function test_audit_log_never_contains_password_or_hash(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'Kasir Baru',
            'username' => 'kasirbaru',
            'email' => 'kasirbaru@bengkel.test',
            'password' => 'rahasia123',
            'role' => 'CASHIER',
        ])->assertStatus(201);

        $log = AuditLog::where('action', AuditLog::ACTION_USER_CREATED)->latest('id')->first();
        $this->assertNotNull($log);
        $payload = json_encode([$log->before_data, $log->after_data]);
        $this->assertStringNotContainsString('rahasia123', $payload);
    }
}
