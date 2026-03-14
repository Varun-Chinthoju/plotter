import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { ChartConfig, Dataset } from '../types';

interface ChartProps {
  config: ChartConfig;
  datasets: Dataset[];
  onRelayout?: (event: Readonly<Plotly.PlotRelayoutEvent>) => void;
  xaxisRange?: [number | string, number | string];
  hoverX?: number | string | null;
  onHover?: (x: number | string | null) => void;
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

const Chart: React.FC<ChartProps> = ({ config, datasets, onRelayout, xaxisRange, hoverX, onHover }) => {
  const plotData = useMemo(() => {
    return config.variables
      .filter((v) => v.enabled)
      .map((v, index) => {
        const dataset = datasets.find(d => d.id === v.datasetId);
        if (!dataset) return null;

        const rawData = dataset.data.data;
        const cleanedData = rawData.filter(row => {
          const x = row[config.xAxis];
          const y = row[v.variable];
          return x !== undefined && x !== null && x !== '' && 
                 y !== undefined && y !== null && y !== '';
        });

        const parseVal = (val: any) => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string' && val.trim() !== '') {
            const n = Number(val);
            return isNaN(n) ? val : n;
          }
          return val;
        };

        cleanedData.sort((a, b) => {
          const valA = parseVal(a[config.xAxis]);
          const valB = parseVal(b[config.xAxis]);
          if (typeof valA === 'number' && typeof valB === 'number') return valA - valB;
          return String(valA).localeCompare(String(valB));
        });

        let xValues = cleanedData.map(row => parseVal(row[config.xAxis]));
        const yValues = cleanedData.map(row => parseVal(row[v.variable]));

        if (config.normalizeX && xValues.length > 0 && typeof xValues[0] === 'number') {
          const minX = xValues[0] as number;
          xValues = xValues.map(x => (x as number) - minX);
        }

        const traceColor = v.color || CHART_COLORS[index % CHART_COLORS.length];

        return {
          x: xValues,
          y: yValues,
          name: `${v.variable} (${dataset.name})`,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: traceColor, width: 2 },
          yaxis: v.yAxis === 'y2' ? ('y2' as const) : ('y' as const),
          connectgaps: true,
        };
      }).filter(Boolean);
  }, [config, datasets]);

  const hasY2 = config.variables.some((v) => v.enabled && v.yAxis === 'y2');
  const isXNumeric = plotData.length > 0 && typeof plotData[0]?.x[0] === 'number';

  const layout: Partial<Plotly.Layout> = {
    title: { text: config.title },
    autosize: true,
    height: 500,
    margin: { l: 50, r: 50, b: 50, t: 80, pad: 4 },
    xaxis: {
      title: { text: config.normalizeX ? `${config.xAxis} (Relative)` : config.xAxis },
      gridcolor: '#e2e8f0',
      range: xaxisRange,
      type: isXNumeric ? 'linear' : 'category',
      autorange: xaxisRange ? false : true,
      showspikes: true,
      spikemode: 'across',
      spikesnap: 'cursor',
      showline: true,
      showgrid: true,
    },
    yaxis: {
      title: { text: 'Primary Axis' },
      gridcolor: '#e2e8f0',
      autorange: true,
    },
    ...(hasY2 && {
      yaxis2: {
        title: { text: 'Secondary Axis' },
        overlaying: 'y',
        side: 'right',
        gridcolor: 'transparent',
        autorange: true,
      },
    }),
    legend: {
      orientation: 'h' as const,
      yanchor: 'bottom' as const,
      y: 1.02,
      xanchor: 'right' as const,
      x: 1,
    },
    shapes: hoverX != null ? [
      {
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: hoverX,
        x1: hoverX,
        y0: 0,
        y1: 1,
        line: {
          color: '#94a3b8',
          width: 1,
          dash: 'dot'
        }
      }
    ] : [],
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    hovermode: 'x unified' as const,
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-sm overflow-hidden p-4 border border-slate-100">
      <Plot
        data={plotData as any}
        layout={layout}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        onRelayout={onRelayout}
        onHover={(data) => {
          if (onHover && data.points[0]) {
            const x = data.points[0].x;
            if (typeof x === 'string' || typeof x === 'number') {
              onHover(x);
            }
          }
        }}
        onUnhover={() => {
          if (onHover) onHover(null);
        }}
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
