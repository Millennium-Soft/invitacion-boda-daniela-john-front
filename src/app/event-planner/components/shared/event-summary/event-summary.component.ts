import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { EventSummary } from '../../../models/event-plan.model';
import { EventPlannerService } from '../../../services/event-planner.service';

@Component({
  selector: 'app-event-summary',
  templateUrl: './event-summary.component.html',
  styleUrls: ['./event-summary.component.css']
})
export class EventSummaryComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;

  summary: EventSummary | null = null;
  private sub!: Subscription;

  constructor(private service: EventPlannerService) {}

  ngOnInit(): void {
    this.sub = this.service.summary$.subscribe(s => this.summary = s);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  formatDuration(seconds: number): string {
    return this.service.formatDuration(seconds);
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }
}
