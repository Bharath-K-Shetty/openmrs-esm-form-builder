import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tag, MultiSelect, Stack, InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import ConceptSearch from '../../../common/concept-search/concept-search.component';
import { useFormField } from '../../../../form-field-context';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { Concept } from '@types';
import styles from './select-answers.scss';

interface AnswerItem {
  id: string;
  text: string;
}

const SelectAnswers: React.FC = () => {
  const { t } = useTranslation();
  const { formField, concept, setFormField } = useFormField();
  const [addedAnswers, setAddedAnswers] = useState<AnswerItem[]>([]);
  const [invalidAnswerFound, setInvalidAnswerFound] = useState(false);

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

    const formFieldAnswerLabelsMap = new Map(formFieldAnswers.map((answer) => [answer.concept, answer.label]));

    const answersFromConceptWithLabelsFromFormField = conceptAnswerItems.map((item) => ({
      id: item.id,
      text: formFieldAnswerLabelsMap.get(item.id) ?? item.text,
    }));

    const additionalAnswers = formFieldAnswers
      .filter((answer) => !conceptAnswerItems.some((item) => item.id === answer.concept))
      .map((answer) => ({
        id: answer.concept,
        text: answer.label,
      }));

    return [...answersFromConceptWithLabelsFromFormField, ...additionalAnswers];
  }, [concept?.answers, formField.questionOptions?.answers]);

  useEffect(() => {
    if (!concept?.answers?.length) return;
    const validateAnswers = async () => {
      if (!answerItems.length) {
        setInvalidAnswerFound(false);
        return;
      }

      const originalAnswerIds = new Set(concept?.answers?.map((ans) => ans.uuid) || []);

      let allValid = true;
      const lookupCache = new Map<string, boolean>();
      const uniqueAnswers = Array.from(new Map(answerItems.map((a) => [a.id, a])).values());

      for (const answer of uniqueAnswers) {
        if (originalAnswerIds.has(answer.id)) {
          continue;
        } else {
          const url = `${restBaseUrl}/concept/${answer.id}?v=full`;
          try {
            const res = await openmrsFetch(url);
            const isValid = res?.data?.uuid === answer.id;

            lookupCache.set(answer.id, isValid);
            if (!isValid) {
              allValid = false;
              break;
            }
          } catch (error) {
            allValid = false;
            break;
          }
        }
      }
      setInvalidAnswerFound(!allValid);
    };

    validateAnswers();
  }, [answerItems, concept]);

  const convertAnswerItemsToString = useCallback((item: AnswerItem) => item.text, []);

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
        <div>
          {selectedAnswers.map((answer) => (
            <Tag className={styles.tag} key={answer.id} type={'blue'}>
              {answer.text}
            </Tag>
          ))}
        </div>
      )}

      {/* Display an inline notification if any answer fails validation */}
      {invalidAnswerFound && (
        <InlineNotification
          kind="error"
          lowContrast
          className={styles.error}
          title={t('invalidAnswerConcept', 'Invalid Answer Concept Detected')}
          subtitle={t('answerConceptValidation', 'One or more selected answer concepts do not exist in the system. ')}
        />
      )}

      {concept && concept.datatype?.name === 'Coded' && (
        <>
          <ConceptSearch
            label={t('searchForAnswerConcept', 'Search for a concept to add as an answer')}
            onSelectConcept={handleSelectAdditionalAnswer}
          />
          {addedAnswers.length > 0 ? (
            <div>
              {addedAnswers.map((answer) => (
                <Tag className={styles.tag} key={answer.id} type={'blue'}>
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
          ) : null}{' '}
        </>
      )}
    </Stack>
  );
};

export default SelectAnswers;
