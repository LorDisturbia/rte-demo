import { schema } from "prosemirror-schema-basic";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { exampleSetup } from "prosemirror-example-setup";
import { useEffect } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const doc = new Y.Doc();
const docState = {
  content: doc.getText("content"),
};

const wsProvider = new WebsocketProvider(
  "wss://192.168.249.63:1234",
  "Follow LorDisturbia",
  doc
);

wsProvider.on("status", (event: any) => {
  console.log(`Websocket status: ${event.status}`);
});

export const Editor = () => {
  useEffect(() => {
    const state =
      // docState.content.toString() !== ""
      // ? EditorState.fromJSON({ schema }, JSON.parse(sharedState.toString()))
      // :
      EditorState.create({
        schema,
        // plugins: exampleSetup({ schema }),
      });

    const view = new EditorView(document.getElementById("editor"), {
      state,
      dispatchTransaction: (transaction: Transaction) => {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        console.log(
          "EditorChange:",
          "\nYjs:\t",
          docState.content.toString() || "<empty>",
          "\nDoc:\t",
          view.state.doc.textContent || "<empty>"
        );

        transaction.steps.forEach((step) => {
          const jsonStep = step.toJSON();
          console.log(`Sending update: ${JSON.stringify(jsonStep)}`);
          switch (jsonStep.stepType) {
            case "replace":
              const delta = [];

              if (jsonStep.from > 0) {
                delta.push({
                  retain: jsonStep.from - 1,
                });
              }

              if (jsonStep.slice && jsonStep.slice.content[0].text) {
                delta.push({
                  insert: jsonStep.slice.content[0].text,
                });
              }

              if (jsonStep.to - jsonStep.from >= 0) {
                delta.push({
                  delete: jsonStep.to - jsonStep.from,
                });
              }

              docState.content.applyDelta(delta);
              break;
          }
        });
      },
    });

    const observe = (event: Y.YTextEvent) => {
      // if (docState.content.toString() === "") return;
      if (docState.content.toString() === view.state.doc.textContent) return;

      const transaction = view.state.tr.replaceWith(
        0,
        view.state.doc.content.size,
        docState.content.toString() !== ""
          ? [state.schema.text(docState.content.toString())]
          : []
      );
      const newState = view.state.apply(transaction);
      view.updateState(newState);
      console.log(
        "YjsChange:",
        "\nYjs:\t",
        docState.content.toString() || "<empty>",
        "\nDoc:\t",
        view.state.doc.textContent || "<empty>"
      );
    };

    docState.content.observe(observe);

    // The focus is lost on rerender so it needs to be manually restored
    view.focus();

    return () => {
      view.destroy();
      docState.content.unobserve(observe);
    };
  }, []);

  return (
    <div>
      <h1>Editor</h1>
      <div id="editor" />
    </div>
  );
};
