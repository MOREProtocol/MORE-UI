import { useTheme } from '@mui/material/styles';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  SeriesPartialOptionsMap,
  Time,
  UTCTimestamp,
  BusinessDay,
  CandlestickSeries,
  CandlestickData
} from 'lightweight-charts';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Typography, Box } from '@mui/material';
import { TimePeriod } from './timePeriods';
import { TimePeriodSelector } from './TimePeriodSelector';
import { formatCurrencyCompact, formatPercent } from './formatters';
import { sortAndDeduplicateByTime, filterByPeriod, computeVisibleLogicalRange } from './dataUtils';

interface PnLDataPoint {
  time: Time;
  value: number;
  color?: string;
}

interface PnLChartProps {
  data: Array<{ time: string; value: number }>;
  percentData?: Array<{ time: string; value: number }>;
  height: number;
  title?: string;
  isInteractive?: boolean;
  isSmall?: boolean;
  topOffset?: number;
  showTimePeriodSelector?: boolean;
  selectedPeriod?: TimePeriod;
  onPeriodChange?: (period: TimePeriod) => void;
}

interface BasePnLChartProps {
  data: PnLDataPoint[];
  percentData?: PnLDataPoint[];
  height: number;
  isInteractive?: boolean;
  title?: string;
  isSmall?: boolean;
  topOffset?: number;
  showTimePeriodSelector?: boolean;
  selectedPeriod?: TimePeriod;
  onPeriodChange?: (period: TimePeriod) => void;
}

