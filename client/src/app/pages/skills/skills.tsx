import * as React from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import {
  Button,
  ButtonVariant,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  FileUpload,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  TextArea,
  TextInput,
  ToggleGroup,
  ToggleGroupItem,
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

import {
  New,
  Skill,
  SkillAssociation,
  SkillSource,
  SkillSourceType,
} from "@app/api/models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import { ConfirmDialog } from "@app/components/ConfirmDialog";
import { FilterToolbar, FilterType } from "@app/components/FilterToolbar";
import { MultiSelect } from "@app/components/FilterToolbar/components/MultiSelect";
import { NotificationsContext } from "@app/components/NotificationsContext";
import { SimplePagination } from "@app/components/SimplePagination";
import {
  ConditionalTableBody,
  TableHeaderContentWithControls,
  TableRowContentWithControls,
} from "@app/components/TableControls";
import { useLocalTableControls } from "@app/hooks/table-controls";
import { useFetchAgents } from "@app/queries/agents";
import { useFetchApplications } from "@app/queries/applications";
import { useFetchArchetypes } from "@app/queries/archetypes";
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

const sourceTypeColor = (sourceType: SkillSourceType) => {
  switch (sourceType) {
    case "Inline":
      return "purple" as const;
    case "Git":
      return "green" as const;
    case "OCI":
      return "blue" as const;
  }
};

/** Encodes a SkillAssociation as a string value for the MultiSelect, e.g. "Agent:3". */
const associationValue = (type: string, id: number) => `${type}:${id}`;

const Skills: React.FC = () => {
  const { t } = useTranslation();
  const { pushNotification } = React.useContext(NotificationsContext);
  const { skills, isFetching, fetchError } = useFetchSkills();
  const { agents } = useFetchAgents();
  const { archetypes } = useFetchArchetypes();
  const { data: applications } = useFetchApplications();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [skillToDelete, setSkillToDelete] = React.useState<Skill>();
  const [skillToView, setSkillToView] = React.useState<Skill | null>(null);
  const [viewContent, setViewContent] = React.useState("");

  // Create Skill modal state
  const [newName, setNewName] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newSourceType, setNewSourceType] =
    React.useState<SkillSourceType>("Inline");
  const [newContent, setNewContent] = React.useState("");
  const [newRepositoryUrl, setNewRepositoryUrl] = React.useState("");
  const [newBranch, setNewBranch] = React.useState("main");
  const [newPath, setNewPath] = React.useState("/");
  const [newImageReference, setNewImageReference] = React.useState("");
  const [newAssociationValues, setNewAssociationValues] = React.useState<
    string[]
  >([]);

  const [importFileName, setImportFileName] = React.useState("");
  const [importContent, setImportContent] = React.useState("");
  const [isFileLoading, setIsFileLoading] = React.useState(false);

  const resetForm = () => {
    setNewName("");
    setNewDescription("");
    setNewSourceType("Inline");
    setNewContent("");
    setNewRepositoryUrl("");
    setNewBranch("main");
    setNewPath("/");
    setNewImageReference("");
    setNewAssociationValues([]);
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

  // Options for the "Associated to" multiselect: Agents, Archetypes, Target
  // profiles (nested under archetypes), and Applications, each tagged with a
  // groupLabel badge so they render the same way as the reference prototype.
  const associationOptions = React.useMemo(() => {
    const options: {
      value: string;
      label: string;
      groupLabel: string;
    }[] = [];

    agents.forEach((agent) => {
      options.push({
        value: associationValue("Agent", agent.id),
        label: agent.name,
        groupLabel: "Agent",
      });
    });
    archetypes.forEach((archetype) => {
      options.push({
        value: associationValue("Archetype", archetype.id),
        label: archetype.name,
        groupLabel: "Archetype",
      });
    });
    archetypes.forEach((archetype) => {
      (archetype.profiles ?? []).forEach((profile) => {
        options.push({
          value: associationValue("Target profile", profile.id),
          label: `${profile.name} (${archetype.name})`,
          groupLabel: "Target profile",
        });
      });
    });
    (applications ?? []).forEach((application) => {
      options.push({
        value: associationValue("Application", application.id),
        label: application.name,
        groupLabel: "Application",
      });
    });
    return options;
  }, [agents, archetypes, applications]);

  const toggleAssociation = (value: string) => {
    setNewAssociationValues((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const resolveAssociations = (values: string[]): SkillAssociation[] =>
    values
      .map((value) => {
        const option = associationOptions.find((opt) => opt.value === value);
        const [type, idStr] = value.split(":");
        if (!option) return null;
        return {
          type: type as SkillAssociation["type"],
          id: Number(idStr),
          name: option.label,
        };
      })
      .filter((item): item is SkillAssociation => item !== null);

  const isCreateValid =
    !!newName.trim() &&
    (newSourceType === "Inline"
      ? !!newContent.trim()
      : newSourceType === "Git"
        ? !!newRepositoryUrl.trim()
        : !!newImageReference.trim());

  const handleCreate = () => {
    const payload: New<Skill> = {
      name: newName.trim(),
      description: newDescription.trim(),
      source: "Custom",
      provider: "Your organization",
      sourceType: newSourceType,
      createdAt: new Date().toISOString(),
      associations: resolveAssociations(newAssociationValues),
      ...(newSourceType === "Inline" && { content: newContent }),
      ...(newSourceType === "Git" && {
        repositoryUrl: newRepositoryUrl.trim(),
        branch: newBranch.trim() || "main",
        path: newPath.trim() || "/",
      }),
      ...(newSourceType === "OCI" && {
        imageReference: newImageReference.trim(),
      }),
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
      sourceType: "Inline",
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

  const sourceTypeOptions: { value: SkillSourceType; label: string }[] = [
    { value: "Inline", label: "Inline" },
    { value: "Git", label: "Git" },
    { value: "OCI", label: "OCI" },
  ];

  const tableControls = useLocalTableControls({
    tableName: "skills-table",
    idProperty: "id",
    dataNameProperty: "name",
    items: skills,
    columnNames: {
      name: "Name",
      description: "Description",
      sourceType: "Source type",
      source: "Source",
      associations: "Associated to",
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
        categoryKey: "sourceType",
        title: "Source type",
        type: FilterType.multiselect,
        selectOptions: sourceTypeOptions.map((s) => ({ value: s.value })),
        getItemValue: (item) => item?.sourceType || "",
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
    sortableColumns: ["name", "sourceType", "source"],
    initialSort: { columnKey: "name", direction: "asc" },
    getSortValues: (item) => ({
      name: item?.name || "",
      sourceType: item?.sourceType || "",
      source: item?.source || "",
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
            Codify migration knowledge for Agents to consume at execution time
            using inline guidance, a git repository, or an OCI image.
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
                  <Th {...getThProps({ columnKey: "sourceType" })} />
                  <Th {...getThProps({ columnKey: "source" })} />
                  <Th {...getThProps({ columnKey: "associations" })} />
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
                      <Td width={15} {...getTdProps({ columnKey: "name" })}>
                        <Button
                          variant="link"
                          isInline
                          onClick={() => openViewModal(skill)}
                        >
                          {skill.name}
                        </Button>
                      </Td>
                      <Td width={25} {...getTdProps({ columnKey: "description" })}>
                        {skill.description || "—"}
                      </Td>
                      <Td width={10} {...getTdProps({ columnKey: "sourceType" })}>
                        <Label
                          color={sourceTypeColor(skill.sourceType)}
                          isCompact
                        >
                          {skill.sourceType}
                        </Label>
                      </Td>
                      <Td width={10} {...getTdProps({ columnKey: "source" })}>
                        <Label color={sourceColor(skill.source)} isCompact>
                          {skill.source}
                        </Label>
                      </Td>
                      <Td width={20} {...getTdProps({ columnKey: "associations" })}>
                        {skill.associations?.length ? (
                          <LabelGroup numLabels={2}>
                            {skill.associations.map((assoc) => (
                              <Label
                                key={`${assoc.type}-${assoc.id}`}
                                isCompact
                                variant="outline"
                              >
                                {assoc.name}
                              </Label>
                            ))}
                          </LabelGroup>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td isActionCell>
                        <ActionsColumn
                          items={[
                            {
                              title:
                                skill.sourceType === "Inline"
                                  ? "View / Edit"
                                  : "View details",
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
        aria-label="Create Skill"
      >
        <ModalHeader title="Create Skill" />
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
              <TextInput
                id="skill-description"
                value={newDescription}
                onChange={(_, value) => setNewDescription(value)}
              />
            </FormGroup>
            <FormGroup label="Source type" isRequired fieldId="skill-source-type">
              <ToggleGroup aria-label="Skill source type">
                {sourceTypeOptions.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    text={option.label}
                    buttonId={`skill-source-type-${option.value}`}
                    isSelected={newSourceType === option.value}
                    onChange={() => setNewSourceType(option.value)}
                  />
                ))}
              </ToggleGroup>
            </FormGroup>

            {newSourceType === "Inline" && (
              <FormGroup label="Content" isRequired fieldId="skill-content">
                <TextArea
                  id="skill-content"
                  value={newContent}
                  onChange={(_, value) => setNewContent(value)}
                  placeholder="Write migration knowledge in markdown..."
                  autoResize
                  style={{ fontFamily: "monospace", minHeight: "200px" }}
                />
              </FormGroup>
            )}

            {newSourceType === "Git" && (
              <>
                <FormGroup
                  label="Repository URL"
                  isRequired
                  fieldId="skill-repository-url"
                >
                  <TextInput
                    id="skill-repository-url"
                    value={newRepositoryUrl}
                    onChange={(_, value) => setNewRepositoryUrl(value)}
                    placeholder="https://github.com/org/repo"
                  />
                </FormGroup>
                <FormGroup label="Branch" fieldId="skill-branch">
                  <TextInput
                    id="skill-branch"
                    value={newBranch}
                    onChange={(_, value) => setNewBranch(value)}
                    placeholder="main"
                  />
                </FormGroup>
                <FormGroup label="Path" fieldId="skill-path">
                  <TextInput
                    id="skill-path"
                    value={newPath}
                    onChange={(_, value) => setNewPath(value)}
                    placeholder="/"
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Path within the repository to the Skill file or
                        directory.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </>
            )}

            {newSourceType === "OCI" && (
              <FormGroup
                label="Image reference"
                isRequired
                fieldId="skill-image-reference"
              >
                <TextInput
                  id="skill-image-reference"
                  value={newImageReference}
                  onChange={(_, value) => setNewImageReference(value)}
                  placeholder="quay.io/org/skill-name:latest"
                />
              </FormGroup>
            )}

            <FormGroup label="Associated to" fieldId="skill-associations">
              <MultiSelect
                toggleId="skill-associations-select-toggle"
                toggleAriaLabel="Skill associations select dropdown"
                aria-label="Associated to"
                placeholderText="Select associations..."
                values={newAssociationValues}
                hasChips
                options={associationOptions}
                onSelect={(selection) => {
                  if (!selection) return;
                  toggleAssociation(selection);
                }}
                onClear={() => setNewAssociationValues([])}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Associate this Skill with one or more Agents, archetypes,
                    target profiles, or applications.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.primary}
            isDisabled={!isCreateValid || isCreating}
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
          {skillToView?.associations?.length ? (
            <DescriptionList
              isHorizontal
              style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Associated to</DescriptionListTerm>
                <DescriptionListDescription>
                  <LabelGroup>
                    {skillToView.associations.map((assoc) => (
                      <Label
                        key={`${assoc.type}-${assoc.id}`}
                        isCompact
                        variant="outline"
                      >
                        {assoc.name}
                      </Label>
                    ))}
                  </LabelGroup>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          ) : null}

          {skillToView?.sourceType === "Git" && (
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>Repository URL</DescriptionListTerm>
                <DescriptionListDescription>
                  {skillToView.repositoryUrl}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Branch</DescriptionListTerm>
                <DescriptionListDescription>
                  {skillToView.branch || "main"}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Path</DescriptionListTerm>
                <DescriptionListDescription>
                  {skillToView.path || "/"}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          )}

          {skillToView?.sourceType === "OCI" && (
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>Image reference</DescriptionListTerm>
                <DescriptionListDescription>
                  {skillToView.imageReference}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          )}

          {(!skillToView || skillToView.sourceType === "Inline") && (
            <TextArea
              id="skill-view-content"
              value={viewContent}
              onChange={(_, value) => setViewContent(value)}
              aria-label="Skill file content"
              autoResize
              style={{ fontFamily: "monospace", minHeight: "300px" }}
            />
          )}
        </ModalBody>
        <ModalFooter>
          {(!skillToView || skillToView.sourceType === "Inline") && (
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
          )}
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
