import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, Plus, Trash2, Settings2, X } from 'lucide-react';
import type { ChartConfig, TelemetryData } from './types';
import Chart from './components/Chart';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const App: React.FC = () => {
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setTelemetryData({
          headers,
          data: results.data as any[],
        });
        
        // Clear existing charts if headers change significantly
        setCharts([]);
      },
    });
  };

  const addChart = useCallback(() => {
    if (!telemetryData) return;
    
    const newChart: ChartConfig = {
      id: Math.random().toString(36).substr(2, 9),
      title: `Chart ${charts.length + 1}`,
      xAxis: telemetryData.headers[0],
      variables: telemetryData.headers.slice(1).map(h => ({
        variable: h,
        enabled: false,
        yAxis: 'y'
      })),
    };
    
    setCharts([...charts, newChart]);
    setActiveConfigId(newChart.id);
  }, [telemetryData, charts]);

  const removeChart = (id: string) => {
    setCharts(charts.filter(c => c.id !== id));
    if (activeConfigId === id) setActiveConfigId(null);
  };

  const updateChart = (id: string, updates: Partial<ChartConfig>) => {
    setCharts(charts.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const toggleVariable = (chartId: string, varName: string) => {
    setCharts(charts.map(c => {
      if (c.id !== chartId) return c;
      return {
        ...c,
        variables: c.variables.map(v => 
          v.variable === varName ? { ...v, enabled: !v.enabled } : v
        )
      };
    }));
  };

  const setVariableYAxis = (chartId: string, varName: string, yAxis: 'y' | 'y2') => {
    setCharts(charts.map(c => {
      if (c.id !== chartId) return c;
      return {
        ...c,
        variables: c.variables.map(v => 
          v.variable === varName ? { ...v, yAxis } : v
        )
      };
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Telemetry Plotter</h1>
          <p className="text-slate-500 mt-1">Visualize and analyze your CSV telemetry data.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors shadow-sm">
            <Upload size={18} />
            <span>Upload CSV</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
          
          {telemetryData && (
            <button 
              onClick={addChart}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg transition-colors shadow-sm"
            >
              <Plus size={18} />
              <span>Add Chart</span>
            </button>
          )}
        </div>
      </header>

      {!telemetryData ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <div className="bg-slate-100 p-4 rounded-full mb-4">
            <Upload size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No telemetry data loaded</h2>
          <p className="text-slate-500 text-center max-w-sm">
            Upload a CSV file to begin visualizing your data. The first column will be treated as the X-axis by default.
          </p>
        </div>
      ) : (
        <div className="space-y-8 max-w-[1400px] mx-auto">
          {charts.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              Click "Add Chart" to start visualizing.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {charts.map((chart) => (
                <div key={chart.id} className="relative group">
                  <div className="absolute right-4 top-4 z-10 flex gap-2">
                    <button 
                      onClick={() => setActiveConfigId(activeConfigId === chart.id ? null : chart.id)}
                      className="p-2 bg-white/80 backdrop-blur hover:bg-white text-slate-600 rounded-md shadow-sm border border-slate-200 transition-all"
                      title="Configure Chart"
                    >
                      <Settings2 size={18} />
                    </button>
                    <button 
                      onClick={() => removeChart(chart.id)}
                      className="p-2 bg-white/80 backdrop-blur hover:bg-red-50 text-red-600 rounded-md shadow-sm border border-slate-200 transition-all"
                      title="Remove Chart"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <Chart config={chart} data={telemetryData} />

                  {activeConfigId === chart.id && (
                    <div className="mt-4 p-6 bg-white rounded-xl shadow-lg border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <Settings2 size={20} className="text-blue-600" />
                          Chart Configuration
                        </h3>
                        <button onClick={() => setActiveConfigId(null)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                        </button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Chart Title</label>
                            <input 
                              type="text" 
                              value={chart.title}
                              onChange={(e) => updateChart(chart.id, { title: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">X-Axis Variable</label>
                            <select 
                              value={chart.xAxis}
                              onChange={(e) => updateChart(chart.id, { xAxis: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              {telemetryData.headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">Variables</label>
                          <div className="max-h-60 overflow-y-auto pr-2 space-y-2 border border-slate-100 rounded-lg p-2">
                            {chart.variables.map(v => (
                              <div key={v.variable} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="checkbox" 
                                    checked={v.enabled}
                                    onChange={() => toggleVariable(chart.id, v.variable)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className={cn("text-sm font-medium", !v.enabled && "text-slate-400")}>{v.variable}</span>
                                </div>
                                {v.enabled && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Axis:</span>
                                    <select 
                                      value={v.yAxis}
                                      onChange={(e) => setVariableYAxis(chart.id, v.variable, e.target.value as 'y' | 'y2')}
                                      className="text-xs border border-slate-200 rounded px-1 py-0.5 outline-none bg-white"
                                    >
                                      <option value="y">Y1 (Left)</option>
                                      <option value="y2">Y2 (Right)</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
