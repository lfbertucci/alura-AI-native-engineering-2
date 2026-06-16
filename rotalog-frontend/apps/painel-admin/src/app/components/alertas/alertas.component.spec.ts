import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertasComponent } from './alertas.component';
import { FrotasService } from '../../services/frotas.service';
import { AlertaManutencao } from '../../models';

const ALERTA_MOCK: AlertaManutencao = {
  id: 1,
  veiculoId: 10,
  placa: 'ABC-1234',
  modelo: 'Caminhão X',
  quilometragemAlerta: 80000,
  motivo: 'KM',
  dataAlerta: '2026-06-14',
  statusNotificacao: 'PENDENTE'
};

const ALERTA_ENVIADA: AlertaManutencao = {
  id: 2,
  veiculoId: 11,
  placa: 'DEF-5678',
  modelo: 'Van Y',
  quilometragemAlerta: 50000,
  motivo: 'TEMPO',
  dataAlerta: '2026-06-10',
  statusNotificacao: 'ENVIADA'
};

describe('AlertasComponent', () => {
  let component: AlertasComponent;
  let fixture: ComponentFixture<AlertasComponent>;
  let frotasServiceMock: jest.Mocked<Pick<FrotasService, 'getAlertasManutencao'>>;

  beforeEach(async () => {
    frotasServiceMock = {
      getAlertasManutencao: jest.fn().mockResolvedValue([ALERTA_MOCK, ALERTA_ENVIADA])
    };

    await TestBed.configureTestingModule({
      imports: [AlertasComponent, CommonModule, FormsModule],
      providers: [
        { provide: FrotasService, useValue: frotasServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertasComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve listar alertas retornados pelo servico ao iniciar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(frotasServiceMock.getAlertasManutencao).toHaveBeenCalledWith(undefined);
    expect(component.alertas.length).toBe(2);
    expect(component.alertas[0].placa).toBe('ABC-1234');
  });

  it('deve chamar getAlertasManutencao com status ao trocar filtro', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    frotasServiceMock.getAlertasManutencao.mockResolvedValue([ALERTA_ENVIADA]);
    component.filtroStatus = 'ENVIADA';
    component.onFiltroChange();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(frotasServiceMock.getAlertasManutencao).toHaveBeenCalledWith('ENVIADA');
    expect(component.alertas.length).toBe(1);
    expect(component.alertas[0].statusNotificacao).toBe('ENVIADA');
  });

  it('deve exibir estado de lista vazia quando o servico retorna array vazio', async () => {
    frotasServiceMock.getAlertasManutencao.mockResolvedValue([]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.alertas.length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).not.toBeNull();
  });

  it('deve exibir mensagem de erro quando o servico lanca excecao', async () => {
    frotasServiceMock.getAlertasManutencao.mockRejectedValue(new Error('Falha de rede'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.erro).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-banner')).not.toBeNull();
  });
});
