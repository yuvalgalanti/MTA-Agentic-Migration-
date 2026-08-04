import * as React from "react";
import { AxiosError } from "axios";
import { useHistory } from "react-router-dom";
import {
  Alert,
  Button,
  ButtonVariant,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalHeader,
  ProgressStep,
  ProgressStepper,
} from "@patternfly/react-core";
import { CubesIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { Paths } from "@app/Paths";
import { MigrationWorkflow, WorkflowRun, WorkflowStageRunResult } from "@app/api/models";
import { NotificationsContext } from "@app/components/NotificationsContext";
import {
  useApproveStageMutation,
  useFetchWorkflowRuns,
} from "@app/queries/migration-workflows";
import { getAxiosErrorMessage } from "@app/utils/utils";

import { KnowledgeBaseEntryForm } from "./knowledge-base-entry-form";
import { RunStatusLabel } from "./run-status-label";

const isNonTerminal = (run: WorkflowRun) =>
  run.status === "Pending" ||
  run.status === "Running" ||
  run.status === "AwaitingApproval";

const stepVariant = (
  status: WorkflowStageRunResult["status"]
): "default" | "success" | "info" | "pending" | "warning" | "danger" => {
  switch (status) {
    case "Succeeded":
      return "success";
    case "Failed":
      return "danger";
    case "Running":
      return "info";
    case "AwaitingApproval":
      return "warning";
    default:
      return "pending";
  }
};

export const RunsTab: React.FC<{ workflow: MigrationWorkflow }> = ({
  workflow,
}) => {
  const history = useHistory();
  const { pushNotification } = React.useContext(NotificationsContext);
  const { runs, isFetching } = useFetchWorkflowRuns(workflow.id);
  const [lessonsLearnedRun, setLessonsLearnedRun] = React.useState<WorkflowRun | null>(
    null
  );

  const onError = (error: AxiosError) => {
    pushNotification({ title: getAxiosErrorMessage(error), variant: "danger" });
  };

  const { mutate: approveStage, isPending: isApproving } = useApproveStageMutation(
    () => pushNotification({ title: "Stage approved", variant: "success" }),
    onError
  );

  const latestRun = runs[0];
  const hasActiveRun = runs.some(isNonTerminal);
  const awaitingStage = latestRun?.stageRuns.find(
    (sr) => sr.status === "AwaitingApproval"
  );

  return (
    <Flex direction={{ default: "column" }} gap={{ default: "gapLg" }}>
      <FlexItem>
        <Button
          variant={ButtonVariant.primary}
          isDisabled={hasActiveRun}
          onClick={() => history.push(Paths.agenticWorkflowRuns)}
        >
          Start new run
        </Button>
      </FlexItem>

      {!isFetching && runs.length === 0 && (
        <FlexItem>
          <EmptyState
            headingLevel="h3"
            icon={CubesIcon}
            titleText="This workflow hasn't been run yet"
            variant="sm"
          >
            <EmptyStateBody>
              Start a run to see agents progress through each stage.
            </EmptyStateBody>
          </EmptyState>
        </FlexItem>
      )}

      {latestRun && (
        <FlexItem>
          <Flex alignItems={{ default: "alignItemsCenter" }} gap={{ default: "gapMd" }}>
            <FlexItem>
              <Content component="h3">
                Latest run — #{latestRun.id}
              </Content>
            </FlexItem>
            <FlexItem>
              <RunStatusLabel status={latestRun.status} isCompact={false} />
            </FlexItem>
          </Flex>

          {latestRun.applications.length > 0 && (
            <Content component="small" style={{ marginBottom: "var(--pf-t--global--spacer--sm)" }}>
              Applications:{" "}
              <LabelGroup>
                {latestRun.applications.map((app) => (
                  <Label key={app.id} isCompact>{app.name}</Label>
                ))}
              </LabelGroup>
              {" | Branch: "}
              <Label isCompact color="blue">{latestRun.targetBranch}</Label>
            </Content>
          )}

          <ProgressStepper aria-label="Workflow run progress">
            {workflow.stages.map((stage) => {
              const stageRun = latestRun.stageRuns.find(
                (sr) => sr.stageId === stage.id
              );
              const status = stageRun?.status ?? "Pending";
              return (
                <ProgressStep
                  key={stage.id}
                  id={`run-${latestRun.id}-stage-${stage.id}`}
                  variant={stepVariant(status)}
                  isCurrent={status === "Running" || status === "AwaitingApproval"}
                  description={stageRun?.output}
                  aria-label={`${stage.name}: ${status}`}
                >
                  {stage.name}
                </ProgressStep>
              );
            })}
          </ProgressStepper>

          {awaitingStage && (
            <Alert
              variant="warning"
              isInline
              title="A stage is awaiting your approval"
              style={{ marginTop: "var(--pf-t--global--spacer--md)" }}
            >
              <p>
                {workflow.stages.find((s) => s.id === awaitingStage.stageId)?.name}{" "}
                has completed its work and requires human approval before the
                workflow continues.
              </p>
              <Button
                variant={ButtonVariant.primary}
                isLoading={isApproving}
                onClick={() =>
                  approveStage({
                    workflowId: workflow.id,
                    runId: latestRun.id,
                    stageId: awaitingStage.stageId,
                  })
                }
              >
                Approve and continue
              </Button>
            </Alert>
          )}

          {(latestRun.status === "Succeeded" || latestRun.status === "Failed") && (
            <Button
              variant={ButtonVariant.secondary}
              style={{ marginTop: "var(--pf-t--global--spacer--md)" }}
              onClick={() => setLessonsLearnedRun(latestRun)}
            >
              Save lessons learned
            </Button>
          )}
        </FlexItem>
      )}

      {runs.length > 0 && (
        <FlexItem>
          <Content component="h3">Run history</Content>
          <Table aria-label="Run history table" variant="compact">
            <Thead>
              <Tr>
                <Th>Run</Th>
                <Th>Status</Th>
                <Th>Applications</Th>
                <Th>Target branch</Th>
                <Th>Started</Th>
                <Th>Completed</Th>
              </Tr>
            </Thead>
            <Tbody>
              {runs.map((run) => (
                <Tr key={run.id}>
                  <Td>#{run.id}</Td>
                  <Td>
                    <RunStatusLabel status={run.status} />
                  </Td>
                  <Td>
                    {run.applications.length > 0
                      ? run.applications.map((a) => a.name).join(", ")
                      : "—"}
                  </Td>
                  <Td>{run.targetBranch || "—"}</Td>
                  <Td>{new Date(run.startedAt).toLocaleString()}</Td>
                  <Td>
                    {run.completedAt
                      ? new Date(run.completedAt).toLocaleString()
                      : "—"}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </FlexItem>
      )}

      <Modal
        isOpen={!!lessonsLearnedRun}
        onClose={() => setLessonsLearnedRun(null)}
        variant="medium"
      >
        <ModalHeader title="Save lessons learned" />
        <ModalBody>
          {lessonsLearnedRun && (
            <KnowledgeBaseEntryForm
              workflowId={workflow.id}
              runs={runs}
              defaultRunId={lessonsLearnedRun.id}
              onClose={() => setLessonsLearnedRun(null)}
            />
          )}
        </ModalBody>
      </Modal>
    </Flex>
  );
};
