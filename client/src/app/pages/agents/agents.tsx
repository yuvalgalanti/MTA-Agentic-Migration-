import * as React from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import {
  Button,
  ButtonVariant,
  Content,
  EmptyState,
  EmptyStateBody,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  PageSection,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
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
import { Agent } from "@app/api/models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import { ConfirmDialog } from "@app/components/ConfirmDialog";
import { FilterToolbar, FilterType } from "@app/components/FilterToolbar";
import { NotificationsContext } from "@app/components/NotificationsContext";
import { SimplePagination } from "@app/components/SimplePagination";
import {
  ConditionalTableBody,
  TableHeaderContentWithControls,
  TableRowContentWithControls,
} from "@app/components/TableControls";
import { useLocalTableControls } from "@app/hooks/table-controls";
import { useDeleteAgentMutation, useFetchAgents } from "@app/queries/agents";
import { formatPath, getAxiosErrorMessage } from "@app/utils/utils";

import { AGENT_ROLES } from "./agent-catalog";
import { AgentForm } from "./components/agent-form";

export const Agents: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { pushNotification } = React.useContext(NotificationsContext);

  const { agents, isFetching, fetchError, refetch } = useFetchAgents();

  const [createUpdateModalState, setCreateUpdateModalState] = React.useState<
    "create" | Agent | null
  >(null);
  const isCreateUpdateModalOpen = createUpdateModalState !== null;
  const agentToUpdate =
    createUpdateModalState !== "create" ? createUpdateModalState : null;

  const [agentToDelete, setAgentToDelete] = React.useState<Agent>();

  const onDeleteSuccess = () => {
    pushNotification({ title: "Agent deleted", variant: "success" });
  };
  const onDeleteError = (error: AxiosError) => {
    pushNotification({ title: getAxiosErrorMessage(error), variant: "danger" });
  };
  const { mutate: deleteAgent } = useDeleteAgentMutation(
    onDeleteSuccess,
    onDeleteError
  );

  const tableControls = useLocalTableControls({
    tableName: "agents-table",
    idProperty: "id",
    dataNameProperty: "name",
    items: agents,
    columnNames: {
      name: "Name",
      role: "Role",
      model: "Model",
      status: "Status",
    },
    isFilterEnabled: true,
    isSortEnabled: true,
    isPaginationEnabled: true,
    hasActionsColumn: true,
    filterCategories: [
      {
        categoryKey: "name",
        title: t("terms.name"),
        type: FilterType.search,
        placeholderText: "Filter by name...",
        getItemValue: (item) => item?.name || "",
      },
      {
        categoryKey: "role",
        title: "Role",
        type: FilterType.multiselect,
        selectOptions: AGENT_ROLES.map((role) => ({ value: role })),
        getItemValue: (item) => item?.role || "",
      },
    ],
    initialItemsPerPage: 10,
    sortableColumns: ["name", "role", "model", "status"],
    initialSort: { columnKey: "name", direction: "asc" },
    getSortValues: (item) => ({
      name: item?.name || "",
      role: item?.role || "",
      model: item?.model || "",
      status: item?.status || "",
    }),
    isLoading: isFetching,
  });

  const {
    currentPageItems,
    numRenderedColumns,
    propHelpers: {
      toolbarProps,
      filterToolbarProps,
      paginationToolbarItemProps,
      paginationProps,
      tableProps,
      getThProps,
      getTrProps,
      getTdProps,
    },
  } = tableControls;

  const closeCreateUpdateModal = () => {
    setCreateUpdateModalState(null);
    refetch();
  };

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Content>
          <Content component="h1">Agents</Content>
        </Content>
        <Content>
          <Content component="p">
            Manage the agents available to include in migration workflow
            stages. Each agent represents an automated capability, such as
            code analysis or refactoring, that a workflow stage can delegate
            work to.
          </Content>
        </Content>
      </PageSection>

      <PageSection hasBodyWrapper={false}>
        <ConditionalRender
          when={isFetching && !(agents || fetchError)}
          then={<AppPlaceholder />}
        >
          <Toolbar {...toolbarProps}>
            <ToolbarContent>
              <FilterToolbar {...filterToolbarProps} />
              <ToolbarGroup variant="action-group">
                <ToolbarItem>
                  <Button
                    type="button"
                    id="create-agent"
                    aria-label="Create new agent"
                    variant={ButtonVariant.primary}
                    onClick={() => setCreateUpdateModalState("create")}
                  >
                    {t("actions.createNew")}
                  </Button>
                </ToolbarItem>
              </ToolbarGroup>
              <ToolbarItem {...paginationToolbarItemProps}>
                <SimplePagination
                  idPrefix="agents-table"
                  isTop
                  paginationProps={paginationProps}
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <Table {...tableProps} aria-label="Agents table">
            <Thead>
              <Tr>
                <TableHeaderContentWithControls {...tableControls}>
                  <Th {...getThProps({ columnKey: "name" })} />
                  <Th {...getThProps({ columnKey: "role" })} />
                  <Th {...getThProps({ columnKey: "model" })} />
                  <Th {...getThProps({ columnKey: "status" })} />
                  <Th screenReaderText={t("actions.rowActions")} />
                </TableHeaderContentWithControls>
              </Tr>
            </Thead>
            <ConditionalTableBody
              isLoading={isFetching}
              isError={!!fetchError}
              isNoData={currentPageItems.length === 0}
              noDataEmptyState={
                <EmptyState headingLevel="h2" icon={CubesIcon} titleText="No agents available" variant="sm">
                  <EmptyStateBody>
                    Create an agent to make it available for use in migration
                    workflow stages.
                  </EmptyStateBody>
                </EmptyState>
              }
              numRenderedColumns={numRenderedColumns}
            >
              {currentPageItems?.map((agent, rowIndex) => (
                <Tbody key={agent.id}>
                  <Tr {...getTrProps({ item: agent })}>
                    <TableRowContentWithControls
                      {...tableControls}
                      item={agent}
                      rowIndex={rowIndex}
                    >
                      <Td width={30} {...getTdProps({ columnKey: "name" })}>
                        <Link
                          to={formatPath(Paths.agenticAgentDetails, {
                            agentId: agent.id,
                          })}
                        >
                          {agent.name}
                        </Link>
                      </Td>
                      <Td width={25} {...getTdProps({ columnKey: "role" })}>
                        {agent.role}
                      </Td>
                      <Td width={25} {...getTdProps({ columnKey: "model" })}>
                        {agent.model}
                      </Td>
                      <Td width={10} {...getTdProps({ columnKey: "status" })}>
                        <Label color={agent.status === "Active" ? "green" : "grey"}>
                          {agent.status}
                        </Label>
                      </Td>
                      <Td isActionCell style={{ textAlign: "right" }}>
                        <ActionsColumn
                          items={[
                            {
                              title: "View details",
                              onClick: () =>
                                history.push(
                                  formatPath(Paths.agenticAgentDetails, {
                                    agentId: agent.id,
                                  })
                                ),
                            },
                            {
                              title: t("actions.edit"),
                              onClick: () => setCreateUpdateModalState(agent),
                            },
                            {
                              title: t("actions.delete"),
                              onClick: () => setAgentToDelete(agent),
                              isDanger: true,
                            },
                          ]}
                        />
                      </Td>
                    </TableRowContentWithControls>
                  </Tr>
                </Tbody>
              ))}
            </ConditionalTableBody>
          </Table>
          <SimplePagination
            idPrefix="agents-table"
            isTop={false}
            paginationProps={paginationProps}
          />
        </ConditionalRender>
      </PageSection>

      <Modal
        id="create-edit-agent-modal"
        variant="medium"
        isOpen={isCreateUpdateModalOpen}
        onClose={closeCreateUpdateModal}
      >
        <ModalHeader
          title={agentToUpdate ? "Update agent" : "Create new agent"}
        />
        <ModalBody>
          <AgentForm agent={agentToUpdate} onClose={closeCreateUpdateModal} />
        </ModalBody>
      </Modal>

      {agentToDelete && (
        <ConfirmDialog
          title="Delete agent"
          titleIconVariant="warning"
          message={`Are you sure you want to delete agent "${agentToDelete.name}"? This action cannot be undone.`}
          isOpen={true}
          confirmBtnVariant={ButtonVariant.danger}
          confirmBtnLabel={t("actions.delete")}
          cancelBtnLabel={t("actions.cancel")}
          onCancel={() => setAgentToDelete(undefined)}
          onClose={() => setAgentToDelete(undefined)}
          onConfirm={() => {
            deleteAgent(agentToDelete.id);
            setAgentToDelete(undefined);
          }}
        />
      )}
    </>
  );
};
