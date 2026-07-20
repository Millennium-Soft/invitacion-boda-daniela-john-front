import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MediaItem, MEDIA_TYPES, MediaType } from '../../../models/event-plan.model';
import { EventPlannerService } from '../../../services/event-planner.service';
import { MediaPreviewDialogComponent } from '../media-preview-dialog/media-preview-dialog.component';

export interface MediaDialogData {
  activityId: string;
  activityTitle: string;
  item?: MediaItem;
  mode: 'create' | 'edit';
}

function urlValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value;
  if (!val) return null;
  try { new URL(val); return null; } catch { return { invalidUrl: true }; }
}

function durationValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = control.value;
  if (!val) return { required: true };
  const parts = val.split(':').map(p => parseInt(p, 10));
  const valid = parts.every(p => !isNaN(p) && p >= 0) && (parts.length === 2 || parts.length === 3);
  if (!valid) return { invalidDuration: true };
  const totalSec = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (totalSec <= 0) return { zeroDuration: true };
  return null;
}

@Component({
  selector: 'app-media-dialog',
  templateUrl: './media-dialog.component.html',
  styleUrls: ['./media-dialog.component.css']
})
export class MediaDialogComponent implements OnInit {
  form!: FormGroup;
  mode: 'create' | 'edit';
  item?: MediaItem;
  readonly mediaTypes = MEDIA_TYPES;

  constructor(
    private fb: FormBuilder,
    private service: EventPlannerService,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<MediaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MediaDialogData
  ) {
    this.mode = data.mode;
    this.item = data.item;
  }

  ngOnInit(): void {
    const i = this.item;
    const durationStr = i ? this.service.formatDuration(i.durationSeconds) : '';
    this.form = this.fb.group({
      type: [i?.type || MediaType.MUSIC, Validators.required],
      title: [i?.title || '', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: [i?.description || '', Validators.maxLength(300)],
      url: [i?.url || '', urlValidator],
      duration: [durationStr, durationValidator],
      observations: [i?.observations || '', Validators.maxLength(300)]
    });
  }

  // Returns a human-readable label for each media type
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'Música': '🎵 Música',
      'Video': '🎬 Video',
      'Audio': '🔊 Audio',
      'Presentación': '📊 Presentación',
      'Otro': '📎 Otro'
    };
    return labels[type] || type;
  }

  // URL detection helpers
  isYouTube(url: string): boolean {
    return !!url && (url.includes('youtube.com') || url.includes('youtu.be'));
  }

  isGoogleDrive(url: string): boolean {
    return !!url && url.includes('drive.google.com');
  }

  // Build embeddable URL for preview
  getEmbedUrl(url: string): string | null {
    if (!url) return null;

    // YouTube
    const ytMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;

    // Google Drive (file/d/{id}/view → /preview)
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;

    return null;
  }

  openPreview(): void {
    const url = this.form.get('url')?.value;
    if (!url || this.form.get('url')?.invalid) return;

    const embedUrl = this.getEmbedUrl(url);
    const title = this.form.get('title')?.value || 'Vista Previa';

    this.dialog.open(MediaPreviewDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      data: { url, embedUrl, title }
    });
  }

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    const durationSeconds = this.service.parseDurationInput(v.duration);
    const payload: Partial<MediaItem> = {
      type: v.type, title: v.title, description: v.description,
      url: v.url, durationSeconds, observations: v.observations
    };
    if (this.mode === 'create') {
      this.dialogRef.close(this.service.addMediaItem(this.data.activityId, payload));
    } else if (this.item) {
      this.service.updateMediaItem(this.data.activityId, this.item.id, payload);
      this.dialogRef.close(true);
    }
  }

  onCancel(): void { this.dialogRef.close(false); }
}
