import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, combineLatest } from 'rxjs';
import { EventPlan, EventSummary, MEDIA_TYPE_ICONS } from '../../../models/event-plan.model';
import { EventPlannerService } from '../../../services/event-planner.service';

@Component({
  selector: 'app-event-report',
  templateUrl: './event-report.component.html',
  styleUrls: ['./event-report.component.css']
})
export class EventReportComponent implements OnInit, OnDestroy {
  plan: EventPlan | null = null;
  summary: EventSummary | null = null;
  readonly today = new Date();
  readonly mediaIcons = MEDIA_TYPE_ICONS;

  private subs: Subscription[] = [];

  constructor(private service: EventPlannerService) {}

  ngOnInit(): void {
    this.subs.push(
      combineLatest([this.service.plan$, this.service.summary$]).subscribe(([plan, summary]) => {
        this.plan = plan;
        this.summary = summary;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get activeActivities() {
    return this.plan?.activities.filter(a => a.active).sort((a, b) => a.order - b.order) || [];
  }

  getStats(activityId: string) {
    return this.summary?.activitiesStats?.[activityId] || null;
  }

  formatDuration(seconds: number): string {
    return this.service.formatDuration(seconds);
  }

  getStatusLabel(activityId: string): string {
    const stats = this.getStats(activityId);
    if (!stats) return '';
    switch (stats.status) {
      case 'available': return '🟢 Disponible';
      case 'adjusted': return '🟡 Ajustado';
      case 'exceeded': return '🔴 Excedido';
      default: return '';
    }
  }

  printReport(): void {
    window.print();
  }

  get eventDateFormatted(): string {
    if (!this.plan?.date) return '';
    const d = new Date(this.plan.date + 'T00:00:00');
    return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}
