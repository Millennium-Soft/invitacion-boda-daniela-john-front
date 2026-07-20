import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EventPlan, EVENT_TYPES } from '../../../models/event-plan.model';
import { EventPlannerService } from '../../../services/event-planner.service';

export interface EventInfoDialogData {
  plan: EventPlan;
}

@Component({
  selector: 'app-event-info-dialog',
  templateUrl: './event-info-dialog.component.html',
  styleUrls: ['./event-info-dialog.component.css']
})
export class EventInfoDialogComponent implements OnInit {
  form!: FormGroup;
  readonly eventTypes = EVENT_TYPES;

  constructor(
    private fb: FormBuilder,
    private service: EventPlannerService,
    private dialogRef: MatDialogRef<EventInfoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EventInfoDialogData
  ) {}

  ngOnInit(): void {
    const p = this.data.plan;
    this.form = this.fb.group({
      name: [p.name, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      eventType: [p.eventType, Validators.required],
      date: [p.date],
      venue: [p.venue, Validators.maxLength(150)],
      description: [p.description, Validators.maxLength(500)]
    });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.service.updatePlan(this.form.value);
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
