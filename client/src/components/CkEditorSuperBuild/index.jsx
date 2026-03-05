import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import SuperBuild from 'ckeditor5-custom-build/build/ckeditor';
import './ckEditor.css'
import { removeTitle } from '../../util/nameFilter';

const CkEditorSuperBuild = ({ placeholder, mentionArray, valueState, handleChange, handlePaste, editorId }) => {
  const mentionFeed = mentionArray.map(user => ({
    id: `@${removeTitle(user.full_name)}`,
    userId: user._id, 
  }));
  
  return (
    <div id={editorId} key={editorId}>
      <CKEditor
        id={editorId}
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
