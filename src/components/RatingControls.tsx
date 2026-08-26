import type { ReviewRating } from "../application/contracts";

interface RatingControlsProps {
  disabled: boolean;
  onRate: (rating: ReviewRating) => void;
}

const ratings: Array<{
  value: ReviewRating;
  label: string;
  shortcut: "1" | "2" | "3" | "4";
}> = [
  { value: "again", label: "Again", shortcut: "1" },
  { value: "hard", label: "Hard", shortcut: "2" },
  { value: "good", label: "Good", shortcut: "3" },
  { value: "easy", label: "Easy", shortcut: "4" }
];

export function RatingControls({ disabled, onRate }: RatingControlsProps) {
  return (
    <fieldset className="rating-controls" disabled={disabled}>
      <legend>How well did you remember?</legend>
      <div className="rating-grid">
        {ratings.map((rating) => (
          <button
            className={`rating-button rating-button--${rating.value}`}
            key={rating.value}
            type="button"
            aria-keyshortcuts={rating.shortcut}
            onClick={() => {
              onRate(rating.value);
            }}
          >
            <span>{rating.label}</span>
            <kbd aria-hidden="true">{rating.shortcut}</kbd>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
