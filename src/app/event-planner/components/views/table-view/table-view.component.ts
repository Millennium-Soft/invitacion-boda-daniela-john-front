import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, combineLatest } from 'rxjs';
import { EventActivity, ActivityStats, MediaItem, MEDIA_TYPE_ICONS, MEDIA_TYPE_COLORS } from '../../../models/event-plan.model';
import { EventPlannerService } from '../../../services/event-planner.service';
import { ActivityDialogComponent, ActivityDialogData } from '../../dialogs/activity-dialog/activity-dialog.component';
import { MediaDialogComponent, MediaDialogData } from '../../dialogs/media-dialog/media-dialog.component';
import { MediaPreviewDialogComponent } from '../../dialogs/media-preview-dialog/media-preview-dialog.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.css']
})
export class TableViewComponent implements OnInit, OnDestroy {
  activities: EventActivity[] = [];
  statsMap: { [id: string]: ActivityStats } = {};
  // Use array instead of Set for change detection compatibility
  expandedRowIds: string[] = [];
  searchQuery = '';

  readonly displayedColumns = ['order', 'startTime', 'endTime', 'title', 'duration', 'mediaCount', 'mediaTime', 'remaining', 'status', 'actions'];
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
        this.applyFilter(plan.activities);
      }),
      this.service.searchQuery$.subscribe(q => {
        this.searchQuery = q;
        this.applyFilter(this.service.getCurrentPlan().activities);
      })
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  private applyFilter(activities: EventActivity[]): void {
    if (!this.searchQuery) {
      this.activities = [...activities].sort((a, b) => a.order - b.order);
    } else {
      const q = this.searchQuery.toLowerCase();
      this.activities = activities
        .filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
        .sort((a, b) => a.order - b.order);
    }
  }

  toggleExpand(id: string): void {
    const idx = this.expandedRowIds.indexOf(id);
    if (idx >= 0) {
      this.expandedRowIds = this.expandedRowIds.filter(x => x !== id);
    } else {
      this.expandedRowIds = [...this.expandedRowIds, id];
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedRowIds.includes(id);
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
      cancelButtonText: 'Cancelar', confirmButtonText: 'Sí, eliminar'
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
      text: `Se eliminará "${mediaTitle}" de esta actividad.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar', confirmButtonText: 'Eliminar'
    });
    if (result.isConfirmed) { this.service.deleteMediaItem(activityId, mediaId); }
  }

  formatDuration(seconds: number): string { return this.service.formatDuration(seconds); }
  getMediaIcon(type: string): string { return this.mediaIcons[type] || 'category'; }
  getMediaColor(type: string): string { return this.mediaColors[type] || '#64748b'; }
  trackById(_: number, item: { id: string }): string { return item.id; }
}
