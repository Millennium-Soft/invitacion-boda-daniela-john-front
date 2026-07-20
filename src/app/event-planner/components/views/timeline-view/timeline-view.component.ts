import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, combineLatest } from 'rxjs';
import { EventActivity, ActivityStats, MEDIA_TYPE_ICONS, MEDIA_TYPE_COLORS } from '../../../models/event-plan.model';
import { EventPlannerService } from '../../../services/event-planner.service';
import { ActivityDialogComponent, ActivityDialogData } from '../../dialogs/activity-dialog/activity-dialog.component';
import { MediaDialogComponent, MediaDialogData } from '../../dialogs/media-dialog/media-dialog.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-timeline-view',
  templateUrl: './timeline-view.component.html',
  styleUrls: ['./timeline-view.component.css']
})
export class TimelineViewComponent implements OnInit, OnDestroy {
  activities: EventActivity[] = [];
  statsMap: { [id: string]: ActivityStats } = {};

  readonly mediaIcons = MEDIA_TYPE_ICONS;
  readonly mediaColors = MEDIA_TYPE_COLORS;

  private subs: Subscription[] = [];

  constructor(
    private service: EventPlannerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.subs.push(
      combineLatest([this.service.plan$, this.service.summary$]).subscribe(([plan, summary]) => {
        this.statsMap = summary.activitiesStats;
        this.activities = [...plan.activities].sort((a, b) => a.order - b.order);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  editActivity(activity: EventActivity): void {
    this.dialog.open(ActivityDialogComponent, {
      data: { activity, mode: 'edit' } as ActivityDialogData,
      width: '560px'
    });
  }

  addMedia(activity: EventActivity): void {
    this.dialog.open(MediaDialogComponent, {
      data: { activityId: activity.id, activityTitle: activity.title, mode: 'create' } as MediaDialogData,
      width: '540px'
    });
  }

  async deleteActivity(activity: EventActivity): Promise<void> {
    const result = await Swal.fire({
      title: '¿Eliminar actividad?',
      text: `Se eliminará "${activity.title}" y toda su multimedia.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar', confirmButtonText: 'Eliminar'
    });
    if (result.isConfirmed) {
      this.service.deleteActivity(activity.id);
      this.snackBar.open('Actividad eliminada', 'Cerrar', { duration: 3000 });
    }
  }

  getStats(id: string): ActivityStats | null {
    return this.statsMap[id] || null;
  }

  formatDuration(seconds: number): string {
    return this.service.formatDuration(seconds);
  }

  getMediaIcon(type: string): string {
    return this.mediaIcons[type] || 'category';
  }

  getMediaColor(type: string): string {
    return this.mediaColors[type] || '#64748b';
  }

  getProgressPercent(activity: EventActivity): number {
    if (!activity.durationSeconds) return 0;
    const stats = this.statsMap[activity.id];
    if (!stats) return 0;
    return Math.min(100, Math.round((stats.totalMediaSeconds / activity.durationSeconds) * 100));
  }

  getProgressColor(activity: EventActivity): string {
    const stats = this.statsMap[activity.id];
    if (!stats) return '#6A1B9A';
    switch (stats.status) {
      case 'available': return '#4CAF50';
      case 'adjusted': return '#DAA520';
      case 'exceeded': return '#E91E63';
      default: return '#6A1B9A';
    }
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
