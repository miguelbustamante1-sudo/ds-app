import { type ReactNode } from 'react';
import {
  Stepper,
  StepperNav,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperPanel,
  StepperContent,
} from '@/components/ui/stepper';
import type { WizardStepId } from './types';

export interface WizardStepDefinition {
  id: WizardStepId;
  title: string;
  description?: string;
  content: ReactNode;
  /** Keep mounted (hidden) while inactive — used for steps that hold local state that must survive navigation. */
  forceMount?: boolean;
}

interface WizardStepperProps {
  steps: WizardStepDefinition[];
  /** The step currently displayed. */
  activeStep: WizardStepId;
  /** The furthest step the user is allowed to reach right now; steps beyond this are locked. */
  unlockedStep: WizardStepId;
  onStepChange: (step: WizardStepId) => void;
}

export function WizardStepper({ steps, activeStep, unlockedStep, onStepChange }: WizardStepperProps) {
  return (
    <Stepper value={activeStep} onValueChange={(value) => onStepChange(value as WizardStepId)}>
      <StepperNav>
        {steps.map((step, index) => (
          <StepperItem key={step.id} step={step.id} completed={step.id < unlockedStep} disabled={step.id > unlockedStep}>
            <StepperTrigger>
              <StepperIndicator>{step.id}</StepperIndicator>
              <div className="flex flex-col items-start text-left">
                <StepperTitle>{step.title}</StepperTitle>
                {step.description && <StepperDescription>{step.description}</StepperDescription>}
              </div>
            </StepperTrigger>
            {index < steps.length - 1 && <StepperSeparator />}
          </StepperItem>
        ))}
      </StepperNav>
      <StepperPanel className="mt-6">
        {steps.map((step) => (
          <StepperContent key={step.id} value={step.id} forceMount={step.forceMount}>
            {step.content}
          </StepperContent>
        ))}
      </StepperPanel>
    </Stepper>
  );
}
