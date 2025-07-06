import { useTheme } from '@mui/material/styles';
import { createChart, IChartApi, ISeriesApi, LineData, SeriesPartialOptionsMap, Time, UTCTimestamp, BusinessDay, LineSeries } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { Typography, Box } from '@mui/material';
import { compactNumber } from 'src/components/primitives/FormattedNumber';

interface ChartDataPoint {
  time: Time;
  value: number;
}

interface LightweightLineChartProps {
  data: Array<{ time: string; value: number }>;
  height: number;
  lineColor?: string;
  title?: string;
  isInteractive?: boolean;
  isSmall?: boolean;
  yAxisFormat?: string;
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

    // Time formatter for crosshair
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

    // Price formatter for Y-axis
    const priceFormatter = (price: number): string => {
      if (!yAxisFormat) return price.toString();

      const formattedNumber = price.toFixed(0);
      const { prefix, postfix } = compactNumber({ value: price, visibleDecimals: 0, roundDown: true });

      if (yAxisFormat === '%') {
        return `${formattedNumber}%`;
      } else if (yAxisFormat === 'USD' || yAxisFormat === '$') {
        return `$${prefix}${postfix}`;
      } else {
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
          exitMode: 1,
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
      // Update chart options for theme changes
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
          color: lineColor,
          priceFormat: yAxisFormat ? {
            type: 'custom',
            formatter: priceFormatter,
          } : undefined,
        });
      }
    }

    // Set data
    if (seriesRef.current && data.length > 0) {
      const sortedData = [...data].sort((a, b) => (a.time as number) - (b.time as number));
      seriesRef.current.setData(sortedData as LineData<Time>[]);

      // Reset and fit content to show all data
      if (chartRef.current) {
        setTimeout(() => {
          chartRef.current?.timeScale().resetTimeScale();
          chartRef.current?.timeScale().fitContent();
        }, 10);
      }
    } else if (seriesRef.current) {
      seriesRef.current.setData([]);
    }

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      chartRef.current?.applyOptions({ width });
    });
    resizeObserver.observe(chartElement);

    return () => {
      resizeObserver.unobserve(chartElement);
    };
  }, [data, height, lineColor, chartContainerRef.current, theme, isInteractive, isSmall, yAxisFormat]);

  // Cleanup on unmount
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

  const isDataTooOld = () => {
    if (!data || data.length === 0) return false;

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

  const formattedData: ChartDataPoint[] = data
    ?.map(item => ({
      ...item,
      time: new Date(item.time).getTime() / 1000 as Time,
    })) || [];

  return <BaseLightweightChart data={formattedData} height={height} lineColor={lineColor} isInteractive={isInteractive} title={title} isSmall={isSmall} yAxisFormat={yAxisFormat} />;
};
