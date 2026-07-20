import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EventActivity } from '../../../models/event-plan.model';
import { EventPlannerService } from '../../../services/event-planner.service';

export interface ActivityDialogData {
  activity?: EventActivity;
  mode: 'create' | 'edit';
}

function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startTime')?.value;
  const end = group.get('endTime')?.value;
  if (start && end && end <= start) return { endBeforeStart: true };
  return null;
}

@Component({
  selector: 'app-activity-dialog',
  templateUrl: './activity-dialog.component.html',
  styleUrls: ['./activity-dialog.component.css']
})
export class ActivityDialogComponent implements OnInit {
  form!: FormGroup;
  mode: 'create' | 'edit';
  activity?: EventActivity;

  constructor(
    private fb: FormBuilder,
    public service: EventPlannerService,
    private dialogRef: MatDialogRef<ActivityDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ActivityDialogData
  ) {
    this.mode = data.mode;
    this.activity = data.activity;
  }

  ngOnInit(): void {
    const a = this.activity;
    this.form = this.fb.group({
      title: [a?.title || '', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: [a?.description || '', Validators.maxLength(500)],
      startTime: [a?.startTime || ''],
      endTime: [a?.endTime || ''],
      durationSeconds: [a?.durationSeconds || 0, [Validators.min(0)]],
      observations: [a?.observations || '', Validators.maxLength(500)],
      active: [a?.active !== undefined ? a.active : true]
    }, { validators: endAfterStart });

    // Auto-calculate duration from time fields
    this.form.get('startTime')?.valueChanges.subscribe(() => this.autoCalcDuration());
    this.form.get('endTime')?.valueChanges.subscribe(() => this.autoCalcDuration());
  }

  private autoCalcDuration(): void {
    const start = this.form.get('startTime')?.value;
    const end = this.form.get('endTime')?.value;
    if (start && end && end > start) {
      const seconds = this.service.timeDiffSeconds(start, end);
      this.form.get('durationSeconds')?.setValue(seconds, { emitEvent: false });
    }
  }

  get durationDisplay(): string {
    return this.service.formatDuration(this.form.get('durationSeconds')?.value || 0);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value;
    if (this.mode === 'create') {
      const activity = this.service.addActivity(value);
      this.dialogRef.close(activity);
    } else if (this.activity) {
      this.service.updateActivity(this.activity.id, value);
      this.dialogRef.close(true);
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
