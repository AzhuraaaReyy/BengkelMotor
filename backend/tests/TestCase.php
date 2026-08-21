<?php

namespace Tests;

use App\Models\User;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\Gateways\FakePaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->instance(PaymentGateway::class, new FakePaymentGateway());
    }

    protected function admin(array $attributes = []): User
    {
        return User::factory()->admin()->create($attributes);
    }

    protected function cashier(array $attributes = []): User
    {
        return User::factory()->cashier()->create($attributes);
    }
}
