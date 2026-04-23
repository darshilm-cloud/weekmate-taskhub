import React, { useMemo } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import SuperBuild from 'ckeditor5-custom-build/build/ckeditor';
import './ckEditor.css'
import { removeTitle } from '../../util/nameFilter';

const CkEditorSuperBuild = ({
  placeholder,
  mentionArray = [],
  valueState,
  handleChange,
  handlePaste,
  editorId,
}) => {
  const safeMentionArray = Array.isArray(mentionArray) ? mentionArray : [];

  const mentionFeed = useMemo(
    () =>
      safeMentionArray
        .filter((user) => user?._id && user?.full_name)
        .map((user) => {
          const mentionLabel = removeTitle(user.full_name).trim();

          return {
            id: `@${mentionLabel}`,
            text: `@${mentionLabel}`,
            name: user.full_name,
            userId: user._id,
          };
        }),
    [safeMentionArray]
  );

  const mentionFeedKey = useMemo(
    () => mentionFeed.map((user) => `${user.userId}:${user.id}`).join("|"),
    [mentionFeed]
  );

  const resolvedEditorId = editorId || "ck-editor-super-build";
  
  return (
    <div id={resolvedEditorId}>
      <CKEditor
        key={`${resolvedEditorId}-${mentionFeedKey}`}
        id={resolvedEditorId}
        onPaste={handlePaste}
        editor={SuperBuild}
        data={valueState}
        config={{
          placeholder: placeholder,
          toolbar: [
            'heading',
            '|',
            'bold',
            'italic',
            'underline',
            '|',
            'fontColor',
            'fontBackgroundColor',
            '|',
            'link',
            '|',
            'numberedList',
            'bulletedList',
            '|',
            'alignment:left',
            'alignment:center',
            'alignment:right',
            '|',
            'fontSize',
            '|',
            'print',
          ],
          fontSize: {
            options: [
              'default',
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
            ],
          },
          mention: {
            feeds: [
              {
                marker: '@',
                feed: mentionFeed,
                minimumCharacters: 0,
              },
            ],
          },
        }}
        onChange={handleChange}
      />
    </div>
  );
};

export default CkEditorSuperBuild;
