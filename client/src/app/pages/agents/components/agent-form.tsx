import * as React from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { AxiosError } from "axios";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { array, object, string } from "yup";
import {
  ActionGroup,
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Form,
  Switch,
} from "@patternfly/react-core";

import { Agent, AgentRole, New } from "@app/api/models";
import { MultiSelect } from "@app/components/FilterToolbar/components/MultiSelect";
import SimpleSelect from "@app/components/FilterToolbar/components/SimpleSelect";
import {
  HookFormPFGroupController,
  HookFormPFTextArea,
  HookFormPFTextInput,
} from "@app/components/HookFormPFFields";
import { NotificationsContext } from "@app/components/NotificationsContext";
import {
  useCreateAgentMutation,
  useFetchAgents,
  useUpdateAgentMutation,
} from "@app/queries/agents";
import { duplicateNameCheck } from "@app/utils/utils";

import {
  AGENT_IMAGES,
  AGENT_MCP_TOOLS,
  AGENT_MODELS,
  AGENT_ROLES,
  AGENT_SKILLS,
} from "../agent-catalog";

interface FormValues {
  name: string;
  prompt: string;
  role: AgentRole;
  image: string;
  model: string;
  skills: string[];
  mcpTools: string[];
  isActive: boolean;
}

export interface AgentFormProps {
  agent: Agent | null;
  onClose: () => void;
}