const BasePnLChart: React.FC<BasePnLChartProps> = ({
  data,
  height,
  isInteractive = true,
  title,
  isSmall = false,
  topOffset = 0,
  showTimePeriodSelector = true,
  selectedPeriod: controlledSelectedPeriod,
  onPeriodChange,
  percentData,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const dailyPnLMapRef = useRef<Map<number, number>>(new Map());
  const theme = useTheme();

  const [uncontrolledSelectedPeriod, setUncontrolledSelectedPeriod] = useState<TimePeriod>('3m');
  const selectedPeriod = controlledSelectedPeriod ?? uncontrolledSelectedPeriod;
  const [crosshairData, setCrosshairData] = useState<{
    time: string;
    ts: number;
    value: number;
    dailyPnL: number;
  } | null>(null);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return data;

    const now = new Date();
    let cutoffDate: Date;

    switch (selectedPeriod) {
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        cutoffDate = new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return data;
    }

    return data.filter(item => (item.time as number) * 1000 >= cutoffDate.getTime());
  }, [data, selectedPeriod]);

  const sortedFilteredData = sortAndDeduplicateByTime(filteredData, (d) => (d.time as number));

  const filteredPercent = useMemo(() => {
    if (!percentData || percentData.length === 0) return [] as PnLDataPoint[];
    const now = new Date();
    let cutoffDate: Date | undefined;
    switch (selectedPeriod) {
      case '7d': cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '1m': cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '3m': cutoffDate = new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000); break;
      case '1y': cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      default: break;
    }
    const filtered = cutoffDate
      ? percentData.filter(item => (item.time as number) * 1000 >= cutoffDate!.getTime())
      : percentData;
    return sortAndDeduplicateByTime(filtered, (d) => (d.time as number));
  }, [percentData, selectedPeriod]);

  let cumulativePnL = 0;
  let cumulativePercent = 0;
  sortedFilteredData.forEach(item => {
    cumulativePnL += item.value;
  });
  filteredPercent.forEach(item => {
    cumulativePercent += item.value;
  });

  useEffect(() => {
    if (!chartContainerRef.current || height <= 0) {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
      return;
    }

    const chartElement = chartContainerRef.current;
    const currentWidth = chartElement.clientWidth;

    if (currentWidth <= 0) {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
      return;
    }

    const detailedTimeFormatter = (timeValue: BusinessDay | UTCTimestamp): string => {
      let date: Date;
      if (typeof timeValue === 'number') {
        date = new Date(timeValue * 1000);
      } else {
        date = new Date(Date.UTC(timeValue.year, timeValue.month - 1, timeValue.day));
      }

      const day = date.getDate().toString().padStart(2, '0');
      const monthName = date.toLocaleString(undefined, { month: 'short' });
      const year = date.getFullYear();
      return `${monthName} ${day}, ${year}`;
    };

    const priceFormatter = (price: number): string => formatCurrencyCompact(price, '$');

    if (!chartRef.current) {
      const chartOptions = {
        width: currentWidth,
        height: height,
        layout: {
          background: { color: 'transparent' },
          textColor: theme.palette.text.secondary,
          attributionLogo: false,
        },
        localization: {
          timeFormatter: detailedTimeFormatter,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        timeScale: {
          rightOffset: isSmall ? 2 : 12,
          minBarSpacing: 0.1,
          timeVisible: isSmall,
          secondsVisible: false,
          tickMarkFormatter: (time: UTCTimestamp) => {
            const date = new Date(time * 1000);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            return `${day}/${month}`;
          },
          borderVisible: false,
          fixLeftEdge: false,
          fixRightEdge: false,
          shiftVisibleRangeOnNewBar: false,
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
        },
        rightPriceScale: {
          borderVisible: false,
          ticksVisible: isSmall,
        },
        handleScroll: isInteractive,
        handleScale: isInteractive,
        crosshair: {
          mode: isInteractive ? 1 : 2,
          vertLine: {
            labelVisible: isInteractive,
            visible: isInteractive,
          },
          horzLine: {
            labelVisible: isInteractive,
            visible: isInteractive,
          },
        },
        trackingMode: {
          exitMode: 1,
        },
      } as const;
      chartRef.current = createChart(chartElement, chartOptions);

      const seriesOptions: SeriesPartialOptionsMap['Candlestick'] = {
        priceFormat: {
          type: 'custom',
          formatter: priceFormatter,
        },
        upColor: theme.palette.success.main,
        downColor: theme.palette.error.main,
        borderUpColor: theme.palette.success.main,
        borderDownColor: theme.palette.error.main,
        wickUpColor: 'transparent',
        wickDownColor: 'transparent',
        priceLineVisible: false,
        lastValueVisible: false,
      };
      seriesRef.current = chartRef.current.addSeries(CandlestickSeries, seriesOptions);

      if (isInteractive) {
        chartRef.current.subscribeCrosshairMove((param) => {
          if (param.time && param.seriesData && seriesRef.current) {
            const seriesData = param.seriesData.get(seriesRef.current) as CandlestickData;
            if (seriesData) {
              const value = seriesData.close;
              const timeStr = detailedTimeFormatter(param.time as UTCTimestamp);
              const timestamp = param.time as number;
              const dailyPnL = dailyPnLMapRef.current.get(timestamp) || 0;

              setCrosshairData({
                time: timeStr,
                ts: timestamp,
                value: value,
                dailyPnL: dailyPnL,
              });
            }
          } else {
            setCrosshairData(null);
          }
        });
      }
    } else {
      chartRef.current.applyOptions({
        width: currentWidth,
        height: height,
        layout: {
          background: { color: 'transparent' },
          textColor: theme.palette.text.secondary,
        },
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });

      if (seriesRef.current) {
        seriesRef.current.applyOptions({
          priceFormat: {
            type: 'custom',
            formatter: priceFormatter,
          },
          upColor: theme.palette.success.main,
          downColor: theme.palette.error.main,
          borderUpColor: theme.palette.success.main,
          borderDownColor: theme.palette.error.main,
          wickUpColor: 'transparent',
          wickDownColor: 'transparent',
        });
      }
    }

    if (seriesRef.current && filteredData.length > 0) {
      const sortedData = sortAndDeduplicateByTime(filteredData, (d) => (d.time as number));

      let cumulativeValue = 0;
      const candlestickData: CandlestickData[] = [];
      dailyPnLMapRef.current.clear();

      sortedData.forEach((item) => {
        const dailyPnL = item.value;
        const openValue = cumulativeValue;
        cumulativeValue += dailyPnL;
        const closeValue = cumulativeValue;

        dailyPnLMapRef.current.set(item.time as number, dailyPnL);

        const candlestick: CandlestickData = {
          time: item.time,
          open: openValue,
          high: Math.max(openValue, closeValue),
          low: Math.min(openValue, closeValue),
          close: closeValue,
        };

        candlestickData.push(candlestick);
      });

      seriesRef.current.setData(candlestickData);

      if (chartRef.current) {
        setTimeout(() => {
          chartRef.current?.timeScale().resetTimeScale();
          chartRef.current?.timeScale().fitContent();
          chartRef.current?.priceScale('right').applyOptions({
            autoScale: true,
          });
          chartRef.current?.timeScale().setVisibleLogicalRange(
            computeVisibleLogicalRange(sortedData.length)
          );
        }, 10);
      }
    } else {
      if (seriesRef.current) {
        seriesRef.current.setData([]);
      }
    }

    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      chartRef.current?.applyOptions({ width });
    });
    resizeObserver.observe(chartElement);

    return () => {
      resizeObserver.unobserve(chartElement);
    };
  }, [filteredData, height, chartContainerRef.current, theme, isInteractive, isSmall]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  const formatCurrency = (value: number) => formatCurrencyCompact(value, '$');

  // Percent helpers (daily delta and cumulative)
  const dailyPercentMap = useMemo(() => {
    const map = new Map<number, number>();
    filteredPercent.forEach((p) => map.set(p.time as number, p.value));
    return map;
  }, [filteredPercent]);

  const lastPercentDelta = filteredPercent.length > 0 ? filteredPercent[filteredPercent.length - 1].value : 0;

  const displayData = crosshairData || {
    time: sortedFilteredData.length > 0 ? new Date(sortedFilteredData[sortedFilteredData.length - 1].time as number * 1000).toLocaleDateString() : '',
    value: cumulativePnL,
    dailyPnL: sortedFilteredData.length > 0 ? sortedFilteredData[sortedFilteredData.length - 1].value : 0,
  };

  // Map daily percent by timestamp to match crosshair day
  const dailyPercent = crosshairData ? (dailyPercentMap.get(crosshairData.ts) || 0) : lastPercentDelta;
  const cumulativePercentDisplay = cumulativePercent;

  return (
    <div style={{ position: 'relative', height: `${height}px`, width: '100%' }}>
      <div
        ref={chartContainerRef}
        style={{
          position: 'relative',
          height: `${height}px`,
          width: '100%',
          display: 'block',
          WebkitMask: 'linear-gradient(to right, transparent 0px, black 6px, black calc(100% - 6px), transparent 100%), linear-gradient(to bottom, transparent 0px, black 6px, black calc(100% - 6px), transparent 100%)',
          mask: 'linear-gradient(to right, transparent 0px, black 6px, black calc(100% - 6px), transparent 100%), linear-gradient(to bottom, transparent 0px, black 6px, black calc(100% - 6px), transparent 100%)',
          WebkitMaskComposite: 'intersect',
          maskComposite: 'intersect',
        }}
      />

      {isInteractive && (
        <Box
          sx={{
            position: 'absolute',
            top: 8 + topOffset,
            left: 8,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          {title && (
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                display: 'block',
                mb: 0.5,
              }}
            >
              {title}
            </Typography>
          )}
          <Typography
            variant="secondary14"
            sx={{
              color: (crosshairData ? displayData.dailyPnL : displayData.value) >= 0 ? theme.palette.success.main : theme.palette.error.main,
              fontWeight: 500,
            }}
          >
            {crosshairData ? 'Daily P&L' : 'Cumulative P&L'}: {crosshairData ? formatPercent(dailyPercent * 100) : formatPercent(cumulativePercentDisplay * 100)} ({formatCurrency(Math.abs(crosshairData ? displayData.dailyPnL : displayData.value))})
          </Typography>
        </Box>
      )}

      {showTimePeriodSelector && (
        <TimePeriodSelector
          selectedPeriod={selectedPeriod}
          onChange={(period) => {
            if (onPeriodChange) onPeriodChange(period);
            if (controlledSelectedPeriod === undefined) setUncontrolledSelectedPeriod(period);
          }}
        />
      )}
    </div>
  );
};

export const PnLChart: React.FC<PnLChartProps> = ({
  data,
  height,
  title,
  isInteractive = true,
  isSmall = false,
  topOffset = 0,
  showTimePeriodSelector = true,
  selectedPeriod,
  onPeriodChange,
}) => {
  const filtered = filterByPeriod(data, (d) => new Date(d.time).getTime(), selectedPeriod ?? '3m');
  const formattedData: PnLDataPoint[] = filtered
    ?.map(item => ({
      ...item,
      time: new Date(item.time).getTime() / 1000 as Time,
    })) || [];

  return (
    <BasePnLChart
      data={formattedData}
      height={height}
      isInteractive={isInteractive}
      title={title}
      isSmall={isSmall}
      topOffset={topOffset}
      showTimePeriodSelector={showTimePeriodSelector}
      selectedPeriod={selectedPeriod}
      onPeriodChange={onPeriodChange}
    />
  );
};


