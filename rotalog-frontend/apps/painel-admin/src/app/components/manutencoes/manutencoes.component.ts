import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FrotasService } from '../../services/frotas.service';
import { Manutencao } from '../../models';

// TODO: Componente sem formulário de criação - funcionalidade incompleta
@Component({
  selector: 'app-manutencoes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="manutencoes-page">
      <div class="page-header">
        <h1>Manutenções</h1>
        <!-- TODO: Botão não funciona - funcionalidade não implementada -->
        <button class="btn-primary" (click)="alert('Funcionalidade não implementada')">+ Nova Manutenção</button>
      </div>

      <div *ngIf="loading" class="loading">Carregando manutenções...</div>

      <table class="data-table" *ngIf="!loading">
        <thead>
          <tr>
            <th>ID</th>
            <th>Veículo ID</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Data Agendada</th>
            <th>Data Realizada</th>
            <th>Custo</th>
            <th>Status</th>
            <th>Oficina</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let manutencao of manutencoes">
            <td>{{ manutencao.id }}</td>
            <td>{{ manutencao.veiculo_id }}</td>
            <td>{{ manutencao.tipo }}</td>
            <td>{{ manutencao.descricao }}</td>
            <td>{{ manutencao.data_agendada }}</td>
            <td>{{ manutencao.data_realizada || 'Pendente' }}</td>
            <td>R$ {{ manutencao.custo | number:'1.2-2' }}</td>
            <td>
              <span class="status-badge" [ngClass]="'status-' + manutencao.status">
                {{ manutencao.status }}
              </span>
            </td>
            <td>{{ manutencao.oficina }}</td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="!loading && manutencoes.length === 0" class="empty-state">
        Nenhuma manutenção encontrada.
      </div>
    </div>
  `,
  styles: [`
    .manutencoes-page { padding: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-header h1 { margin: 0; color: #333; font-size: 24px; }
    .btn-primary { background: #1565c0; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
    .loading { text-align: center; padding: 40px; color: #666; }
    .data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .data-table th { text-align: left; padding: 14px; background: #f5f5f5; color: #666; font-size: 13px; text-transform: uppercase; }
    .data-table td { padding: 14px; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
    .data-table tr:hover { background: #f9f9f9; }
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status-AGENDADA { background: #e3f2fd; color: #1565c0; }
    .status-EM_ANDAMENTO { background: #fff3e0; color: #e65100; }
    .status-CONCLUIDA { background: #e8f5e9; color: #2e7d32; }
    .status-CANCELADA { background: #ffebee; color: #c62828; }
    .empty-state { text-align: center; padding: 40px; color: #999; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  `]
})
export class ManutencoesComponent implements OnInit {
  manutencoes: Manutencao[] = [];
  loading = true;

  constructor(private frotasService: FrotasService) {}

  ngOnInit(): void {
    this.carregarManutencoes();
  }

  async carregarManutencoes(): Promise<void> {
    this.loading = true;
    this.manutencoes = await this.frotasService.getManutencoes();
    this.loading = false;
  }

  // TODO: Método exposto no template mas definido aqui - anti-pattern
  alert(msg: string): void {
    window.alert(msg);
  }
}
