<?php

namespace App\Support;

use Illuminate\Support\Str;

class CodeGenerator
{
    public static function saleCode(): string
    {
        return 'TRX-' . Str::upper(Str::random(8));
    }

    public static function orderCode(): string
    {
        return 'SRV-' . Str::upper(Str::random(8));
    }

    public static function sku(string $name): string
    {
        return 'SKU-' . Str::upper(Str::random(6));
    }

    public static function serviceCode(string $name): string
    {
        return 'JAS-' . Str::upper(Str::random(6));
    }
}
