import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EventPlannerComponent } from './components/event-planner/event-planner.component';
import { EventReportComponent } from './components/report/event-report/event-report.component';

const routes: Routes = [
  { path: '', component: EventPlannerComponent },
  { path: 'reporte', component: EventReportComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EventPlannerRoutingModule {}
