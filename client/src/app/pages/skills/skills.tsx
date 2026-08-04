import * as React from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import {
  Button,
  ButtonVariant,
  Content,
  EmptyState,
  EmptyStateBody,
  FileUpload,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  TextArea,
  TextInput,
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

import { New, Skill, SkillSource } from "@app/api/models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import { ConfirmDialog } from "@app/components/ConfirmDialog";
import { FilterToolbar, FilterType } from "@app/components/FilterToolbar";
import SimpleSelect from "@app/components/FilterToolbar/components/SimpleSelect";
import { NotificationsContext } from "@app/components/NotificationsContext";
import { SimplePagination } from "@app/components/SimplePagination";
import {
  ConditionalTableBody,
  TableHeaderContentWithControls,
  TableRowContentWithControls,
} from "@app/components/TableControls";
import { useLocalTableControls } from "@app/hooks/table-controls";
import {
  useCreateSkillMutation,
  useDeleteSkillMutation,
  useFetchSkills,
  useUpdateSkillMutation,
} from "@app/queries/skills";
import { getAxiosErrorMessage } from "@app/utils/utils";

const sourceColor = (source: SkillSource) => {
  switch (source) {
    case "Red Hat":
      return "red" as const;
    case "Organization":
      return "blue" as const;
    case "Custom":
      return "grey" as const;
  }
};

const Skills: React.FC = () => {
  const { t } = useTranslation();
  const { pushNotification } = React.useContext(NotificationsContext);
  const { skills, isFetching, fetchError } = useFetchSkills();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [skillToDelete, setSkillToDelete] = React.useState<Skill>();
  const [skillToView, setSkillToView] = React.useState<Skill | null>(null);
  const [viewContent, setViewContent] = React.useState("");

  const [newName, setNewName] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newSource, setNewSource] = React.useState<SkillSource>("Custom");
  const [newProvider, setNewProvider] = React.useState("");

  const [importFileName, setImportFileName] = React.useState("");
  const [importContent, setImportContent] = React.useState("");
  const [isFileLoading, setIsFileLoading] = React.useState(false);

  const resetForm = () => {
    setNewName("");
    setNewDescription("");
    setNewSource("Custom");
    setNewProvider("");
    setImportFileName("");
    setImportContent("");
  };

  const onCreateSuccess = (skill: Skill) => {
    pushNotification({
      title: `Skill "${skill.name}" created`,
      variant: "success",
    });
    setIsCreateOpen(false);
    resetForm();
  };
  const onCreateError = (error: AxiosError) => {
    pushNotification({ title: getAxiosErrorMessage(error), variant: "danger" });
  };
  const { mutate: createSkill, isPending: isCreating } = useCreateSkillMutation(
    onCreateSuccess,
    onCreateError
  );

  const onDeleteSuccess = () => {
    pushNotification({ title: "Skill deleted", variant: "success" });
  };
  const onDeleteError = (error: AxiosError) => {
    pushNotification({ title: getAxiosErrorMessage(error), variant: "danger" });
  };
  const { mutate: deleteSkill } = useDeleteSkillMutation(
    onDeleteSuccess,
    onDeleteError
  );

  const onUpdateSuccess = (skill: Skill) => {
    pushNotification({
      title: `Skill "${skill.name}" saved`,
      variant: "success",
    });
    setSkillToView(null);
  };
  const { mutate: updateSkill, isPending: isSaving } = useUpdateSkillMutation(
    onUpdateSuccess,
    onCreateError
  );

  const openViewModal = (skill: Skill) => {
    setSkillToView(skill);
    setViewContent(skill.content ?? "");
  };

  const handleSaveContent = () => {
    if (!skillToView) return;
    updateSkill({ ...skillToView, content: viewContent });
  };

  const handleCreate = () => {
    const payload: New<Skill> = {
      name: newName.trim(),
      description: newDescription.trim(),
      source: newSource,
      provider: newProvider.trim() || "Custom",
      createdAt: new Date().toISOString(),
    };
    createSkill(payload);
  };

  const handleImport = () => {
    const lines = importContent.split("\n");
    const nameLine = lines.find((l) => l.startsWith("# "));
    const skillName = nameLine
      ? nameLine.replace(/^#+\s*/, "").trim()
      : importFileName.replace(/\.[^.]+$/, "");

    const payload: New<Skill> = {
      name: skillName || importFileName,
      description: `Imported from ${importFileName}`,
      source: "Custom",
      provider: "Imported",
      content: importContent,
      createdAt: new Date().toISOString(),
    };
    createSkill(payload);
    setIsImportOpen(false);
    resetForm();
  };

  const sourceOptions: { value: SkillSource; label: string }[] = [
    { value: "Red Hat", label: "Red Hat" },
    { value: "Organization", label: "Organization" },
    { value: "Custom", label: "Custom" },
  ];

  const tableControls = useLocalTableControls({
    tableName: "skills-table",
    idProperty: "id",
    dataNameProperty: "name",
    items: skills,
    columnNames: {
      name: "Name",
      description: "Description",
      source: "Source",
      provider: "Provider",
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
        categoryKey: "source",
        title: "Source",
        type: FilterType.multiselect,
        selectOptions: sourceOptions.map((s) => ({ value: s.value })),
        getItemValue: (item) => item?.source || "",
      },
    ],
    initialItemsPerPage: 10,
    sortableColumns: ["name", "source", "provider"],
    initialSort: { columnKey: "name", direction: "asc" },
    getSortValues: (item) => ({
      name: item?.name || "",
      source: item?.source || "",
      provider: item?.provider || "",
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
          <Content component="h1">Skills</Content>
        </Content>
        <Content>
          <Content component="p">
            Manage the skill catalog available to agents. Skills can come from
            Red Hat, your organization, or custom definitions you import or
            create.
          </Content>
        </Content>
      </PageSection>

      <PageSection hasBodyWrapper={false}>
        <ConditionalRender
          when={isFetching && !(skills || fetchError)}
          then={<AppPlaceholder />}
        >
          <Toolbar {...toolbarProps}>
            <ToolbarContent>
              <FilterToolbar {...filterToolbarProps} />
              <ToolbarGroup variant="action-group">
                <ToolbarItem>
                  <Button
                    variant={ButtonVariant.primary}
                    onClick={() => setIsCreateOpen(true)}
                  >
                    Create skill
                  </Button>
                </ToolbarItem>
                <ToolbarItem>
                  <Button
                    variant={ButtonVariant.secondary}
                    onClick={() => setIsImportOpen(true)}
                  >
                    Import skill file
                  </Button>
                </ToolbarItem>
              </ToolbarGroup>
              <ToolbarItem {...paginationToolbarItemProps}>
                <SimplePagination
                  idPrefix="skills-table"
                  isTop
                  paginationProps={paginationProps}
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <Table {...tableProps} aria-label="Skills table">
            <Thead>
              <Tr>
                <TableHeaderContentWithControls {...tableControls}>
                  <Th {...getThProps({ columnKey: "name" })} />
                  <Th {...getThProps({ columnKey: "description" })} />
                  <Th {...getThProps({ columnKey: "source" })} />
                  <Th {...getThProps({ columnKey: "provider" })} />
                  <Th screenReaderText="Row actions" />
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
                  titleText="No skills available"
                  variant="sm"
                >
                  <EmptyStateBody>
                    Create a skill or import a skill file to get started.
                  </EmptyStateBody>
                </EmptyState>
              }
              numRenderedColumns={numRenderedColumns}
            >
              {currentPageItems?.map((skill, rowIndex) => (
                <Tbody key={skill.id}>
                  <Tr {...getTrProps({ item: skill })}>
                    <TableRowContentWithControls
                      {...tableControls}
                      item={skill}
                      rowIndex={rowIndex}
                    >
                      <Td width={20} {...getTdProps({ columnKey: "name" })}>
                        <Button
                          variant="link"
                          isInline
                          onClick={() => openViewModal(skill)}
                        >
                          {skill.name}
                        </Button>
                      </Td>
                      <Td width={35} {...getTdProps({ columnKey: "description" })}>
                        {skill.description || "—"}
                      </Td>
                      <Td width={15} {...getTdProps({ columnKey: "source" })}>
                        <Label color={sourceColor(skill.source)} isCompact>
                          {skill.source}
                        </Label>
                      </Td>
                      <Td width={15} {...getTdProps({ columnKey: "provider" })}>
                        {skill.provider}
                      </Td>
                      <Td isActionCell>
                        <ActionsColumn
                          items={[
                            {
                              title: "View / Edit",
                              onClick: () => openViewModal(skill),
                            },
                            {
                              title: "Delete",
                              onClick: () => setSkillToDelete(skill),
                              isDanger: true,
                              isDisabled: skill.source === "Red Hat",
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
            idPrefix="skills-table"
            isTop={false}
            paginationProps={paginationProps}
          />
        </ConditionalRender>
      </PageSection>

      {/* Create skill modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          resetForm();
        }}
        variant="medium"
        aria-label="Create skill"
      >
        <ModalHeader title="Create skill" />
        <ModalBody>
          <Form>
            <FormGroup label="Name" isRequired fieldId="skill-name">
              <TextInput
                id="skill-name"
                value={newName}
                onChange={(_, value) => setNewName(value)}
              />
            </FormGroup>
            <FormGroup label="Description" fieldId="skill-description">
              <TextArea
                id="skill-description"
                value={newDescription}
                onChange={(_, value) => setNewDescription(value)}
                autoResize
              />
            </FormGroup>
            <FormGroup label="Source" fieldId="skill-source">
              <SimpleSelect
                toggleId="skill-source-toggle"
                toggleAriaLabel="Skill source"
                ariaLabel="Source"
                value={newSource}
                options={sourceOptions}
                onSelect={(selection) =>
                  setNewSource((selection as SkillSource) ?? "Custom")
                }
              />
            </FormGroup>
            <FormGroup label="Provider" fieldId="skill-provider">
              <TextInput
                id="skill-provider"
                value={newProvider}
                onChange={(_, value) => setNewProvider(value)}
                placeholder="e.g. Platform Engineering"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.primary}
            isDisabled={!newName.trim() || isCreating}
            isLoading={isCreating}
            onClick={handleCreate}
          >
            Create
          </Button>
          <Button
            variant={ButtonVariant.link}
            onClick={() => {
              setIsCreateOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Import skill file modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          resetForm();
        }}
        variant="medium"
        aria-label="Import skill file"
      >
        <ModalHeader title="Import skill file" />
        <ModalBody>
          <Form>
            <FormGroup
              label="Skill file"
              isRequired
              fieldId="skill-file-upload"
            >
              <FileUpload
                id="skill-file-upload"
                type="text"
                value={importContent}
                filename={importFileName}
                filenamePlaceholder="Drop a file here or click to upload"
                onFileInputChange={(_event, file) => {
                  setImportFileName(file.name);
                }}
                onDataChange={(_event, value) => setImportContent(value)}
                onTextChange={(_event, value) => setImportContent(value)}
                isLoading={isFileLoading}
                onReadStarted={() => setIsFileLoading(true)}
                onReadFinished={() => setIsFileLoading(false)}
                onClearClick={() => {
                  setImportFileName("");
                  setImportContent("");
                }}
                browseButtonText="Browse"
                allowEditingUploadedText
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.primary}
            isDisabled={!importContent.trim() || isCreating}
            isLoading={isCreating}
            onClick={handleImport}
          >
            Import
          </Button>
          <Button
            variant={ButtonVariant.link}
            onClick={() => {
              setIsImportOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* View / Edit skill content modal */}
      <Modal
        isOpen={!!skillToView}
        onClose={() => setSkillToView(null)}
        variant="large"
        aria-label="View skill content"
      >
        <ModalHeader
          title={skillToView ? `${skillToView.name}` : "Skill"}
          description={skillToView?.description}
        />
        <ModalBody>
          <TextArea
            id="skill-view-content"
            value={viewContent}
            onChange={(_, value) => setViewContent(value)}
            aria-label="Skill file content"
            autoResize
            style={{ fontFamily: "monospace", minHeight: "300px" }}
          />
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.primary}
            isDisabled={
              isSaving || viewContent === (skillToView?.content ?? "")
            }
            isLoading={isSaving}
            onClick={handleSaveContent}
          >
            Save
          </Button>
          <Button
            variant={ButtonVariant.link}
            onClick={() => setSkillToView(null)}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {skillToDelete && (
        <ConfirmDialog
          title="Delete skill"
          titleIconVariant="warning"
          message={`Are you sure you want to delete skill "${skillToDelete.name}"? This action cannot be undone.`}
          isOpen={true}
          confirmBtnVariant={ButtonVariant.danger}
          confirmBtnLabel="Delete"
          cancelBtnLabel="Cancel"
          onCancel={() => setSkillToDelete(undefined)}
          onClose={() => setSkillToDelete(undefined)}
          onConfirm={() => {
            deleteSkill(skillToDelete.id);
            setSkillToDelete(undefined);
          }}
        />
      )}
    </>
  );
};

export default Skills;
