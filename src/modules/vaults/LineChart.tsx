import { curveNatural } from '@visx/curve';
import { localPoint } from '@visx/event';
import { LinearGradient } from '@visx/gradient';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { Bar, Circle, LinePath } from '@visx/shape';
import { defaultStyles, TooltipWithBounds, withTooltip } from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import React, { useCallback, useMemo } from 'react';

// Tooltip data type
type TooltipData = { x: number; y: number };

// Base chart props without responsive wrapper
interface BaseChartProps {
  data: TooltipData[];
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

// Props for the exported component
interface LineChartProps {
  data: TooltipData[];
  height: number;
}

// Internal chart component with tooltip functionality
const BaseChart = withTooltip<BaseChartProps, TooltipData>(
  ({
    data,
    width,
    height,
    margin = { top: 10, right: 10, bottom: 10, left: 10 },
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
  }: BaseChartProps & WithTooltipProvidedProps<TooltipData>) => {
    // Early return if width is too small
    if (width < 10) return null;

    // Calculate bounds
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Define scales for X and Y axes
    const xScale = useMemo(
      () =>
        scaleLinear({
          domain: [0, data.length - 1],
          range: [0, innerWidth],
        }),
      [data, innerWidth]
    );

    const yScale = useMemo(
      () =>
        scaleLinear({
          domain: [
            Math.min(...data.map((d) => d.y)) * 0.9,
            Math.max(...data.map((d) => d.y)) * 1.1,
          ],
          range: [innerHeight, 0],
        }),
      [data, innerHeight]
    );

    // Tooltip styles
    const tooltipStyles = {
      ...defaultStyles,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '14px',
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)',
    };

    // Handle tooltip
    const handleTooltip = useCallback(
      (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
        const { x } = localPoint(event) || { x: 0 };
        const x0 = xScale.invert(x - margin.left);
        const index = Math.min(Math.round(x0), data.length - 1);
        const d = data[index];

        showTooltip({
          tooltipData: d,
          tooltipLeft: xScale(index) + margin.left,
          tooltipTop: yScale(d.y) + margin.top,
        });
      },
      [showTooltip, xScale, yScale, data, margin]
    );

    return (
      <>
        <svg width={width} height={height}>
          <LinearGradient
            id="line-gradient"
            from="#FF9900"
            to="#FFC266"
            fromOpacity={1}
            toOpacity={0.8}
          />
          <g transform={`translate(${margin.left},${margin.top})`}>
            <LinePath
              data={data}
              x={(_d, i) => xScale(i)}
              y={(d) => yScale(d.y)}
              stroke="url(#line-gradient)"
              strokeWidth={width > 500 ? 4 : 2}
              curve={curveNatural}
            />

            {/* Invisible bar to detect hover */}
            <Bar
              width={innerWidth}
              height={innerHeight}
              fill="transparent"
              onTouchStart={handleTooltip}
              onTouchMove={handleTooltip}
              onMouseMove={handleTooltip}
              onMouseLeave={() => hideTooltip()}
            />

            {/* Tooltip indicator */}
            {tooltipData && (
              <Circle
                cx={xScale(tooltipData.x)}
                cy={yScale(tooltipData.y)}
                r={6}
                fill="#FF9900"
                stroke="white"
                strokeWidth={2}
                pointerEvents="none"
              />
            )}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltipData && (
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          <TooltipWithBounds top={tooltipTop - 50} left={tooltipLeft - 20} style={tooltipStyles}>
            ${tooltipData.y.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </TooltipWithBounds>
        )}
      </>
    );
  }
);

// Exported component with ParentSize wrapper for responsiveness
export const LineChart: React.FC<LineChartProps> = ({ data, height }) => {
  return (
    <ParentSize>
      {({ width }) => <BaseChart data={data} width={width} height={height} />}
    </ParentSize>
  );
};
