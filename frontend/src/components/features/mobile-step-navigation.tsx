import { Button } from '../primitives/button';
import { ChevronLeft } from 'lucide-react';
import { FloatingFooter } from '../primitives/floating-footer';

export const MOBILE_STEP_NAVIGATION_MB_CLASS = 'max-md:mb-[104px]';
export const MOBILE_STEP_NAVIGATION_PX_CLASS = 'px-6 sm:px-16';

interface MobileStepNavigationProps {
  step: number;
  maxStep: number;
  canProceed?: boolean;
  isSubmitting?: boolean;
  submitText?: string;
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
}

export function MobileStepNavigation({
  step,
  maxStep,
  canProceed = true,
  isSubmitting = false,
  submitText = 'Submit',
  onBack,
  onNext,
}: MobileStepNavigationProps) {

  const isLastStep = step === maxStep;
  const buttonText = isLastStep
    ? (isSubmitting ? 'Submitting...' : submitText)
    : 'Next';

  // button visibility logic
  const showPreviousButton = onBack && step > 0;

  // spacing constants
  const BUTTON_WIDTH = 48; // px
  const GAP_WIDTH = 8; // px (gap-2)
  const BUTTON_WITH_GAP = BUTTON_WIDTH + GAP_WIDTH; // 56px

  // animation distance (button slides out by its width + gap)
  const SLIDE_DISTANCE = BUTTON_WITH_GAP;

  // calculate how much width the next button should lose and offset
  const leftOffset = showPreviousButton ? BUTTON_WITH_GAP : 0;
  const rightOffset = 0;
  const totalOffset = leftOffset + rightOffset;

  return (
    <FloatingFooter
      isVisible={step >= 0 && step <= maxStep}
      className={MOBILE_STEP_NAVIGATION_PX_CLASS}
    >
      {/* previous */}
      {onBack && (
        <div
          className="absolute left-0 top-0 shrink-0 w-12 h-12 z-10"
          style={{
            transform: showPreviousButton ? 'translateX(0) scale(1)' : `translateX(-${SLIDE_DISTANCE}px) scale(1)`,
            opacity: showPreviousButton ? 1 : 0,
            transition: 'transform 300ms ease-in-out, opacity 300ms ease-in-out',
            pointerEvents: showPreviousButton ? 'auto' : 'none',
          }}
        >
          <Button
            variant="outline"
            className="bg-white hover:bg-gray-50 aspect-square group w-12 h-12"
            onClick={onBack}
          >
            <ChevronLeft className="size-4 transition-transform duration-200 group-active:-translate-x-1" />
          </Button>
        </div>
      )}

      {/* next/submit */}
      <Button
        onClick={onNext}
        disabled={!canProceed || isSubmitting}
        className="group text-lg font-medium h-12 bg-chartreuse hover:bg-chartreuse/80"
        style={{
          width: `calc(100% - ${totalOffset}px)`,
          marginLeft: `${leftOffset}px`,
          transition: 'width 300ms ease-in-out, margin-left 300ms ease-in-out',
        }}
      >
        {buttonText}
      </Button>
    </FloatingFooter>
  );
}