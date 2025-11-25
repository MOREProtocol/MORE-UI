import { useTheme } from '@mui/material/styles';
import { createChart, IChartApi, ISeriesApi, LineData, SeriesPartialOptionsMap, Time, UTCTimestamp, BusinessDay, LineSeries } from 'lightweight-charts';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Typography } from '@mui/material';
import { TimePeriod } from './timePeriods';
import { TimePeriodSelector } from './TimePeriodSelector';
import { createValueFormatter } from './formatters';
import { sortAndDeduplicateByTime, filterByPeriod, computeVisibleLogicalRange } from './dataUtils';
import { ChartDataPoint } from './types';

interface LineChartProps {
  data: Array<{ time: string; value: number }>;
  height: number;
  lineColor?: string;
  title?: string;
  isInteractive?: boolean;
  isSmall?: boolean;
  yAxisFormat?: string;
  showTimePeriodSelector?: boolean;
  selectedPeriod?: TimePeriod;
  onPeriodChange?: (period: TimePeriod) => void;
}

interface BaseChartProps {
  data: ChartDataPoint[];
  height: number;
  lineColor?: string;
  isInteractive?: boolean;
  title?: string;
  isSmall?: boolean;
  yAxisFormat?: string;
}

const BaseLightweightChart: React.FC<BaseChartProps> = ({
  data,
  height,
  lineColor,
  isInteractive = true,
  title,
  isSmall = false,
  yAxisFormat,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const theme = useTheme(); // used in title color

  const effectiveLineColor = lineColor ?? theme.palette.other.chartHighlight;

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
      const year = date.getFullYear().toString().slice(-2);
      return `${day} ${monthName} ${year}`;
    };

    const priceFormatter = createValueFormatter(yAxisFormat);

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

      const seriesOptions: SeriesPartialOptionsMap['Line'] = {
        color: effectiveLineColor,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: yAxisFormat ? {
          type: 'custom',
          formatter: priceFormatter,
        } : undefined,
      };
      seriesRef.current = chartRef.current.addSeries(LineSeries, seriesOptions);
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
          color: effectiveLineColor,
          priceFormat: yAxisFormat ? {
            type: 'custom',
            formatter: priceFormatter,
          } : undefined,
        });
      }
    }

    if (seriesRef.current && data.length > 0) {
      const sortedData = sortAndDeduplicateByTime(data, (d) => (d.time as number));
      seriesRef.current.setData(sortedData as LineData<Time>[]);

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
    } else if (seriesRef.current) {
      seriesRef.current.setData([]);
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
  }, [data, height, effectiveLineColor, chartContainerRef.current, theme, isInteractive, isSmall, yAxisFormat]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={chartContainerRef} style={{
      position: 'relative',
      height: `${height}px`,
      width: '100%',
      display: 'block',
      WebkitMask: 'linear-gradient(to right, transparent 0px, black 6px, black calc(100% - 6px), transparent 100%), linear-gradient(to bottom, transparent 0px, black 6px, black calc(100% - 6px), transparent 100%)',
      mask: 'linear-gradient(to right, transparent 0px, black 6px, black calc(100% - 6px), transparent 100%), linear-gradient(to bottom, transparent 0px, black 6px, black calc(100% - 6px), transparent 100%)',
      WebkitMaskComposite: 'intersect',
      maskComposite: 'intersect',
    }}>
      {title && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 10,
            color: theme.palette.text.secondary,
          }}
        >
          {title}
        </Typography>
      )}
    </div>
  );
};

export const LineChart: React.FC<LineChartProps> = ({
  data,
  height,
  lineColor,
  title,
  isInteractive = true,
  isSmall = false,
  yAxisFormat,
  showTimePeriodSelector = true,
  selectedPeriod: controlledSelectedPeriod,
  onPeriodChange,
}) => {

  const [uncontrolledSelectedPeriod, setUncontrolledSelectedPeriod] = useState<TimePeriod>('3m');
  const selectedPeriod = controlledSelectedPeriod ?? uncontrolledSelectedPeriod;

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return data;
    return filterByPeriod(data, (d) => new Date(d.time).getTime(), selectedPeriod);
  }, [data, selectedPeriod]);

  const formattedData: ChartDataPoint[] = filteredData
    ?.map(item => ({
      ...item,
      time: new Date(item.time).getTime() / 1000 as Time,
    })) || [];

  return (
    <div style={{ position: 'relative', height: `${height}px`, width: '100%' }}>
      <BaseLightweightChart
        data={formattedData}
        height={height}
        lineColor={lineColor}
        isInteractive={isInteractive}
        title={title}
        isSmall={isSmall}
        yAxisFormat={yAxisFormat}
      />

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


