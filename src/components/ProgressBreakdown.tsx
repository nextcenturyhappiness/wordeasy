import type { Progress } from "../application/contracts";

interface ProgressBreakdownProps {
  newProgress: Progress;
  reviewProgress: Progress;
}

interface ProgressItemProps {
  label: string;
  progress: Progress;
}

function ProgressItem({ label, progress }: ProgressItemProps) {
  const labelId = `progress-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div className="progress-item">
      <dt id={labelId}>{label}</dt>
      <dd aria-labelledby={labelId}>
        <span>{progress.completed}</span>
        <span aria-hidden="true"> / </span>
        <span className="sr-only">of</span>
        <span>{progress.total}</span>
      </dd>
    </div>
  );
}

export function ProgressBreakdown({ newProgress, reviewProgress }: ProgressBreakdownProps) {
  const total = {
    completed: newProgress.completed + reviewProgress.completed,
    total: newProgress.total + reviewProgress.total
  };

  return (
    <dl className="progress-grid" aria-label="Today’s learning progress">
      <ProgressItem label="New" progress={newProgress} />
      <ProgressItem label="Review" progress={reviewProgress} />
      <ProgressItem label="Total today" progress={total} />
    </dl>
  );
}
