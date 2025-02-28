import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Tag, MultiSelect, Stack } from '@carbon/react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';

import type { Concept } from '@types';
import { useFormField } from '../../../../form-field-context';
import ConceptSearch from '../../../common/concept-search/concept-search.component';
import { SortableTag } from '../../../common/sortable-tag/sortable-tag.component';

import styles from './select-answers.scss';
interface AnswerItem {
  id: string;
  text: string;
}

const SelectAnswers: React.FC = () => {
  const { t } = useTranslation();
  const { formField, concept, setFormField } = useFormField();
  const [addedAnswers, setAddedAnswers] = useState<AnswerItem[]>([]);

  useEffect(() => {
    if (!concept) {
      setAddedAnswers([]);
    }
  }, [concept]);

  const selectedAnswers = useMemo(
    () =>
      formField.questionOptions?.answers?.map((answer) => ({
        id: answer.concept,
        text: answer.label,
      })) ?? [],
    [formField.questionOptions?.answers],
  );

  const handleSelectAnswers = useCallback(
    ({ selectedItems }: { selectedItems: Array<AnswerItem> }) => {
      const mappedAnswers = selectedItems.map((answer) => ({
        concept: answer.id,
        label: answer.text,
      }));

      setFormField((prevField) => {
        const currentAnswers = prevField.questionOptions?.answers || [];
        if (JSON.stringify(currentAnswers) === JSON.stringify(mappedAnswers)) {
          return prevField;
        }
        return {
          ...prevField,
          questionOptions: {
            ...prevField.questionOptions,
            answers: mappedAnswers,
          },
        };
      });
    },
    [setFormField],
  );

  const handleSelectAdditionalAnswer = useCallback(
    (concept: Concept) => {
      const newAnswer = { id: concept.uuid, text: concept.display };
      const answerExistsInSelected = selectedAnswers.some((answer) => answer.id === newAnswer.id);
      const answerExistsInAdded = addedAnswers.some((answer) => answer.id === newAnswer.id);
      if (!answerExistsInSelected && !answerExistsInAdded) {
        setAddedAnswers((prevAnswers) => [...prevAnswers, newAnswer]);
        setFormField((prevFormField) => {
          const existingAnswers = prevFormField.questionOptions?.answers ?? [];
          existingAnswers.push({ concept: concept.uuid, label: concept.display });
          return {
            ...prevFormField,
            questionOptions: {
              ...prevFormField.questionOptions,
              answers: existingAnswers,
            },
          };
        });
      }
    },
    [selectedAnswers, addedAnswers, setFormField],
  );

  const handleDeleteAdditionalAnswer = useCallback(
    (id: string) => {
      setAddedAnswers((prevAnswers) => prevAnswers.filter((answer) => answer.id !== id));
      setFormField((prevFormField) => {
        const selectedAnswers = prevFormField.questionOptions?.answers ?? [];
        return {
          ...prevFormField,
          questionOptions: {
            ...prevFormField.questionOptions,
            answers: selectedAnswers.filter((answer) => answer.concept !== id),
          },
        };
      });
    },
    [setFormField],
  );

  const answerItems = useMemo(() => {
    // Convert answers from the concept to items format
    const conceptAnswerItems =
      concept?.answers?.map((answer) => ({
        id: answer.uuid,
        text: answer.display,
      })) ?? [];

    const formFieldAnswers = formField.questionOptions?.answers ?? [];

    // If no answers from concept but we have form field answers, use those
    if (conceptAnswerItems.length === 0 && formFieldAnswers.length > 0) {
      return formFieldAnswers.map((answer) => ({
        id: answer.concept,
        text: answer.label,
      }));
    }

    // Merge concept answers with any additional form field answers
    const additionalAnswers = formFieldAnswers
      .filter((answer) => !conceptAnswerItems.some((item) => item.id === answer.concept))
      .map((answer) => ({
        id: answer.concept,
        text: answer.label,
      }));

    return [...conceptAnswerItems, ...additionalAnswers];
  }, [concept?.answers, formField.questionOptions?.answers]);

  const convertAnswerItemsToString = useCallback((item: AnswerItem) => item.text, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      if (active.id !== over.id) {
        setFormField((prevFormField) => {
          const currentAnswers = prevFormField.questionOptions?.answers ?? [];
          const oldIndex = currentAnswers.findIndex((a) => a.concept === active.id);
          const newIndex = currentAnswers.findIndex((a) => a.concept === over.id);
          if (oldIndex === -1 || newIndex === -1) return prevFormField;

          const reordered = arrayMove(currentAnswers, oldIndex, newIndex);
          return {
            ...prevFormField,
            questionOptions: {
              ...prevFormField.questionOptions,
              answers: reordered,
            },
          };
        });
      }
    },
    [setFormField],
  );

  return (
    <Stack gap={5}>
      {answerItems.length > 0 && (
        <MultiSelect
          className={styles.multiSelect}
          direction="top"
          id="selectAnswers"
          items={answerItems}
          itemToString={convertAnswerItemsToString}
          onChange={handleSelectAnswers}
          size="md"
          selectedItems={selectedAnswers}
          titleText={t('selectAnswersToDisplay', 'Select answers to display')}
        />
      )}

      {selectedAnswers.length > 0 && (
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext items={selectedAnswers} strategy={verticalListSortingStrategy}>
            <div>
              {selectedAnswers.map((answer) => (
                <SortableTag key={answer.id} id={answer.id} text={answer.text} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {concept && concept.datatype?.name === 'Coded' && (
        <>
          <ConceptSearch
            label={t('searchForAnswerConcept', 'Search for a concept to add as an answer')}
            onSelectConcept={handleSelectAdditionalAnswer}
          />
          {addedAnswers.length > 0 && (
            <div>
              {addedAnswers.map((answer) => (
                <Tag className={styles.tag} key={answer.id} type="blue">
                  {answer.text}
                  <button
                    className={styles.conceptAnswerButton}
                    onClick={() => handleDeleteAdditionalAnswer(answer.id)}
                  >
                    X
                  </button>
                </Tag>
              ))}
            </div>
          )}
        </>
      )}
    </Stack>
  );
};

export default SelectAnswers;
