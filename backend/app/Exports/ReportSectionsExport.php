<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * Renders a report as stacked labeled sections in a single sheet:
 * heading row, column-header row, data rows, blank separator, repeat.
 * $sections: array<{heading: string, columns: string[], rows: array[]}>
 */
class ReportSectionsExport implements FromArray, WithTitle
{
    public function __construct(private array $sections, private string $title) {}

    public function array(): array
    {
        $rows = [];

        foreach ($this->sections as $section) {
            $rows[] = [$section['heading']];
            $rows[] = $section['columns'];

            if (empty($section['rows'])) {
                $rows[] = ['Tidak ada data.'];
            } else {
                foreach ($section['rows'] as $row) {
                    $rows[] = $row;
                }
            }

            $rows[] = [];
        }

        return $rows;
    }

    public function title(): string
    {
        return $this->title;
    }
}
