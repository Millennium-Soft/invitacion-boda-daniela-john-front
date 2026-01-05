import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { DataRegistrationComponent } from './components/data-registration/data-registration.component';
import { RsvpComponent } from './components/rsvp/rsvp.component';

const routes: Routes = [
  //COMPONENTES DEL SISTEMA
  { path: 'login', component: LoginComponent },

  { path: 'inicio', component: InicioComponent },
  { path: 'registro-datos', component: DataRegistrationComponent },
  { path: 'confirmar-asistencia', component: RsvpComponent },

  //REDIRECCIONAMIENTO COMOPONENTE POR DEFECTO PARA RUTAS INEXISTENTES EN EL NAVEGADOR
  { path: '', pathMatch: 'full', redirectTo: '/inicio' },
  { path: '**', pathMatch: 'full', redirectTo: '/inicio' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      onSameUrlNavigation: 'reload',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule { }
