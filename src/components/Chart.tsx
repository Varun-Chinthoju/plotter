import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { ChartConfig, Dataset } from '../types';

interface ChartProps {
  config: ChartConfig;
  datasets: Dataset[];
}

export const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#1d4ed8', // blue-700
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#f43f5e', // rose-500
];

const Chart: React.FC<ChartProps> = ({ config, datasets }) => {
  const plotData = useMemo(() => {
    return config.variables
      .filter((v) => v.enabled)
      .map((v, index) => {
        const dataset = datasets.find(d => d.id === v.datasetId);
        if (!dataset) return null;

        const xValues = dataset.data.data.map((row) => row[config.xAxis]);
        const yValues = dataset.data.data.map((row) => row[v.variable]);

        const traceColor = v.color || CHART_COLORS[index % CHART_COLORS.length];

        return {
          x: xValues,
          y: yValues,
          name: `${v.variable} (${dataset.name})`,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: traceColor, width: 2 },
          yaxis: v.yAxis === 'y2' ? ('y2' as const) : ('y' as const),
        };
      }).filter(Boolean);
  }, [config, datasets]);

  const hasY2 = config.variables.some((v) => v.enabled && v.yAxis === 'y2');

  const layout: Partial<Plotly.Layout> = {
    title: { text: config.title },
    autosize: true,
    height: 500,
    margin: { l: 50, r: 50, b: 50, t: 80, pad: 4 },
    xaxis: {
      title: { text: config.xAxis },
      gridcolor: '#e2e8f0',
    },
    yaxis: {
      title: { text: 'Primary Axis' },
      gridcolor: '#e2e8f0',
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
    hovermode: 'closest' as const,
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-sm overflow-hidden p-4 border border-slate-100">
      <Plot
        data={plotData as any}
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
