export interface TelemetryData {
  headers: string[];
  data: Record<string, number | string>[];
}

export interface Dataset {
  id: string;
  name: string;
  data: TelemetryData;
}

export interface VariableConfig {
  datasetId: string;
  variable: string;
  enabled: boolean;
  yAxis: 'y' | 'y2';
  color?: string;
}

export interface ChartConfig {
  id: string;
  datasetId: string;
  title: string;
  xAxis: string;
  variables: VariableConfig[];
  normalizeX?: boolean;
}
