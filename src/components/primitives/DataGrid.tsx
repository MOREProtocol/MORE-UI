import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  alpha,
  Typography,
  Divider,
  Select,
  MenuItem,
} from '@mui/material';

export interface ColumnDefinition<T> {
  key: keyof T;
  label: string;
  sortable: boolean;
  render: (row: T) => React.ReactNode;
  skeletonRender?: () => React.ReactNode;
  headerRender?: () => React.ReactNode;
  mobileRender?: (row: T) => React.ReactNode;
  hideOnMobile?: boolean;
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
  hideActionsWhenOverflow?: boolean;
  mobileCardMode?: boolean;
  mobileRowRender?: (row: T) => React.ReactNode;
  headerMessage?: React.ReactNode;
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
  hideActionsWhenOverflow = true,
  mobileCardMode,
  mobileRowRender,
  headerMessage,
}: BaseDataGridProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [orderBy, setOrderBy] = useState<keyof T | undefined>(defaultSortColumn);
  const [order, setOrder] = useState<SortOrder>(defaultSortOrder);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const hideOnOverflow = hideActionsWhenOverflow && hasOverflow;
  const useMobileCards = (mobileCardMode ?? isMobile);

  useEffect(() => {
    const updateOverflow = () => {
      const el = containerRef.current;
      if (!el) return;
      // el.firstElementChild may be the actual scrollable container, but TableContainer is the Box with overflowX auto
      setHasOverflow(el.scrollWidth > el.clientWidth);
    };
    updateOverflow();
    window.addEventListener('resize', updateOverflow);
    const id = setInterval(updateOverflow, 250);
    return () => {
      window.removeEventListener('resize', updateOverflow);
      clearInterval(id);
    };
  }, [data, columns, minWidth, isMobile, hideActionsWhenOverflow]);

  // Keep sorting in sync if caller changes defaults (e.g., on tab switch)
  useEffect(() => {
    setOrderBy(defaultSortColumn);
  }, [defaultSortColumn]);

  useEffect(() => {
    setOrder(defaultSortOrder);
  }, [defaultSortOrder]);

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

  // Mobile card mode: loading skeletons
  if (loading && useMobileCards) {
    const sortableColumns = columns.filter((c) => c.sortable);
    return (
      <Box ref={containerRef} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sortableColumns.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'background.surface',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography variant="secondary14" color="text.secondary">Sort by</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="rounded" width={120} height={32} />
              <Skeleton variant="circular" width={28} height={28} />
            </Box>
          </Box>
        )}
        {[1, 2, 3].map((index) => (
          <Box
            key={`mobile-skeleton-${index}`}
            sx={{
              borderRadius: 2,
              bgcolor: 'background.paper',
              p: 2,
              boxShadow: 'none',
            }}
          >
            {columns.map((column, columnIndex) => (
              <Box key={`mobile-skel-field-${index}-${columnIndex}`} sx={{ py: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="description" color="text.secondary" sx={{ flex: '0 0 45%' }}>
                    {column.label}
                  </Typography>
                  <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    {column.skeletonRender ? column.skeletonRender() : (
                      <Skeleton variant="text" width={120} height={20} />
                    )}
                  </Box>
                </Box>
                {columnIndex < columns.length - 1 && <Divider sx={{ mt: 1.25 }} />}
              </Box>
            ))}
            {actionColumn && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                {actionColumn.skeletonRender ? actionColumn.skeletonRender() : (
                  <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  }

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
              {columns.map((column, columnIndex) => (
                <TableCell
                  key={`header-${columnIndex}`}
                  sx={{
                    fontWeight: 600,
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    padding: isMobile ? '8px 4px' : '14px'
                  }}
                >
                  {column.headerRender ? column.headerRender() : column.label}
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
                {columns.map((column, columnIndex) => (
                  <TableCell
                    key={`skeleton-${index}-${columnIndex}`}
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

  // Mobile card mode: data rendering
  if (useMobileCards) {
    const sortableColumns = columns.filter((c) => c.sortable);
    const orderByIsValid = orderBy && columns.some((c) => c.key === orderBy);

    return (
      <Box ref={containerRef} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sortableColumns.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'background.surface',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography variant="secondary14" color="text.secondary">Sort by</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Select
                size="small"
                value={(orderByIsValid ? (orderBy as string) : (sortableColumns[0]?.key as string)) || ''}
                onChange={(e) => {
                  const next = e.target.value as keyof T;
                  setOrderBy(next);
                }}
                sx={{ minWidth: 140 }}
              >
                {sortableColumns.map((c) => (
                  <MenuItem key={String(c.key)} value={String(c.key)}>{c.label}</MenuItem>
                ))}
              </Select>
              <TableSortLabel
                active
                direction={order}
                onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
              />
            </Box>
          </Box>
        )}

        {headerMessage && (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2, mt: -1 }}>
            {headerMessage}
          </Box>
        )}

        {sortedData.map((row, index) => {
          const rowId = typeof rowIdGetter === 'function' ? rowIdGetter(row, index) : index;
          return (
            <Box
              key={`mobile-row-${rowId}`}
              onClick={() => handleRowClick(row)}
              sx={{
                borderRadius: 2,
                bgcolor: 'background.paper',
                p: 2,
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': onRowClick ? { bgcolor: alpha(theme.palette.primary.main, 0.04) } : {},
              }}
            >
              {mobileRowRender ? (
                mobileRowRender(row)
              ) : (
                <>
                  {columns.filter((c) => !c.hideOnMobile).map((column, columnIndex, visibleColumns) => (
                    <Box key={`mobile-field-${rowId}-${columnIndex}`} sx={{ py: 1.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Typography variant="description" color="text.secondary" sx={{ flex: '0 0 45%' }}>
                          {column.label}
                        </Typography>
                        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', textAlign: 'right', minWidth: 0 }}>
                          {(column.mobileRender || column.render)(row)}
                        </Box>
                      </Box>
                      {columnIndex < visibleColumns.length - 1 && <Divider sx={{ mt: 1.25 }} />}
                    </Box>
                  ))}
                </>
              )}

              {actionColumn && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                  {actionColumn.render(row)}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <TableContainer
      component={Box}
      ref={containerRef}
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
            {columns.map((column, columnIndex) => (
              <TableCell key={`header-main-${columnIndex}`}>
                {column.headerRender ? (
                  column.headerRender()
                ) : column.sortable ? (
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
          {headerMessage && (
            <TableRow>
              <TableCell
                colSpan={columns.length + (actionColumn ? 1 : 0)}
                sx={{ p: 0, border: 0 }}
              >
                {headerMessage}
              </TableCell>
            </TableRow>
          )}
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
                  ...(hideOnOverflow ? { '&:hover .datagrid-action': { opacity: 1 } } : {}),
                }}
              >
                {columns.map((column, columnIndex) => (
                  <TableCell key={`row-${rowId}-${columnIndex}`}>
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
                      '& .datagrid-action': {
                        opacity: hideOnOverflow ? 0 : 1,
                        transition: 'opacity 0.15s ease',
                      },
                    }}
                  >
                    <Box className="datagrid-action">
                      {actionColumn.render(row)}
                    </Box>
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