import * as React from "react";
import { Modal, ModalBody, ModalHeader } from "@patternfly/react-core";

import { SkillCollection } from "@app/api/models";

import { SkillCollectionForm } from "./skill-collection-form";

export interface SkillCollectionFormModalProps {
  isOpen: boolean;
  skillCollection?: SkillCollection;
  skillCollections: SkillCollection[];
  onClose: () => void;
}

export const SkillCollectionFormModal: React.FC<
  SkillCollectionFormModalProps
> = ({ isOpen, skillCollection, skillCollections, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal id="skill-collection-modal" isOpen variant="medium" onClose={onClose}>
      <ModalHeader
        title={skillCollection ? "Edit skill collection" : "Create skill collection"}
      />
      <ModalBody>
        <SkillCollectionForm
          key={skillCollection?.id ?? 0}
          skillCollection={skillCollection ?? null}
          skillCollections={skillCollections}
          onClose={onClose}
        />
      </ModalBody>
    </Modal>
  );
};
