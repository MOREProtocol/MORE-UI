import { alpha, useTheme } from '@mui/material/styles';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  SeriesPartialOptionsMap,
  Time,
  UTCTimestamp,
  BusinessDay,
  LineSeries,
  WhitespaceData,
} from 'lightweight-charts';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Typography } from '@mui/material';
import { TimePeriod } from './timePeriods';
import { TimePeriodSelector } from './TimePeriodSelector';
import { createValueFormatter } from './formatters';
import { sortAndDeduplicateByTime, filterByPeriod, computeVisibleLogicalRange } from './dataUtils';
import { ChartDataPoint } from './types';
import { VerticalLinesPrimitive } from './VerticalLinesPrimitive';
import { HiddenWindow, makeIsHiddenTime, selectHiddenWindows, toUtcTimestampSeconds } from './hiddenWindows';

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
  chainId?: number;
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
  hiddenWindows?: HiddenWindow[];
}

const BaseLightweightChart: React.FC<BaseChartProps> = ({
  data,
  height,
  lineColor,
  isInteractive = true,
  title,
  isSmall = false,
  yAxisFormat,
  hiddenWindows = [],
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const spacerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const visibleSeriesRefs = useRef<Array<ISeriesApi<'Line'>>>([]);
  const verticalLinesPrimitiveRef = useRef<VerticalLinesPrimitive | null>(null);
  const isCrosshairSuppressedRef = useRef<boolean>(false);
  const theme = useTheme(); // used in title color

  const effectiveLineColor = lineColor ?? theme.palette.other.chartHighlight;

  const [hiddenOverlay, setHiddenOverlay] = useState<{
    xCenter: number;
    maxWidth: number;
    message: string;
  } | null>(null);

  const isChartStale = useMemo(() => {
    if (!data?.length) return false;

    const latestSeconds = Math.max(...data.map((d) => (d.time as number)));
    if (!Number.isFinite(latestSeconds)) return false;

    const latestMs = latestSeconds * 1000;
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    return Date.now() - latestMs > TWO_DAYS_MS;
  }, [data]);

  const hiddenTimesForLines = useMemo(() => {
    // We want vertical markers at boundaries: start and end for each window.
    const times: Time[] = [];
    for (const w of hiddenWindows) {
      times.push(w.start as unknown as Time);
      times.push(w.end as unknown as Time);
    }
    return times;
  }, [hiddenWindows]);

  const seriesDataWithGaps = useMemo(() => {
    if (!data?.length || hiddenWindows.length === 0) return data as Array<LineData<Time>>;

    const isHiddenTime = makeIsHiddenTime(hiddenWindows);

    // Convert any in-window points to whitespace, and also ensure we insert explicit
    // whitespace points at each window boundary so the line can't "bridge" across
    // sparse datasets that have no samples inside the hidden range.
    const out: Array<LineData<Time> | WhitespaceData<Time>> = data.map((d) => {
      const t = d.time as number;
      if (isHiddenTime(t)) return { time: d.time } as WhitespaceData<Time>;
      return d as unknown as LineData<Time>;
    });

    for (const w of hiddenWindows) {
      out.push({ time: w.start as unknown as Time } as WhitespaceData<Time>);
      out.push({ time: w.end as unknown as Time } as WhitespaceData<Time>);
    }

    return out;
  }, [data, hiddenWindows]);

  const visibleSegments = useMemo(() => {
    if (!data?.length) return [] as Array<Array<LineData<Time>>>;
    if (!hiddenWindows.length) return [data as Array<LineData<Time>>];

    const isHiddenTime = makeIsHiddenTime(hiddenWindows);

    const sorted = sortAndDeduplicateByTime(data, (d) => (d.time as number)) as Array<LineData<Time>>;
    const segments: Array<Array<LineData<Time>>> = [];
    let current: Array<LineData<Time>> = [];

    for (const point of sorted) {
      const t = point.time as unknown as number;
      if (isHiddenTime(t)) {
        if (current.length) {
          segments.push(current);
          current = [];
        }
        continue;
      }
      current.push(point);
    }

    if (current.length) segments.push(current);
    return segments;
  }, [data, hiddenWindows]);

  const updateHiddenOverlayPosition = () => {
    const chart = chartRef.current;
    const container = chartContainerRef.current;
    if (!chart || !container) {
      setHiddenOverlay(null);
      return;
    }
    if (!hiddenWindows.length) {
      setHiddenOverlay(null);
      return;
    }

    // Show only the first window that intersects the currently visible time range.
    const visible = chart.timeScale().getVisibleRange();
    if (!visible) {
      setHiddenOverlay(null);
      return;
    }

    const visibleFrom = visible.from as number;
    const visibleTo = visible.to as number;

    const windowInView = hiddenWindows.find((w) => {
      const s = w.start as number;
      const e = w.end as number;
      return e >= visibleFrom && s <= visibleTo;
    });

    if (!windowInView) {
      setHiddenOverlay(null);
      return;
    }

    const xStart = chart.timeScale().timeToCoordinate(windowInView.start as unknown as Time);
    const xEnd = chart.timeScale().timeToCoordinate(windowInView.end as unknown as Time);

    if (xStart === null || xEnd === null) {
      setHiddenOverlay(null);
      return;
    }

    const left = Math.min(xStart, xEnd);
    const right = Math.max(xStart, xEnd);

    // If the hidden interval is fully off-screen, don't show the message.
    if (right < 0 || left > container.clientWidth) {
      setHiddenOverlay(null);
      return;
    }

    const xCenter = (left + right) / 2;
    const maxWidth = Math.max(120, right - left - 16);

    setHiddenOverlay({
      xCenter,
      maxWidth,
      message: windowInView.message,
    });
  };

  useEffect(() => {
    if (!chartContainerRef.current || height <= 0) {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        spacerSeriesRef.current = null;
        visibleSeriesRefs.current = [];
        verticalLinesPrimitiveRef.current = null;
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

      // Visible segments (one series per segment) avoid connecting across whitespace.
      visibleSeriesRefs.current = [];

      // Attach vertical dashed markers primitive (for hidden ranges boundaries).
      try {
        const pane = chartRef.current.panes()[0];
        const primitive = new VerticalLinesPrimitive({
          times: hiddenTimesForLines,
          color: alpha(theme.palette.text.secondary, 0.45),
          lineWidth: 1,
          dash: [4, 4],
        });
        pane.attachPrimitive(primitive);
        verticalLinesPrimitiveRef.current = primitive;
      } catch {
        // Fail-safe: don't break chart if primitives API differs.
        verticalLinesPrimitiveRef.current = null;
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

    // Update primitive times and style on changes.
    if (verticalLinesPrimitiveRef.current) {
      verticalLinesPrimitiveRef.current.updateTimes(hiddenTimesForLines);
      verticalLinesPrimitiveRef.current.updateStyle({
        color: alpha(theme.palette.text.secondary, 0.45),
      });
    }

    // Ensure we have the correct number of visible series for segments.
    if (chartRef.current) {
      const desiredCount = visibleSegments.length;
      const currentCount = visibleSeriesRefs.current.length;

      if (currentCount > desiredCount) {
        const toRemove = visibleSeriesRefs.current.splice(desiredCount);
        for (const s of toRemove) chartRef.current.removeSeries(s);
      } else if (currentCount < desiredCount) {
        for (let i = currentCount; i < desiredCount; i++) {
          const seriesOptions = makeLineSeriesOptions(effectiveLineColor, priceFormatter, yAxisFormat);
          visibleSeriesRefs.current.push(chartRef.current.addSeries(LineSeries, seriesOptions));
        }
      }
    }

    if (spacerSeriesRef.current && seriesDataWithGaps.length > 0) {
      const sortedData = sortAndDeduplicateByTime(seriesDataWithGaps, (d) => (d.time as number));
      spacerSeriesRef.current.setData(sortedData as Array<LineData<Time> | WhitespaceData<Time>>);

      // Update each visible segment series with its segment data.
      for (let i = 0; i < visibleSeriesRefs.current.length; i++) {
        const seg = visibleSegments[i] ?? [];
        visibleSeriesRefs.current[i].setData(seg);
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
          updateHiddenOverlayPosition();
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
      updateHiddenOverlayPosition();
    });
    resizeObserver.observe(chartElement);

    const onVisibleRangeChange = () => updateHiddenOverlayPosition();
    chartRef.current?.timeScale().subscribeVisibleTimeRangeChange(onVisibleRangeChange);

    const setCrosshairSuppressed = (suppressed: boolean) => {
      if (!chartRef.current) return;
      if (isCrosshairSuppressedRef.current === suppressed) return;
      isCrosshairSuppressedRef.current = suppressed;

      chartRef.current.applyOptions({
        crosshair: {
          mode: isInteractive ? 1 : 2,
          vertLine: {
            visible: isInteractive && !suppressed,
            labelVisible: isInteractive && !suppressed,
          },
          horzLine: {
            visible: isInteractive && !suppressed,
            labelVisible: isInteractive && !suppressed,
          },
        },
      });
    };

    const onCrosshairMove = (param: { time?: BusinessDay | UTCTimestamp | Time | null }) => {
      if (!isInteractive || hiddenWindows.length === 0) return;
      const t = toUtcTimestampSeconds(param?.time ?? null);
      if (t === null) {
        setCrosshairSuppressed(false);
        return;
      }
      const inHidden = hiddenWindows.some((w) => t >= (w.start as number) && t <= (w.end as number));
      setCrosshairSuppressed(inHidden);
    };

    chartRef.current?.subscribeCrosshairMove(onCrosshairMove);

    return () => {
      resizeObserver.unobserve(chartElement);
      chartRef.current?.timeScale().unsubscribeVisibleTimeRangeChange(onVisibleRangeChange);
      chartRef.current?.unsubscribeCrosshairMove(onCrosshairMove);
    };
  }, [
    seriesDataWithGaps,
    height,
    effectiveLineColor,
    chartContainerRef.current,
    theme,
    isInteractive,
    isSmall,
    yAxisFormat,
    hiddenTimesForLines,
    visibleSegments,
    hiddenWindows,
  ]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        spacerSeriesRef.current = null;
        visibleSeriesRefs.current = [];
        verticalLinesPrimitiveRef.current = null;
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

      {hiddenOverlay && (
        <div
          style={{
            position: 'absolute',
            top: 50,
            left: hiddenOverlay.xCenter,
            transform: 'translateX(-50%)',
            zIndex: 14,
            pointerEvents: 'none',
            maxWidth: `${hiddenOverlay.maxWidth}px`,
            padding: '0 8px',
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
              textAlign: 'center',
              backdropFilter: 'blur(4px)',
              wordBreak: 'break-word',
            }}
          >
            {hiddenOverlay.message}
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
  chainId,
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

  const hiddenWindows = useMemo(() => selectHiddenWindows(chainId), [chainId]);

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
        hiddenWindows={hiddenWindows}
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


