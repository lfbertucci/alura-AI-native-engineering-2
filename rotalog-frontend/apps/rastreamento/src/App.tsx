import React from 'react';
import PropTypes from 'prop-types';
import TrackingDashboard from './components/TrackingDashboard';
import DeliveryList from './components/DeliveryList';
import MapView from './components/MapView';
import { fetchAutenticado } from './services/auth';

// Class component 70% - dívida técnica intencional
// TODO: Migrar para functional component com hooks
class App extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      deliveries: [],
      selectedDelivery: null,
      loading: false,
      error: null,
      filters: {
        status: 'all',
        date: null,
        driver: null
      },
      mapCenter: { lat: -23.5505, lng: -46.6333 },
      zoom: 12,
      // TODO: Remover Redux sem Toolkit e implementar Redux Toolkit
      reduxState: null
    };
  }

  componentDidMount() {
    this.fetchDeliveries();
    // TODO: Implementar proper error handling
    // TODO: Adicionar loading states
  }

  fetchDeliveries = () => {
    this.setState({ loading: true });

    // TODO: Usar Redux actions em vez de fetch direto
    // TODO: Implementar proper API abstraction
    fetchAutenticado('http://localhost:3000/api/entregas')
      .then(res => {
        if (!res.ok) throw new Error(`Erro ${res.status}: falha ao buscar entregas`);
        return res.json();
      })
      .then(data => {
        this.setState({
          deliveries: Array.isArray(data) ? data : [],
          loading: false
        });
      })
      .catch(err => {
        console.error('Erro ao buscar entregas:', err);
        this.setState({
          error: err.message,
          loading: false
        });
      });
  };

  handleDeliveryUpdate = (updatedDelivery: any) => {
    this.setState((prevState: any) => ({
      deliveries: prevState.deliveries.map((d: any) =>
        d.id === updatedDelivery.id ? updatedDelivery : d
      ),
      selectedDelivery: prevState.selectedDelivery?.id === updatedDelivery.id
        ? updatedDelivery
        : prevState.selectedDelivery,
    }));
  };

  handleSelectDelivery = (delivery: any) => {
    this.setState({ 
      selectedDelivery: delivery,
      mapCenter: { 
        lat: delivery.destino_lat || delivery.origem_lat, 
        lng: delivery.destino_lng || delivery.origem_lng 
      }
    });
  };

  handleFilterChange = (filterKey: any, value: any) => {
    this.setState((prevState: any) => ({
      filters: {
        ...prevState.filters,
        [filterKey]: value
      }
    }));
  };

  // TODO: Componentes muito grandes (500+ linhas de template)
  // TODO: CSS global vazando entre componentes
  render() {
    const { deliveries, selectedDelivery, loading, error, mapCenter, zoom } = this.state;

    if (loading) {
      return <div className="loading-container">Carregando entregas...</div>;
    }

    if (error) {
      return <div className="error-container">Erro: {error}</div>;
    }

    return (
      <div className="app-container">
        <header className="app-header">
          <h1>RotaLog - Rastreamento de Entregas</h1>
          <p>Portal de rastreamento em tempo real</p>
        </header>

        <div className="app-content">
          <aside className="sidebar">
            <DeliveryList 
              deliveries={deliveries}
              selectedDelivery={selectedDelivery}
              onSelectDelivery={this.handleSelectDelivery}
              onFilterChange={this.handleFilterChange}
            />
          </aside>

          <main className="main-content">
            <div className="tracking-section">
              <TrackingDashboard delivery={selectedDelivery} onDeliveryUpdate={this.handleDeliveryUpdate} />
            </div>

            <div className="map-section">
              <MapView 
                center={mapCenter}
                zoom={zoom}
                delivery={selectedDelivery}
              />
            </div>
          </main>
        </div>
      </div>
    );
  }
}

// TODO: PropTypes em vez de TypeScript (dívida técnica)
(App as any).propTypes = {
  // Props não documentadas
};

export default App;
