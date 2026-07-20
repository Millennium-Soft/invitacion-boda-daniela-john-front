import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';

import { EventPlannerRoutingModule } from './event-planner-routing.module';

// Main component
import { EventPlannerComponent } from './components/event-planner/event-planner.component';

// Shared components
import { TrafficLightComponent } from './components/shared/traffic-light/traffic-light.component';
import { EventSummaryComponent } from './components/shared/event-summary/event-summary.component';

// Dialogs
import { EventInfoDialogComponent } from './components/dialogs/event-info-dialog/event-info-dialog.component';
import { ActivityDialogComponent } from './components/dialogs/activity-dialog/activity-dialog.component';
import { MediaDialogComponent } from './components/dialogs/media-dialog/media-dialog.component';
import { MediaPreviewDialogComponent } from './components/dialogs/media-preview-dialog/media-preview-dialog.component';

// Views
import { TableViewComponent } from './components/views/table-view/table-view.component';
import { TimelineViewComponent } from './components/views/timeline-view/timeline-view.component';
import { CardsViewComponent } from './components/views/cards-view/cards-view.component';
import { DjViewComponent } from './components/views/dj-view/dj-view.component';

// Report
import { EventReportComponent } from './components/report/event-report/event-report.component';

// Pipes
import { DurationFormatPipe } from './pipes/duration-format.pipe';

// Service
import { EventPlannerService } from './services/event-planner.service';

@NgModule({
  declarations: [
    EventPlannerComponent,
    TrafficLightComponent,
    EventSummaryComponent,
    EventInfoDialogComponent,
    ActivityDialogComponent,
    MediaDialogComponent,
    MediaPreviewDialogComponent,
    TableViewComponent,
    TimelineViewComponent,
    CardsViewComponent,
    DjViewComponent,
    EventReportComponent,
    DurationFormatPipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    EventPlannerRoutingModule,
    // Angular Material
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatMenuModule,
    MatBadgeModule,
    MatChipsModule,
    MatExpansionModule
  ],
  providers: [
    EventPlannerService,
    DatePipe
  ]
})
export class EventPlannerModule {}
