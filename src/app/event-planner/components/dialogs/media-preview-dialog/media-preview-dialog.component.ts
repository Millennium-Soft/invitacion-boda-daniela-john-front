import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface MediaPreviewData {
  url: string;
  embedUrl: string | null;
  title: string;
}

@Component({
  selector: 'app-media-preview-dialog',
  templateUrl: './media-preview-dialog.component.html',
  styleUrls: ['./media-preview-dialog.component.css']
})
export class MediaPreviewDialogComponent implements OnInit {
  safeEmbedUrl: SafeResourceUrl | null = null;
  isYouTube = false;
  isDrive = false;
  canEmbed = false;

  constructor(
    private sanitizer: DomSanitizer,
    private dialogRef: MatDialogRef<MediaPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MediaPreviewData
  ) {}

  ngOnInit(): void {
    this.isYouTube = this.data.url.includes('youtube.com') || this.data.url.includes('youtu.be');
    this.isDrive = this.data.url.includes('drive.google.com');
    this.canEmbed = !!this.data.embedUrl;

    if (this.data.embedUrl) {
      this.safeEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.embedUrl);
    }
  }

  openExternal(): void {
    window.open(this.data.url, '_blank', 'noopener');
  }

  close(): void {
    this.dialogRef.close();
  }
}
