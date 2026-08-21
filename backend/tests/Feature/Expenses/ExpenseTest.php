<?php

namespace Tests\Feature\Expenses;

use App\Models\Expense;
use Tests\TestCase;

class ExpenseTest extends TestCase
{
    public function test_cashier_cannot_access_expense_endpoints(): void
    {
        $cashier = $this->cashier();
        $expense = Expense::factory()->create();

        $this->actingAs($cashier)->getJson('/api/v1/expenses')->assertStatus(403);
        $this->actingAs($cashier)->postJson('/api/v1/expenses', [
            'expense_date' => now()->toDateString(),
            'category' => 'Operasional',
            'amount' => 10000,
        ])->assertStatus(403);
        $this->actingAs($cashier)->putJson("/api/v1/expenses/{$expense->id}", ['amount' => 5000])->assertStatus(403);
    }

    public function test_admin_can_record_an_expense(): void
    {
        $admin = $this->admin();

        $response = $this->actingAs($admin)->postJson('/api/v1/expenses', [
            'expense_date' => now()->toDateString(),
            'category' => 'Operasional',
            'amount' => 150000,
            'description' => 'Listrik bulan ini',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('expenses', ['category' => 'Operasional', 'amount' => 150000, 'created_by' => $admin->id]);
    }

    public function test_expense_amount_must_be_greater_than_zero(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/api/v1/expenses', [
            'expense_date' => now()->toDateString(),
            'category' => 'Operasional',
            'amount' => 0,
        ])->assertStatus(422);

        $this->actingAs($admin)->postJson('/api/v1/expenses', [
            'expense_date' => now()->toDateString(),
            'category' => 'Operasional',
            'amount' => -5000,
        ])->assertStatus(422);
    }

    public function test_created_by_is_resolved_from_authenticated_admin(): void
    {
        $admin = $this->admin();
        $otherAdmin = $this->admin();

        $response = $this->actingAs($admin)->postJson('/api/v1/expenses', [
            'expense_date' => now()->toDateString(),
            'category' => 'Operasional',
            'amount' => 10000,
            'created_by' => $otherAdmin->id,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('expenses', ['id' => $response->json('data.id'), 'created_by' => $admin->id]);
    }

    public function test_todays_expense_is_included_when_filtering_by_todays_date_range(): void
    {
        // Regression: expense_date is persisted with a time component
        // (Eloquent's 'date' cast still round-trips through a datetime
        // string), so a naive whereBetween([date, date]) string comparison
        // silently excluded same-day rows. Must use DATE(expense_date).
        $admin = $this->admin();
        Expense::factory()->create([
            'expense_date' => now()->toDateString(),
            'amount' => 12345,
            'created_by' => $admin->id,
        ]);

        $today = now()->toDateString();
        $response = $this->actingAs($admin)->getJson("/api/v1/expenses?from={$today}&to={$today}");

        $response->assertStatus(200);
        $this->assertEquals(12345, (float) $response->json('meta.total_amount'));
        $this->assertNotEmpty($response->json('data.data'));
    }
}
