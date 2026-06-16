import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './components/layout/sidebar.component';

// TODO: Sem autenticação - qualquer pessoa pode acessar
// TODO: Sem interceptors HTTP
// TODO: Sem tratamento global de erros
@Component({
  standalone: true,
  imports: [SidebarComponent, RouterModule],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'RotaLog - Painel Administrativo';
}
