import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FrotasService } from '../../services/frotas.service';
import { AlertaManutencao } from '../../models';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="alertas-page">
      <div class="page-header">
        <h1>Alertas de Manutenção</h1>
      </div>

      <div class="filters">
        <select [(ngModel)]="filtroStatus" (change)="onFiltroChange()">
          <option value="">Todos</option>
          <option value="PENDENTE">PENDENTE</option>
          <option value="ENVIADA">ENVIADA</option>
          <option value="FALHA">FALHA</option>
        </select>
      </div>

      <div *ngIf="loading" class="loading">Carregando alertas...</div>

      <div *ngIf="erro" class="error-banner">
        {{ erro }}
        <button (click)="carregarAlertas()">Tentar novamente</button>
      </div>

      <table class="data-table" *ngIf="!loading && !erro">
        <thead>
          <tr>
            <th>Placa</th>
            <th>Modelo</th>
            <th>Motivo</th>
            <th>KM do Alerta</th>
            <th>Data</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let alerta of alertas">
            <td><strong>{{ alerta.placa }}</strong></td>
            <td>{{ alerta.modelo }}</td>
            <td>{{ alerta.motivo }}</td>
            <td>{{ alerta.quilometragemAlerta | number }} km</td>
            <td>{{ alerta.dataAlerta }}</td>
            <td>
              <span class="status-badge" [ngClass]="'status-' + alerta.statusNotificacao">
                {{ alerta.statusNotificacao }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="!loading && !erro && alertas.length === 0" class="empty-state">
        Nenhum alerta encontrado.
      </div>
    </div>
  `,
  styles: [`
    .alertas-page { padding: 20px; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .page-header h1 { margin: 0; color: #333; font-size: 24px; }

    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .filters select {
      padding: 10px 14px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }

    .loading { text-align: center; padding: 40px; color: #666; }

    .error-banner {
      background: #ffebee;
      color: #c62828;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .error-banner button {
      background: #c62828;
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .data-table th {
      text-align: left;
      padding: 14px;
      background: #f5f5f5;
      color: #666;
      font-size: 13px;
      text-transform: uppercase;
    }

    .data-table td {
      padding: 14px;
      border-bottom: 1px solid #f5f5f5;
      font-size: 14px;
    }

    .data-table tr:hover { background: #f9f9f9; }

    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-PENDENTE { background: #fff8e1; color: #f57f17; }
    .status-ENVIADA  { background: #e8f5e9; color: #2e7d32; }
    .status-FALHA    { background: #ffebee; color: #c62828; }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #999;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  `]
})
export class AlertasComponent implements OnInit {
  alertas: AlertaManutencao[] = [];
  loading = true;
  erro: string | null = null;
  filtroStatus = '';

  constructor(private frotasService: FrotasService) {}

  ngOnInit(): void {
    this.carregarAlertas();
  }

  async carregarAlertas(): Promise<void> {
    this.loading = true;
    this.erro = null;
    try {
      const status = this.filtroStatus || undefined;
      this.alertas = await this.frotasService.getAlertasManutencao(status);
    } catch (err: any) {
      this.erro = 'Erro ao carregar alertas de manutenção.';
      console.error('AlertasComponent error:', err);
    } finally {
      this.loading = false;
    }
  }

  onFiltroChange(): void {
    this.carregarAlertas();
  }
}
