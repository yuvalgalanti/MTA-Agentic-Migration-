import * as React from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { AxiosError } from "axios";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { array, boolean, number, object, string } from "yup";
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  Modal,
  Switch,
  TextArea,
  TextInput,
  Wizard,
  WizardHeader,
  WizardStep,
} from "@patternfly/react-core";

import { Agent, MigrationWorkflow, New } from "@app/api/models";
import SimpleSelect from "@app/components/FilterToolbar/components/SimpleSelect";
import { NotificationsContext } from "@app/components/NotificationsContext";
import { GOAL_TEMPLATES } from "@app/pages/agents/agent-catalog";
import { useFetchAgents } from "@app/queries/agents";
import {
  useCreateMigrationWorkflowMutation,
  useUpdateMigrationWorkflowMutation,
} from "@app/queries/migration-workflows";
import { getAxiosErrorMessage } from "@app/utils/utils";

import { StageListField } from "./components/stage-list-field";
import { WorkflowWizardFormValues } from "./types";

const blankStage = (): WorkflowWizardFormValues["stages"][number] => ({
  name: "",
  description: "",
  agentId: "",
  requiresApproval: false,
});

const validationSchema = object().shape({
  name: string()
    .trim()
    .required("A workflow name is required.")
    .min(3, "Must be at least 3 characters.")
    .max(120, "Must be 120 characters or fewer."),
  goalTemplate: string(),
  goal: string()
    .trim()
    .required("A migration plan goal is required.")
    .max(500, "Must be 500 characters or fewer."),
  saveLessonsLearned: boolean(),
  autoCreatePR: boolean(),
  stages: array()
    .of(
      object().shape({
        name: string().trim().required("A stage name is required."),
        description: string(),
        agentId: number()
          .typeError("Select an agent for this stage.")
          .required("Select an agent for this stage."),
        requiresApproval: boolean(),
      })
    )
    .min(1, "Add at least one stage."),
});

export interface MigrationWorkflowWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (workflow: MigrationWorkflow) => void;
  workflow?: MigrationWorkflow | null;
  seedFrom?: MigrationWorkflow | null;
}

