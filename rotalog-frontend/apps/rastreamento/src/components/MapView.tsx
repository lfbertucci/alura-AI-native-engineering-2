import React from 'react';
import PropTypes from 'prop-types';

// TODO: Usar react-leaflet em vez de Leaflet vanilla (dívida técnica)
// Importando Leaflet diretamente porque o webpack do NX tem problemas com react-leaflet
// FIXME: deveria usar react-leaflet para integração melhor com lifecycle do React

declare const L: any; // FIXME: tipagem fraca - Leaflet carregado via CDN

class MapView extends React.Component<any, any> {
  private mapRef: any;
  private mapInstance: any;
  private markersLayer: any;
  private routeLine: any;

  constructor(props: any) {
    super(props);
    this.mapRef = React.createRef();
    this.mapInstance = null;
    this.markersLayer = null;
    this.routeLine = null;
    this.state = {
      mapLoaded: false,
      mapError: false
    };
  }

  componentDidMount() {
    this.loadLeaflet();
  }

  componentDidUpdate(prevProps: any) {
    if (prevProps.delivery !== this.props.delivery && this.mapInstance) {
      this.updateMapMarkers();
    }
  }

  componentWillUnmount() {
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
  }

  loadLeaflet = () => {
    // FIXME: Leaflet carregado via CDN script tag - deveria ser via npm
    if (typeof L !== 'undefined') {
      this.initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      this.initMap();
    };
    script.onerror = () => {
      console.error('Erro ao carregar Leaflet');
      this.setState({ mapError: true });
    };
    document.head.appendChild(script);
  };

  initMap = () => {
    if (!this.mapRef.current || this.mapInstance) return;

    try {
      const { center, zoom } = this.props;

      this.mapInstance = L.map(this.mapRef.current, {
        center: [center.lat, center.lng],
        zoom: zoom || 12,
        zoomControl: true
      });

      // OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(this.mapInstance);

      // Layer group para markers
      this.markersLayer = L.layerGroup().addTo(this.mapInstance);

      this.setState({ mapLoaded: true });

      // Se já tem delivery selecionada, mostrar no mapa
      if (this.props.delivery) {
        this.updateMapMarkers();
      }
    } catch (error) {
      console.error('Erro ao inicializar mapa:', error);
      this.setState({ mapError: true });
    }
  };

