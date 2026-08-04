export interface WorkflowWizardStageValues {
  name: string;
  description: string;
  agentId: number | "";
  requiresApproval: boolean;
}

export interface WorkflowWizardFormValues {
  name: string;
  goalTemplate: string;
  goal: string;
  saveLessonsLearned: boolean;
  autoCreatePR: boolean;
  stages: WorkflowWizardStageValues[];
}
