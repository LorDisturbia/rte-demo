import { schema } from "prosemirror-schema-basic";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { exampleSetup } from "prosemirror-example-setup";

import { useEffect, useState } from "react";

export const Editor = () => {
  const [value, setValue] = useState<EditorState | undefined>(undefined);

  useEffect(() => {
    const state =
      value ??
      EditorState.create({
        schema,
        plugins: exampleSetup({ schema }),
      });

    const view = new EditorView(document.getElementById("editor"), {
      state,
      dispatchTransaction: (transaction: Transaction) => {
        setValue(view.state.apply(transaction));
      },
    });

    // The focus is lost on rerender so it needs to be manually restored
    view.focus();

    return () => {
      view.destroy();
    };
  }, [value]);

  return (
    <div>
      <h1>Editor</h1>
      <div id="editor" />
    </div>
  );
};
