import React from 'react';
import PropTypes from 'prop-types';

// FIXME: duplicado do TrackingDashboard - deveria ser lib compartilhada
const STATUS_CONFIG: any = {
  PENDENTE: { label: 'Pendente', className: 'status-PENDENTE' },
  ATRIBUIDA: { label: 'Atribuída', className: 'status-ATRIBUIDA' },
  EM_TRANSITO: { label: 'Em Trânsito', className: 'status-EM_TRANSITO' },
  ENTREGUE: { label: 'Entregue', className: 'status-ENTREGUE' },
  CANCELADA: { label: 'Cancelada', className: 'status-CANCELADA' }
};

class DeliveryList extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      filteredDeliveries: props.deliveries,
      sortBy: 'status'
    };
  }

  componentDidUpdate(prevProps: any) {
    if (prevProps.deliveries !== this.props.deliveries) {
      this.updateFilteredList();
    }
  }

  updateFilteredList = () => {
    // TODO: Implementar filtros corretamente
    // TODO: Usar Redux selectors em vez de state local
    const { deliveries } = this.props;
    let filtered = [...deliveries];

    // TODO: Sorting deveria estar em Redux
    filtered.sort((a: any, b: any) => {
      if (this.state.sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      if (this.state.sortBy === 'date') {
        return new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime();
      }
      if (this.state.sortBy === 'distance') {
        return (b.distancia_km || 0) - (a.distancia_km || 0);
      }
      return 0;
    });

    this.setState({ filteredDeliveries: filtered });
  };

  render() {
    const { filteredDeliveries } = this.state;
    const { selectedDelivery, onSelectDelivery } = this.props;

    return (
      <div className="delivery-list">
        <div className="list-header">
          <h3>Entregas</h3>
          <select 
            value={this.state.sortBy}
            onChange={(e) => this.setState({ sortBy: e.target.value }, this.updateFilteredList)}
          >
            <option value="status">Por Status</option>
            <option value="date">Por Data</option>
            <option value="distance">Por Distância</option>
          </select>
        </div>

        <div className="list-items">
          {filteredDeliveries.map((delivery: any) => {
            const statusConfig = STATUS_CONFIG[delivery.status] || { label: delivery.status, className: '' };
            return (
              <div 
                key={delivery.id}
                className={`list-item ${selectedDelivery?.id === delivery.id ? 'selected' : ''}`}
                onClick={() => onSelectDelivery(delivery)}
              >
                <div className="item-header">
                  <span className="item-id">#{delivery.id}</span>
                  <span className={`item-status ${statusConfig.className}`}>
                    {statusConfig.label}
                  </span>
                </div>
                <div className="item-body">
                  <p className="item-driver">{delivery.motorista_nome || 'Sem motorista'}</p>
                  <p className="item-destination">{delivery.destino_endereco}</p>
                  <p className="item-distance">{delivery.distancia_km} km</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

(DeliveryList as any).propTypes = {
  deliveries: PropTypes.array.isRequired,
  selectedDelivery: PropTypes.object,
  onSelectDelivery: PropTypes.func.isRequired,
  onFilterChange: PropTypes.func
};

export default DeliveryList;
