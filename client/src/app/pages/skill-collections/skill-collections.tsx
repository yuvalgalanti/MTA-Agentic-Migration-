import * as React from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import {
  Button,
  ButtonVariant,
  Content,
  EmptyState,
  EmptyStateBody,
  LabelGroup,
  Label,
  PageSection,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import { CubesIcon, PencilAltIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { SkillCollection } from "@app/api/models";
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
import { OverflowActionMenu } from "@app/components/overflow-action-menu";
import { useLocalTableControls } from "@app/hooks/table-controls";
import { useFetchAgents } from "@app/queries/agents";
import {
  useDeleteSkillCollectionMutation,
  useFetchSkillCollections,
} from "@app/queries/skill-collections";
import { useFetchSkills } from "@app/queries/skills";
import { addSeparatorForOverflow } from "@app/utils/grouping";
import { getAxiosErrorMessage } from "@app/utils/utils";

import { SkillCollectionFormModal } from "./components/skill-collection-form-modal";

export const SkillCollections: React.FC = () => {
  const { t } = useTranslation();
  const { pushNotification } = React.useContext(NotificationsContext);

  const [skillCollectionToDelete, setSkillCollectionToDelete] =
    React.useState<SkillCollection>();
  const [createUpdateModalState, setCreateUpdateModalState] = React.useState<
    "create" | SkillCollection | undefined
  >(undefined);

  const { skillCollections, isFetching, fetchError } = useFetchSkillCollections();
  const { skills } = useFetchSkills();
  const { agents } = useFetchAgents();
  const deletedNameRef = React.useRef<string>("");

  const usedByCount = React.useMemo(() => {
    const counts: Record<string, number> = {};
    agents.forEach((agent) => {
      (agent.skillCollections || []).forEach((name) => {
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return counts;
  }, [agents]);

  const onMutationError = (error: AxiosError) => {
    pushNotification({ title: getAxiosErrorMessage(error), variant: "danger" });
  };

  const { mutate: deleteSkillCollection } = useDeleteSkillCollectionMutation(() => {
    pushNotification({
      title: t("toastr.success.deletedWhat", {
        what: deletedNameRef.current,
        type: "skill collection",
      }),
      variant: "success",
    });
  }, onMutationError);

  const tableControls = useLocalTableControls({
    tableName: "skill-collections-table",
    idProperty: "id",
    dataNameProperty: "name",
    items: skillCollections,
    columnNames: {
      name: t("terms.name"),
      description: t("terms.description"),
      skills: "Skills",
      usedBy: "Used by",
    },
    isFilterEnabled: true,
    isSortEnabled: true,
    isPaginationEnabled: true,
    hasActionsColumn: true,
    filterCategories: [
      {
        categoryKey: "name",
        title: "Name",
        type: FilterType.search,
        placeholderText: "Filter by name...",
        getItemValue: (item) => item?.name || "",
      },
    ],
    initialItemsPerPage: 10,
    sortableColumns: ["name"],
    initialSort: { columnKey: "name", direction: "asc" },
    getSortValues: (item) => ({
      name: item?.name || "",
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

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Content>
          <Content component="h1">Skill collections</Content>
          <Content component="p">
            Bundle related Skills together so they can be attached to an Agent
            as a group.
          </Content>
        </Content>
      </PageSection>
      <PageSection hasBodyWrapper={false}>
        <ConditionalRender
          when={isFetching && !(skillCollections || fetchError)}
          then={<AppPlaceholder />}
        >
          <div
            style={{
              backgroundColor:
                "var(--pf-t--global--background--color--primary--default)",
            }}
          >
            <Toolbar {...toolbarProps}>
              <ToolbarContent>
                <FilterToolbar {...filterToolbarProps} />
                <ToolbarGroup variant="action-group">
                  <ToolbarItem>
                    <Button
                      size="sm"
                      onClick={() => setCreateUpdateModalState("create")}
                      variant="primary"
                      id="create-skill-collection-button"
                    >
                      Create skill collection
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
                <ToolbarItem {...paginationToolbarItemProps}>
                  <SimplePagination
                    idPrefix="skill-collections-table"
                    isTop
                    paginationProps={paginationProps}
                  />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>

            <Table
              {...tableProps}
              id="skill-collections-table"
              aria-label="Skill collections table"
            >
              <Thead>
                <Tr>
                  <TableHeaderContentWithControls {...tableControls}>
                    <Th width={20} {...getThProps({ columnKey: "name" })} />
                    <Th
                      width={30}
                      {...getThProps({ columnKey: "description" })}
                    />
                    <Th width={30} {...getThProps({ columnKey: "skills" })} />
                    <Th width={10} {...getThProps({ columnKey: "usedBy" })} />
                    <Th screenReaderText={t("actions.rowActions")} />
                  </TableHeaderContentWithControls>
                </Tr>
              </Thead>
              <ConditionalTableBody
                isLoading={isFetching}
                isError={!!fetchError}
                isNoData={currentPageItems.length === 0}
                noDataEmptyState={
                  <EmptyState
                    headingLevel="h2"
                    icon={CubesIcon}
                    titleText="No skill collections yet"
                    variant="sm"
                  >
                    <EmptyStateBody>
                      Create a skill collection to bundle related Skills
                      together.
                    </EmptyStateBody>
                  </EmptyState>
                }
                numRenderedColumns={numRenderedColumns}
              >
                <Tbody>
                  {currentPageItems?.map((skillCollection, rowIndex) => (
                    <Tr
                      key={skillCollection.id}
                      {...getTrProps({ item: skillCollection })}
                    >
                      <TableRowContentWithControls
                        {...tableControls}
                        item={skillCollection}
                        rowIndex={rowIndex}
                      >
                        <Td
                          modifier="truncate"
                          width={20}
                          {...getTdProps({ columnKey: "name" })}
                        >
                          {skillCollection.name}
                        </Td>
                        <Td
                          modifier="truncate"
                          width={30}
                          {...getTdProps({ columnKey: "description" })}
                        >
                          {skillCollection.description}
                        </Td>
                        <Td width={30} {...getTdProps({ columnKey: "skills" })}>
                          <LabelGroup numLabels={3}>
                            {skillCollection.skillIds.map((skillId) => {
                              const skill = skills.find((s) => s.id === skillId);
                              return (
                                <Label key={skillId} isCompact color="purple">
                                  {skill?.name ?? `#${skillId}`}
                                </Label>
                              );
                            })}
                          </LabelGroup>
                        </Td>
                        <Td width={10} {...getTdProps({ columnKey: "usedBy" })}>
                          {usedByCount[skillCollection.name] || 0} agent
                          {(usedByCount[skillCollection.name] || 0) === 1
                            ? ""
                            : "s"}
                        </Td>
                        <Td isActionCell>
                          <OverflowActionMenu
                            toggleId="row-actions"
                            toggleAriaLabel={t("actions.rowActions")}
                            items={addSeparatorForOverflow(
                              (index, isShared) => ({
                                isSeparator: true,
                                itemKey: `separator-${index}`,
                                isShared,
                              }),
                              [
                                [
                                  {
                                    title: t("actions.edit"),
                                    "aria-label": t("actions.edit"),
                                    variant: "plain",
                                    icon: <PencilAltIcon />,
                                    itemKey: "edit",
                                    isShared: true,
                                    ouiaId: "pencil-action",
                                    useOnlyIconWhenShared: true,
                                    tooltipProps: {
                                      content: t("actions.edit"),
                                    },
                                    onClick: () =>
                                      setCreateUpdateModalState(skillCollection),
                                  },
                                ],
                                [
                                  {
                                    isDanger: true,
                                    title: t("actions.delete"),
                                    itemKey: "delete",
                                    onClick: () =>
                                      setSkillCollectionToDelete(skillCollection),
                                  },
                                ],
                              ]
                            )}
                          />
                        </Td>
                      </TableRowContentWithControls>
                    </Tr>
                  ))}
                </Tbody>
              </ConditionalTableBody>
            </Table>
            <SimplePagination
              idPrefix="skill-collections-table"
              isTop={false}
              paginationProps={paginationProps}
            />
          </div>
        </ConditionalRender>

        <SkillCollectionFormModal
          isOpen={createUpdateModalState !== undefined}
          skillCollection={
            createUpdateModalState === "create" ? undefined : createUpdateModalState
          }
          skillCollections={skillCollections}
          onClose={() => setCreateUpdateModalState(undefined)}
        />

        {skillCollectionToDelete ? (
          <ConfirmDialog
            title={t("dialog.title.deleteWithName", {
              what: "skill collection",
              name: skillCollectionToDelete.name,
            })}
            titleIconVariant="warning"
            message={t("dialog.message.delete")}
            isOpen
            confirmBtnVariant={ButtonVariant.danger}
            confirmBtnLabel={t("actions.delete")}
            cancelBtnLabel={t("actions.cancel")}
            onCancel={() => setSkillCollectionToDelete(undefined)}
            onClose={() => setSkillCollectionToDelete(undefined)}
            onConfirm={() => {
              deletedNameRef.current = skillCollectionToDelete.name;
              deleteSkillCollection(skillCollectionToDelete.id);
              setSkillCollectionToDelete(undefined);
            }}
          />
        ) : null}
      </PageSection>
    </>
  );
};

export default SkillCollections;
