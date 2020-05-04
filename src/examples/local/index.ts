import Quill, { Sources } from "quill";
import Delta from "quill-delta";
import { v4 as uuid } from "uuid";

const editorA = new Quill(document.getElementById("editor-a") as Element, {
  theme: "snow"
});
const editorB = new Quill(document.getElementById("editor-b") as Element, {
  theme: "snow"
});

interface ServerAdapter {
  onConnect(handler: (clientId: string) => void): void;
  sendAck(clientId: string): void;
  broadcastOperation(excludedClientId: string, operation: Delta): void;
  sendDocument(clientId: string, document: Delta, revision: number): void;
  onReceiveClientOperation(
    handler: (clientId: string, operation: Delta, revision: number) => void
  ): void;
}

class Server {
  document: Delta;
  operations: Delta[];
  adapter: ServerAdapter;

  constructor(document: Delta, adapter: ServerAdapter) {
    this.document = document;
    this.operations = [];
    this.adapter = adapter;

    this.adapter.onConnect(this.handleConnect);
    this.adapter.onReceiveClientOperation(this.handleReceiveClientOperation);
  }

  handleConnect = (clientId: string) => {
    this.adapter.sendDocument(clientId, this.document, this.currentRevision());
  };

  handleReceiveClientOperation = (
    clientId: string,
    operation: Delta,
    revision: number
  ) => {
    const concurrentOperations = this.operations.slice(revision - 1);
    operation = concurrentOperations.reduce(
      (op, co) => co.transform(op, true),
      operation
    );

    this.document = this.document.compose(operation);
    this.operations.push(operation);
    this.adapter.sendAck(clientId);
    this.adapter.broadcastOperation(clientId, operation);
  };

  currentRevision() {
    return this.operations.length;
  }
}

interface ClientAdapter {
  connect(clientId: string): void;
  onReceiveDocument(handler: (document: Delta, revision: number) => void): void;
  sendOperation(clientId: string, operation: Delta, revision: number): void;
  onReceiveAck(handler: () => void): void;
  onReceiveServerOperation(handler: (operation: Delta) => void): void;
}

class Client {
  id: string;
  editor: Quill;
  adapter: ClientAdapter;
  document: Delta;
  revision: number;
  outstanding: Delta | undefined = undefined;
  buffer: Delta | undefined = undefined;

  constructor(editor: Quill, adapter: ClientAdapter) {
    this.id = uuid();
    this.editor = editor;
    this.adapter = adapter;
    this.document = new Delta();
    this.revision = 0;

    this.editor.disable();
    this.editor.on("text-change", this.handleEditorTextChange);

    this.adapter.onReceiveDocument(this.handleReceiveDocumennt);
    this.adapter.onReceiveAck(this.handleReceiveAck);
    this.adapter.onReceiveServerOperation(this.handleReceiveOperation);

    this.adapter.connect(this.id);
  }

  handleEditorTextChange = (
    operation: Delta,
    oldContents: Delta,
    source: Sources
  ) => {
    if (source === "user") {
      if (!this.outstanding) {
        this.sendOperation(operation);
      } else if (!this.buffer) {
        this.buffer = operation;
      } else {
        this.buffer = this.buffer.compose(operation);
      }
    }
  };

  handleReceiveDocumennt = (document: Delta, revision: number) => {
    this.revision = revision;
    this.document = document;
    this.editor.updateContents(document, "api");
    this.editor.enable();
  };

  handleReceiveAck = () => {
    if (!this.outstanding) {
      return;
    }
    this.revision++;
    this.outstanding = undefined;

    if (this.buffer) {
      this.adapter.sendOperation(this.id, this.buffer, this.revision + 1);
      this.outstanding = this.buffer;
      this.buffer = undefined;
    }
  };

  handleReceiveOperation = (operation: Delta) => {
    this.applyServerOperation(operation);
  };

  private sendOperation(operation: Delta) {
    this.adapter.sendOperation(this.id, operation, this.revision + 1);
    this.outstanding = operation;
  }

  private applyServerOperation(operation: Delta) {
    if (this.outstanding) {
      const newOutstanding = operation.transform(this.outstanding, true);
      operation = this.outstanding.transform(operation, false);
      this.outstanding = newOutstanding;

      if (this.buffer) {
        const newBuffer = operation.transform(this.buffer, true);
        operation = this.buffer.transform(operation, false);
        this.buffer = newBuffer;
      }
    }

    this.revision++;
    this.editor.updateContents(operation);
  }
}

const NOOP = () => {};

class LocalClientAdapter implements ClientAdapter {
  handleReceiveDocument: (document: Delta, revision: number) => void = NOOP;
  handleReceiveAck: () => void = NOOP;
  handleReceiveServerOperation: (operation: Delta) => void = NOOP;
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
  onReceiveAck(handler: () => void) {
    this.handleReceiveAck = handler;
  }
  onReceiveServerOperation(handler: (operation: Delta) => void) {
    this.handleReceiveServerOperation = handler;
  }
}

class LocalServerAdapter implements ServerAdapter {
  handleConnect: (clientId: string) => void = NOOP;
  handleReceiveClientOperation: (
    clientId: string,
    operation: Delta,
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
  sendDocument(clientId: string, document: Delta, revision: number) {
    this.clientAdapters[clientId]?.handleReceiveDocument(document, revision);
  }
  onReceiveClientOperation(
    handler: (clientId: string, operation: Delta, revision: number) => void
  ) {
    this.handleReceiveClientOperation = handler;
  }
}

const serverAdapter = new LocalServerAdapter();
const server = new Server(new Delta(), serverAdapter);

const clientAdapterA = new LocalClientAdapter(serverAdapter);
const clientA = new Client(editorA, clientAdapterA);

const clientAdapterB = new LocalClientAdapter(serverAdapter);
const clientB = new Client(editorB, clientAdapterB);
