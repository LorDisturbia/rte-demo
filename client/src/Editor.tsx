import { schema } from "prosemirror-schema-basic";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { exampleSetup } from "prosemirror-example-setup";
import { useEffect } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const doc = new Y.Doc();
const wsProvider = new WebsocketProvider(
  "ws://192.168.249.63:1234",
  "my-roomname",
  doc
);

wsProvider.on("status", (event: any) => {
  console.log(event.status);
});

export const Editor = () => {
  // Now a simple JSON stringified version of the editor state is stored in the sharedState
  // TODO: Figure out how to store the editor state as a Yjs type
  const sharedState = doc.getText("sharedState");

  useEffect(() => {
    const state =
      sharedState.toString() !== ""
        ? EditorState.fromJSON({ schema }, JSON.parse(sharedState.toString()))
        : EditorState.create({
            schema,
            // plugins: exampleSetup({ schema }),
          });

    const view = new EditorView(document.getElementById("editor"), {
      state,
      dispatchTransaction: (transaction: Transaction) => {
        const newState = view.state.apply(transaction);
        const jsonState = newState.toJSON();
        sharedState.delete(0, sharedState.length);
        sharedState.insert(0, JSON.stringify(jsonState));
        view.updateState(newState);
      },
    });

    const observe = (event: Y.YTextEvent) => {
      if (sharedState.toString() === "") return;
      console.log(sharedState.toString());
      view.updateState(
        EditorState.fromJSON({ schema }, JSON.parse(sharedState.toString()))
      );
    };

    sharedState.observe(observe);

    // The focus is lost on rerender so it needs to be manually restored
    view.focus();

    return () => {
      view.destroy();
      sharedState.unobserve(observe);
    };
  }, [sharedState]);

  return (
    <div>
      <h1>Editor</h1>
      <div id="editor" />
    </div>
  );
};
