# Telemetry CSV Charting Application Plan

## Objective
Create a modern web application to upload, visualize, and analyze telemetry `.csv` data. The application will allow users to generate multiple interactive charts from a single CSV file, toggle specific variables on or off, and assign variables to different Y-scales (primary vs. secondary Y-axis) for effective comparison of data with different magnitudes.

## Tech Stack
- **Framework**: React with TypeScript (via Vite)
- **Styling**: Tailwind CSS
- **Charting**: Plotly (`plotly.js` and `react-plotly.js`) - ideal for complex scientific/telemetry data, zooming, panning, and multiple Y-axes.
- **CSV Parsing**: PapaParse

## Key Features
1. **CSV Upload**: A simple drag-and-drop or file selection area to load telemetry data.
2. **Dashboard Management**: Ability to add multiple, independent charts using the same loaded dataset.
3. **Chart Configuration**:
   - Select the independent variable (X-axis, e.g., Time).
   - Select multiple dependent variables (Y-axis).
   - Toggle visibility of selected variables.
   - Assign any variable to a secondary Y-axis (different scale).
4. **Interactive Visualization**: Zoom, pan, hover tooltips, and export options provided out-of-the-box by Plotly.

## Implementation Steps

### Phase 1: Setup & Scaffolding
- Initialize a new React TypeScript project using Vite in the root directory.
- Install necessary dependencies: `papaparse`, `plotly.js`, `react-plotly.js`, `lucide-react` (for icons), and Tailwind CSS.
- Set up the basic application layout (Header, Main Content Area).

### Phase 2: Core State & Data Handling
- Implement CSV parsing logic using PapaParse.
- Create a central state (using React Context or standard state) to store:
  - The parsed CSV headers (variable names).
  - The raw CSV data rows.
  - The list of configured charts.

### Phase 3: Chart Configuration UI
- Build a "Chart Card" component.
- Inside the Chart Card, create a configuration panel:
  - Dropdown to select the X-axis variable.
  - List of available variables with checkboxes to enable/disable them on the chart.
  - For each enabled variable, a toggle/dropdown to select the Y-axis scale (e.g., "Left (Y1)" or "Right (Y2)").

### Phase 4: Plotly Integration
- Build the core Chart component wrapping `react-plotly.js`.
- Write logic to transform the parsed CSV data and the chart configuration into Plotly's `data` (traces) and `layout` objects.
- Ensure the layout dynamically handles the secondary Y-axis if any variable is mapped to it.

### Phase 5: Multi-Chart Dashboard
- Create a dashboard area where the user can click "Add New Chart".
- Ensure each chart maintains its own independent configuration state while reading from the same shared CSV dataset.

## Verification & Testing
- **Upload Test**: Ensure CSV files (with various column counts) parse correctly without freezing the UI.
- **Multi-Chart Test**: Add at least 3 charts and verify they render independently.
- **Scale Test**: Map a variable with values in the 1000s to Y1, and a variable with values from 0-1 to Y2, and verify both scales render correctly and clearly.
- **Performance**: Verify Plotly handles a moderately large CSV (e.g., 10k rows) reasonably well.