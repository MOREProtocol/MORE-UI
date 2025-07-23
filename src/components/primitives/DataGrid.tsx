import React, { useMemo, useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Skeleton,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material';

export interface ColumnDefinition<T> {
  key: keyof T;
  label: string;
  sortable: boolean;
  render: (row: T) => React.ReactNode;
  skeletonRender?: () => React.ReactNode;
}

interface BaseDataGridProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  defaultSortColumn?: keyof T;
  defaultSortOrder?: 'asc' | 'desc';
  actionColumn?: {
    render: (row: T) => React.ReactNode;
    skeletonRender?: () => React.ReactNode;
  };
  minWidth?: string | number;
  rowIdGetter?: (row: T, index: number) => string | number;
}

type SortOrder = 'asc' | 'desc';

export function BaseDataGrid<T>({
  data,
  columns,
  loading = false,
  onRowClick,
  defaultSortColumn,
  defaultSortOrder = 'desc',
  actionColumn,
  minWidth = 650,
  rowIdGetter = (_row: T, index: number) => index,
}: BaseDataGridProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [orderBy, setOrderBy] = useState<keyof T | undefined>(defaultSortColumn);
  const [order, setOrder] = useState<SortOrder>(defaultSortOrder);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!data.length || !orderBy) return data;

    return [...data].sort((a, b) => {
      const aValue: T[keyof T] = a[orderBy];
      const bValue: T[keyof T] = b[orderBy];

      // Handle undefined/null values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return order === 'asc' ? -1 : 1;
      if (bValue == null) return order === 'asc' ? 1 : -1;

      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aStr = aValue.toLowerCase();
        const bStr = bValue.toLowerCase();
        if (aStr < bStr) return order === 'asc' ? -1 : 1;
        if (aStr > bStr) return order === 'asc' ? 1 : -1;
        return 0;
      }

      // Fallback: convert to string and compare
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (aStr < bStr) return order === 'asc' ? -1 : 1;
      if (aStr > bStr) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, orderBy, order]);

  const handleSort = (column: keyof T) => {
    const isAsc = orderBy === column && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(column);
  };

  const handleRowClick = (row: T) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  if (loading) {
    return (
      <TableContainer
        component={Box}
        sx={{
          borderRadius: 2,
          backgroundColor: 'background.surface',
          overflowX: 'auto',
          '& .MuiTable-root': {
            minWidth: isMobile ? 600 : minWidth,
            tableLayout: 'auto',
          }
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
              {columns.map((column) => (
                <TableCell
                  key={String(column.key)}
                  sx={{
                    fontWeight: 600,
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    padding: isMobile ? '8px 4px' : '14px'
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
              {actionColumn && (
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    padding: isMobile ? '8px 4px' : '12px',
                    position: 'sticky',
                    right: 0,
                    zIndex: 2,
                  }}
                />
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3].map((index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell
                    key={String(column.key)}
                    sx={{
                      padding: isMobile ? '8px 4px' : '16px'
                    }}
                  >
                    {column.skeletonRender ? column.skeletonRender() : (
                      <Skeleton variant="text" width={80} height={20} />
                    )}
                  </TableCell>
                ))}
                {actionColumn && (
                  <TableCell
                    sx={{
                      padding: isMobile ? '8px 4px' : '16px',
                      textAlign: 'right',
                      width: 'auto',
                      minWidth: isMobile ? '80px' : '120px',
                      position: 'sticky',
                      right: 0,
                      zIndex: 2,
                    }}
                  >
                    {actionColumn.skeletonRender ? actionColumn.skeletonRender() : (
                      <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer
      component={Box}
      sx={{
        borderRadius: 2,
        backgroundColor: 'background.paper',
        overflowX: 'auto',
        '& .MuiTable-root': {
          minWidth: isMobile ? 600 : minWidth,
          tableLayout: 'auto',
        }
      }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.surface' }}>
            {columns.map((column) => (
              <TableCell key={String(column.key)}>
                {column.sortable ? (
                  <TableSortLabel
                    active={orderBy === column.key}
                    direction={orderBy === column.key ? order : 'asc'}
                    onClick={() => handleSort(column.key)}
                    sx={{
                      fontWeight: 600,
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      '& .MuiTableSortLabel-root': {
                        padding: isMobile ? '4px' : '8px'
                      }
                    }}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  <span style={{
                    fontWeight: 600,
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }}>
                    {column.label}
                  </span>
                )}
              </TableCell>
            ))}
            {actionColumn && (
              <TableCell
                sx={{
                  fontWeight: 600,
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  textAlign: 'right',
                  width: 'auto',
                  minWidth: isMobile ? '80px' : '120px',
                  paddingLeft: isMobile ? '8px' : '16px',
                  position: 'sticky',
                  right: 0,
                  zIndex: 2,
                }}
              />
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedData.map((row, index) => {
            const rowId = typeof rowIdGetter === 'function' ? rowIdGetter(row, index) : index;
            return (
              <TableRow
                key={rowId}
                onClick={() => handleRowClick(row)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  minHeight: isMobile ? '48px' : '64px',
                  '&:hover': onRowClick ? {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  } : {},
                  '& .MuiTableCell-root': {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    py: isMobile ? 1 : 2,
                    px: isMobile ? 1 : 2,
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    overflow: 'visible',
                  },
                }}
              >
                {columns.map((column) => (
                  <TableCell key={String(column.key)}>
                    {column.render(row)}
                  </TableCell>
                ))}
                {actionColumn && (
                  <TableCell
                    sx={{
                      textAlign: 'right',
                      width: 'auto',
                      minWidth: isMobile ? '80px' : '120px',
                      paddingLeft: isMobile ? '8px' : '16px',
                      position: 'sticky',
                      right: 0,
                    }}
                  >
                    {actionColumn.render(row)}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
} 