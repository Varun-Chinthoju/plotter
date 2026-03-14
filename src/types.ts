export interface TelemetryData {
  headers: string[];
  data: Record<string, number | string>[];
}

export interface VariableConfig {
  variable: string;
  enabled: boolean;
  yAxis: 'y' | 'y2';
  color?: string;
}

export interface ChartConfig {
  id: string;
  title: string;
  xAxis: string;
  variables: VariableConfig[];
}
