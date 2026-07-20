import { Component, Input } from '@angular/core';
import { ActivityStats, ActivityStatus } from '../../../models/event-plan.model';

@Component({
  selector: 'app-traffic-light',
  templateUrl: './traffic-light.component.html',
  styleUrls: ['./traffic-light.component.css']
})
export class TrafficLightComponent {
  @Input() stats: ActivityStats | null | undefined = null;
  @Input() compact = false;

  readonly ActivityStatus = ActivityStatus;

  get statusEmoji(): string {
    if (!this.stats) return '';
    switch (this.stats.status) {
      case ActivityStatus.AVAILABLE: return '🟢';
      case ActivityStatus.ADJUSTED: return '🟡';
      case ActivityStatus.EXCEEDED: return '🔴';
      default: return '';
    }
  }
}