export const AgentForm: React.FC<AgentFormProps> = ({ agent, onClose }) => {
  const { t } = useTranslation();
  const { pushNotification } = React.useContext(NotificationsContext);
  const { agents } = useFetchAgents();

  const onCreateOrUpdateSuccess = (data: Agent) => {
    pushNotification({
      title: t(agent ? "toastr.success.saveWhat" : "toastr.success.createWhat", {
        type: "agent",
        what: data.name,
      }),
      variant: "success",
    });
    onClose();
  };

  const onCreateOrUpdateError = (_error: AxiosError) => {
    pushNotification({
      title: t(agent ? "toastr.fail.save" : "toastr.fail.create", {
        type: "agent",
      }),
      variant: "danger",
    });
  };

  const { mutate: createAgent } = useCreateAgentMutation(
    onCreateOrUpdateSuccess,
    onCreateOrUpdateError
  );
  const { mutate: updateAgent } = useUpdateAgentMutation(
    onCreateOrUpdateSuccess,
    onCreateOrUpdateError
  );

  const roleOptions = AGENT_ROLES.map((role) => ({ value: role, label: role }));
  const imageOptions = AGENT_IMAGES.map((img) => ({
    value: img.value,
    label: img.label,
  }));
  const modelOptions = AGENT_MODELS.map((model) => ({
    value: model.value,
    label: `${model.label} (${model.provider})`,
  }));
  const skillOptions = AGENT_SKILLS.map((skill) => ({ value: skill, label: skill }));
  const mcpToolOptions = AGENT_MCP_TOOLS.map((tool) => ({ value: tool, label: tool }));

  const validationSchema = object().shape({
    name: string()
      .trim()
      .required(t("validation.required"))
      .min(3, t("validation.minLength", { length: 3 }))
      .max(120, t("validation.maxLength", { length: 120 }))
      .test(
        "Duplicate name",
        "An agent with this name already exists. Use a different name.",
        (value) => duplicateNameCheck(agents, agent || null, value || "")
      ),
    prompt: string()
      .trim()
      .max(2000, t("validation.maxLength", { length: 2000 })),
    role: string().required(t("validation.required")),
    image: string().required(t("validation.required")),
    model: string().required(t("validation.required")),
    skills: array().of(string()),
    mcpTools: array().of(string()),
  });

  const {
    handleSubmit,
    formState: { isSubmitting, isValidating, isValid, isDirty },
    control,
  } = useForm<FormValues>({
    defaultValues: {
      name: agent?.name || "",
      prompt: agent?.prompt || "",
      role: agent?.role || "Code Analysis",
      image: agent?.image || AGENT_IMAGES[0].value,
      model: agent?.model || AGENT_MODELS[0].value,
      skills: agent?.skills || [],
      mcpTools: agent?.mcpTools || [],
      isActive: agent ? agent.status === "Active" : true,
    },
    resolver: yupResolver(validationSchema),
    mode: "all",
  });

  const onSubmit = (formValues: FormValues) => {
    const payload: New<Agent> = {
      name: formValues.name.trim(),
      prompt: formValues.prompt.trim(),
      role: formValues.role,
      image: formValues.image,
      model: formValues.model,
      skills: formValues.skills,
      mcpTools: formValues.mcpTools,
      status: formValues.isActive ? "Active" : "Inactive",
      createdAt: agent?.createdAt || new Date().toISOString(),
    };

    if (agent) {
      updateAgent({ id: agent.id, ...payload });
    } else {
      createAgent(payload);
    }
  };

  const toggleSelection = (
    current: string[],
    value: string,
    onChange: (next: string[]) => void
  ) => {
    if (current.includes(value)) {
      onChange(current.filter((item) => item !== value));
    } else {
      onChange([...current, value]);
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <HookFormPFTextInput
        control={control}
        name="name"
        label={t("terms.name")}
        fieldId="agent-name"
        isRequired
      />
      <HookFormPFTextArea
        control={control}
        name="prompt"
        label="Agent prompt"
        fieldId="agent-prompt"
      />
      <Flex gap={{ default: "gapMd" }}>
        <FlexItem grow={{ default: "grow" }}>
          <HookFormPFGroupController
            control={control}
            name="role"
            label="Role"
            fieldId="agent-role-select"
            isRequired
            renderInput={({ field: { value, name, onChange } }) => (
              <SimpleSelect
                toggleId="agent-role-select-toggle"
                toggleAriaLabel="Agent role select dropdown toggle"
                ariaLabel={name}
                value={value}
                options={roleOptions}
                onSelect={(selection) => onChange(selection ?? "")}
              />
            )}
          />
        </FlexItem>
        <FlexItem grow={{ default: "grow" }}>
          <HookFormPFGroupController
            control={control}
            name="image"
            label="Image"
            fieldId="agent-image-select"
            isRequired
            renderInput={({ field: { value, name, onChange } }) => (
              <SimpleSelect
                toggleId="agent-image-select-toggle"
                toggleAriaLabel="Agent image select dropdown toggle"
                ariaLabel={name}
                value={value}
                options={imageOptions}
                onSelect={(selection) => onChange(selection ?? "")}
              />
            )}
          />
        </FlexItem>
      </Flex>
      <HookFormPFGroupController
        control={control}
        name="model"
        label="Model"
        fieldId="agent-model-select"
        isRequired
        renderInput={({ field: { value, name, onChange } }) => (
          <SimpleSelect
            toggleId="agent-model-select-toggle"
            toggleAriaLabel="Agent model select dropdown toggle"
            ariaLabel={name}
            value={value}
            options={modelOptions}
            onSelect={(selection) => onChange(selection ?? "")}
          />
        )}
      />
      <HookFormPFGroupController
        control={control}
        name="skills"
        label="Skills"
        fieldId="agent-skills-select"
        renderInput={({ field: { value, name, onChange } }) => (
          <MultiSelect
            toggleId="agent-skills-select-toggle"
            toggleAriaLabel="Agent skills select dropdown toggle"
            aria-label={name}
            placeholderText="Select skills..."
            values={value}
            hasChips
            options={skillOptions}
            onSelect={(selection) => {
              if (!selection) return;
              toggleSelection(value, selection, onChange);
            }}
            onClear={() => onChange([])}
          />
        )}
      />
      <HookFormPFGroupController
        control={control}
        name="mcpTools"
        label="MCP tools"
        fieldId="agent-mcp-tools-select"
        renderInput={({ field: { value, name, onChange } }) => (
          <MultiSelect
            toggleId="agent-mcp-tools-select-toggle"
            toggleAriaLabel="Agent MCP tools select dropdown toggle"
            aria-label={name}
            placeholderText="Select MCP tools..."
            values={value}
            hasChips
            options={mcpToolOptions}
            onSelect={(selection) => {
              if (!selection) return;
              toggleSelection(value, selection, onChange);
            }}
            onClear={() => onChange([])}
          />
        )}
      />
      <Controller
        control={control}
        name="isActive"
        render={({ field: { onChange, value, name } }) => (
          <Switch
            id="agent-status-switch"
            name={name}
            label={value ? "Active" : "Inactive"}
            isChecked={value}
            onChange={(_, checked) => onChange(checked)}
          />
        )}
      />
      <ActionGroup>
        <Button
          type="submit"
          id="submit"
          aria-label="submit"
          variant={ButtonVariant.primary}
          isDisabled={!isValid || isSubmitting || isValidating || !isDirty}
        >
          {!agent ? t("actions.create") : t("actions.save")}
        </Button>
        <Button
          type="button"
          id="cancel"
          aria-label="cancel"
          variant={ButtonVariant.link}
          isDisabled={isSubmitting || isValidating}
          onClick={onClose}
        >
          {t("actions.cancel")}
        </Button>
      </ActionGroup>
    </Form>
  );
};
