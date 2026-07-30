import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, BarChart3, Camera, Download } from 'lucide-react';
import Tooltip from './ui/Tooltip';

// Chart types that need a legend (no axes to identify segments)
const LEGEND_CHART_TYPES = new Set([
  'pie', 'donut', 'treemap', 'sunburst', 'funnelarea',
]);

/**
 * Premium Plotly chart wrapper with glassmorphism, fullscreen toggle,
 * chart type badge, and loading skeleton.
 */
export default function PlotlyChart({ figure }) {
  const containerRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Synchronously extract the chart title from the figure layout to avoid layout shift
  const figLayout = figure?.layout || {};
  const chartTitle = typeof figLayout.title === 'string'
    ? figLayout.title
    : figLayout.title?.text || '';

  useEffect(() => {
    if (!containerRef.current || !figure || !window.Plotly) return;

    setLoaded(false);

    // Determine the primary chart type from the first trace
    const primaryType = (figure.data?.[0]?.type || 'scatter').toLowerCase();
    const hasHole = figure.data?.[0]?.hole && figure.data[0].hole > 0;
    const effectiveType = (primaryType === 'pie' && hasHole) ? 'donut' : primaryType;

    // Determine if we should show the legend
    const hasMultipleTraces = figure.data && figure.data.length > 1;
    const isPieOrDonut = LEGEND_CHART_TYPES.has(effectiveType) || LEGEND_CHART_TYPES.has(primaryType);
    const showlegend = isPieOrDonut || hasMultipleTraces || figLayout.showlegend === true;

    // Height calculation: standard height for chart inside container
    const chartHeight = fullscreen ? undefined : 350;

    const layout = {
      autosize: true,
      height: chartHeight,
      font: {
        family: 'Inter, system-ui, -apple-system, sans-serif',
        color: '#1F1F1F',
        size: 11,
      },
      colorway: ['#5E72E4', '#F5365C', '#2DCE89', '#8965E0', '#FF9F43', '#11CDEF', '#FB6340'],
      // Spread backend layout as base
      ...figLayout,
      // Force override after spread
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      showlegend,
      // Disable Plotly's native title rendering (rendered above in HTML)
      title: undefined,
    };

    const isAxisChart = !LEGEND_CHART_TYPES.has(effectiveType) && !LEGEND_CHART_TYPES.has(primaryType);

    if (showlegend) {
      // Clean bottom horizontal legend alignment within the boundary
      layout.legend = {
        orientation: 'h',
        yanchor: 'top',
        y: -0.15,
        xanchor: 'center',
        x: 0.5,
        bgcolor: 'transparent',
        borderwidth: 0,
        font: { color: '#1F1F1F', size: 11, family: 'Inter, sans-serif' },
      };
    }

    if (isAxisChart) {
      // Axis-based charts (line, bar, scatter, etc.)
      layout.margin = { t: 25, r: 30, b: showlegend ? 80 : 40, l: 50 };
      layout.xaxis = {
        gridcolor: 'rgba(0, 0, 0, 0.05)',
        zerolinecolor: 'rgba(0, 0, 0, 0.12)',
        tickcolor: 'rgba(0, 0, 0, 0.12)',
        tickfont: { size: 10, color: '#525252' },
        ...(figLayout.xaxis || {}),
      };
      layout.yaxis = {
        gridcolor: 'rgba(0, 0, 0, 0.05)',
        zerolinecolor: 'rgba(0, 0, 0, 0.12)',
        tickcolor: 'rgba(0, 0, 0, 0.12)',
        tickfont: { size: 10, color: '#525252' },
        ...(figLayout.yaxis || {}),
      };
    } else {
      // Non-axis charts (pie, donut, etc.)
      layout.margin = { t: 15, r: 30, b: showlegend ? 80 : 30, l: 30, pad: 4 };
      layout.xaxis = { visible: false };
      layout.yaxis = { visible: false };
    }

    const config = {
      responsive: true,
      displayModeBar: false, // Hide ugly default plotly buttons
      displaylogo: false,
    };

    // Process trace data
    const data = (figure.data || []).map((trace) => {
      const traceType = (trace.type || 'scatter').toLowerCase();
      if (LEGEND_CHART_TYPES.has(traceType)) {
        return {
          ...trace,
          // Center the pie/donut chart and leave room for legend at the bottom
          domain: { x: [0.1, 0.9], y: [0.1, 1.0] },
          textinfo: trace.textinfo || 'percent',
          textposition: trace.textposition || 'inside',
          insidetextorientation: trace.insidetextorientation || 'radial',
          showlegend: true,
        };
      }
      return {
        ...trace,
        showlegend: true
      };
    });

    window.Plotly.newPlot(containerRef.current, data, layout, config).then(() => {
      setLoaded(true);
    });

    return () => {
      if (containerRef.current && window.Plotly) {
        window.Plotly.purge(containerRef.current);
      }
    };
  }, [figure, fullscreen]);

  // Handle resize on toggle
  useEffect(() => {
    if (containerRef.current && window.Plotly && loaded) {
      window.Plotly.Plots.resize(containerRef.current);
    }
  }, [fullscreen, loaded]);

  const handleDownload = () => {
    if (!containerRef.current || !window.Plotly) return;
    window.Plotly.downloadImage(containerRef.current, {
      format: 'png',
      filename: `plot_${figure?.data?.[0]?.type || 'chart'}_${Date.now()}`,
      width: 1000,
      height: 600,
    });
  };

  const chartType = figure?.data?.[0]?.type || 'chart';

  return (
    <div
      className={`bg-white border border-[#E9E2D7] rounded-[20px] shadow-sm transition-all duration-300 ${
        fullscreen
          ? 'fixed inset-4 z-[100] flex flex-col'
          : 'relative hover:shadow-md'
      }`}
    >
      {/* Fullscreen backdrop */}
      {fullscreen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
          onClick={() => setFullscreen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E9E2D7]/60 bg-[#FAF8F5]/30 rounded-t-[20px]">
        <div className="flex items-center gap-2">
          <BarChart3 size={13} className="text-[#B89B73]" />
          <span className="text-[10px] font-bold text-[#7B766E] uppercase tracking-wider">{chartType}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Download plot as image" position="top">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg border border-[#E9E2D7] bg-white text-[#68625B] hover:text-[#000000] hover:bg-[#FAF7F2] transition-colors cursor-pointer shadow-sm"
            >
              <Download size={14} />
            </button>
          </Tooltip>
          <Tooltip content={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} position="top">
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 rounded-lg border border-[#E9E2D7] bg-white text-[#68625B] hover:text-[#000000] hover:bg-[#FAF7F2] transition-colors cursor-pointer shadow-sm"
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Chart container */}
      <div className={`p-4 bg-white rounded-b-[20px] flex flex-col relative overflow-hidden ${fullscreen ? 'flex-1' : ''}`}>
        {/* Synchronously rendered HTML Title */}
        {chartTitle && (
          <div className="text-center mb-3 flex-shrink-0">
            <h3 className="text-xs font-bold text-[#1F1F1F] font-sans tracking-wide">
              {chartTitle}
            </h3>
          </div>
        )}

        {/* Loading shimmer */}
        {!loaded && (
          <div className="w-full h-[350px] relative overflow-hidden bg-[#FAF8F5]/60 rounded-xl flex-shrink-0">
            <div className="absolute inset-0 animate-shimmer">
              <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-zinc-200 border-t-[#B89B73] rounded-full animate-spin" />
                <span className="text-[10px] font-mono text-[#7C6B5D]">Rendering chart...</span>
              </div>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className={`w-full ${fullscreen ? 'h-full' : 'h-[350px]'} ${
            !loaded ? 'opacity-0 absolute pointer-events-none' : 'opacity-100 transition-opacity duration-300'
          }`}
        />
      </div>
    </div>
  );
}
