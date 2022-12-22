# ProseMirror + Yjs = Real-Time Collaboration

This project is a PoC for adding RTE capabilities to a ProseMirror editor in a React App.

You can test the [demo](https://lordisturbia.github.io/rte-demo/) if you want to see it in action.

## Structure

The [client](./client) of the project is a simple React app. Everything interesting happens in the [Editor component](./client/Editor.tsx), where a ProseMirror editor is set up and its content is wired to a Yjs document.

Currently, the client is piggybacking on the backend used by the official ProseMirror + Yjs demo, but you can use a local server by simply:

- Changing the WebSocket hostname and port in [Editor.tsx](client/src/Editor.tsx) to `ws://localhost:1234`
- Running a server locally with `HOST=0.0.0.0 PORT=1234 YPERSISTENCE=./dbDir npx y-websocket` (you'll need a recent version of Node installed)

## Limitations

Mapping between ProseMirror and Yjs data structures is quite hard and time-consuming. Because of this, the PoC only offers very basic capabilities: no markup, and only one node of text. With some work, though, we're confident that it can be generalized to support more sophisticated use cases.

## Updating the demo

To update the demo just run `npm run deploy -- -m "<SOME COMMIT MESSAGE>"` from the `client` directory.
