import React from 'react';
import PropTypes from 'prop-types';

// TODO: Componente muito simples, sem paginação, sorting, filtering
export const DataTable = ({ columns, data, onRowClick }) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #ddd' }}>
          {columns.map((col) => (
            <th
              key={col.key}
              style={{
                padding: '1rem',
                textAlign: 'left',
                fontWeight: '600',
                fontSize: '13px',
                color: '#333'
              }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr
            key={idx}
            onClick={() => onRowClick && onRowClick(row)}
            style={{
              borderBottom: '1px solid #ddd',
              cursor: onRowClick ? 'pointer' : 'default',
              ':hover': { backgroundColor: '#f5f5f5' }
            }}
          >
            {columns.map((col) => (
              <td
                key={col.key}
                style={{
                  padding: '1rem',
                  fontSize: '13px',
                  color: '#666'
                }}
              >
                {row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  onRowClick: PropTypes.func
};
