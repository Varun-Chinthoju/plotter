import React, { useMemo, useRef, useEffect } from 'react';
import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import type { ChartConfig, Dataset } from '../types';

const Plot = createPlotlyComponent(Plotly);

interface ChartProps {
  config: ChartConfig;
  datasets: Dataset[];
  onRelayout?: (event: Readonly<Plotly.PlotRelayoutEvent>) => void;
  xaxisRange?: [number | string, number | string];
  hoverX?: number | string | null;
  onHover?: (x: number | string | null) => void;
  isSmall?: boolean;
}

import { CHART_COLORS } from '../constants';

const Chart: React.FC<ChartProps> = ({ config, datasets, onRelayout, xaxisRange, hoverX, onHover, isSmall }) => {
  const gdRef = useRef<HTMLElement | null>(null);

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

        const parseVal = (val: unknown) => {
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

  useEffect(() => {
    const gd = gdRef.current;
    const PlotlyFx = (Plotly as unknown as { Fx: { hover: (gd: HTMLElement, evt: unknown[]) => void } }).Fx;
    if (gd && hoverX !== null && hoverX !== undefined) {
      // Cast Plotly to access Fx which might be missing in basic-dist types but exists in runtime
      PlotlyFx.hover(gd, [{ curveNumber: 0, xval: hoverX }]);
    } else if (gd && hoverX === null) {
      PlotlyFx.hover(gd, []);
    }
  }, [hoverX]);

  const hasY2 = config.variables.some((v) => v.enabled && v.yAxis === 'y2');
  const isXNumeric = plotData.length > 0 && typeof plotData[0]?.x[0] === 'number';

  const layout: Partial<Plotly.Layout> = {
    title: { text: config.title, font: { size: isSmall ? 14 : 18 } },
    autosize: true,
    height: isSmall ? 350 : 500,
    margin: { l: 40, r: 40, b: 40, t: 60, pad: 4 },
    xaxis: {
      title: { text: config.normalizeX ? `${config.xAxis} (Relative)` : config.xAxis, font: { size: isSmall ? 10 : 12 } },
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
      title: { text: 'Primary', font: { size: isSmall ? 10 : 12 } },
      gridcolor: '#e2e8f0',
      autorange: true,
    },
    ...(hasY2 && {
      yaxis2: {
        title: { text: 'Secondary', font: { size: isSmall ? 10 : 12 } },
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
      font: { size: isSmall ? 9 : 11 }
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    hovermode: 'x unified' as const,
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-sm overflow-hidden p-2 md:p-4 border border-slate-100">
      <Plot
        data={plotData as Plotly.Data[]}
        layout={layout}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        onRelayout={onRelayout}
        onInitialized={(_fig, gd) => (gdRef.current = gd)}
        onUpdate={(_fig, gd) => (gdRef.current = gd)}
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
