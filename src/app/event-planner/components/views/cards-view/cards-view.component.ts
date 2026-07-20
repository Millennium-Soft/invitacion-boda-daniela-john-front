import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, combineLatest } from 'rxjs';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { EventActivity, ActivityStats, MediaItem, MEDIA_TYPE_ICONS, MEDIA_TYPE_COLORS } from '../../../models/event-plan.model';
import { EventPlannerService } from '../../../services/event-planner.service';
import { ActivityDialogComponent, ActivityDialogData } from '../../dialogs/activity-dialog/activity-dialog.component';
import { MediaDialogComponent, MediaDialogData } from '../../dialogs/media-dialog/media-dialog.component';
import { MediaPreviewDialogComponent } from '../../dialogs/media-preview-dialog/media-preview-dialog.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cards-view',
  templateUrl: './cards-view.component.html',
  styleUrls: ['./cards-view.component.css']
})
export class CardsViewComponent implements OnInit, OnDestroy {
  activities: EventActivity[] = [];
  statsMap: { [id: string]: ActivityStats } = {};
  // Use array instead of Set for proper Angular change detection
  expandedMediaIds: string[] = [];

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

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  onDrop(event: CdkDragDrop<EventActivity[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const reordered = [...this.activities];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.activities = reordered;
    this.service.reorderActivities(reordered);
    this.snackBar.open('Orden actualizado', 'Cerrar', { duration: 2000 });
  }

  toggleMediaExpand(id: string): void {
    const idx = this.expandedMediaIds.indexOf(id);
    if (idx >= 0) {
      this.expandedMediaIds = this.expandedMediaIds.filter(x => x !== id);
    } else {
      this.expandedMediaIds = [...this.expandedMediaIds, id];
    }
  }

  isMediaExpanded(id: string): boolean {
    return this.expandedMediaIds.includes(id);
  }

  editActivity(activity: EventActivity): void {
    this.dialog.open(ActivityDialogComponent, {
      data: { activity, mode: 'edit' } as ActivityDialogData,
      width: '560px'
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

  duplicateActivity(activity: EventActivity): void {
    this.service.duplicateActivity(activity.id);
    this.snackBar.open('Actividad duplicada', 'Cerrar', { duration: 2000 });
  }

  toggleActivity(activity: EventActivity): void {
    this.service.toggleActivity(activity.id);
  }

  addMedia(activity: EventActivity): void {
    this.dialog.open(MediaDialogComponent, {
      data: { activityId: activity.id, activityTitle: activity.title, mode: 'create' } as MediaDialogData,
      width: '560px'
    });
  }

  editMedia(activity: EventActivity, mediaId: string): void {
    const item = activity.mediaItems.find(m => m.id === mediaId);
    if (!item) return;
    this.dialog.open(MediaDialogComponent, {
      data: { activityId: activity.id, activityTitle: activity.title, item, mode: 'edit' } as MediaDialogData,
      width: '560px'
    });
  }

  previewMedia(item: MediaItem): void {
    const embedUrl = this.buildEmbedUrl(item.url);
    this.dialog.open(MediaPreviewDialogComponent, {
      width: '720px', maxWidth: '95vw',
      data: { url: item.url, embedUrl, title: item.title }
    });
  }

  private buildEmbedUrl(url: string): string | null {
    if (!url) return null;
    const yt = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
    const drive = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
    return null;
  }

  async deleteMedia(activityId: string, mediaId: string, mediaTitle: string): Promise<void> {
    const result = await Swal.fire({
      title: '¿Eliminar elemento?',
      text: `Se eliminará "${mediaTitle}".`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar', confirmButtonText: 'Eliminar'
    });
    if (result.isConfirmed) { this.service.deleteMediaItem(activityId, mediaId); }
  }

  getStats(id: string): ActivityStats | null { return this.statsMap[id] || null; }

  getCardBorderColor(id: string): string {
    const stats = this.statsMap[id];
    if (!stats) return '#E0D9C6';
    switch (stats.status) {
      case 'available': return '#4CAF50';
      case 'adjusted': return '#DAA520';
      case 'exceeded': return '#E91E63';
      default: return '#E0D9C6';
    }
  }

  getProgressPercent(activity: EventActivity): number {
    if (!activity.durationSeconds) return 0;
    const stats = this.statsMap[activity.id];
    return stats ? Math.min(100, Math.round((stats.totalMediaSeconds / activity.durationSeconds) * 100)) : 0;
  }

  formatDuration(seconds: number): string { return this.service.formatDuration(seconds); }
  getMediaIcon(type: string): string { return this.mediaIcons[type] || 'category'; }
  getMediaColor(type: string): string { return this.mediaColors[type] || '#64748b'; }
  trackById(_: number, item: { id: string }): string { return item.id; }
}
