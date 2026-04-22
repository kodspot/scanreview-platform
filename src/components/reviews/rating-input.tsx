import { cn } from "@/lib/utils";
import type { RatingType } from "@/lib/types";

interface RatingInputProps {
  ratingType: RatingType;
  maxRating: number;
  value: number;
  onChange: (value: number) => void;
}

const emojiScale = ["😞", "🙁", "😐", "🙂", "🤩"];

export function RatingInput({ ratingType, maxRating, value, onChange }: RatingInputProps) {
  const options = Array.from({ length: maxRating }, (_, index) => index + 1);

  return (
    <div className="grid grid-cols-5 gap-3">
      {options.map((option) => {
        const label =
          ratingType === "emoji"
            ? emojiScale[option - 1] || option.toString()
            : ratingType === "stars"
              ? `${option}★`
              : option.toString();

        return (
          <button
            key={option}
            className={cn(
              "rounded-[22px] border px-3 py-4 text-center text-lg font-medium transition",
              value === option
                ? "border-transparent bg-slate-950 text-white shadow-[0_14px_40px_rgba(15,23,42,0.22)]"
                : "border-black/10 bg-white text-slate-900 hover:border-slate-950/30",
            )}
            onClick={() => onChange(option)}
            type="button"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
