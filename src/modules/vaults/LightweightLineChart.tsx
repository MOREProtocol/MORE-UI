import { useTheme } from '@mui/material/styles';
import { createChart, IChartApi, ISeriesApi, LineData, SeriesPartialOptionsMap, Time, UTCTimestamp, BusinessDay, LineSeries } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { Typography, Box } from '@mui/material';
import { compactNumber } from 'src/components/primitives/FormattedNumber';

// Data type for the chart
interface ChartDataPoint {
  time: Time; // Expecting Unix timestamp (seconds)
  value: number;
}

// Props for the exported component
interface LightweightLineChartProps {
  data: Array<{ time: string; value: number }>; // Input data with string time
  height: number;
  lineColor?: string;
  title?: string;
  isInteractive?: boolean;
  isSmall?: boolean;
  yAxisFormat?: string; // Format for Y-axis (e.g., '%', 'USD', 'ETH', etc.)
}

// Props for the base chart component
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
  lineColor = '#FF9900',
  isInteractive = true,
  title,
  isSmall = false,
  yAxisFormat,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const theme = useTheme();

  useEffect(() => {
    if (!chartContainerRef.current || height <= 0) {
      // If chart exists but container is gone or height is invalid, clean up
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
      return; // Don't proceed if width is invalid
    }

    // Formatter for detailed time display (e.g., crosshair)
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
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day} ${monthName} ${year} ${hours}:${minutes}`;
    };

    // Formatter for Y-axis price display
    const priceFormatter = (price: number): string => {
      if (!yAxisFormat) return price.toString();

      // Format the number to a reasonable precision
      const formattedNumber = price.toFixed(0);
      const { prefix, postfix } = compactNumber({ value: price, visibleDecimals: 0, roundDown: true });

      // Handle different format types
      if (yAxisFormat === '%') {
        return `${formattedNumber}%`;
      } else if (yAxisFormat === 'USD' || yAxisFormat === '$') {
        return `$${prefix}${postfix}`;
      } else {
        // For other formats like 'ETH', 'BTC', etc.
        return `${prefix}${postfix} ${yAxisFormat}`;
      }
    };

    // Initialize chart
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
          locale: navigator.language, // Use browser's locale
          timeFormatter: detailedTimeFormatter,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        timeScale: {
          rightOffset: isSmall ? 2 : 12,
          minBarSpacing: isSmall ? 3 : 5,
          timeVisible: isSmall,
          secondsVisible: false,
          tickMarkFormatter: (time: UTCTimestamp) => {
            const date = new Date(time * 1000);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            return `${day}/${month}`;
          },
          borderVisible: false,
        },
        rightPriceScale: {
          borderVisible: false,
          ticksVisible: isSmall,
        },
        handleScroll: isInteractive,
        handleScale: isInteractive,
        crosshair: {
          mode: isInteractive ? 1 /* CrosshairMode.Magnet */ : 2 /* CrosshairMode.Hidden */,
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
          exitMode: 1 /* TrackingModeExitMode.OnTouchEnd */,
        },
      };
      chartRef.current = createChart(chartElement, chartOptions);

      const seriesOptions: SeriesPartialOptionsMap['Line'] = {
        color: lineColor,
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
      // Chart exists, apply updated options based on theme or other prop changes
      chartRef.current.applyOptions({
        width: currentWidth,
        height: height,
        layout: {
          background: { color: 'transparent' },
          textColor: theme.palette.text.secondary,
        },
        localization: {
          locale: navigator.language,
          timeFormatter: detailedTimeFormatter,
        },
        grid: {
          horzLines: { visible: false },
        },
        timeScale: {
          rightOffset: isSmall ? 2 : 12,
          minBarSpacing: isSmall ? 3 : 5,
          timeVisible: isSmall,
          borderVisible: false,
        },
        rightPriceScale: {
          borderVisible: false,
          ticksVisible: isSmall,
        },
        handleScroll: isInteractive,
        handleScale: isInteractive,
        crosshair: {
          mode: isInteractive ? 1 /* CrosshairMode.Magnet */ : 2 /* CrosshairMode.Hidden */,
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
          exitMode: 1 /* TrackingModeExitMode.OnTouchEnd */,
        },
      });

      if (seriesRef.current) {
        seriesRef.current.applyOptions({
          color: lineColor,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          priceFormat: yAxisFormat ? {
            type: 'custom',
            formatter: priceFormatter,
          } : undefined,
        });
      }
    }

    // Set data
    if (seriesRef.current && data.length > 0) {
      // Ensure data is sorted by time for lightweight-charts
      const sortedData = [...data].sort((a, b) => (a.time as number) - (b.time as number));

      // Force chart to recalculate scales by clearing and resetting data
      seriesRef.current.setData([]);
      seriesRef.current.setData(sortedData as LineData<Time>[]);
      chartRef.current?.timeScale().fitContent();
    } else if (seriesRef.current) {
      seriesRef.current.setData([]); // Clear data if input is empty
    }

    // Handle resize using ResizeObserver for width
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      chartRef.current?.applyOptions({ width });
    });
    resizeObserver.observe(chartElement);

    // Cleanup
    return () => {
      resizeObserver.unobserve(chartElement);
    };
  }, [data, height, lineColor, chartContainerRef.current, theme, isInteractive, isSmall, yAxisFormat]);

  // Effect for full cleanup on unmount
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
    <div ref={chartContainerRef} style={{ position: 'relative', height: `${height}px`, width: '100%', display: 'block' }}>
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

export const LightweightLineChart: React.FC<LightweightLineChartProps> = ({
  data,
  height,
  lineColor,
  title,
  isInteractive = true,
  isSmall = false,
  yAxisFormat,
}) => {
  const theme = useTheme();

  // Check if data is too old (more than 24 hours)
  const isDataTooOld = () => {
    if (!data || data.length === 0) return false;

    // Get the most recent data point
    const sortedData = [...data].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const mostRecentDataPoint = sortedData[0];

    if (!mostRecentDataPoint) return false;

    const mostRecentTime = new Date(mostRecentDataPoint.time).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - mostRecentTime;

    // 24 hours in milliseconds
    const twentyFourHours = 24 * 60 * 60 * 1000;

    return timeDifference > twentyFourHours;
  };

  // If data is too old, show indexing message
  if (isDataTooOld()) {
    return (
      <Box
        sx={{
          height: `${height}px`,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <Typography
          sx={{
            color: theme.palette.text.secondary,
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Chart data is currently indexing...
        </Typography>
      </Box>
    );
  }

  // Convert string time to Unix timestamp for lightweight-charts
  const formattedData: ChartDataPoint[] = data
    ?.map(item => ({
      ...item,
      time: new Date(item.time).getTime() / 1000 as Time,
    })) || [];
  // Sorting moved to BaseLightweightChart before setData for robustness

  return <BaseLightweightChart data={formattedData} height={height} lineColor={lineColor} isInteractive={isInteractive} title={title} isSmall={isSmall} yAxisFormat={yAxisFormat} />;
};
