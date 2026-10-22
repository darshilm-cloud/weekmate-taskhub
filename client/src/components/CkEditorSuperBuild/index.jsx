import React, { useMemo, useRef } from 'react';
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
  onEnterSubmit, // optional: chat-style editors send on Enter (Shift+Enter = new line)
}) => {
  // always call the latest handler (the editor itself is created once; see the mention feed below)
  const enterSubmitRef = useRef(onEnterSubmit);
  enterSubmitRef.current = onEnterSubmit;

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

  // The editor is created once. The mention list is read through a ref by a feed function, so
  // when the list arrives or changes (e.g. switching discussions) the editor is NOT torn down and
  // re-created - that briefly showed two editors and made the box flicker.
  const mentionFeedRef = useRef(mentionFeed);
  mentionFeedRef.current = mentionFeed;
  const feedFn = useRef((queryText) => {
    const q = `@${String(queryText || "")}`.toLowerCase();
    return mentionFeedRef.current.filter((item) => item.id.toLowerCase().includes(q));
  }).current;

  const resolvedEditorId = editorId || "ck-editor-super-build";
  
  return (
    <div id={resolvedEditorId}>
      <CKEditor
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
                feed: feedFn,
                minimumCharacters: 0,
              },
            ],
          },
        }}
        onChange={handleChange}
        onReady={(editor) => {
          if (!onEnterSubmit) return;
          // "enter" is not fired while the @mention list is open (it selects the user instead).
          editor.editing.view.document.on(
            "enter",
            (evt, data) => {
              if (data.isSoft) return; // Shift+Enter keeps its normal new-line behaviour
              data.preventDefault();
              evt.stop();
              enterSubmitRef.current?.();
            },
            { priority: "high" }
          );
        }}
      />
    </div>
  );
};

export default CkEditorSuperBuild;
