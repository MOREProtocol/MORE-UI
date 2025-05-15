import { useTheme } from '@mui/material/styles';
import { AreaSeries, createChart, IChartApi, ISeriesApi, LineData, SeriesPartialOptionsMap, Time, UTCTimestamp, BusinessDay } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { Typography } from '@mui/material';

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
}

// Props for the base chart component
interface BaseChartProps {
  data: ChartDataPoint[];
  height: number;
  lineColor?: string;
  isInteractive?: boolean;
  title?: string;
  isSmall?: boolean;
}

const BaseLightweightChart: React.FC<BaseChartProps> = ({
  data,
  height,
  lineColor = '#FF9900',
  isInteractive = true,
  title,
  isSmall = false,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
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

    // Initialize chart
    if (!chartRef.current) {
      const chartOptions = {
        width: currentWidth,
        height: height,
        layout: {
          background: { color: theme.palette.background.paper },
          textColor: theme.palette.text.secondary,
          attributionLogo: false,
        },
        localization: {
          locale: navigator.language, // Use browser's locale
          timeFormatter: detailedTimeFormatter,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: {
            color: theme.palette.divider,
            visible: !isSmall,
          },
        },
        timeScale: {
          rightOffset: 12,
          minBarSpacing: 5,
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: UTCTimestamp) => {
            const date = new Date(time * 1000);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            return `${day}/${month}`;
          },
          borderColor: isSmall ? theme.palette.background.paper : theme.palette.divider,
        },
        rightPriceScale: {
          borderColor: isSmall ? theme.palette.background.paper : theme.palette.divider,
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

      const seriesOptions: SeriesPartialOptionsMap['Area'] = {
        lineColor: lineColor,
        topColor: lineColor,
        bottomColor: 'white',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      };
      seriesRef.current = chartRef.current.addSeries(AreaSeries, seriesOptions);
    } else {
      // Chart exists, apply updated options based on theme or other prop changes
      chartRef.current.applyOptions({
        width: currentWidth,
        height: height,
        layout: {
          background: { color: theme.palette.background.paper },
          textColor: theme.palette.text.secondary,
        },
        localization: {
          locale: navigator.language,
          timeFormatter: detailedTimeFormatter,
        },
        grid: {
          horzLines: {
            color: theme.palette.divider,
            visible: !isSmall,
          },
        },
        timeScale: {
          borderColor: isSmall ? theme.palette.background.paper : theme.palette.divider,
        },
        rightPriceScale: {
          borderColor: isSmall ? theme.palette.background.paper : theme.palette.divider,
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
          lineColor: lineColor,
          topColor: lineColor,
          bottomColor: 'white',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
    }

    // Set data
    if (seriesRef.current && data.length > 0) {
      // Ensure data is sorted by time for lightweight-charts
      const sortedData = [...data].sort((a, b) => (a.time as number) - (b.time as number));
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
  }, [data, height, lineColor, chartContainerRef.current, theme, isInteractive, isSmall]);

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
}) => {
  // Convert string time to Unix timestamp for lightweight-charts
  const formattedData: ChartDataPoint[] = data
    ?.map(item => ({
      ...item,
      time: new Date(item.time).getTime() / 1000 as Time,
    })) || [];
  // Sorting moved to BaseLightweightChart before setData for robustness

  return <BaseLightweightChart data={formattedData} height={height} lineColor={lineColor} isInteractive={isInteractive} title={title} isSmall={isSmall} />;
};
