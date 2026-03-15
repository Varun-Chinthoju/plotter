import React, { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  Upload, Plus, Trash2, Settings2, X, FileText, Edit2, 
  Link, Link2Off, Move, GitCompare, MousePointer2, PanelsTopLeft
} from 'lucide-react';
import type { ChartConfig, Dataset } from './types';
import Chart from './components/Chart';
import { CHART_COLORS } from './constants';
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
  
  const [isZoomSynced, setIsZoomSynced] = useState(false);
  const [isHoverSynced, setIsHoverSynced] = useState(true);
  const [sharedRange, setSharedRange] = useState<[number | string, number | string] | undefined>(undefined);
  const [sharedHoverX, setSharedHoverX] = useState<number | string | null>(null);
  
  const [draggedDatasetId, setDraggedDatasetId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<'top' | 'bottom' | null>(null);
  
  const [splitView, setSplitView] = useState<{ enabled: boolean; topId: string | null; bottomId: string | null }>({
    enabled: false,
    topId: null,
    bottomId: null,
  });

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
              data: results.data as Record<string, number | string>[],
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

  const addChart = useCallback((dsId: string) => {
    const ds = datasets.find(d => d.id === dsId);
    if (!ds) return;
    
    const dsCharts = charts.filter(c => c.datasetId === dsId);
    const newChart: ChartConfig = {
      id: Math.random().toString(36).substr(2, 9),
      datasetId: dsId,
      title: `Chart ${dsCharts.length + 1}`,
      xAxis: ds.data.headers[0],
      variables: ds.data.headers.slice(1).map((h, i) => ({
        datasetId: dsId,
        variable: h,
        enabled: false,
        yAxis: 'y',
        color: CHART_COLORS[i % CHART_COLORS.length]
      })),
    };
    
    setCharts(prev => [...prev, newChart]);
    setActiveConfigId(newChart.id);
  }, [datasets, charts]);

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
    const targetDs = datasets.find(d => d.id === targetId);
    if (!sourceDs || !targetDs) return;

    setCharts(prevCharts => {
      // Ensure target has at least one chart to merge into
      let targetCharts = prevCharts.filter(c => c.datasetId === targetId);
      let workingCharts = [...prevCharts];

      if (targetCharts.length === 0) {
        // Auto-create a default chart for the target dataset
        const autoChart: ChartConfig = {
          id: Math.random().toString(36).substr(2, 9),
          datasetId: targetId,
          title: `Chart 1`,
          xAxis: targetDs.data.headers[0],
          variables: targetDs.data.headers.slice(1).map((h, i) => ({
            datasetId: targetId,
            variable: h,
            enabled: true,
            yAxis: 'y' as const,
            color: CHART_COLORS[i % CHART_COLORS.length]
          })),
        };
        workingCharts = [...workingCharts, autoChart];
        targetCharts = [autoChart];
      }

      return workingCharts.map(chart => {
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
      });
    });
    setActiveDatasetId(targetId);
    setShowCompareTool(false);
  };

  const setVariableYAxis = (chartId: string, datasetId: string, varName: string, yAxis: 'y' | 'y2') => {
    setCharts(charts.map(c => {
      if (c.id !== chartId) return c;
      return { ...c, variables: c.variables.map(v => (v.datasetId === datasetId && v.variable === varName) ? { ...v, yAxis } : v) };
    }));
  };

  const setVariableColor = (chartId: string, datasetId: string, varName: string, color: string) => {
    setCharts(charts.map(c => {
      if (c.id !== chartId) return c;
      return { ...c, variables: c.variables.map(v => (v.datasetId === datasetId && v.variable === varName) ? { ...v, color } : v) };
    }));
  };

  const deleteDataset = (id: string) => {
    setDatasets(datasets.filter(d => d.id !== id));
    setCharts(charts.filter(c => c.datasetId !== id));
    if (activeDatasetId === id) {
      const remaining = datasets.filter(d => d.id !== id);
      setActiveDatasetId(remaining.length > 0 ? remaining[0].id : null);
    }
    if (splitView.topId === id || splitView.bottomId === id) {
      setSplitView({ enabled: false, topId: null, bottomId: null });
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
    if (!draggedDatasetId) return;
    
    if (dropZone === 'top') {
      setSplitView({
        enabled: true,
        topId: draggedDatasetId,
        bottomId: splitView.bottomId || (draggedDatasetId === activeDatasetId ? datasets.find(d => d.id !== draggedDatasetId)?.id || null : activeDatasetId)
      });
      setIsZoomSynced(true);
      setIsHoverSynced(true);
    } else if (dropZone === 'bottom') {
      setSplitView({
        enabled: true,
        topId: splitView.topId || (draggedDatasetId === activeDatasetId ? datasets.find(d => d.id !== draggedDatasetId)?.id || null : activeDatasetId),
        bottomId: draggedDatasetId
      });
      setIsZoomSynced(true);
      setIsHoverSynced(true);
    } else if (draggedDatasetId !== targetId) {
      performOverlap(draggedDatasetId, targetId);
    }
    
    setDraggedDatasetId(null);
    setDropZone(null);
  };

  // 🛰️ Data HUD Values
  const hudValues = useMemo(() => {
    if (sharedHoverX === null) return null;
    
    return datasets.map(ds => {
      const rows = ds.data.data;
      if (rows.length === 0) return null;
      const xAxis = ds.data.headers[0]; 
      
      let closestRow = rows[0];
      let minDiff = Infinity;
      for (const row of rows) {
        const xVal = Number(row[xAxis]);
        if (isNaN(xVal)) continue;
        const diff = Math.abs(xVal - Number(sharedHoverX));
        if (diff < minDiff) {
          minDiff = diff;
          closestRow = row;
        }
      }
      return {
        dsName: ds.name,
        values: ds.data.headers.map(h => ({
          name: h,
          val: closestRow[h]
        }))
      };
    }).filter(Boolean);
  }, [datasets, sharedHoverX]);

  const ChartList = ({ dsId, isSmall }: { dsId: string, isSmall?: boolean }) => {
    const ds = datasets.find(d => d.id === dsId);
    const dsCharts = charts.filter(c => c.datasetId === dsId);
    if (!ds) return null;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 bg-slate-50/80 backdrop-blur py-2 sticky top-0 z-20 rounded-lg border border-slate-200/50 mb-4">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <FileText size={16} className="text-blue-500" /> {ds.name}
          </h2>
          <button onClick={() => addChart(dsId)} className="text-xs flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600 transition-colors"><Plus size={12} /> Add Chart</button>
        </div>
        {dsCharts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-white/50 border border-dashed border-slate-200 rounded-xl text-sm">No charts for this dataset.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {dsCharts.map((chart) => (
              <div key={chart.id} className="relative group">
                <div className="absolute left-3 top-3 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setActiveConfigId(activeConfigId === chart.id ? null : chart.id)} className="p-1.5 bg-white/90 backdrop-blur hover:bg-white text-slate-500 rounded border border-slate-200 shadow-sm"><Settings2 size={14} /></button>
                  <button onClick={() => removeChart(chart.id)} className="p-1.5 bg-white/90 backdrop-blur hover:bg-red-50 text-red-500 rounded border border-slate-200 shadow-sm"><Trash2 size={14} /></button>
                </div>
                <Chart config={chart} datasets={datasets} onRelayout={handleChartRelayout} xaxisRange={sharedRange} hoverX={sharedHoverX} onHover={handleChartHover} isSmall={isSmall} />
                {activeConfigId === chart.id && (
                  <div className="mt-2 p-4 bg-white rounded-xl shadow-xl border border-slate-200 z-20 relative animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between mb-4 border-b pb-2">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800"><Settings2 size={16} className="text-blue-600" /> Config: {chart.title}</h3>
                      <button onClick={() => setActiveConfigId(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex gap-4">
                        <div className="flex-1"><label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Title</label><input type="text" value={chart.title} onChange={(e) => updateChart(chart.id, { title: e.target.value })} className="w-full px-2 py-1 text-sm border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-500" /></div>
                        <div className="flex-1"><label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">X-Axis</label><select value={chart.xAxis} onChange={(e) => updateChart(chart.id, { xAxis: e.target.value })} className="w-full px-2 py-1 text-sm border border-slate-200 rounded outline-none bg-white">{ds.data.headers.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
                      </div>
                      <div className="flex items-center gap-2 px-1"><input type="checkbox" id={`norm-${chart.id}`} checked={chart.normalizeX || false} onChange={(e) => updateChart(chart.id, { normalizeX: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600" /><label htmlFor={`norm-${chart.id}`} className="text-xs font-medium text-slate-600">Normalize X (Start at 0)</label></div>
                      <div className="max-h-48 overflow-y-auto pr-1 border rounded-lg bg-slate-50 p-2">
                        {datasets.map(d => (
                          <div key={d.id} className="mb-3 last:mb-0">
                            <div className="text-[9px] uppercase font-bold text-slate-400 mb-1 px-1">{d.name} {d.id === chart.datasetId && '(Primary)'}</div>
                            {d.data.headers.filter(h => h !== chart.xAxis).map(h => {
                              const config = chart.variables.find(v => v.datasetId === d.id && v.variable === h);
                              const isEnabled = config?.enabled || false;
                              return (
                                <div key={h} className="flex items-center justify-between p-1.5 hover:bg-white rounded transition-colors group/var">
                                  <div className="flex items-center gap-2"><input type="checkbox" checked={isEnabled} onChange={() => toggleVariable(chart.id, d.id, h)} className="w-3.5 h-3.5 rounded text-blue-600" /><span className={cn("text-xs", !isEnabled && "text-slate-400")}>{h}</span></div>
                                  {isEnabled && (
                                    <div className="flex items-center gap-2">
                                      <input type="color" value={config?.color || CHART_COLORS[0]} onChange={(e) => setVariableColor(chart.id, d.id, h, e.target.value)} className="w-4 h-4 p-0 border-none bg-transparent cursor-pointer rounded" />
                                      <select value={config?.yAxis || 'y'} onChange={(e) => setVariableYAxis(chart.id, d.id, h, e.target.value as 'y' | 'y2')} className="text-[9px] border border-slate-200 rounded px-1 py-0.5 bg-white font-bold"><option value="y">Y1</option><option value="y2">Y2</option></select>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-6 overflow-x-hidden pb-48">
      {draggedDatasetId && (
        <>
          <div onDragOver={(e) => { e.preventDefault(); setDropZone('top'); }} onDragLeave={() => setDropZone(null)} onDrop={(e) => { e.preventDefault(); handleDrop(draggedDatasetId); }} className={cn("fixed left-0 right-0 top-[120px] h-[80px] z-50 transition-all duration-200 pointer-events-auto flex items-center justify-center rounded-2xl mx-8", dropZone === 'top' ? "bg-blue-500/20 border-2 border-blue-500" : "bg-blue-500/5 border-2 border-dashed border-blue-300")}><span className="text-blue-600 font-bold uppercase tracking-widest text-xs">↑ Split Top</span></div>
          <div onDragOver={(e) => { e.preventDefault(); setDropZone('bottom'); }} onDragLeave={() => setDropZone(null)} onDrop={(e) => { e.preventDefault(); handleDrop(draggedDatasetId); }} className={cn("fixed left-0 right-0 bottom-4 h-[80px] z-50 transition-all duration-200 pointer-events-auto flex items-center justify-center rounded-2xl mx-8", dropZone === 'bottom' ? "bg-blue-500/20 border-2 border-blue-500" : "bg-blue-500/5 border-2 border-dashed border-blue-300")}><span className="text-blue-600 font-bold uppercase tracking-widest text-xs">↓ Split Bottom</span></div>
        </>
      )}

      <header className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">Telemetry Plotter {splitView.enabled && <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-600 rounded-full font-bold uppercase tracking-tighter">Parallel View</span>}</h1>
          <p className="text-slate-500 text-sm mt-1">Parallel X-axis telemetry analysis.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {datasets.length >= 2 && !splitView.enabled && (
            <button onClick={() => setShowCompareTool(!showCompareTool)} className={cn("flex items-center gap-2 px-3 py-2 border rounded-lg transition-all shadow-sm text-sm", showCompareTool ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50")}><GitCompare size={16} /> <span>Compare</span></button>
          )}
          {splitView.enabled && (
            <button onClick={() => setSplitView({ enabled: false, topId: null, bottomId: null })} className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-900 transition-all"><PanelsTopLeft size={16} /> Exit Parallel View</button>
          )}
          {datasets.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button onClick={() => setIsHoverSynced(!isHoverSynced)} className={cn("p-1.5 rounded transition-all", isHoverSynced ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:text-slate-600")} title="Sync Hover"><MousePointer2 size={16} /></button>
              <button onClick={() => { setIsZoomSynced(!isZoomSynced); if (!isZoomSynced) setSharedRange(undefined); }} className={cn("p-1.5 rounded transition-all", isZoomSynced ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:text-slate-600")} title="Sync Zoom">{isZoomSynced ? <Link size={16} /> : <Link2Off size={16} />}</button>
            </div>
          )}
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors shadow-sm text-sm font-bold"><Upload size={16} /> <span>Upload</span><input type="file" accept=".csv" multiple onChange={handleFileUpload} className="hidden" /></label>
        </div>
      </header>

      {showCompareTool && datasets.length >= 2 && !splitView.enabled && (
        <div className="mb-8 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-indigo-900 flex items-center gap-2"><GitCompare size={18} /> Quick Compare</h3><button onClick={() => setShowCompareTool(false)} className="text-indigo-400 hover:text-indigo-600"><X size={18}/></button></div>
          <div className="flex flex-wrap items-center gap-4">
            <select value={compareSourceId || datasets[0].id} onChange={e => setCompareSourceId(e.target.value)} className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500">{datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <Move size={14} className="text-indigo-300" />
            <select value={compareTargetId || datasets[1].id} onChange={e => setCompareTargetId(e.target.value)} className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500">{datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <div className="flex gap-2 ml-auto"><button onClick={() => { setSplitView({ enabled: true, topId: compareSourceId || datasets[0].id, bottomId: compareTargetId || datasets[1].id }); setIsZoomSynced(true); setIsHoverSynced(true); setShowCompareTool(false); }} className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all">Parallel View</button><button onClick={() => performOverlap(compareSourceId || datasets[0].id, compareTargetId || (compareSourceId === datasets[0].id ? datasets[1].id : datasets[0].id))} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all">Overlap</button></div>
          </div>
        </div>
      )}

      {datasets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-6 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              draggable
              onDragStart={() => setDraggedDatasetId(dataset.id)}
              onDragEnd={() => { setDraggedDatasetId(null); setDropZone(null); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dropZone === null) handleDrop(dataset.id); }}
              className={cn(
                "group flex items-center gap-2 px-3 py-1.5 rounded-t-lg transition-all cursor-pointer border-x border-t -mb-[9px] relative",
                activeDatasetId === dataset.id && !splitView.enabled ? "bg-white border-slate-200 text-blue-600 font-bold" : "bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200",
                (splitView.topId === dataset.id || splitView.bottomId === dataset.id) && "border-t-blue-400 border-t-2",
                draggedDatasetId === dataset.id && "opacity-50 scale-95",
                draggedDatasetId && draggedDatasetId !== dataset.id && "ring-2 ring-indigo-300 ring-offset-1"
              )}
              onClick={() => { setActiveDatasetId(dataset.id); if (splitView.enabled) setSplitView({ ...splitView, enabled: false }); }}
            >
              <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400 mr-1"><Move size={10} /></div>
              <span className="text-xs truncate max-w-[120px]">{dataset.name}</span>
              <div className={cn("flex items-center gap-0.5 transition-opacity", activeDatasetId === dataset.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                <button onClick={(e) => { e.stopPropagation(); setEditingDatasetId(dataset.id); setTempDatasetName(dataset.name); }} className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"><Edit2 size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); deleteDataset(dataset.id); }} className="p-0.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"><X size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {datasets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
          <div className="bg-blue-50 p-6 rounded-full mb-6"><Upload size={48} className="text-blue-400" /></div>
          <h2 className="text-2xl font-bold mb-2">Ready for Telemetry</h2>
          <p className="text-slate-500 text-center max-w-sm mb-8 px-4 text-sm leading-relaxed">Upload your CSV files to start analyzing. Drag tabs to the screen edges to compare side-by-side.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl px-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600"><span className="font-bold text-blue-600 block mb-1">↔ PARALLEL COMPARE</span>Drag a tab to the <b className="text-slate-900">top or bottom edge</b> of your screen to stack datasets.</div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600"><span className="font-bold text-blue-600 block mb-1">⇶ OVERLAP COMPARE</span>Drag one tab <b className="text-slate-900">directly onto another</b> to overlay graphs with inverted colors.</div>
          </div>
        </div>
      ) : splitView.enabled ? (
        <div className="flex flex-col gap-12 max-w-[1200px] mx-auto animate-in fade-in duration-500">
          <div className="bg-slate-100/50 p-4 rounded-2xl border border-slate-200/60 shadow-inner">{ChartList({ dsId: splitView.topId!, isSmall: true })}</div>
          <div className="bg-slate-100/50 p-4 rounded-2xl border border-slate-200/60 shadow-inner">{ChartList({ dsId: splitView.bottomId!, isSmall: true })}</div>
        </div>
      ) : (
        <div className="max-w-[1200px] mx-auto">
          {activeDatasetId ? (
            <div className="grid grid-cols-1 gap-8">
              {ChartList({ dsId: activeDatasetId })}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">Select a tab to view charts.</div>
          )}
        </div>
      )}

      {/* 🛰️ Data HUD (Shared Values) */}
      {sharedHoverX !== null && datasets.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom-full duration-300">
          <div className="max-w-[1800px] mx-auto overflow-x-auto no-scrollbar">
            <div className="flex items-start gap-8 min-w-max">
              <div className="flex flex-col shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">X-Axis Value</span>
                <span className="text-xl font-black text-blue-600 tabular-nums leading-none">{sharedHoverX}</span>
              </div>
              <div className="h-10 w-px bg-slate-200 shrink-0" />
              <div className="flex gap-12">
                {hudValues?.map((ds, i) => (
                  <div key={i} className="flex flex-col shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-500 truncate mb-1 border-b border-slate-100 pb-1">{ds?.dsName}</span>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 max-w-4xl">
                      {ds?.values.map((v, j) => (
                        <div key={j} className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-400 whitespace-nowrap">{v.name}:</span>
                          <span className="font-mono font-bold text-slate-700">{typeof v.val === 'number' ? v.val.toFixed(3) : v.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingDatasetId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-slate-800 mb-4">Rename Dataset</h3>
            <input autoFocus value={tempDatasetName} onChange={(e) => setTempDatasetName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveDatasetName(editingDatasetId, tempDatasetName)} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 mb-6" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditingDatasetId(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => saveDatasetName(editingDatasetId, tempDatasetName)} className="px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
