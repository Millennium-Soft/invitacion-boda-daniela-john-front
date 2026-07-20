import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, combineLatest } from 'rxjs';
import { EventActivity, EventPlan, ActivityStats, MEDIA_TYPE_ICONS, MEDIA_TYPE_COLORS } from '../../../models/event-plan.model';
import { EventPlannerService } from '../../../services/event-planner.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-dj-view',
  templateUrl: './dj-view.component.html',
  styleUrls: ['./dj-view.component.css']
})
export class DjViewComponent implements OnInit, OnDestroy {
  activities: EventActivity[] = [];
  statsMap: { [id: string]: ActivityStats } = {};
  plan: EventPlan | null = null;

  readonly mediaIcons = MEDIA_TYPE_ICONS;
  readonly mediaColors = MEDIA_TYPE_COLORS;

  private subs: Subscription[] = [];

  readonly today = new Date();

  constructor(private service: EventPlannerService) {}

  ngOnInit(): void {
    this.subs.push(
      combineLatest([this.service.plan$, this.service.summary$]).subscribe(([plan, summary]) => {
        this.plan = plan;
        this.statsMap = summary.activitiesStats;
        this.activities = plan.activities
          .filter(a => a.active)
          .sort((a, b) => a.order - b.order);
      })
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  formatDuration(seconds: number): string { return this.service.formatDuration(seconds); }

  getMediaIcon(type: string): string { return this.mediaIcons[type] || 'category'; }
  getMediaColor(type: string): string { return this.mediaColors[type] || '#64748b'; }

  getStatusSymbol(id: string): string {
    const stats = this.statsMap[id];
    if (!stats) return '—';
    switch (stats.status) {
      case 'available': return '✔ OK';
      case 'adjusted': return '= Exacto';
      case 'exceeded': return '! Excedido';
      default: return '—';
    }
  }

  getStatusColor(id: string): [number, number, number] {
    const stats = this.statsMap[id];
    if (!stats) return [150, 150, 150];
    switch (stats.status) {
      case 'available': return [46, 125, 50];
      case 'adjusted': return [123, 88, 0];
      case 'exceeded': return [136, 14, 79];
      default: return [150, 150, 150];
    }
  }

  printView(): void { window.print(); }

  trackById(_: number, item: { id: string }): string { return item.id; }

  // ── DJ PDF Export ─────────────────────────────────────────────────────────
  exportDjPdf(): void {
    if (!this.plan) return;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 12;

    const dateStr = this.plan.date
      ? new Date(this.plan.date + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'long' })
      : '';

    // ── Portada / Header ────────────────────────────────────────────────────
    pdf.setFillColor(74, 20, 140); // #4A148C
    pdf.rect(0, 0, pageW, 36, 'F');

    pdf.setFillColor(218, 165, 32); // gold strip
    pdf.rect(0, 36, pageW, 2, 'F');

    pdf.setTextColor(218, 165, 32);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(this.plan.name, pageW / 2, 13, { align: 'center' });

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Guión Musical — Vista DJ', pageW / 2, 22, { align: 'center' });

    pdf.setFontSize(8);
    const metaParts = [this.plan.eventType, dateStr, this.plan.venue].filter(Boolean).join('  •  ');
    pdf.text(metaParts, pageW / 2, 30, { align: 'center' });

    pdf.setTextColor(180, 180, 180);
    pdf.setFontSize(7);
    pdf.text(`Generado el ${new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}`, pageW / 2, 35, { align: 'center' });

    let cursorY = 46;

    // ── For each activity ───────────────────────────────────────────────────
    for (const activity of this.activities) {
      const stats = this.statsMap[activity.id];
      const totalMedia = stats?.totalMediaSeconds || 0;
      const remaining = stats?.remainingSeconds ?? 0;
      const statusMsg = stats?.statusMessage || '';

      // Page break check (section needs at least 45mm)
      if (cursorY > pageH - 55) {
        this.addDjPageFooter(pdf, pageW, pageH, margin, this.plan.name);
        pdf.addPage();
        cursorY = 18;
      }

      // Activity title block
      pdf.setFillColor(106, 27, 154); // #6A1B9A
      pdf.roundedRect(margin, cursorY, pageW - margin * 2, 10, 2, 2, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      const timeRange = activity.startTime && activity.endTime
        ? `${activity.startTime} – ${activity.endTime}`
        : activity.startTime || '';
      pdf.text(`#${activity.order}  ${activity.title}`, margin + 3, cursorY + 7);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(timeRange, pageW - margin - 3, cursorY + 7, { align: 'right' });

      cursorY += 14;

      // Duration row
      pdf.setTextColor(80, 20, 120);
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      const dur = this.formatDuration(activity.durationSeconds);
      const mediaStr = this.formatDuration(totalMedia);
      const remSign = remaining < 0 ? '–' : '+';
      const remStr = `${remSign}${this.formatDuration(Math.abs(remaining))}`;
      const [sR, sG, sB] = this.getStatusColor(activity.id);
      pdf.setTextColor(80, 20, 120);
      pdf.text(`Duración: ${dur}   Multimedia: ${mediaStr}   Libre: `, margin + 2, cursorY);
      pdf.setTextColor(sR, sG, sB);
      pdf.setFont('helvetica', 'bold');
      pdf.text(remStr + '  ' + statusMsg, margin + 2 + 60, cursorY);
      cursorY += 6;

      // Observations
      if (activity.observations) {
        pdf.setTextColor(100, 60, 10);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7.5);
        pdf.text(`Obs.: ${activity.observations}`, margin + 2, cursorY);
        cursorY += 4;
      }

      // Media table
      if (activity.mediaItems.length > 0) {
        const rows = activity.mediaItems.map((m, idx) => [
          String(idx + 1),
          m.type,
          m.title,
          m.description || '—',
          this.formatDuration(m.durationSeconds),
          m.observations || '—',
          m.url || '—'
        ]);

        autoTable(pdf, {
          startY: cursorY,
          head: [['#', 'Tipo', 'Título', 'Artista / Desc.', 'Duración', 'Notas DJ', 'URL / Enlace']],
          body: rows,
          theme: 'grid',
          headStyles: {
            fillColor: [74, 20, 140],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 7.5,
            halign: 'center'
          },
          bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
          alternateRowStyles: { fillColor: [249, 244, 255] },
          columnStyles: {
            0: { cellWidth: 7, halign: 'center' },
            1: { cellWidth: 18, halign: 'center' },
            2: { cellWidth: 38 },
            3: { cellWidth: 30 },
            4: { cellWidth: 16, halign: 'center' },
            5: { cellWidth: 28 },
            6: { cellWidth: 45, fontStyle: 'italic', textColor: [106, 27, 154] }
          },
          margin: { left: margin, right: margin },
          didDrawPage: () => {
            this.addDjPageFooter(pdf, pageW, pageH, margin, this.plan!.name);
          }
        });

        cursorY = (pdf as any).lastAutoTable.finalY + 6;
      } else {
        pdf.setTextColor(160, 160, 160);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(8);
        pdf.text('Sin elementos multimedia registrados para esta actividad.', margin + 4, cursorY + 3);
        cursorY += 8;
      }

      cursorY += 4;
    }

    // Final footer on last page
    this.addDjPageFooter(pdf, pageW, pageH, margin, this.plan.name);

    const filename = `Guion_DJ_${(this.plan.name || 'Evento').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  }

  private addDjPageFooter(pdf: jsPDF, pageW: number, pageH: number, margin: number, planName: string): void {
    const footerY = pageH - 7;
    pdf.setFillColor(74, 20, 140);
    pdf.rect(0, pageH - 10, pageW, 10, 'F');
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(218, 165, 32);
    pdf.text(planName + ' — Guión Musical DJ', margin, footerY);
    pdf.setTextColor(255, 255, 255);
    const pageNum = (pdf as any).internal.getCurrentPageInfo().pageNumber;
    pdf.text(`Pág. ${pageNum}`, pageW - margin, footerY, { align: 'right' });
  }
}
