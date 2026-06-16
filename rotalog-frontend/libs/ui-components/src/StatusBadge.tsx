import React from 'react';
import PropTypes from 'prop-types';

// TODO: Componente pobremente abstraído
export const StatusBadge = ({ status, label }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#fff3cd';
      case 'in_progress':
        return '#cfe2ff';
      case 'completed':
        return '#d1e7dd';
      case 'cancelled':
        return '#f8d7da';
      default:
        return '#e0e0e0';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'pending':
        return '#856404';
      case 'in_progress':
        return '#084298';
      case 'completed':
        return '#0f5132';
      case 'cancelled':
        return '#842029';
      default:
        return '#333';
    }
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: getStatusColor(status),
        color: getStatusTextColor(status)
      }}
    >
      {label || status}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  label: PropTypes.string
};
