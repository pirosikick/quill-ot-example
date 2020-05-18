import Quill, { RangeStatic } from "quill";
import Delta from "quill-delta";
import {
  Client,
  Server,
  ClientAdapter,
  ServerAdapter,
  SimpleSelectionRenderer
} from "@pirosikick/quill-ot-core";

const editorA = new Quill(document.getElementById("editor-a") as Element, {
  theme: "snow"
});
const editorB = new Quill(document.getElementById("editor-b") as Element, {
  theme: "snow"
});

const NOOP = () => {};

class LocalClientAdapter implements ClientAdapter {
  handleReceiveDocument: (document: Delta, revision: number) => void = NOOP;
  handleReceiveAck: () => void = NOOP;
  handleReceiveServerOperation: (operation: Delta) => void = NOOP;
  handleReceiveServerSelection: (
    clientId: string,
    selection: RangeStatic
  ) => void = NOOP;
  serverAdapter: LocalServerAdapter;

  constructor(serverAdapter: LocalServerAdapter) {
    this.serverAdapter = serverAdapter;
  }

  // overrides
  connect(clientId: string) {
    this.serverAdapter.addClientAdapter(clientId, this);
  }
  onReceiveDocument(handler: (document: Delta, revision: number) => void) {
    this.handleReceiveDocument = handler;
  }
  sendOperation(clientId: string, operation: Delta, revision: number) {
    console.log("clientAdapter.sendOperation", clientId, operation, revision);

    this.serverAdapter.handleReceiveClientOperation(
      clientId,
      operation,
      revision
    );
  }
  sendSelection(clientId: string, selection: RangeStatic, revision: number) {
    this.serverAdapter.handleReceiveClientSelection(
      clientId,
      selection,
      revision
    );
  }
  onReceiveAck(handler: () => void) {
    this.handleReceiveAck = handler;
  }
  onReceiveServerOperation(handler: (operation: Delta) => void) {
    this.handleReceiveServerOperation = handler;
  }
  onReceiveServerSelection(
    handler: (clientId: string, selection: RangeStatic) => void
  ) {
    this.handleReceiveServerSelection = handler;
  }
}

class LocalServerAdapter implements ServerAdapter {
  handleConnect: (clientId: string) => void = NOOP;
  handleReceiveClientOperation: (
    clientId: string,
    operation: Delta,
    revision: number
  ) => void = NOOP;
  handleReceiveClientSelection: (
    clientId: string,
    selection: RangeStatic,
    revision: number
  ) => void = NOOP;

  document: Delta = new Delta();
  clientAdapters: Record<string, LocalClientAdapter> = {};
  addClientAdapter(clientId: string, adapter: LocalClientAdapter) {
    this.clientAdapters[clientId] = adapter;
    this.handleConnect(clientId);
  }

  // overrides
  onConnect(handler: (clientId: string) => void) {
    this.handleConnect = handler;
  }
  sendAck(clientId: string) {
    console.log("serverAdapter.sendAck");

    if (this.clientAdapters[clientId]) {
      setTimeout(() => {
        console.log("call clientAdapter[clientId].handleReceiveAck");
        this.clientAdapters[clientId].handleReceiveAck();
      }, 0);
    }
  }
  broadcastOperation(excludedClientId: string, operation: Delta) {
    Object.entries(this.clientAdapters)
      .filter(([clientId]) => clientId !== excludedClientId)
      .forEach(([clientId, adapter]) => {
        adapter.handleReceiveServerOperation(operation);
      });
  }
  broadcastSelection(excludedClientId: string, selection: RangeStatic) {
    Object.entries(this.clientAdapters)
      .filter(([clientId]) => clientId !== excludedClientId)
      .forEach(([clientId, adapter]) => {
        adapter.handleReceiveServerSelection(excludedClientId, selection);
      });
  }
  sendDocument(clientId: string, document: Delta, revision: number) {
    this.clientAdapters[clientId]?.handleReceiveDocument(document, revision);
  }
  onReceiveClientOperation(
    handler: (clientId: string, operation: Delta, revision: number) => void
  ) {
    this.handleReceiveClientOperation = handler;
  }
  onReceiveClientSelection(
    handler: (
      clientId: string,
      selection: RangeStatic,
      revision: number
    ) => void
  ) {
    this.handleReceiveClientSelection = handler;
  }
}

const serverAdapter = new LocalServerAdapter();
const server = new Server(new Delta(), serverAdapter);

const clientAdapterA = new LocalClientAdapter(serverAdapter);
const selectionRendererA = new SimpleSelectionRenderer(editorA);
const clientA = new Client(editorA, clientAdapterA, selectionRendererA);

const clientAdapterB = new LocalClientAdapter(serverAdapter);
const selectionRendererB = new SimpleSelectionRenderer(editorB);
const clientB = new Client(editorB, clientAdapterB, selectionRendererB);
