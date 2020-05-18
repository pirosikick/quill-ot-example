import { RangeStatic } from "quill";
import Delta from "quill-delta";

export interface ClientAdapter {
  connect(clientId: string): void;
  onReceiveDocument(handler: (document: Delta, revision: number) => void): void;
  sendOperation(clientId: string, operation: Delta, revision: number): void;
  sendSelection(
    clientId: string,
    selection: RangeStatic | null,
    revision: number
  ): void;
  onReceiveAck(handler: () => void): void;
  onReceiveServerOperation(handler: (operation: Delta) => void): void;
  onReceiveServerSelection(
    handler: (clientId: string, selection: RangeStatic | null) => void
  ): void;
}

export interface ServerAdapter {
  onConnect(handler: (clientId: string) => void): void;
  sendAck(clientId: string): void;
  broadcastOperation(excludedClientId: string, operation: Delta): void;
  broadcastSelection(
    excludedClientId: string,
    selection: RangeStatic | null
  ): void;
  sendDocument(clientId: string, document: Delta, revision: number): void;
  onReceiveClientOperation(
    handler: (clientId: string, operation: Delta, revision: number) => void
  ): void;
  onReceiveClientSelection(
    handler: (
      clientId: string,
      selection: RangeStatic | null,
      revision: number
    ) => void
  ): void;
}

export interface SelectionRenderer {
  renderSelection(clientId: string, selection: RangeStatic | null): void;
}
