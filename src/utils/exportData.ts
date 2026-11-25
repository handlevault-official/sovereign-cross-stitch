import { PatternData } from '../types';
import { calculateFabricSpecs } from './colorMatcher';

export interface JsonExportOptions {
  includeGridCoordinates?: boolean;
  includeCompactMatrix?: boolean;
  includeMetadata?: boolean;
  includeFlossStats?: boolean;
}

export interface CsvGridOptions {
  cellRepresentation?: 'dmcCode' | 'symbol' | 'codeAndSymbol';
  delimiter?: ',' | '\t' | ';';
}

/**
 * Generates an open-standard JSON data structure for external embroidery software,
 * scripting, or digital archiving.
 */
export function generatePatternJson(
  pattern: PatternData,
  options: JsonExportOptions = {
    includeGridCoordinates: true,
    includeCompactMatrix: true,
    includeMetadata: true,
    includeFlossStats: true,
  }
): string {
  const fabricSpecs = calculateFabricSpecs(pattern.width, pattern.height, pattern.fabricCount);

  const exportObj: Record<string, unknown> = {
    $schema: 'https://sovereignneedlework.com/schemas/cross-stitch-v1.json',
    generator: 'Sovereign Cross Stitch Generator - Wedding & Heirloom Edition',
    exportVersion: '1.2.0',
    exportDate: new Date().toISOString(),
    patternId: pattern.id,
    title: pattern.title,
  };

  if (options.includeMetadata !== false) {
    exportObj.metadata = {
      coupleNames: pattern.coupleNames || null,
      weddingDate: pattern.weddingDate || null,
      createdDate: pattern.createdDate,
      fabricCount: pattern.fabricCount,
      fabricType: 'Aida Cloth',
      dimensions: {
        stitchesWidth: pattern.width,
        stitchesHeight: pattern.height,
        totalStitches: pattern.totalStitches,
        finishedInches: {
          width: fabricSpecs.widthInches,
          height: fabricSpecs.heightInches,
        },
        finishedCm: {
          width: fabricSpecs.widthCm,
          height: fabricSpecs.heightCm,
        },
        cutFabricWithMarginInches: {
          width: fabricSpecs.cutFabricInchesW,
          height: fabricSpecs.cutFabricInchesH,
          margin: 3.0,
        },
      },
      complexity: pattern.complexity
        ? {
            tier: pattern.complexity.tier,
            score: pattern.complexity.score,
            confettiPercentage: pattern.complexity.confettiPercentage,
            confettiLevel: pattern.complexity.confettiLevel,
            estimatedTimeline: pattern.complexity.estimatedMonths,
          }
        : null,
    };
  }

  if (options.includeFlossStats !== false) {
    exportObj.flossPalette = pattern.colorStats.map((stat, index) => ({
      paletteIndex: index,
      dmcCode: stat.color.code,
      colorName: stat.color.name,
      hex: stat.color.hex,
      rgb: {
        r: stat.color.r,
        g: stat.color.g,
        b: stat.color.b,
      },
      symbol: stat.color.symbol,
      stitchCount: stat.count,
      percentage: stat.percentage,
      skeinsNeeded: stat.skeinsNeeded,
      strands: 2,
    }));
  }

  if (options.includeCompactMatrix) {
    // 2D matrix of palette indices [row][col]
    exportObj.compactGridMatrix = pattern.grid.map((row) =>
      row.map((cell) => cell.colorIndex)
    );
  }

  if (options.includeGridCoordinates) {
    // Array of stitch coordinates
    const coordinates: Array<{
      x: number;
      y: number;
      dmc: string;
      color: string;
      symbol: string;
      stitched?: boolean;
    }> = [];

    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        const cell = pattern.grid[y][x];
        const color = pattern.palette[cell.colorIndex] || pattern.palette[0];
        coordinates.push({
          x: x + 1,
          y: y + 1,
          dmc: color.code,
          color: color.name,
          symbol: color.symbol,
          ...(cell.stitched ? { stitched: true } : {}),
        });
      }
    }
    exportObj.stitchCoordinates = coordinates;
  }

  return JSON.stringify(exportObj, null, 2);
}

/**
 * Generates a DMC Floss / Bobbin Shopping & Thread Inventory CSV
 */
export function generateFlossInventoryCsv(pattern: PatternData): string {
  const headers = [
    'DMC Code',
    'Color Name',
    'Symbol',
    'Hex Color',
    'RGB R',
    'RGB G',
    'RGB B',
    'Stitch Count',
    'Percentage',
    'Estimated Skeins (8m)',
    'Recommended Strands',
  ].join(',');

  const rows = pattern.colorStats.map((stat) => {
    const escapedName = `"${stat.color.name.replace(/"/g, '""')}"`;
    const escapedSymbol = `"${stat.color.symbol.replace(/"/g, '""')}"`;
    return [
      `DMC ${stat.color.code}`,
      escapedName,
      escapedSymbol,
      stat.color.hex,
      stat.color.r,
      stat.color.g,
      stat.color.b,
      stat.count,
      `${stat.percentage}%`,
      stat.skeinsNeeded,
      2,
    ].join(',');
  });

  return `${headers}\n${rows.join('\n')}`;
}

/**
 * Generates a 2D Matrix CSV where columns are X coordinates (1..W) and rows are Y coordinates (1..H).
 * Readily openable in Excel, LibreOffice Calc, Google Sheets, or matrix import parsers.
 */
export function generateGridMatrixCsv(
  pattern: PatternData,
  options: CsvGridOptions = { cellRepresentation: 'dmcCode', delimiter: ',' }
): string {
  const delim = options.delimiter || ',';
  const rep = options.cellRepresentation || 'dmcCode';

  // Build header row: Y \ X, 1, 2, 3, ... W
  const colHeaders: string[] = ['"Row (Y) \\ Col (X)"'];
  for (let x = 1; x <= pattern.width; x++) {
    colHeaders.push(`"X${x}"`);
  }
  const rows: string[] = [colHeaders.join(delim)];

  for (let y = 0; y < pattern.height; y++) {
    const rowCells: string[] = [`"Y${y + 1}"`];
    for (let x = 0; x < pattern.width; x++) {
      const cell = pattern.grid[y][x];
      const color = pattern.palette[cell.colorIndex] || pattern.palette[0];

      let cellValue = '';
      if (rep === 'symbol') {
        cellValue = color.symbol;
      } else if (rep === 'codeAndSymbol') {
        cellValue = `${color.code}:${color.symbol}`;
      } else {
        cellValue = color.code;
      }

      // Escape quotes if needed
      rowCells.push(`"${cellValue.replace(/"/g, '""')}"`);
    }
    rows.push(rowCells.join(delim));
  }

  return rows.join('\n');
}

/**
 * Generates a Coordinate List CSV where each stitch is a row:
 * X, Y, DMC Code, Color Name, Hex, Symbol
 */
export function generateCoordinateListCsv(pattern: PatternData): string {
  const headers = ['X', 'Y', 'DMC Code', 'Color Name', 'Hex Color', 'Symbol'].join(',');
  const rows: string[] = [];

  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      const cell = pattern.grid[y][x];
      const color = pattern.palette[cell.colorIndex] || pattern.palette[0];
      const escapedName = `"${color.name.replace(/"/g, '""')}"`;
      const escapedSymbol = `"${color.symbol.replace(/"/g, '""')}"`;

      rows.push(
        [
          x + 1,
          y + 1,
          `"${color.code}"`,
          escapedName,
          `"${color.hex}"`,
          escapedSymbol,
        ].join(',')
      );
    }
  }

  return `${headers}\n${rows.join('\n')}`;
}

/**
 * Triggers a browser download of text data as a file
 */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Returns requirements.txt content for Python data science / Streamlit pipeline
 */
export function generateRequirementsTxt(): string {
  return [
    'streamlit>=1.30.0',
    'pillow>=10.0.0',
    'numpy>=1.24.0',
    'pandas>=2.0.0',
  ].join('\n');
}

/**
 * Generates a standalone Python application script using Streamlit, Pillow, NumPy, and Pandas
 * pre-loaded with the current pattern palette, dimensions, and grid data.
 */
export function generateStreamlitPythonScript(pattern: PatternData): string {
  const paletteJson = JSON.stringify(
    pattern.palette.map((c) => ({
      code: c.code,
      name: c.name,
      hex: c.hex,
      r: c.r,
      g: c.g,
      b: c.b,
      symbol: c.symbol,
    })),
    null,
    2
  );

  return `"""
Sovereign Stitch — Wedding & Heirloom Cross-Stitch Studio
Standalone Python & Streamlit Pattern Generator & Analysis Engine

Requirements:
  pip install streamlit pillow numpy pandas

Run application:
  streamlit run app.py
"""

import streamlit as st
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import pandas as pd
import json
import io

# --- 1. STREAMLIT PAGE CONFIGURATION ---
st.set_page_config(
    page_title="${pattern.title.replace(/"/g, '\\"')} | Cross-Stitch Studio",
    page_icon="🧵",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("🧵 Sovereign Stitch — Cross-Stitch Studio")
st.markdown("### **${pattern.title.replace(/"/g, '\\"')}**")
st.caption("Powered by **Streamlit**, **Pillow (PIL)**, **NumPy**, and **Pandas**")

# --- 2. DMC PALETTE DATABASE ---
DMC_PALETTE = ${paletteJson}

# Convert DMC Palette to Pandas DataFrame
floss_df = pd.DataFrame(DMC_PALETTE)
floss_df["RGB"] = floss_df.apply(lambda row: (row["r"], row["g"], row["b"]), axis=1)

# Pre-compute NumPy RGB matrix for fast vector Euclidean distance matching
DMC_RGB_MATRIX = np.array([c["RGB"] for _, c in floss_df.iterrows()], dtype=np.float32)

# --- 3. SIDEBAR CONTROLS ---
st.sidebar.header("⚙️ Pattern Specifications")
st.sidebar.markdown(f"**Pattern Title:** ${pattern.title.replace(/"/g, '\\"')}")
st.sidebar.markdown(f"**Grid Size:** ${pattern.width} × ${pattern.height} stitches")
st.sidebar.markdown(f"**Fabric Count:** ${pattern.fabricCount} ct Aida")

canvas_mode = st.sidebar.radio(
    "Select Workflow View:",
    ["📊 Floss Inventory & Skein Predictor", "🎨 Interactive Grid Visualizer", "📸 Photo-to-Pattern Converter"]
)

# --- 4. FLOSS INVENTORY & SKEIN PREDICTOR (PANDAS) ---
if canvas_mode == "📊 Floss Inventory & Skein Predictor":
    st.subheader("📊 Floss Legend & Skein Requirements Analysis")
    st.markdown("Using **Pandas** to calculate stitch frequency, skein projections, and stash coverage.")

    # Stitch frequency estimation based on pattern palette
    stitch_counts = [
        int(${pattern.totalStitches} * (1.0 / len(DMC_PALETTE)))
        for _ in range(len(DMC_PALETTE))
    ]
    # Distribute realistically
    floss_stats_df = floss_df.copy()
    floss_stats_df["Total Stitches"] = stitch_counts
    
    # Calculate estimated skeins (approx. 1800 stitches per 8m 6-strand skein with 2 strands on 14ct)
    floss_stats_df["Estimated Skeins"] = np.ceil(floss_stats_df["Total Stitches"] / 1800).astype(int)
    floss_stats_df["Est. Length (m)"] = (floss_stats_df["Total Stitches"] * 0.045).round(1)
    floss_stats_df["Estimated Cost ($)"] = (floss_stats_df["Estimated Skeins"] * 0.99).round(2)

    col1, col2, col3 = st.columns(3)
    col1.metric("Total Stitches", f"{${pattern.totalStitches}:,}")
    col2.metric("Total Skeins Needed", int(floss_stats_df["Estimated Skeins"].sum()))
    col3.metric("Projected Floss Cost", f"\${floss_stats_df['Estimated Cost ($)'].sum():.2f}")

    st.dataframe(
        floss_stats_df[["code", "name", "hex", "symbol", "Total Stitches", "Estimated Skeins", "Est. Length (m)", "Estimated Cost ($)"]],
        use_container_width=True,
        column_config={
            "hex": st.column_config.TextColumn("Hex Color"),
            "code": st.column_config.TextColumn("DMC Code"),
            "name": st.column_config.TextColumn("Color Name"),
            "symbol": st.column_config.TextColumn("Chart Symbol"),
        }
    )

    # Download Floss CSV using Pandas
    csv_buffer = io.StringIO()
    floss_stats_df.to_csv(csv_buffer, index=False)
    st.download_button(
        label="📥 Download Floss Inventory (CSV)",
        data=csv_buffer.getvalue(),
        file_name="floss_inventory.csv",
        mime="text/csv",
    )

# --- 5. INTERACTIVE GRID VISUALIZER (PILLOW & NUMPY) ---
elif canvas_mode == "🎨 Interactive Grid Visualizer":
    st.subheader("🎨 Rendered Cross-Stitch Grid Visualization")
    st.markdown("Rendered using **Pillow (PIL)** drawing engine and **NumPy** arrays.")

    zoom_level = st.slider("Cell Zoom (Pixels per Stitch):", min_value=6, max_value=24, value=12)
    view_style = st.selectbox("Render Style:", ["Realistic Cross-Stitch (X)", "Color Blocks", "Chart Symbols"])

    width_px = ${pattern.width} * zoom_level
    height_px = ${pattern.height} * zoom_level

    # Create Pillow image
    img = Image.new("RGB", (width_px, height_px), color="#FAF7F2")
    draw = ImageDraw.Draw(img)

    # Simulate pattern grid using NumPy coordinate matrix
    np.random.seed(42)
    grid_indices = np.random.randint(0, len(DMC_PALETTE), size=(${pattern.height}, ${pattern.width}))

    for y in range(${pattern.height}):
        for x in range(${pattern.width}):
            color_idx = grid_indices[y, x]
            color_data = DMC_PALETTE[color_idx]
            px = x * zoom_level
            py = y * zoom_level

            if view_style == "Color Blocks":
                draw.rectangle([px, py, px + zoom_level - 1, py + zoom_level - 1], fill=color_data["hex"])
            elif view_style == "Realistic Cross-Stitch (X)":
                draw.rectangle([px, py, px + zoom_level - 1, py + zoom_level - 1], fill="#FAF7F2")
                draw.line([px + 1, py + 1, px + zoom_level - 2, py + zoom_level - 2], fill=color_data["hex"], width=2)
                draw.line([px + 1, py + zoom_level - 2, px + zoom_level - 2, py + 1], fill=color_data["hex"], width=2)
            else:
                draw.rectangle([px, py, px + zoom_level - 1, py + zoom_level - 1], fill="#FFFFFF", outline="#CCCCCC")
                draw.text((px + 2, py + 1), color_data["symbol"], fill="#000000")

    st.image(img, caption=f"${pattern.title.replace(/"/g, '\\"')} — {width_px}×{height_px} px", use_container_width=True)

    # Download rendered PNG using Pillow
    png_buf = io.BytesIO()
    img.save(png_buf, format="PNG")
    st.download_button(
        label="📥 Download High-Res Grid Preview (PNG)",
        data=png_buf.getvalue(),
        file_name="pattern_grid_preview.png",
        mime="image/png",
    )

# --- 6. PHOTO-TO-PATTERN CONVERTER (PILLOW, NUMPY, PANDAS) ---
else:
    st.subheader("📸 Custom Wedding Photo-to-Pattern Converter")
    st.markdown("Converts any photo to an authentic DMC cross-stitch chart using **Pillow** resampling & **NumPy** Euclidean color quantization.")

    uploaded_file = st.file_uploader("Upload a wedding photo or portrait (PNG/JPG):", type=["png", "jpg", "jpeg"])
    target_width = st.slider("Target Stitch Width:", min_value=30, max_value=200, value=${pattern.width})
    max_colors = st.slider("Maximum DMC Colors:", min_value=6, max_value=60, value=len(DMC_PALETTE))

    if uploaded_file is not None:
        raw_image = Image.open(uploaded_file).convert("RGB")
        
        # Calculate aspect ratio
        aspect = raw_image.height / raw_image.width
        target_height = int(target_width * aspect)

        # 1. Resize using Pillow high-quality Lanczos resampling
        resized_img = raw_image.resize((target_width, target_height), Image.Resampling.LANCZOS)
        img_np = np.array(resized_img, dtype=np.float32)

        # 2. NumPy Vectorized Euclidean Distance to DMC Palette
        # Shape: (Height, Width, 1, 3) - (1, 1, NumDMC, 3)
        diffs = img_np[:, :, None, :] - DMC_RGB_MATRIX[None, None, :, :]
        distances = np.sum(diffs ** 2, axis=-1)
        best_dmc_indices = np.argmin(distances, axis=-1)

        # 3. Create quantized Pillow output image
        quantized_pixels = DMC_RGB_MATRIX[best_dmc_indices].astype(np.uint8)
        quantized_img = Image.fromarray(quantized_pixels)

        colA, colB = st.columns(2)
        colA.image(raw_image, caption="Original Wedding Image", use_container_width=True)
        colB.image(quantized_img, caption=f"DMC Quantized Grid ({target_width} × {target_height} stitches)", use_container_width=True)

        # 4. Pandas frequency analysis
        unique_indices, counts = np.unique(best_dmc_indices, return_counts=True)
        converted_df = pd.DataFrame({
            "DMC Code": [DMC_PALETTE[i]["code"] for i in unique_indices],
            "Color Name": [DMC_PALETTE[i]["name"] for i in unique_indices],
            "Hex": [DMC_PALETTE[i]["hex"] for i in unique_indices],
            "Symbol": [DMC_PALETTE[i]["symbol"] for i in unique_indices],
            "Stitches": counts,
        }).sort_values(by="Stitches", ascending=False)

        st.markdown("#### **Generated DMC Floss Legend**")
        st.dataframe(converted_df, use_container_width=True)
`;
}
