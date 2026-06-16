import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FrotasService } from '../../services/frotas.service';
import { ManutencaoPreventiva } from '../../models';

@Component({
  selector: 'app-manutencao-preventiva',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="manutencao-preventiva-page">
      <div class="page-header">
        <h1>Manutenção Preventiva</h1>
      </div>

      <div class="filters">
        <select [(ngModel)]="filtroStatus" (change)="onFiltroChange()">
          <option value="">Todos</option>
          <option value="PENDENTE">PENDENTE</option>
          <option value="EM_ANDAMENTO">EM_ANDAMENTO</option>
          <option value="CONCLUIDA">CONCLUIDA</option>
          <option value="CANCELADA">CANCELADA</option>
        </select>
      </div>

      <div *ngIf="loading" class="loading">Carregando manutenções preventivas...</div>

      <div *ngIf="erro" class="error-banner">
        {{ erro }}
        <button (click)="carregarManutencoes()">Tentar novamente</button>
      </div>

      <table class="data-table" *ngIf="!loading && !erro">
        <thead>
          <tr>
            <th>ID</th>
            <th>Veículo ID</th>
            <th>Descrição</th>
            <th>Data</th>
            <th>KM</th>
            <th>Custo</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of manutencoesFiltradas">
            <td>{{ m.id }}</td>
            <td>{{ m.veiculoId }}</td>
            <td>{{ m.descricao }}</td>
            <td>{{ m.dataManutencao }}</td>
            <td>{{ m.quilometragemManutencao | number }} km</td>
            <td>R$ {{ m.custo | number:'1.2-2' }}</td>
            <td>
              <span class="status-badge" [ngClass]="'status-' + m.status">
                {{ m.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="!loading && !erro && manutencoesFiltradas.length === 0" class="empty-state">
        Nenhuma manutenção preventiva encontrada.
      </div>
    </div>
  `,
  styles: [`
    .manutencao-preventiva-page { padding: 20px; }

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

    .status-PENDENTE     { background: #fff8e1; color: #f57f17; }
    .status-EM_ANDAMENTO { background: #e3f2fd; color: #1565c0; }
    .status-CONCLUIDA    { background: #e8f5e9; color: #2e7d32; }
    .status-CANCELADA    { background: #ffebee; color: #c62828; }

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
export class ManutencaoPreventivaComponent implements OnInit {
  manutencoes: ManutencaoPreventiva[] = [];
  manutencoesFiltradas: ManutencaoPreventiva[] = [];
  loading = true;
  erro: string | null = null;
  filtroStatus = '';

  constructor(private frotasService: FrotasService) {}

  ngOnInit(): void {
    this.carregarManutencoes();
  }

  async carregarManutencoes(): Promise<void> {
    this.loading = true;
    this.erro = null;
    try {
      this.manutencoes = await this.frotasService.getManutencoesPreventivas();
      this.aplicarFiltro();
    } catch (err: any) {
      this.erro = 'Erro ao carregar manutenções preventivas.';
      console.error('ManutencaoPreventivaComponent error:', err);
    } finally {
      this.loading = false;
    }
  }

  onFiltroChange(): void {
    this.aplicarFiltro();
  }

  private aplicarFiltro(): void {
    this.manutencoesFiltradas = this.filtroStatus
      ? this.manutencoes.filter(m => m.status === this.filtroStatus)
      : [...this.manutencoes];
  }
}