  updateMapMarkers = () => {
    const { delivery } = this.props;
    if (!this.mapInstance || !this.markersLayer) return;

    // Limpar markers anteriores
    this.markersLayer.clearLayers();
    if (this.routeLine) {
      this.mapInstance.removeLayer(this.routeLine);
      this.routeLine = null;
    }

    if (!delivery) return;

    const origemLat = parseFloat(delivery.origem_lat);
    const origemLng = parseFloat(delivery.origem_lng);
    const destinoLat = parseFloat(delivery.destino_lat);
    const destinoLng = parseFloat(delivery.destino_lng);

    const hasOrigem = !isNaN(origemLat) && !isNaN(origemLng);
    const hasDestino = !isNaN(destinoLat) && !isNaN(destinoLng);

    // Ícone customizado para origem (verde)
    const origemIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background:#1D9E75;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">📦</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });

    // Ícone customizado para destino (vermelho)
    const destinoIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background:#D32F2F;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏁</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });

    // Adicionar marker de origem
    if (hasOrigem) {
      const origemMarker = L.marker([origemLat, origemLng], { icon: origemIcon })
        .bindPopup(
          '<div style="min-width:200px">' +
          '<strong style="color:#1D9E75">📦 Origem</strong><br/>' +
          '<span style="font-size:13px">' + delivery.origem_endereco + '</span>' +
          '</div>'
        );
      this.markersLayer.addLayer(origemMarker);
    }

    // Adicionar marker de destino
    if (hasDestino) {
      const destinoMarker = L.marker([destinoLat, destinoLng], { icon: destinoIcon })
        .bindPopup(
          '<div style="min-width:200px">' +
          '<strong style="color:#D32F2F">🏁 Destino</strong><br/>' +
          '<span style="font-size:13px">' + delivery.destino_endereco + '</span>' +
          (delivery.motorista_nome ? '<br/><span style="font-size:12px;color:#666">Motorista: ' + delivery.motorista_nome + '</span>' : '') +
          '</div>'
        );
      this.markersLayer.addLayer(destinoMarker);
    }

    // Desenhar linha de rota entre origem e destino
    if (hasOrigem && hasDestino) {
      this.routeLine = L.polyline(
        [[origemLat, origemLng], [destinoLat, destinoLng]],
        { 
          color: '#1D9E75', 
          weight: 3, 
          opacity: 0.7, 
          dashArray: '10, 10' 
        }
      ).addTo(this.mapInstance);

      // Ajustar o mapa para mostrar origem e destino
      const bounds = L.latLngBounds(
        [origemLat, origemLng],
        [destinoLat, destinoLng]
      );
      this.mapInstance.fitBounds(bounds, { padding: [50, 50] });
    } else if (hasOrigem) {
      this.mapInstance.setView([origemLat, origemLng], 15);
    } else if (hasDestino) {
      this.mapInstance.setView([destinoLat, destinoLng], 15);
    }

    // Adicionar markers de rastreamento (posições intermediárias) para entregas em trânsito
    if (delivery.rastreamentos && delivery.status === 'EM_TRANSITO') {
      const posicoes = delivery.rastreamentos
        .filter((r: any) => r.evento === 'POSICAO_ATUALIZADA' && r.latitude && r.longitude)
        .sort((a: any, b: any) => new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime());

      posicoes.forEach((pos: any, idx: number) => {
        const lat = parseFloat(pos.latitude);
        const lng = parseFloat(pos.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const isLast = idx === posicoes.length - 1;
        const trackIcon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="background:' + (isLast ? '#FF9800' : '#90CAF9') + ';border-radius:50%;width:' + (isLast ? '24' : '12') + 'px;height:' + (isLast ? '24' : '12') + 'px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">' + (isLast ? '🚚' : '') + '</div>',
          iconSize: [isLast ? 24 : 12, isLast ? 24 : 12],
          iconAnchor: [isLast ? 12 : 6, isLast ? 12 : 6]
        });

        const marker = L.marker([lat, lng], { icon: trackIcon })
          .bindPopup(
            '<div style="min-width:150px">' +
            '<strong>' + (isLast ? '🚚 Posição Atual' : '📍 Posição') + '</strong><br/>' +
            '<span style="font-size:12px">' + (pos.descricao || '') + '</span><br/>' +
            '<span style="font-size:11px;color:#666">' + 
              new Date(pos.data_evento).toLocaleString('pt-BR') + 
            '</span>' +
            '</div>'
          );
        this.markersLayer.addLayer(marker);
      });

      // Se tem posições de rastreamento, desenhar rota real
      if (posicoes.length > 0) {
        const allPoints = [];
        if (hasOrigem) allPoints.push([origemLat, origemLng]);
        posicoes.forEach((pos: any) => {
          const lat = parseFloat(pos.latitude);
          const lng = parseFloat(pos.longitude);
          if (!isNaN(lat) && !isNaN(lng)) allPoints.push([lat, lng]);
        });

        if (this.routeLine) {
          this.mapInstance.removeLayer(this.routeLine);
        }

        // Linha sólida para trecho percorrido
        if (allPoints.length > 1) {
          L.polyline(allPoints, { 
            color: '#1D9E75', 
            weight: 4, 
            opacity: 0.8 
          }).addTo(this.mapInstance);
        }

        // Linha tracejada para trecho restante (última posição até destino)
        if (hasDestino && allPoints.length > 0) {
          const lastPoint = allPoints[allPoints.length - 1];
          this.routeLine = L.polyline(
            [lastPoint, [destinoLat, destinoLng]],
            { 
              color: '#1D9E75', 
              weight: 3, 
              opacity: 0.5, 
              dashArray: '8, 8' 
            }
          ).addTo(this.mapInstance);
        }

        // Fitbounds incluindo rastreamentos
        if (hasDestino) {
          const allCoords = allPoints.concat([[destinoLat, destinoLng]]);
          const bounds = L.latLngBounds(allCoords);
          this.mapInstance.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    }
  };

  handleCentralizar = () => {
    if (!this.mapInstance) return;

    const { delivery } = this.props;
    if (delivery && delivery.origem_lat) {
      this.mapInstance.setView(
        [parseFloat(delivery.origem_lat), parseFloat(delivery.origem_lng)],
        14
      );
    } else {
      // Centralizar em São Paulo
      this.mapInstance.setView([-23.5505, -46.6333], 12);
    }
  };

  render() {
    const { delivery } = this.props;
    const { mapLoaded, mapError } = this.state;

    return (
      <div className="map-view">
        <div className="map-header">
          <h3>Mapa de Rastreamento</h3>
          <div className="map-header-actions">
            {delivery && <span className="map-info">Entrega #{delivery.id} - {delivery.numero_pedido}</span>}
            <button onClick={this.handleCentralizar} className="btn-centralizar" title="Centralizar mapa">
              Centralizar
            </button>
          </div>
        </div>

        <div className="map-container">
          {mapError && (
            <div className="map-error">
              <p>Erro ao carregar o mapa</p>
              <p style={{ fontSize: '12px', color: '#999' }}>Verifique sua conexão com a internet</p>
            </div>
          )}
          <div 
            ref={this.mapRef} 
            className="leaflet-map"
            style={{ width: '100%', height: '100%' }}
          />
          {!mapLoaded && !mapError && (
            <div className="map-loading">Carregando mapa...</div>
          )}
        </div>
      </div>
    );
  }
}

(MapView as any).propTypes = {
  center: PropTypes.object.isRequired,
  zoom: PropTypes.number.isRequired,
  delivery: PropTypes.object
};

export default MapView;
