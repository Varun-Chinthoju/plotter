import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { ChartConfig, TelemetryData } from '../types';

interface ChartProps {
  config: ChartConfig;
  data: TelemetryData;
}

const Chart: React.FC<ChartProps> = ({ config, data }) => {
  const plotData = useMemo(() => {
    return config.variables
      .filter((v) => v.enabled)
      .map((v) => {
        const xValues = data.data.map((row) => row[config.xAxis]);
        const yValues = data.data.map((row) => row[v.variable]);

        return {
          x: xValues,
          y: yValues,
          name: v.variable,
          type: 'scatter' as const,
          mode: 'lines' as const,
          yaxis: v.yAxis === 'y2' ? ('y2' as const) : ('y' as const),
        };
      });
  }, [config, data]);

  const hasY2 = config.variables.some((v) => v.enabled && v.yAxis === 'y2');

  const layout: Partial<Plotly.Layout> = {
    title: { text: config.title },
    autosize: true,
    height: 500,
    margin: { l: 50, r: 50, b: 50, t: 80, pad: 4 },
    xaxis: {
      title: { text: config.xAxis },
      gridcolor: '#e5e7eb',
    },
    yaxis: {
      title: { text: 'Primary Axis' },
      gridcolor: '#e5e7eb',
    },
    ...(hasY2 && {
      yaxis2: {
        title: { text: 'Secondary Axis' },
        overlaying: 'y',
        side: 'right',
        gridcolor: 'transparent',
      },
    }),
    legend: {
      orientation: 'h' as const,
      yanchor: 'bottom' as const,
      y: 1.02,
      xanchor: 'right' as const,
      x: 1,
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
  };

  return (
    <div className="w-full h-[500px] bg-white rounded-lg shadow-sm overflow-hidden p-4">
      <Plot
        data={plotData}
        layout={layout}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        config={{
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['select2d', 'lasso2d'],
        }}
      />
    </div>
  );
};

export default Chart;
