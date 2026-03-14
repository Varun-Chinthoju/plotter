import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { 
  Upload, Plus, Trash2, Settings2, X, FileText, Edit2, 
  Check, LayoutGrid, LayoutList, Palette, 
  Link, Link2Off, Move, GitCompare, MousePointer2 
} from 'lucide-react';
import type { ChartConfig, Dataset } from './types';
import Chart, { CHART_COLORS } from './components/Chart';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const invertColor = (hex: string): string => {
  if (hex.indexOf('#') === 0) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split('').map(s => s + s).join('');
  if (hex.length !== 6) return '#000000';
  const r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16).padStart(2, '0');
  const g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16).padStart(2, '0');
  const b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
};

const App: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [tempDatasetName, setTempDatasetName] = useState('');
  const [layoutMode, setLayoutMode] = useState<'single' | 'grid'>('single');
  const [isZoomSynced, setIsZoomSynced] = useState(false);
  const [isHoverSynced, setIsHoverSynced] = useState(true);
  const [sharedRange, setSharedRange] = useState<[number | string, number | string] | undefined>(undefined);
  const [sharedHoverX, setSharedHoverX] = useState<number | string | null>(null);
  const [draggedDatasetId, setDraggedDatasetId] = useState<string | null>(null);
  
  const [showCompareTool, setShowCompareTool] = useState(false);
  const [compareSourceId, setCompareSourceId] = useState<string>('');
  const [compareTargetId, setCompareTargetId] = useState<string>('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const newDataset: Dataset = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name.replace('.csv', ''),
            data: {
              headers,
              data: results.data as any[],
            },
          };
          
          setDatasets((prev) => {
            const updated = [...prev, newDataset];
            if (!activeDatasetId) setActiveDatasetId(newDataset.id);
            return updated;
          });
        },
      });
    });
    event.target.value = '';
  };

  const activeDataset = datasets.find(d => d.id === activeDatasetId);
  const activeDatasetCharts = charts.filter(c => c.datasetId === activeDatasetId);

  const addChart = useCallback(() => {
    if (!activeDatasetId || !activeDataset) return;
    
    const newChart: ChartConfig = {
      id: Math.random().toString(36).substr(2, 9),
      datasetId: activeDatasetId,
      title: `Chart ${activeDatasetCharts.length + 1}`,
      xAxis: activeDataset.data.headers[0],
      variables: activeDataset.data.headers.slice(1).map((h, i) => ({
        datasetId: activeDatasetId,
        variable: h,
        enabled: false,
        yAxis: 'y',
        color: CHART_COLORS[i % CHART_COLORS.length]
      })),
    };
    
    setCharts([...charts, newChart]);
    setActiveConfigId(newChart.id);
  }, [activeDatasetId, activeDataset, charts, activeDatasetCharts.length]);

  const removeChart = (id: string) => {
    setCharts(charts.filter(c => c.id !== id));
    if (activeConfigId === id) setActiveConfigId(null);
  };

  const updateChart = (id: string, updates: Partial<ChartConfig>) => {
    setCharts(charts.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const toggleVariable = (chartId: string, datasetId: string, varName: string) => {
    setCharts(charts.map(c => {
      if (c.id !== chartId) return c;
      const variableExists = c.variables.some(v => v.datasetId === datasetId && v.variable === varName);
      if (variableExists) {
        return {
          ...c,
          variables: c.variables.map(v => 
            (v.datasetId === datasetId && v.variable === varName) ? { ...v, enabled: !v.enabled } : v
          )
        };
      } else {
        return {
          ...c,
          variables: [...c.variables, { 
            datasetId, 
            variable: varName, 
            enabled: true, 
            yAxis: 'y',
            color: CHART_COLORS[c.variables.length % CHART_COLORS.length]
          }]
        };
      }
    }));
  };

  const performOverlap = (sourceId: string, targetId: string) => {
    const sourceDs = datasets.find(d => d.id === sourceId);
    if (!sourceDs) return;

    setCharts(prevCharts => prevCharts.map(chart => {
      if (chart.datasetId !== targetId) return chart;
      const primaryVars = chart.variables.filter(v => v.datasetId === targetId && v.enabled);
      const newVariables = [...chart.variables];

      primaryVars.forEach(primaryVar => {
        if (sourceDs.data.headers.includes(primaryVar.variable)) {
          const existing = newVariables.find(v => v.datasetId === sourceId && v.variable === primaryVar.variable);
          const oppositeColor = invertColor(primaryVar.color || CHART_COLORS[0]);
          if (existing) {
            existing.enabled = true;
            existing.color = oppositeColor;
          } else {
            newVariables.push({
              datasetId: sourceId,
              variable: primaryVar.variable,
              enabled: true,
              yAxis: primaryVar.yAxis,
              color: oppositeColor
            });
          }
        }
      });
      return { ...chart, variables: newVariables };
    }));
    setActiveDatasetId(targetId);
    setShowCompareTool(false);
  };

  const setVariableYAxis = (chartId: string, datasetId: string, varName: string, yAxis: 'y' | 'y2') => {
    setCharts(charts.map(c => {
      if (c.id !== chartId) return c;
      return {
        ...c,
        variables: c.variables.map(v => 
          (v.datasetId === datasetId && v.variable === varName) ? { ...v, yAxis } : v
        )
      };
    }));
  };

  const setVariableColor = (chartId: string, datasetId: string, varName: string, color: string) => {
    setCharts(charts.map(c => {
      if (c.id !== chartId) return c;
      return {
        ...c,
        variables: c.variables.map(v => 
          (v.datasetId === datasetId && v.variable === varName) ? { ...v, color } : v
        )
      };
    }));
  };

  const deleteDataset = (id: string) => {
    setDatasets(datasets.filter(d => d.id !== id));
    setCharts(charts.filter(c => c.datasetId !== id));
    if (activeDatasetId === id) {
      const remaining = datasets.filter(d => d.id !== id);
      setActiveDatasetId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const saveDatasetName = (id: string, name: string) => {
    setDatasets(datasets.map(d => d.id === id ? { ...d, name } : d));
    setEditingDatasetId(null);
  };

  const handleChartRelayout = (event: Readonly<Plotly.PlotRelayoutEvent>) => {
    if (!isZoomSynced) return;
    if (event['xaxis.range[0]'] !== undefined && event['xaxis.range[1]'] !== undefined) {
      setSharedRange([event['xaxis.range[0]'], event['xaxis.range[1]']]);
    } else if (event['xaxis.autorange'] === true) {
      setSharedRange(undefined);
    }
  };

  const handleChartHover = (x: number | string | null) => {
    if (isHoverSynced) {
      setSharedHoverX(x);
    }
  };

  const handleDrop = (targetId: string) => {
    if (!draggedDatasetId || draggedDatasetId === targetId) {
      setDraggedDatasetId(null);
      return;
    }
    performOverlap(draggedDatasetId, targetId);
    setDraggedDatasetId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Telemetry Plotter</h1>
          <p className="text-slate-500 mt-1">Visualize and analyze your CSV telemetry data.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {datasets.length >= 2 && (
            <button 
              onClick={() => {
                setShowCompareTool(!showCompareTool);
                if (!compareSourceId) setCompareSourceId(datasets[0].id);
                if (!compareTargetId) setCompareTargetId(datasets[1].id);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border rounded-lg transition-all shadow-sm",
                showCompareTool ? "bg-indigo-600 border-indigo-600 text-white font-semibold" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <GitCompare size={18} />
              <span>Compare Files</span>
            </button>
          )}

          {datasets.length > 0 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsHoverSynced(!isHoverSynced)}
                className={cn(
                  "p-2 border rounded-lg transition-all shadow-sm",
                  isHoverSynced ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-slate-200 text-slate-400"
                )}
                title="Sync Mouse Hover"
              >
                <MousePointer2 size={18} />
              </button>

              <button 
                onClick={() => { setIsZoomSynced(!isZoomSynced); if (!isZoomSynced) setSharedRange(undefined); }}
                className={cn(
                  "p-2 border rounded-lg transition-all shadow-sm",
                  isZoomSynced ? "bg-blue-50 border-blue-200 text-blue-600 font-semibold" : "bg-white border-slate-200 text-slate-400 hover:text-slate-700"
                )}
                title="Sync Zoom"
              >
                {isZoomSynced ? <Link size={18} /> : <Link2Off size={18} />}
              </button>

              <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button onClick={() => setLayoutMode('single')} className={cn("p-1.5 rounded-md transition-all", layoutMode === 'single' ? "bg-slate-100 text-blue-600" : "text-slate-400 hover:text-slate-600")}>
                  <LayoutList size={18} />
                </button>
                <button onClick={() => setLayoutMode('grid')} className={cn("p-1.5 rounded-md transition-all", layoutMode === 'grid' ? "bg-slate-100 text-blue-600" : "text-slate-400 hover:text-slate-600")}>
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors shadow-sm">
            <Upload size={18} />
            <span>Upload CSV(s)</span>
            <input type="file" accept=".csv" multiple onChange={handleFileUpload} className="hidden" />
          </label>
          
          {activeDataset && (
            <button onClick={addChart} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg transition-colors shadow-sm">
              <Plus size={18} />
              <span>Add Chart</span>
            </button>
          )}
        </div>
      </header>

      {showCompareTool && datasets.length >= 2 && (
        <div className="mb-8 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
              <GitCompare size={20} />
              Comparison Tool
            </h3>
            <button onClick={() => setShowCompareTool(false)} className="text-indigo-400 hover:text-indigo-600"><X size={20}/></button>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-indigo-700">Source:</span>
              <select 
                value={compareSourceId} 
                onChange={e => setCompareSourceId(e.target.value)}
                className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <Move size={16} className="text-indigo-300 rotate-90 md:rotate-0" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-indigo-700">Target:</span>
              <select 
                value={compareTargetId} 
                onChange={e => setCompareTargetId(e.target.value)}
                className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="h-8 w-px bg-indigo-200 hidden md:block" />
            <div className="flex gap-2">
              <button 
                onClick={() => { setLayoutMode('grid'); setIsZoomSynced(true); setIsHoverSynced(true); setShowCompareTool(false); setActiveDatasetId(compareTargetId); }}
                className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors shadow-sm"
              >
                Side-by-Side Compare
              </button>
              <button 
                onClick={() => performOverlap(compareSourceId, compareTargetId)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Overlap Compare
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs text-indigo-500">
            <b>Side-by-Side:</b> Arranges charts in a grid and syncs your mouse cursor across both. <br/>
            <b>Overlap:</b> Injects graphs from the source file into the target file's charts using inverted colors.
          </p>
        </div>
      )}

      {datasets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-slate-200 pb-2 overflow-x-auto">
          {datasets.map((dataset) => (
            <div 
              key={dataset.id}
              draggable
              onDragStart={() => setDraggedDatasetId(dataset.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleDrop(dataset.id); }}
              className={cn(
                "group flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all cursor-pointer border-x border-t -mb-[9px] relative",
                activeDatasetId === dataset.id ? "bg-white border-slate-200 text-blue-600 font-semibold shadow-[0_-2px_4px_rgba(0,0,0,0.02)]" : "bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200",
                draggedDatasetId === dataset.id && "opacity-50"
              )}
              onClick={() => setActiveDatasetId(dataset.id)}
            >
              <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400"><Move size={12} /></div>
              <FileText size={16} />
              {editingDatasetId === dataset.id ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <input autoFocus value={tempDatasetName} onChange={(e) => setTempDatasetName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveDatasetName(dataset.id, tempDatasetName)} className="w-32 px-1 text-sm bg-white border border-blue-300 rounded outline-none" />
                  <button onClick={() => saveDatasetName(dataset.id, tempDatasetName)} className="text-green-600 hover:bg-green-50 p-0.5 rounded"><Check size={14} /></button>
                </div>
              ) : (
                <span className="text-sm truncate max-w-[150px]">{dataset.name}</span>
              )}
              <div className={cn("flex items-center gap-0.5 transition-opacity", activeDatasetId === dataset.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                <button onClick={(e) => { e.stopPropagation(); setEditingDatasetId(dataset.id); setTempDatasetName(dataset.name); }} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"><Edit2 size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); deleteDataset(dataset.id); }} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"><X size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {datasets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <div className="bg-slate-100 p-4 rounded-full mb-4"><Upload size={32} className="text-slate-400" /></div>
          <h2 className="text-xl font-semibold mb-2">No telemetry data loaded</h2>
          <p className="text-slate-500 text-center max-w-sm">Upload one or more CSV files to begin. <br/><br/> <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Tip: Drag one tab onto another to overlap!</span></p>
        </div>
      ) : (
        <div className="space-y-8 max-w-[1400px] mx-auto">
          {activeDatasetCharts.length === 0 ? (
            <div className="text-center py-20 text-slate-400 bg-white border border-slate-100 rounded-xl">No charts in <span className="font-semibold text-slate-600">"{activeDataset?.name}"</span>. Click "Add Chart" to start.</div>
          ) : (
            <div className={cn("grid gap-8 transition-all duration-300", layoutMode === 'grid' ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
              {activeDatasetCharts.map((chart) => (
                <div key={chart.id} className="relative group">
                  <div className="absolute right-4 top-4 z-10 flex gap-2">
                    <button onClick={() => setActiveConfigId(activeConfigId === chart.id ? null : chart.id)} className="p-2 bg-white/80 backdrop-blur hover:bg-white text-slate-600 rounded-md shadow-sm border border-slate-200 transition-all"><Settings2 size={18} /></button>
                    <button onClick={() => removeChart(chart.id)} className="p-2 bg-white/80 backdrop-blur hover:bg-red-50 text-red-600 rounded-md shadow-sm border border-slate-200 transition-all"><Trash2 size={18} /></button>
                  </div>
                  <div className={cn("transition-all duration-300", layoutMode === 'grid' ? "h-[450px]" : "h-[500px]")}>
                    <Chart 
                      config={chart} 
                      datasets={datasets} 
                      onRelayout={handleChartRelayout} 
                      xaxisRange={sharedRange}
                      hoverX={sharedHoverX}
                      onHover={handleChartHover}
                    />
                  </div>
                  {activeConfigId === chart.id && (
                    <div className="mt-4 p-6 bg-white rounded-xl shadow-lg border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2"><Settings2 size={20} className="text-blue-600" /> Chart Configuration</h3>
                        <button onClick={() => setActiveConfigId(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                      </div>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div><label className="block text-sm font-semibold text-slate-700 mb-2">Chart Title</label><input type="text" value={chart.title} onChange={(e) => updateChart(chart.id, { title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                          <div><label className="block text-sm font-semibold text-slate-700 mb-2">X-Axis Variable</label><select value={chart.xAxis} onChange={(e) => updateChart(chart.id, { xAxis: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none">{datasets.find(d => d.id === chart.datasetId)?.data.headers.map(h => (<option key={h} value={h}>{h}</option>))}</select></div>
                          <div className="flex items-center gap-3 pt-2"><input type="checkbox" id={`normalize-${chart.id}`} checked={chart.normalizeX || false} onChange={(e) => updateChart(chart.id, { normalizeX: e.target.checked })} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" /><label htmlFor={`normalize-${chart.id}`} className="text-sm font-medium text-slate-700 cursor-pointer">Normalize X-Axis (Start at 0)</label></div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">Variables</label>
                          <div className="max-h-80 overflow-y-auto pr-2 space-y-4 border border-slate-100 rounded-lg p-3">
                            {datasets.map(ds => (
                              <div key={ds.id} className="space-y-1">
                                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1 px-1 flex items-center justify-between"><span>{ds.name} {ds.id === chart.datasetId && '(Primary)'}</span></div>
                                {ds.data.headers.filter(h => h !== chart.xAxis).map(h => {
                                  const config = chart.variables.find(v => v.datasetId === ds.id && v.variable === h);
                                  const isEnabled = config?.enabled || false;
                                  return (
                                    <div key={h} className="flex flex-col gap-2 p-2 hover:bg-slate-50 rounded-md transition-colors">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3"><input type="checkbox" checked={isEnabled} onChange={() => toggleVariable(chart.id, ds.id, h)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" /><span className={cn("text-sm font-medium", !isEnabled && "text-slate-400")}>{h}</span></div>
                                        <div className="flex items-center gap-2">{ds.id === chart.datasetId && (<button onClick={() => performOverlap(ds.id, chart.datasetId)} className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold transition-colors">Overlap</button>)}{isEnabled && (<div className="flex items-center gap-3"><div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-md shadow-sm"><Palette size={12} className="text-slate-400" /><input type="color" value={config?.color || CHART_COLORS[0]} onChange={(e) => setVariableColor(chart.id, ds.id, h, e.target.value)} className="w-6 h-4 border-none p-0 bg-transparent cursor-pointer rounded overflow-hidden" title="Choose Trace Color" /></div><select value={config?.yAxis || 'y'} onChange={(e) => setVariableYAxis(chart.id, ds.id, h, e.target.value as 'y' | 'y2')} className="text-[10px] border border-slate-200 rounded px-1 py-0.5 outline-none bg-white font-bold text-slate-600"><option value="y">Y1</option><option value="y2">Y2</option></select></div>)}</div>
                                      </div>
                                    </div>
                                  );
                                })}
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
