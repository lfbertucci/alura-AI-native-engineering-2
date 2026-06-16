import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// TODO: Componente deveria usar Angular Material ou PrimeNG
// TODO: Sem responsividade mobile
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="sidebar">
      <div class="sidebar-header">
        <h2>RotaLog</h2>
        <span class="subtitle">Painel Administrativo</span>
      </div>

      <ul class="nav-menu">
        <li>
          <a routerLink="/dashboard" routerLinkActive="active">
            <span class="icon">📊</span>
            <span>Dashboard</span>
          </a>
        </li>
        <li>
          <a routerLink="/veiculos" routerLinkActive="active">
            <span class="icon">🚛</span>
            <span>Veículos</span>
          </a>
        </li>
        <li>
          <a routerLink="/motoristas" routerLinkActive="active">
            <span class="icon">👤</span>
            <span>Motoristas</span>
          </a>
        </li>
        <li>
          <a routerLink="/manutencoes" routerLinkActive="active">
            <span class="icon">🔧</span>
            <span>Manutenções</span>
          </a>
        </li>
        <li>
          <a routerLink="/manutencao-preventiva" routerLinkActive="active">
            <span class="icon">🛡️</span>
            <span>Manutenção Preventiva</span>
          </a>
        </li>
        <li>
          <a routerLink="/entregas" routerLinkActive="active">
            <span class="icon">📦</span>
            <span>Entregas</span>
          </a>
        </li>
        <li>
          <a routerLink="/alertas" routerLinkActive="active">
            <span class="icon">🔔</span>
            <span>Alertas</span>
          </a>
        </li>
      </ul>

      <div class="sidebar-footer">
        <p>v1.0.0 - Legado</p>
        <!-- TODO: Implementar logout -->
        <!-- TODO: Mostrar usuário logado -->
      </div>
    </nav>
  `,
  styles: [`
    .sidebar {
      width: 250px;
      height: 100vh;
      background: #1a1a2e;
      color: white;
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 100;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid #333;
      text-align: center;
    }

    .sidebar-header h2 {
      margin: 0;
      font-size: 24px;
      color: #4fc3f7;
    }

    .subtitle {
      font-size: 12px;
      color: #999;
    }

    .nav-menu {
      list-style: none;
      padding: 0;
      margin: 20px 0;
      flex: 1;
    }

    .nav-menu li a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      color: #ccc;
      text-decoration: none;
      transition: background 0.2s;
      font-size: 15px;
    }

    .nav-menu li a:hover {
      background: #16213e;
      color: white;
    }

    .nav-menu li a.active {
      background: #0f3460;
      color: #4fc3f7;
      border-left: 3px solid #4fc3f7;
    }

    .icon {
      font-size: 18px;
    }

    .sidebar-footer {
      padding: 15px 20px;
      border-top: 1px solid #333;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  `]
})
export class SidebarComponent {}
