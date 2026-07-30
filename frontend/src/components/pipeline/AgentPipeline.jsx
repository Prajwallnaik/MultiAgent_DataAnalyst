import React from 'react';
import { motion } from 'framer-motion';
import {
  Database, Search, Code, Play, Wrench, Lightbulb, CheckCircle, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';

const STAGES = [
  { key: 'query_planner', label: 'Query Planner', icon: Search, desc: 'Understanding intent & planning analysis' },
  { key: 'code_generator', label: 'Code Generator', icon: Code, desc: 'Generating pandas / SQL code' },
  { key: 'execution', label: 'Execution', icon: Play, desc: 'Running code in sandbox' },
  { key: 'fixer', label: 'Fixer Agent', icon: Wrench, desc: 'Auto-debugging failed code' },
  { key: 'insight', label: 'Insight Agent', icon: Lightbulb, desc: 'Interpreting results' },
];

const STATE_STYLES = {
  idle: {
    border: 'border-zinc-700/30',
    bg: 'bg-zinc-800/20',
    iconColor: 'text-zinc-500',
    glow: '',
    pulse: false,
  },
  running: {
    border: 'border-brand/50',
    bg: 'bg-brand/10',
    iconColor: 'text-brand-light',
    glow: 'glow-brand',
    pulse: true,
  },
  success: {
    border: 'border-emerald/40',
    bg: 'bg-emerald/10',
    iconColor: 'text-emerald',
    glow: 'glow-emerald',
    pulse: false,
  },
  error: {
    border: 'border-rose/40',
    bg: 'bg-rose/10',
    iconColor: 'text-rose',
    glow: 'glow-rose',
    pulse: false,
  },
  retrying: {
    border: 'border-amber/40',
    bg: 'bg-amber/10',
    iconColor: 'text-amber',
    glow: 'glow-amber',
    pulse: true,
  },
  skipped: {
    border: 'border-zinc-700/20',
    bg: 'bg-zinc-800/10',
    iconColor: 'text-zinc-600',
    glow: '',
    pulse: false,
  },
};

function getStatusIcon(status, size = 10) {
  switch (status) {
    case 'running': return <Loader2 size={size} className="animate-spin" />;
    case 'success': return <CheckCircle size={size} />;
    case 'error': return <AlertCircle size={size} />;
    case 'retrying': return <RefreshCw size={size} className="animate-spin" />;
    default: return null;
  }
}

/**
 * Computes the state of each pipeline stage from the query result metadata.
 *
 * Since the API is synchronous (no WebSocket streaming), we infer states:
 * - If loading: simulate progressive stage activation
 * - If result available: mark based on retry_count, error, fallback
 */
export function computePipelineStates(entry, isLoading, loadingElapsed) {
  if (!isLoading && !entry) {
    return STAGES.map((s) => ({ ...s, status: 'idle' }));
  }

  if (isLoading) {
    // Simulate progressive activation based on elapsed time
    const timings = [0, 1500, 3500, 5000, 7000]; // ms thresholds
    return STAGES.map((s, i) => {
      if (i === 3) return { ...s, status: 'skipped' }; // Fixer only runs on error
      const threshold = timings[i > 3 ? i - 1 : i];
      if (loadingElapsed >= (timings[(i > 3 ? i - 1 : i) + 1] || 999999)) {
        return { ...s, status: 'success' };
      }
      if (loadingElapsed >= threshold) {
        return { ...s, status: 'running' };
      }
      return { ...s, status: 'idle' };
    });
  }

  // We have a completed entry
  const { retry_count = 0, fallback_used, output_type } = entry;
  const isError = output_type === 'error' || fallback_used;

  return STAGES.map((s) => {
    if (s.key === 'fixer') {
      if (retry_count > 0) return { ...s, status: fallback_used ? 'error' : 'success' };
      return { ...s, status: 'skipped' };
    }
    if (s.key === 'execution') {
      if (isError && retry_count === 0) return { ...s, status: 'error' };
      return { ...s, status: 'success' };
    }
    if (s.key === 'insight') {
      if (isError) return { ...s, status: 'skipped' };
      return { ...s, status: 'success' };
    }
    return { ...s, status: isError && fallback_used ? 'error' : 'success' };
  });
}

/**
 * Live Agent Pipeline — horizontal visualization of the multi-agent flow.
 */
export default function AgentPipeline({ entry, isLoading, loadingElapsed = 0 }) {
  const stages = computePipelineStates(entry, isLoading, loadingElapsed);

  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="flex items-center gap-2 min-w-max px-1">
        {stages.map((stage, i) => {
          const style = STATE_STYLES[stage.status] || STATE_STYLES.idle;
          const Icon = stage.icon;

          return (
            <React.Fragment key={stage.key}>
              <motion.div
                className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg border ${style.border} ${style.bg} ${style.glow} transition-all duration-500`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: stage.status === 'skipped' ? 0.35 : 1,
                  scale: stage.status === 'running' ? 1.02 : 1,
                }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                {style.pulse && (
                  <div className="absolute inset-0 rounded-lg border border-brand/30 animate-ping opacity-20" />
                )}

                <Icon
                  size={14}
                  className={`${style.iconColor} transition-colors duration-300`}
                />

                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-200 leading-none whitespace-nowrap">
                    {stage.label}
                  </span>
                  <span className="text-[9px] text-zinc-500 leading-tight mt-0.5 whitespace-nowrap">
                    {stage.desc}
                  </span>
                </div>

                {stage.status !== 'idle' && stage.status !== 'skipped' && (
                  <div className={`ml-1 ${style.iconColor}`}>
                    {getStatusIcon(stage.status)}
                  </div>
                )}
              </motion.div>

              {/* Connector */}
              {i < stages.length - 1 && (
                <div className="flex items-center">
                  <svg width="24" height="12" viewBox="0 0 24 12" className="flex-shrink-0">
                    <line
                      x1="0" y1="6" x2="18" y2="6"
                      stroke={stages[i + 1].status !== 'idle' && stages[i + 1].status !== 'skipped'
                        ? '#6366f1'
                        : '#2e2e3d'}
                      strokeWidth="1.5"
                      strokeDasharray={stage.status === 'success' ? 'none' : '4 3'}
                      className={stage.status === 'running' ? 'pipeline-connector' : ''}
                    />
                    <polygon
                      points="17,2 23,6 17,10"
                      fill={stages[i + 1].status !== 'idle' && stages[i + 1].status !== 'skipped'
                        ? '#6366f1'
                        : '#2e2e3d'}
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
