import { schema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import React, { useEffect } from "react";

export const Editor = () => {
  useEffect(() => {
    const state = EditorState.create({ schema });
    const view = new EditorView(document.getElementById("editor"), { state });
  }, []);

  return (
    <div>
      <h1>Editor</h1>
      <div id="editor" />
    </div>
  );
};
