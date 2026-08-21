<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{ $title }}</title>
<style>
    body { font-family: sans-serif; font-size: 11px; color: #111827; }
    h1 { font-size: 16px; margin-bottom: 2px; }
    p.period { color: #6b7280; margin-top: 0; margin-bottom: 12px; }
    h2 { font-size: 13px; margin-top: 18px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th, td { border: 1px solid #d1d5db; padding: 4px 6px; text-align: left; }
    th { background: #f3f4f6; }
</style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <p class="period">Periode: {{ $from }} s/d {{ $to }}</p>

    @foreach ($sections as $section)
        <h2>{{ $section['heading'] }}</h2>
        <table>
            <thead>
                <tr>
                    @foreach ($section['columns'] as $col)
                        <th>{{ $col }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @forelse ($section['rows'] as $row)
                    <tr>
                        @foreach ($row as $cell)
                            <td>{{ $cell }}</td>
                        @endforeach
                    </tr>
                @empty
                    <tr>
                        <td colspan="{{ count($section['columns']) }}">Tidak ada data.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    @endforeach
</body>
</html>
