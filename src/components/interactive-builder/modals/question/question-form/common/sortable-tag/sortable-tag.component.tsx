import React from 'react';
import { Tag } from '@carbon/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import styles from './sortable-tag.scss';
import { Draggable } from '@carbon/react/icons';

interface SortableTagProps {
  id: string;
  text: string;
  onDelete?: () => void;
}

export const SortableTag: React.FC<SortableTagProps> = ({ id, text, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const dynamicStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={dynamicStyle} className={styles.sortableTagWrapper}>
      <div {...attributes} {...listeners} className={styles.dragHandle}>
        <Draggable />
      </div>
      <Tag className={`${styles.sortableTag} ${isDragging ? styles.dragging : ''}`} type="blue">
        {text}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={styles.conceptAnswerButton}
          >
            X
          </button>
        )}
      </Tag>
    </div>
  );
};
