import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { EventPlan, ViewMode } from '../../models/event-plan.model';
import { EventPlannerService } from '../../services/event-planner.service';
import { ActivityDialogComponent, ActivityDialogData } from '../dialogs/activity-dialog/activity-dialog.component';
import { EventInfoDialogComponent, EventInfoDialogData } from '../dialogs/event-info-dialog/event-info-dialog.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-event-planner',
  templateUrl: './event-planner.component.html',
  styleUrls: ['./event-planner.component.css']
})
export class EventPlannerComponent implements OnInit, OnDestroy {
  plan: EventPlan | null = null;
  viewMode: ViewMode = 'cards';
  searchQuery = '';

  private subs: Subscription[] = [];

  constructor(
    private service: EventPlannerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.service.plan$.subscribe(p => this.plan = p)
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  setView(mode: ViewMode): void {
    this.viewMode = mode;
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.service.setSearchQuery(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.service.setSearchQuery('');
  }

  openActivityDialog(): void {
    this.dialog.open(ActivityDialogComponent, {
      data: { mode: 'create' } as ActivityDialogData,
      width: '560px'
    }).afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Actividad creada exitosamente', 'Cerrar', { duration: 3000 });
      }
    });
  }

  openEventInfoDialog(): void {
    if (!this.plan) return;
    this.dialog.open(EventInfoDialogComponent, {
      data: { plan: this.plan } as EventInfoDialogData,
      width: '540px'
    }).afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Información del evento actualizada', 'Cerrar', { duration: 2000 });
      }
    });
  }

  async resetPlan(): Promise<void> {
    const result = await Swal.fire({
      title: '¿Reiniciar el plan?',
      text: 'Se eliminarán todas las actividades y multimedia. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, reiniciar'
    });
    if (result.isConfirmed) {
      this.service.resetPlan();
      this.snackBar.open('Plan reiniciado', 'Cerrar', { duration: 3000 });
    }
  }

  exportPlan(): void {
    const json = this.service.exportPlan();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-evento-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Plan exportado correctamente', 'Cerrar', { duration: 3000 });
  }

  importPlan(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      const success = this.service.importPlan(json);
      if (success) {
        this.snackBar.open('Plan importado correctamente', 'Cerrar', { duration: 3000 });
      } else {
        Swal.fire('Error', 'El archivo no tiene un formato válido.', 'error');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  printView(): void {
    window.print();
  }

  get eventDateFormatted(): string {
    if (!this.plan?.date) return '';
    const d = new Date(this.plan.date + 'T00:00:00');
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
