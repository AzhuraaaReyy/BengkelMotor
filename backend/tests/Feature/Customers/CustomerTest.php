<?php

namespace Tests\Feature\Customers;

use App\Models\Customer;
use Tests\TestCase;

class CustomerTest extends TestCase
{
    public function test_cashier_can_create_a_customer_with_motorcycle_type(): void
    {
        $cashier = $this->cashier();

        $response = $this->actingAs($cashier)->postJson('/api/v1/customers', [
            'name' => 'Siti Rahayu',
            'phone' => '081234567890',
            'motorcycle_type' => 'Honda Vario 125',
            'notes' => 'Langganan oli',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Siti Rahayu')
            ->assertJsonPath('data.motorcycle_type', 'Honda Vario 125');
        $this->assertDatabaseHas('customers', [
            'name' => 'Siti Rahayu',
            'motorcycle_type' => 'Honda Vario 125',
        ]);
    }

    public function test_customer_motorcycle_type_can_be_updated(): void
    {
        $cashier = $this->cashier();
        $customer = Customer::factory()->create(['motorcycle_type' => 'Honda Beat']);

        $response = $this->actingAs($cashier)->putJson("/api/v1/customers/{$customer->id}", [
            'motorcycle_type' => 'Yamaha NMAX',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.motorcycle_type', 'Yamaha NMAX');
        $this->assertSame('Yamaha NMAX', Customer::find($customer->id)->motorcycle_type);
    }

    public function test_customer_list_includes_motorcycle_type(): void
    {
        Customer::factory()->create([
            'name' => 'Budi Setiawan',
            'phone' => '081377766655',
            'motorcycle_type' => 'Honda PCX 160',
        ]);

        $response = $this->actingAs($this->cashier())->getJson('/api/v1/customers');

        $response->assertStatus(200)
            ->assertJsonPath('data.data.0.name', 'Budi Setiawan')
            ->assertJsonPath('data.data.0.motorcycle_type', 'Honda PCX 160');
    }
}