export const MigrationWorkflowWizard: React.FC<MigrationWorkflowWizardProps> = ({
  isOpen,
  onClose,
  onSaved,
  workflow = null,
  seedFrom = null,
}) => {
  const { pushNotification } = React.useContext(NotificationsContext);
  const source = workflow ?? seedFrom;

  const { agents } = useFetchAgents();
  const activeAgents: Agent[] = agents.filter((a) => a.status === "Active");

  const goalTemplateOptions = GOAL_TEMPLATES.map((t) => ({
    value: t.value,
    label: t.label,
  }));

  const onCreateOrUpdateSuccess = (savedWorkflow: MigrationWorkflow) => {
    pushNotification({
      title: workflow
        ? `Migration workflow "${savedWorkflow.name}" saved`
        : `Migration workflow "${savedWorkflow.name}" created`,
      variant: "success",
    });
    onSaved(savedWorkflow);
  };
  const onCreateOrUpdateError = (error: AxiosError) => {
    pushNotification({ title: getAxiosErrorMessage(error), variant: "danger" });
  };

  const { mutateAsync: createWorkflow } = useCreateMigrationWorkflowMutation(
    onCreateOrUpdateSuccess,
    onCreateOrUpdateError
  );
  const { mutateAsync: updateWorkflow } = useUpdateMigrationWorkflowMutation(
    onCreateOrUpdateSuccess,
    onCreateOrUpdateError
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WorkflowWizardFormValues>({
    defaultValues: {
      name: workflow
        ? workflow.name
        : seedFrom
          ? `${seedFrom.name} (copy)`
          : "",
      goalTemplate: "custom",
      goal: source?.goal || "",
      saveLessonsLearned: source?.saveLessonsLearned ?? true,
      autoCreatePR: source?.autoCreatePR ?? false,
      stages: source?.stages.length
        ? source.stages.map((stage) => ({
            name: stage.name,
            description: stage.description || "",
            agentId: stage.agentId,
            requiresApproval: stage.requiresApproval,
          }))
        : [blankStage()],
    },
    resolver: yupResolver(validationSchema),
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "stages",
    keyName: "key",
  });

  const name = useWatch({ control, name: "name" });
  const goal = useWatch({ control, name: "goal" });
  const stagesValues = useWatch({ control, name: "stages" });
  const saveLessonsLearned = useWatch({ control, name: "saveLessonsLearned" });
  const autoCreatePR = useWatch({ control, name: "autoCreatePR" });

  const isDetailsStepValid = !errors.name && !errors.goal && !!name?.trim() && !!goal?.trim();
  const isStagesStepValid =
    stagesValues.length > 0 &&
    stagesValues.every((stage) => !!stage.name?.trim() && stage.agentId !== "");

  const onGoalTemplateChange = (templateValue: string) => {
    setValue("goalTemplate", templateValue);
    const template = GOAL_TEMPLATES.find((t) => t.value === templateValue);
    if (template && template.goalText) {
      setValue("goal", template.goalText, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: WorkflowWizardFormValues) => {
    const payload: New<MigrationWorkflow> = {
      name: values.name.trim(),
      goal: values.goal.trim(),
      saveLessonsLearned: values.saveLessonsLearned,
      autoCreatePR: values.autoCreatePR,
      isTemplate: false,
      owner: workflow?.owner || { id: 1, name: "Demo User" },
      createdAt: workflow?.createdAt || new Date().toISOString(),
      stages: values.stages.map((stage, index) => ({
        id: index + 1,
        name: stage.name.trim(),
        description: stage.description?.trim(),
        agentId: Number(stage.agentId),
        requiresApproval: stage.requiresApproval,
      })),
    };

    if (workflow) {
      await updateWorkflow({ id: workflow.id, ...payload });
    } else {
      await createWorkflow(payload);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      aria-label="Migration workflow wizard modal"
      onEscapePress={onClose}
      variant="large"
    >
      <Wizard
        onClose={onClose}
        header={
          <WizardHeader
            onClose={onClose}
            title={workflow ? "Edit migration workflow" : "Create migration workflow"}
            description={
              seedFrom && !workflow ? `Starting from "${seedFrom.name}"` : undefined
            }
          />
        }
      >
        <WizardStep
          key="step-plan-details"
          id="step-plan-details"
          name="Plan details"
          footer={{ isNextDisabled: !isDetailsStepValid }}
        >
          <Form>
            <FormGroup label="Name" isRequired fieldId="workflow-name">
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <TextInput
                    id="workflow-name"
                    value={field.value}
                    onChange={(_, value) => field.onChange(value)}
                  />
                )}
              />
            </FormGroup>
            <FormGroup
              label="Goal template"
              fieldId="workflow-goal-template"
            >
              <Controller
                control={control}
                name="goalTemplate"
                render={({ field }) => (
                  <SimpleSelect
                    toggleId="workflow-goal-template-toggle"
                    toggleAriaLabel="Goal template select"
                    ariaLabel="Goal template"
                    isFullWidth
                    value={field.value}
                    options={goalTemplateOptions}
                    onSelect={(selection) => {
                      if (selection) onGoalTemplateChange(selection);
                    }}
                  />
                )}
              />
            </FormGroup>
            <FormGroup
              label="Migration plan goal"
              isRequired
              fieldId="workflow-goal"
            >
              <Controller
                control={control}
                name="goal"
                render={({ field }) => (
                  <TextArea
                    id="workflow-goal"
                    value={field.value}
                    onChange={(_, value) => field.onChange(value)}
                    autoResize
                    placeholder="Describe the outcome this workflow should achieve."
                  />
                )}
              />
            </FormGroup>
          </Form>
        </WizardStep>

        <WizardStep
          key="step-stages"
          id="step-stages"
          name="Stages"
          footer={{ isNextDisabled: !isStagesStepValid }}
        >
          <Content component="p">
            Build the workflow as an ordered list of stages. Each stage
            delegates its work to an agent, and can optionally require human
            approval before the workflow continues.
          </Content>
          <StageListField
            control={control}
            fields={fields}
            remove={remove}
            agents={activeAgents}
          />
          <Button
            variant="link"
            onClick={() => append(blankStage())}
            style={{ marginTop: "var(--pf-t--global--spacer--md)" }}
          >
            Add stage
          </Button>
          <div style={{ marginTop: "var(--pf-t--global--spacer--lg)" }}>
            <Controller
              control={control}
              name="saveLessonsLearned"
              render={({ field }) => (
                <Switch
                  id="workflow-save-lessons"
                  label={
                    field.value
                      ? "Save lessons learned to knowledge base: On"
                      : "Save lessons learned to knowledge base: Off"
                  }
                  isChecked={field.value}
                  onChange={(_, checked) => field.onChange(checked)}
                />
              )}
            />
          </div>
          <div style={{ marginTop: "var(--pf-t--global--spacer--sm)" }}>
            <Controller
              control={control}
              name="autoCreatePR"
              render={({ field }) => (
                <Switch
                  id="workflow-auto-pr"
                  label={
                    field.value
                      ? "Automatically create pull request: On"
                      : "Automatically create pull request: Off"
                  }
                  isChecked={field.value}
                  onChange={(_, checked) => field.onChange(checked)}
                />
              )}
            />
          </div>
        </WizardStep>

        <WizardStep
          key="step-review"
          id="step-review"
          name="Review"
          footer={{
            nextButtonText: workflow ? "Save" : "Create",
            isNextDisabled: !isDetailsStepValid || !isStagesStepValid,
            onNext: handleSubmit(onSubmit),
          }}
        >
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>Name</DescriptionListTerm>
              <DescriptionListDescription>{name}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Goal</DescriptionListTerm>
              <DescriptionListDescription>{goal}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Save lessons learned</DescriptionListTerm>
              <DescriptionListDescription>
                {saveLessonsLearned ? "Yes" : "No"}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Auto-create PR</DescriptionListTerm>
              <DescriptionListDescription>
                {autoCreatePR ? "Yes" : "No"}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Stages</DescriptionListTerm>
              <DescriptionListDescription>
                <ol>
                  {stagesValues.map((stage, index) => {
                    const agent = activeAgents.find(
                      (a) => a.id === Number(stage.agentId)
                    );
                    return (
                      <li key={index}>
                        <strong>{stage.name || `Stage ${index + 1}`}</strong>
                        {" — "}
                        {agent?.name ?? "No agent selected"}
                        {stage.requiresApproval ? " (requires approval)" : ""}
                      </li>
                    );
                  })}
                </ol>
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </WizardStep>
      </Wizard>
    </Modal>
  );
};
