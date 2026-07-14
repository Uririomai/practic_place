"use client";

import { Check, Minus } from "lucide-react";

interface Step {
  title: string;
  required: boolean;
}

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: Set<number>;
  skippedSteps: Set<number>;
  steps: Step[];
  onStepClick: (step: number) => void;
}

export function StepIndicator({
  currentStep,
  completedSteps,
  skippedSteps,
  steps,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.has(index);
        const isSkipped = skippedSteps.has(index);
        const isDone = isCompleted || isSkipped;
        const isCurrent = index === currentStep;
        const isClickable = isDone || isCurrent;

        return (
          <div key={index} className="flex items-center flex-1 last:flex-none">
            {/* Круг */}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                transition-colors shrink-0
                ${isSkipped
                  ? "bg-yellow-400 text-white hover:bg-yellow-500 cursor-pointer"
                  : isCompleted
                    ? "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                    : isCurrent
                      ? "bg-primary text-primary-foreground cursor-default"
                      : "bg-muted text-muted-foreground cursor-default"
                }
              `}
            >
              {isSkipped ? (
                <Minus className="h-4 w-4" />
              ) : isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </button>

            {/* Подпись */}
            <div className="ml-2 hidden sm:block">
              <p className={`text-xs font-medium leading-none ${
                isCurrent ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step.title}
              </p>
            </div>

            {/* Линия */}
            {index < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${
                isSkipped ? "bg-yellow-400" : isCompleted ? "bg-green-500" : "bg-muted"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
