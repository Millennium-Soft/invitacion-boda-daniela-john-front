import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { DataRegistrationComponent } from './components/data-registration/data-registration.component';
import { GuestValidationComponent } from './components/guest-validation/guest-validation.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MemoriesComponent } from './components/memories/memories.component';

const routes: Routes = [
  //COMPONENTES DEL SISTEMA
  { path: 'login', component: LoginComponent },

  { path: '', component: InicioComponent },
  { path: 'inicio', component: InicioComponent },
  { path: 'registro-datos', component: DataRegistrationComponent },
  { path: 'validate', component: GuestValidationComponent },
  { path: 'validate/:id', component: GuestValidationComponent },
  { path: 'recepcion-boda-DJ2026', component: GuestValidationComponent, data: { isAdmin: true } },
  { path: 'dashboard', component: DashboardComponent },

  // Public shareable route for guests — share via QR code
  { path: 'momentos', component: MemoriesComponent },

  //REDIRECCIONAMIENTO COMOPONENTE POR DEFECTO PARA RUTAS INEXISTENTES EN EL NAVEGADOR
  { path: '**', component: InicioComponent },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: false,
      onSameUrlNavigation: 'reload'
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule { }
