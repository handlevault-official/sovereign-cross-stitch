"""
Sovereign Stitch — Wedding & Heirloom Cross-Stitch Studio
Standalone Python Application powered by Streamlit, Pillow, NumPy, and Pandas

Quickstart:
  1. pip install -r scripts/requirements.txt
  2. streamlit run scripts/streamlit_cross_stitch_app.py
"""

import streamlit as st
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import pandas as pd
import io

# 1. PAGE SETUP
st.set_page_config(
    page_title="Sovereign Stitch | Python & Streamlit Studio",
    page_icon="🧵",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("🧵 Sovereign Stitch — Cross-Stitch Studio")
st.markdown("### **Wedding & Heirloom Pattern Processing Suite**")
st.caption("Built with **Streamlit** (UI) • **Pillow (PIL)** (Image Processing) • **NumPy** (Matrix Math) • **Pandas** (Tabular Analysis)")

# 2. DEFAULT DMC FLOSS PALETTE DATABASE
DMC_DATA = [
    {"code": "ECRU", "name": "Platinum White / Ecru", "hex": "#F0EAE1", "r": 240, "g": 234, "b": 225, "symbol": "◇"},
    {"code": "3865", "name": "Winter White", "hex": "#F9F7F1", "r": 249, "g": 247, "b": 241, "symbol": "○"},
    {"code": "822", "name": "Light Beige Silk", "hex": "#E7DEC8", "r": 231, "g": 222, "b": 200, "symbol": "△"},
    {"code": "676", "name": "Light Old Gold", "hex": "#E5C158", "r": 229, "g": 193, "b": 88, "symbol": "★"},
    {"code": "729", "name": "Medium Antique Gold", "hex": "#BA8C35", "r": 186, "g": 140, "b": 53, "symbol": "◆"},
    {"code": "680", "name": "Dark Old Gold", "hex": "#936F1E", "r": 147, "g": 111, "b": 30, "symbol": "▲"},
    {"code": "778", "name": "Blush Rose Silk", "hex": "#DFB3B2", "r": 223, "g": 179, "b": 178, "symbol": "♥"},
    {"code": "3726", "name": "Dark Antique Mauve", "hex": "#9B5D68", "r": 155, "g": 93, "b": 104, "symbol": "♣"},
    {"code": "502", "name": "Blue Green Sage", "hex": "#5D8A74", "r": 93, "g": 138, "b": 116, "symbol": "♠"},
    {"code": "3051", "name": "Dark Green Gray", "hex": "#47593D", "r": 71, "g": 89, "b": 61, "symbol": "✿"},
    {"code": "310", "name": "Black", "hex": "#000000", "r": 0, "g": 0, "b": 0, "symbol": "■"},
]

# Create Pandas DataFrame of DMC Palette
dmc_df = pd.DataFrame(DMC_DATA)
dmc_df["RGB"] = dmc_df.apply(lambda r: (r["r"], r["g"], r["b"]), axis=1)

# Precompute NumPy vector matrix of DMC colors
DMC_RGB_VECTORS = np.array([c["RGB"] for _, c in dmc_df.iterrows()], dtype=np.float32)

# 3. SIDEBAR NAVIGATION
st.sidebar.header("🛠️ Studio Modes")
mode = st.sidebar.radio(
    "Choose Workflow:",
    [
        "📊 Floss Legend & Skein Estimation (Pandas)",
        "🎨 Pattern Grid Visualizer (Pillow + NumPy)",
        "📸 Custom Wedding Photo Quantizer (Pillow + NumPy + Pandas)"
    ]
)

# 4. TABULAR FLOSS INVENTORY & SKEIN ESTIMATION (PANDAS)
if mode == "📊 Floss Legend & Skein Estimation (Pandas)":
    st.subheader("📊 DMC Floss Legend & Skein Projections (Pandas)")
    st.write("Calculates exact thread requirements, estimated lengths, and cost using **Pandas** DataFrame operations.")

    sample_stitches = [1420, 1180, 950, 840, 680, 520, 430, 390, 310, 260, 180]
    stats_df = dmc_df.copy()
    stats_df["Stitch Count"] = sample_stitches
    
    # Approx 1,800 stitches per standard 8-meter 6-strand skein (using 2 strands on 14ct Aida)
    stats_df["Skeins Required"] = np.ceil(stats_df["Stitch Count"] / 1800).astype(int)
    stats_df["Meters Needed"] = (stats_df["Stitch Count"] * 0.045).round(2)
    stats_df["Estimated Cost ($)"] = (stats_df["Skeins Required"] * 0.99).round(2)

    col1, col2, col3 = st.columns(3)
    col1.metric("Total Pattern Stitches", f"{stats_df['Stitch Count'].sum():,}")
    col2.metric("Total Skeins Needed", f"{stats_df['Skeins Required'].sum()} skeins")
    col3.metric("Projected Floss Cost", f"${stats_df['Estimated Cost ($)'].sum():.2f}")

    st.dataframe(
        stats_df[["code", "name", "hex", "symbol", "Stitch Count", "Skeins Required", "Meters Needed", "Estimated Cost ($)"]],
        use_container_width=True
    )

    csv_data = stats_df.to_csv(index=False)
    st.download_button(
        "📥 Export DMC Floss Table as CSV",
        data=csv_data,
        file_name="dmc_floss_legend.csv",
        mime="text/csv"
    )

# 5. PATTERN GRID VISUALIZER (PILLOW & NUMPY)
elif mode == "🎨 Pattern Grid Visualizer (Pillow + NumPy)":
    st.subheader("🎨 Pattern Canvas Render (Pillow & NumPy)")
    st.write("Generates high-resolution stitch charts and color-block grids using **Pillow** graphics and **NumPy** coordinate indexing.")

    grid_w = st.sidebar.slider("Grid Width (Stitches):", 20, 120, 60)
    grid_h = st.sidebar.slider("Grid Height (Stitches):", 20, 120, 60)
    zoom = st.sidebar.slider("Stitch Zoom (px per cell):", 6, 24, 12)
    view_type = st.sidebar.selectbox("Render Mode:", ["Realistic Cross-Stitch (X)", "Color Blocks", "Chart Symbols"])

    # Generate synthetic pattern using NumPy
    np.random.seed(101)
    grid = np.random.randint(0, len(DMC_DATA), size=(grid_h, grid_w))

    canvas_w = grid_w * zoom
    canvas_h = grid_h * zoom
    canvas = Image.new("RGB", (canvas_w, canvas_h), color="#FAF7F2")
    draw = ImageDraw.Draw(canvas)

    for y in range(grid_h):
        for x in range(grid_w):
            color_info = DMC_DATA[grid[y, x]]
            px = x * zoom
            py = y * zoom

            if view_type == "Color Blocks":
                draw.rectangle([px, py, px + zoom - 1, py + zoom - 1], fill=color_info["hex"])
            elif view_type == "Realistic Cross-Stitch (X)":
                draw.rectangle([px, py, px + zoom - 1, py + zoom - 1], fill="#FAF7F2")
                draw.line([px + 1, py + 1, px + zoom - 2, py + zoom - 2], fill=color_info["hex"], width=2)
                draw.line([px + 1, py + zoom - 2, px + zoom - 2, py + 1], fill=color_info["hex"], width=2)
            else:
                draw.rectangle([px, py, px + zoom - 1, py + zoom - 1], fill="#FFFFFF", outline="#E0D7C9")
                draw.text((px + 2, py + 1), color_info["symbol"], fill="#000000")

    st.image(canvas, caption=f"Rendered Grid ({canvas_w} × {canvas_h} px)", use_container_width=True)

    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    st.download_button(
        "📥 Download Rendered Grid PNG",
        data=buf.getvalue(),
        file_name="cross_stitch_pattern_render.png",
        mime="image/png"
    )

# 6. PHOTO-TO-PATTERN QUANTIZER (PILLOW + NUMPY + PANDAS)
else:
    st.subheader("📸 Custom Wedding Photo Quantizer (Pillow + NumPy + Pandas)")
    st.write("Convert any photo into an authentic cross-stitch pattern matching the closest DMC thread colors.")

    uploaded = st.file_uploader("Upload Image:", type=["jpg", "jpeg", "png"])
    stitch_w = st.slider("Target Stitch Width:", 30, 150, 70)

    if uploaded:
        raw_img = Image.open(uploaded).convert("RGB")
        aspect = raw_img.height / raw_img.width
        stitch_h = int(stitch_w * aspect)

        # 1. Pillow: Resample to stitch resolution
        low_res = raw_img.resize((stitch_w, stitch_h), Image.Resampling.LANCZOS)
        img_array = np.array(low_res, dtype=np.float32)

        # 2. NumPy: Matrix Euclidean color distance
        # Shape: (stitch_h, stitch_w, 1, 3) - (1, 1, num_dmc, 3)
        diff = img_array[:, :, None, :] - DMC_RGB_VECTORS[None, None, :, :]
        sq_dist = np.sum(diff ** 2, axis=-1)
        best_indices = np.argmin(sq_dist, axis=-1)

        # 3. Pillow: Build quantized preview
        quantized_arr = DMC_RGB_VECTORS[best_indices].astype(np.uint8)
        quantized_img = Image.fromarray(quantized_arr)

        colA, colB = st.columns(2)
        colA.image(raw_img, caption="Original Photo", use_container_width=True)
        colB.image(quantized_img, caption=f"Quantized Cross-Stitch Grid ({stitch_w}×{stitch_h})", use_container_width=True)

        # 4. Pandas: Count stitches and generate shopping list
        unique, counts = np.unique(best_indices, return_counts=True)
        summary_df = pd.DataFrame({
            "DMC Code": [DMC_DATA[i]["code"] for i in unique],
            "Color Name": [DMC_DATA[i]["name"] for i in unique],
            "Hex": [DMC_DATA[i]["hex"] for i in unique],
            "Stitches": counts,
            "Skeins": np.ceil(counts / 1800).astype(int)
        }).sort_values(by="Stitches", ascending=False)

        st.markdown("#### **Required DMC Threads**")
        st.dataframe(summary_df, use_container_width=True)
