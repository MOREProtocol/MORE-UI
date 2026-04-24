import { alpha, useTheme } from '@mui/material/styles';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  AreaData,
  SeriesPartialOptionsMap,
  Time,
  UTCTimestamp,
  BusinessDay,
  LineSeries,
  AreaSeries,
} from 'lightweight-charts';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Typography } from '@mui/material';
import { TimePeriod } from './timePeriods';
import { TimePeriodSelector } from './TimePeriodSelector';
import { createValueFormatter } from './formatters';
import { sortAndDeduplicateByTime, filterByPeriod, computeVisibleLogicalRange } from './dataUtils';
import { ChartDataPoint } from './types';

function makeLineSeriesOptions(
  effectiveLineColor: string,
  priceFormatter: (value: number) => string,
  yAxisFormat?: string
): SeriesPartialOptionsMap['Line'] {
  return {
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
}

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
  areaGradient?: boolean;
  hideAxis?: boolean;
}

interface BaseChartProps {
  data: ChartDataPoint[];
  height: number;
  lineColor?: string;
  isInteractive?: boolean;
  title?: string;
  isSmall?: boolean;
  yAxisFormat?: string;
  areaGradient?: boolean;
  hideAxis?: boolean;
}

const BaseLightweightChart: React.FC<BaseChartProps> = ({
  data,
  height,
  lineColor,
  isInteractive = true,
  title,
  isSmall = false,
  yAxisFormat,
  areaGradient = false,
  hideAxis = false,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const spacerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const visibleSeriesRefs = useRef<Array<ISeriesApi<'Line' | 'Area'>>>([]);
  const theme = useTheme();

  const effectiveLineColor = lineColor ?? theme.palette.other.chartHighlight;

  const isChartStale = useMemo(() => {
    if (!data?.length) return false;

    const latestSeconds = Math.max(...data.map((d) => (d.time as number)));
    if (!Number.isFinite(latestSeconds)) return false;

    const latestMs = latestSeconds * 1000;
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    return Date.now() - latestMs > TWO_DAYS_MS;
  }, [data]);

  useEffect(() => {
    if (!chartContainerRef.current || height <= 0) {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        spacerSeriesRef.current = null;
        visibleSeriesRefs.current = [];
      }
      return;
    }

    const chartElement = chartContainerRef.current;
    const currentWidth = chartElement.clientWidth;

    if (currentWidth <= 0) {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        spacerSeriesRef.current = null;
        visibleSeriesRefs.current = [];
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
          visible: !hideAxis,
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
          visible: !hideAxis,
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

      const seriesOptions = makeLineSeriesOptions(effectiveLineColor, priceFormatter, yAxisFormat);

      // Spacer series keeps time scale spacing, but never draws a line.
      spacerSeriesRef.current = chartRef.current.addSeries(LineSeries, {
        ...seriesOptions,
        lineVisible: false,
        pointMarkersVisible: false,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });

      visibleSeriesRefs.current = [];
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

      spacerSeriesRef.current?.applyOptions({
        lineVisible: false,
        color: effectiveLineColor,
        priceFormat: yAxisFormat ? {
          type: 'custom',
          formatter: priceFormatter,
        } : undefined,
      });

      for (const s of visibleSeriesRefs.current) {
        s.applyOptions({
          color: effectiveLineColor,
          priceFormat: yAxisFormat ? {
            type: 'custom',
            formatter: priceFormatter,
          } : undefined,
        });
      }
    }

    // Ensure we have exactly one visible series.
    if (chartRef.current) {
      const desiredCount = data?.length > 0 ? 1 : 0;
      const currentCount = visibleSeriesRefs.current.length;

      if (currentCount > desiredCount) {
        const toRemove = visibleSeriesRefs.current.splice(desiredCount);
        for (const s of toRemove) chartRef.current.removeSeries(s);
      } else if (currentCount < desiredCount) {
        for (let i = currentCount; i < desiredCount; i++) {
          if (areaGradient) {
            const topColor = alpha(effectiveLineColor, 0.3);
            const bottomColor = alpha(effectiveLineColor, 0.0);
            visibleSeriesRefs.current.push(
              chartRef.current.addSeries(AreaSeries, {
                lineColor: effectiveLineColor,
                lineWidth: 2,
                topColor,
                bottomColor,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
                priceFormat: yAxisFormat ? {
                  type: 'custom',
                  formatter: priceFormatter,
                } : undefined,
              } as SeriesPartialOptionsMap['Area'])
            );
          } else {
            const seriesOptions = makeLineSeriesOptions(effectiveLineColor, priceFormatter, yAxisFormat);
            visibleSeriesRefs.current.push(chartRef.current.addSeries(LineSeries, seriesOptions));
          }
        }
      }
    }

    if (spacerSeriesRef.current && data?.length > 0) {
      const sortedData = sortAndDeduplicateByTime(data, (d) => (d.time as number));
      spacerSeriesRef.current.setData(sortedData as Array<LineData<Time>>);

      if (visibleSeriesRefs.current[0]) {
        visibleSeriesRefs.current[0].setData(sortedData as Array<LineData<Time> | AreaData<Time>>);
      }

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
    } else if (spacerSeriesRef.current) {
      spacerSeriesRef.current.setData([]);
      for (const s of visibleSeriesRefs.current) s.setData([]);
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
  }, [
    data,
    height,
    effectiveLineColor,
    chartContainerRef.current,
    theme,
    isInteractive,
    isSmall,
    yAxisFormat,
    areaGradient,
    hideAxis,
  ]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        spacerSeriesRef.current = null;
        if (visibleSeriesRefs.current) visibleSeriesRefs.current = [];
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
      {isChartStale && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            padding: '12px',
          }}
        >
          <Typography
            variant={isSmall ? 'secondary12' : 'secondary14'}
            sx={{
              color: theme.palette.text.secondary,
              backgroundColor: alpha(theme.palette.background.paper, 0.72),
              border: `1px solid ${alpha(theme.palette.text.secondary, 0.16)}`,
              borderRadius: 1,
              px: 1.5,
              py: 0.75,
              maxWidth: '90%',
              textAlign: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            ⚠️ Chart data is not up to date
          </Typography>
        </div>
      )}
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
  areaGradient = false,
  hideAxis = false,
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
        areaGradient={areaGradient}
        hideAxis={hideAxis}
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
