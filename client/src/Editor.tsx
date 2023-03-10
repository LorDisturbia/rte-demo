import { schema } from "prosemirror-schema-basic";
import { EditorState, TextSelection, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { exampleSetup } from "prosemirror-example-setup";
import { useEffect, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const doc = new Y.Doc();
const remoteDoc = new Y.Doc();
const docState = {
  content: doc.getText("content"),
};

const isLocal = window.location.hostname === "localhost";

const wsProvider = new WebsocketProvider(
  isLocal ? "ws://192.168.1.146:1234" : "wss://demos.yjs.dev/prosemirror-demo",
  "test5",
  remoteDoc
);

const pmAttributeToYjsAttribute = (attribute: string) => {
  switch (attribute) {
    case "strong":
      return "bold";
    case "em":
      return "italic";
    case "code":
      return "monospace";
    default:
      return attribute;
  }
};

const yjsAttributeToPmAttribute = (attribute: string) => {
  switch (attribute) {
    case "bold":
      return "strong";
    case "italic":
      return "em";
    case "monospace":
      return "code";
    default:
      return attribute;
  }
};

const getSliceContent = (slice: any) => {
  if (slice.content) {
    return slice.content.map((node: any) => {
      if (node.text) {
        return node.text as string;
      }
      return getSliceContent(node);
    });
  }
  return "";
};

const syncDocuments = () => {
  const localState = Y.encodeStateVector(doc);
  const remoteState = Y.encodeStateVector(remoteDoc);
  const localDiff = Y.encodeStateAsUpdate(doc, remoteState);
  const remoteDiff = Y.encodeStateAsUpdate(remoteDoc, localState);
  Y.applyUpdate(doc, remoteDiff);
  Y.applyUpdate(remoteDoc, localDiff);
};

export const Editor = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    wsProvider.on("status", (event: any) => {
      setIsConnected(event.status === "connected");
      console.log(event.status);
      syncDocuments();
    });
  }, []);

  useEffect(() => {
    const state = EditorState.create({
      schema,
      plugins: exampleSetup({ schema }),
    });

    const view = new EditorView(document.getElementById("editor"), {
      state,
      dispatchTransaction: (transaction: Transaction) => {
        const newState = view.state.apply(transaction);

        console.log(
          (transaction as any).curSelection.$from.pos,
          (transaction as any).curSelection.$to.pos
        );
        view.updateState(newState);
        console.log(
          "EditorChange:",
          "\nYjs:\t",
          docState.content.toString() || "<empty>",
          "\nDoc:\t",
          view.state.doc.textContent || "<empty>"
        );

        doc.transact(() => {
          transaction.steps.forEach((step) => {
            const jsonStep = step.toJSON();

            const delta: any[] = [];
            switch (jsonStep.stepType) {
              case "replace":
                if (jsonStep.from > 1) {
                  delta.push({
                    retain: jsonStep.from - 1,
                  });
                }
                const sliceContent =
                  jsonStep.slice && getSliceContent(jsonStep.slice)[0];
                if (sliceContent) {
                  delta.push({
                    insert: sliceContent,
                  });
                }

                if (jsonStep.to - jsonStep.from > 0) {
                  delta.push({
                    delete: jsonStep.to - jsonStep.from,
                  });
                }

                break;
              case "addMark":
                delta.push(
                  {
                    retain: jsonStep.from - 1,
                  },
                  {
                    retain: jsonStep.to - jsonStep.from,
                    attributes: {
                      [pmAttributeToYjsAttribute(jsonStep.mark.type)]: true,
                    },
                  }
                );
                break;
              case "removeMark":
                delta.push(
                  {
                    retain: jsonStep.from,
                  },
                  {
                    retain: jsonStep.to - jsonStep.from,
                    attributes: {
                      [pmAttributeToYjsAttribute(jsonStep.mark.type)]: false,
                    },
                  }
                );
                break;
            }
            console.log(
              "Doc change detected",
              "\nConverting the following step: ",
              jsonStep,
              "\nTo the following delta: ",
              delta
            );
            docState.content.applyDelta(delta);
          });
        });
      },
    });

    const observe = (event: Y.YTextEvent) => {
      syncDocuments();
      if (event instanceof Uint8Array) return;
      if (event.transaction.local) return;

      const transaction = view.state.tr;
      let currentPosition = 1;
      event.delta.forEach((step) => {
        let stepText: string | undefined;
        if (typeof step.insert === "string") {
          stepText = step.insert;
        } else if (step.insert instanceof Array) {
          stepText = step.insert[0];
        }

        if (step.retain) {
          for (const key in step.attributes) {
            const markStart = currentPosition;
            const markEnd = currentPosition + step.retain;
            if (step.attributes[key]) {
              transaction.addMark(
                markStart,
                markEnd,
                view.state.schema.marks[yjsAttributeToPmAttribute(key)].create()
              );
            } else {
              transaction.removeMark(
                markStart,
                markEnd,
                view.state.schema.marks[yjsAttributeToPmAttribute(key)].create()
              );
            }
          }

          currentPosition += step.retain;
        } else if (stepText) {
          transaction.insertText(stepText, currentPosition);
          currentPosition += stepText.length;
        } else if (step.delete) {
          const deleteEnd = Math.min(
            currentPosition + step.delete,
            view.state.doc.textContent.length + currentPosition + 1
          );
          transaction.delete(currentPosition, deleteEnd);
        }
      });

      // .replaceWith sets the selection to the end of the replaced range
      // so we need to reset it to the previous selection
      const previousSelection = view.state.selection;
      const resolvedAnchor = transaction.doc.resolve(previousSelection.anchor);
      const resolvedHead = transaction.doc.resolve(previousSelection.head);
      transaction.setSelection(new TextSelection(resolvedAnchor, resolvedHead));

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
    remoteDoc.on("update", observe);

    // The focus is lost on rerender so it needs to be manually restored
    view.focus();

    return () => {
      view.destroy();
      docState.content.unobserve(observe);
      remoteDoc.off("update", observe);
    };
  }, []);

  return (
    <div>
      <h1>{`Editor (${isConnected ? "Online" : "Offline"})`}</h1>
      <div id="editor" />
    </div>
  );
};
