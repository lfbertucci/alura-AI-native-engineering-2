import React from 'react';
import PropTypes from 'prop-types';
import { fetchAutenticado } from '../services/auth';

// Mapeamento de status para labels e cores
// FIXME: deveria vir de uma config centralizada
const STATUS_CONFIG: any = {
  PENDENTE: { label: 'Pendente', className: 'status-PENDENTE' },
  ATRIBUIDA: { label: 'Atribuída', className: 'status-ATRIBUIDA' },
  EM_TRANSITO: { label: 'Em Trânsito', className: 'status-EM_TRANSITO' },
  ENTREGUE: { label: 'Entregue', className: 'status-ENTREGUE' },
  CANCELADA: { label: 'Cancelada', className: 'status-CANCELADA' }
};

// Calcula progresso baseado no status
// FIXME: deveria usar dados reais de tracking GPS
function calcularProgresso(status: string): number {
  switch (status) {
    case 'PENDENTE': return 0;
    case 'ATRIBUIDA': return 25;
    case 'EM_TRANSITO': return 60;
    case 'ENTREGUE': return 100;
    case 'CANCELADA': return 0;
    default: return 0;
  }
}

// Class component com lógica de negócio e apresentação misturadas
class TrackingDashboard extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      expanded: true,
      refreshInterval: null,
      lastUpdate: null
    };
  }

  componentDidMount() {
    // TODO: Implementar proper polling com Redux
    const interval = setInterval(() => {
      this.refreshData();
    }, 5000);
    this.setState({ refreshInterval: interval });
  }

  componentWillUnmount() {
    if (this.state.refreshInterval) {
      clearInterval(this.state.refreshInterval);
    }
  }

  refreshData = () => {
    // TODO: Chamar API corretamente
    const { delivery, onDeliveryUpdate } = this.props;
    if (delivery) {
      fetchAutenticado(`http://localhost:3000/api/entregas/${delivery.id}`)
        .then(res => {
          if (!res.ok) throw new Error(`Erro ${res.status}`);
          return res.json();
        })
        .then(data => {
          this.setState({ lastUpdate: new Date() });
          if (onDeliveryUpdate) onDeliveryUpdate(data);
          // TODO: Atualizar Redux store
        })
        .catch(err => console.error(err));
    }
  };

  // TODO: Componente muito grande, deveria ser dividido
  render() {
    const { delivery } = this.props;
    const { expanded } = this.state;

    if (!delivery) {
      return <div className="dashboard-empty">Selecione uma entrega para ver detalhes</div>;
    }

    const statusConfig = STATUS_CONFIG[delivery.status] || { label: delivery.status, className: '' };
    const progresso = calcularProgresso(delivery.status);

    return (
      <div className="tracking-dashboard">
        <div className="dashboard-header">
          <h2>Detalhes da Entrega #{delivery.id}</h2>
          <button onClick={() => this.setState({ expanded: !expanded })}>
            {expanded ? 'Minimizar' : 'Expandir'}
          </button>
        </div>

        {expanded && (
          <div className="dashboard-content">
            <div className="info-grid">
              <div className="info-item">
                <label>Status:</label>
                <span className={`status-badge ${statusConfig.className}`}>
                  {statusConfig.label}
                </span>
              </div>

              <div className="info-item">
                <label>Motorista:</label>
                <span>{delivery.motorista_nome || 'Não atribuído'}</span>
              </div>

              <div className="info-item">
                <label>Veículo:</label>
                <span>{delivery.veiculo_placa ? `${delivery.veiculo_placa} - ${delivery.veiculo_modelo || ''}` : 'Não atribuído'}</span>
              </div>

              <div className="info-item">
                <label>Origem:</label>
                <span>{delivery.origem_endereco}</span>
              </div>

              <div className="info-item">
                <label>Destino:</label>
                <span>{delivery.destino_endereco}</span>
              </div>

              <div className="info-item">
                <label>Distância:</label>
                <span>{delivery.distancia_km} km</span>
              </div>

              <div className="info-item">
                <label>Tempo Estimado:</label>
                <span>{delivery.tempo_estimado_minutos} min</span>
              </div>

              <div className="info-item">
                <label>Progresso:</label>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="timeline">
              <h3>Histórico</h3>
              {delivery.rastreamentos && delivery.rastreamentos
                .sort((a: any, b: any) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime())
                .map((event: any, idx: number) => (
                <div key={idx} className="timeline-item">
                  <span className="timeline-time">
                    {new Date(event.data_evento).toLocaleString('pt-BR', { 
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                  <span className={`timeline-event-badge ${STATUS_CONFIG[event.evento]?.className || 'status-default'}`}>
                    {event.evento.replace(/_/g, ' ')}
                  </span>
                  <span className="timeline-event">{event.descricao}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}

(TrackingDashboard as any).propTypes = {
  delivery: PropTypes.object,
  onDeliveryUpdate: PropTypes.func,
};

export default TrackingDashboard;
