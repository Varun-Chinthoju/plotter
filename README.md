# Telemetry Plotter

A simple, interactive web application to visualize telemetry data from CSV files.

## Features

- **CSV Support**: Upload any CSV file.
- **Interactive Charts**: Powered by Plotly.js for zooming, panning, and detailed tooltips.
- **Multiple Charts**: Create as many charts as you need from the same dataset.
- **Customizable**: Enable or disable specific variables for each chart.
- **Dual Y-Axis**: Map variables to a secondary Y-axis for better comparison of data with different scales.
- **Modern UI**: Clean design built with React, Tailwind CSS, and Lucide icons.

## Getting Started

1.  **Clone or Download** the project.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run the development server**:
    ```bash
    npm run dev
    ```
4.  **Open in Browser**: Navigate to the local URL provided by Vite (usually `http://localhost:5173`).
5.  **Upload a CSV**: Click "Upload CSV" and select your telemetry file.
6.  **Add & Configure**: Click "Add Chart" and use the gear icon to set the title, X-axis, and Y-axis variables.

## CSV Format

The application expects a CSV file with headers in the first row. The first column is used as the default X-axis, but you can change this in the chart configuration.

Example:
```csv
time,voltage,current,temperature
0,12.5,1.2,25.4
0.1,12.4,1.5,25.5
0.2,12.6,1.1,25.6
...
```
