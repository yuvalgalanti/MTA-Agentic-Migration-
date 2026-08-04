import * as React from "react";
import { AxiosError } from "axios";
import { useHistory } from "react-router-dom";
import {
  Button,
  ButtonVariant,
  Content,
  EmptyState,
  EmptyStateBody,
  Form,
  FormGroup,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  TextInput,
} from "@patternfly/react-core";
import { CubesIcon } from "@patternfly/react-icons";
import {
  ActionsColumn,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@patternfly/react-table";

import { Paths } from "@app/Paths";
import { Ref } from "@app/api/models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import { MultiSelect } from "@app/components/FilterToolbar/components/MultiSelect";
import SimpleSelect from "@app/components/FilterToolbar/components/SimpleSelect";
import { NotificationsContext } from "@app/components/NotificationsContext";
import { useFetchApplications } from "@app/queries/applications";
import {
  useFetchAllWorkflowRuns,
  useFetchMigrationWorkflows,
  useStartWorkflowRunMutation,
} from "@app/queries/migration-workflows";
import { formatPath, getAxiosErrorMessage } from "@app/utils/utils";

import { RunStatusLabel } from "../workflow-detail/components/run-status-label";

const WorkflowRunsPage: React.FC = () => {
  const history = useHistory();
  const { pushNotification } = React.useContext(NotificationsContext);

  const { runs, isFetching } = useFetchAllWorkflowRuns();
  const { workflows } = useFetchMigrationWorkflows();
  const { data: applications } = useFetchApplications();

  const [isStartRunOpen, setIsStartRunOpen] = React.useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = React.useState<string>("");
  const [selectedAppIds, setSelectedAppIds] = React.useState<string[]>([]);
  const [targetBranch, setTargetBranch] = React.useState("migration/main");

  const realWorkflows = workflows.filter((w) => !w.isTemplate);
  const workflowOptions = realWorkflows.map((w) => ({
    value: String(w.id),
    label: w.name,
  }));
  const appOptions = applications.map((a) => ({
    value: String(a.id),
    label: a.name,
  }));

  const onStartError = (error: AxiosError) => {
    pushNotification({ title: getAxiosErrorMessage(error), variant: "danger" });
  };
  const { mutate: startRun, isPending: isStarting } = useStartWorkflowRunMutation(
    (run) => {
      pushNotification({ title: "Run started", variant: "success" });
      setIsStartRunOpen(false);
      history.push(
        `${formatPath(Paths.agenticWorkflowDetails, {
          workflowId: run.workflowId,
        })}?tab=runs`
      );
    },
    onStartError
  );

  const handleStartRun = () => {
    if (!selectedWorkflowId) return;
    const selectedApps: Ref[] = selectedAppIds
      .map((idStr) => {
        const app = applications.find((a) => a.id === Number(idStr));
        return app ? { id: app.id, name: app.name } : null;
      })
      .filter(Boolean) as Ref[];

    startRun({
      workflowId: Number(selectedWorkflowId),
      applications: selectedApps,
      targetBranch,
    });
  };

  const toggleAppSelection = (value: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const workflowNameById = (id: number) =>
    workflows.find((w) => w.id === id)?.name ?? `Workflow #${id}`;

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Content>
          <Content component="h1">Workflow Runs</Content>
        </Content>
        <Content>
          <Content component="p">
            View all migration workflow runs across your workflows, or start
            a new run by selecting a workflow and the applications to migrate.
          </Content>
        </Content>
      </PageSection>

      <PageSection hasBodyWrapper={false}>
        <ConditionalRender when={isFetching && !runs.length} then={<AppPlaceholder />}>
          <div style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}>
            <Button
              variant={ButtonVariant.primary}
              onClick={() => setIsStartRunOpen(true)}
            >
              Start new run
            </Button>
          </div>

          {runs.length === 0 ? (
            <EmptyState
              headingLevel="h2"
              icon={CubesIcon}
              titleText="No workflow runs yet"
              variant="sm"
            >
              <EmptyStateBody>
                Start a new run to see agents progress through migration
                workflow stages.
              </EmptyStateBody>
            </EmptyState>
          ) : (
            <Table aria-label="All workflow runs table" variant="compact">
              <Thead>
                <Tr>
                  <Th width={10}>Run</Th>
                  <Th width={20}>Workflow</Th>
                  <Th width={15}>Status</Th>
                  <Th width={20}>Applications</Th>
                  <Th width={15}>Target branch</Th>
                  <Th width={15}>Started</Th>
                  <Th width={10}>Completed</Th>
                  <Th screenReaderText="Row actions" />
                </Tr>
              </Thead>
              <Tbody>
                {runs.map((run) => (
                  <Tr key={run.id}>
                    <Td>#{run.id}</Td>
                    <Td>
                      <Button
                        variant="link"
                        isInline
                        onClick={() =>
                          history.push(
                            `${formatPath(Paths.agenticWorkflowDetails, {
                              workflowId: run.workflowId,
                            })}?tab=runs`
                          )
                        }
                      >
                        {workflowNameById(run.workflowId)}
                      </Button>
                    </Td>
                    <Td>
                      <RunStatusLabel status={run.status} />
                    </Td>
                    <Td>
                      {run.applications.length > 0 ? (
                        <LabelGroup numLabels={3}>
                          {run.applications.map((app) => (
                            <Label key={app.id} isCompact>
                              {app.name}
                            </Label>
                          ))}
                        </LabelGroup>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <Label isCompact color="blue">
                        {run.targetBranch}
                      </Label>
                    </Td>
                    <Td>{new Date(run.startedAt).toLocaleString()}</Td>
                    <Td>
                      {run.completedAt
                        ? new Date(run.completedAt).toLocaleString()
                        : "—"}
                    </Td>
                    <Td isActionCell>
                      <ActionsColumn
                        items={[
                          {
                            title: "View workflow",
                            onClick: () =>
                              history.push(
                                `${formatPath(Paths.agenticWorkflowDetails, {
                                  workflowId: run.workflowId,
                                })}?tab=runs`
                              ),
                          },
                        ]}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </ConditionalRender>
      </PageSection>

      <Modal
        isOpen={isStartRunOpen}
        onClose={() => setIsStartRunOpen(false)}
        variant="medium"
        aria-label="Start workflow run"
      >
        <ModalHeader title="Start workflow run" />
        <ModalBody>
          <Form>
            <FormGroup label="Workflow" isRequired fieldId="run-workflow">
              <SimpleSelect
                toggleId="run-workflow-toggle"
                toggleAriaLabel="Select workflow"
                ariaLabel="Workflow"
                isFullWidth
                value={selectedWorkflowId}
                options={workflowOptions}
                onSelect={(selection) =>
                  setSelectedWorkflowId(selection ?? "")
                }
              />
            </FormGroup>
            <FormGroup
              label="Applications"
              fieldId="run-applications"
            >
              <MultiSelect
                toggleId="run-applications-toggle"
                toggleAriaLabel="Select applications"
                aria-label="Applications"
                placeholderText="Select applications..."
                values={selectedAppIds}
                hasChips
                options={appOptions}
                onSelect={(selection) => {
                  if (selection) toggleAppSelection(selection);
                }}
                onClear={() => setSelectedAppIds([])}
              />
            </FormGroup>
            <FormGroup
              label="Target branch"
              isRequired
              fieldId="run-target-branch"
            >
              <TextInput
                id="run-target-branch"
                value={targetBranch}
                onChange={(_, value) => setTargetBranch(value)}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.primary}
            isDisabled={!selectedWorkflowId || !targetBranch.trim() || isStarting}
            isLoading={isStarting}
            onClick={handleStartRun}
          >
            Start run
          </Button>
          <Button
            variant={ButtonVariant.link}
            onClick={() => setIsStartRunOpen(false)}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default WorkflowRunsPage;
