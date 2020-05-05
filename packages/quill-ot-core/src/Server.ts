import Delta from "quill-delta";
import type { ServerAdapter } from "./interfaces";

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

export default Server;
