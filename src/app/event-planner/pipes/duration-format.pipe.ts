import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'durationFormat' })
export class DurationFormatPipe implements PipeTransform {

  // Transforms seconds to readable clock or verbose format
  transform(totalSeconds: number, format: 'clock' | 'verbose' = 'clock'): string {
    if (totalSeconds == null || isNaN(totalSeconds)) return '0:00';
    const absSeconds = Math.abs(Math.round(totalSeconds));
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = absSeconds % 60;
    const sign = totalSeconds < 0 ? '-' : '';

    if (format === 'verbose') {
      const parts: string[] = [];
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      if (s > 0 || parts.length === 0) parts.push(`${s}s`);
      return sign + parts.join(' ');
    }

    if (h > 0) {
      return `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${sign}${m}:${String(s).padStart(2, '0')}`;
  }
}
