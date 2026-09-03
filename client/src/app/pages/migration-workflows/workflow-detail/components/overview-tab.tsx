import * as React from "react";
import {
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Flex,
  FlexItem,
  Label,
} from "@patternfly/react-core";

import { Agent, MigrationWorkflow } from "@app/api/models";

import { AGENT_MODELS } from "../../../agents/agent-catalog";

const modelLabel = (modelValue: string) => {
  const model = AGENT_MODELS.find((m) => m.value === modelValue);
  return model ? `${model.label} (${model.provider})` : modelValue;
};

export const OverviewTab: React.FC<{
  workflow: MigrationWorkflow;
  agents: Agent[];
}> = ({ workflow, agents }) => {
  return (
    <Flex direction={{ default: "column" }} gap={{ default: "gapXl" }}>
      <FlexItem>
        <Card>
          <CardBody>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>Owner</DescriptionListTerm>
                <DescriptionListDescription>
                  {workflow.owner?.name ?? (
                    <Content component="small">Unassigned</Content>
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Goal</DescriptionListTerm>
                <DescriptionListDescription>{workflow.goal}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Save lessons learned</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label color={workflow.saveLessonsLearned ? "green" : "grey"} isCompact>
                    {workflow.saveLessonsLearned ? "Yes" : "No"}
                  </Label>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Auto-create PR</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label color={workflow.autoCreatePR ? "green" : "grey"} isCompact>
                    {workflow.autoCreatePR ? "Yes" : "No"}
                  </Label>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Created</DescriptionListTerm>
                <DescriptionListDescription>
                  {new Date(workflow.createdAt).toLocaleString()}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </FlexItem>
      <FlexItem>
        <Divider />
      </FlexItem>
      <FlexItem>
        <Content component="h3">Stages</Content>
        <Flex direction={{ default: "column" }} gap={{ default: "gapSm" }}>
          {workflow.stages.map((stage, index) => {
            const agent = agents.find((a) => a.id === stage.agentId);
            return (
              <Card key={stage.id} isCompact>
                <CardBody>
                  <Flex
                    alignItems={{ default: "alignItemsCenter" }}
                    justifyContent={{ default: "justifyContentSpaceBetween" }}
                  >
                    <FlexItem>
                      <Content component="p">
                        <strong>
                          {index + 1}. {stage.name}
                        </strong>
                      </Content>
                      {stage.description && (
                        <Content component="small">{stage.description}</Content>
                      )}
                    </FlexItem>
                    <FlexItem>
                      <Flex gap={{ default: "gapSm" }}>
                        <FlexItem>
                          <Label color="blue" isCompact>
                            {agent ? agent.name : "Unassigned agent"}
                          </Label>
                        </FlexItem>
                        {agent && (
                          <FlexItem>
                            <Label color="purple" isCompact>
                              {modelLabel(agent.model)}
                            </Label>
                          </FlexItem>
                        )}
                        {stage.requiresApproval && (
                          <FlexItem>
                            <Label color="orange" isCompact>
                              Requires approval
                            </Label>
                          </FlexItem>
                        )}
                      </Flex>
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>
            );
          })}
        </Flex>
      </FlexItem>
    </Flex>
  );
};
