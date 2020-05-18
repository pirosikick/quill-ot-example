import { v4 as uuid } from "uuid";
import Delta from "quill-delta";
import transformRange from "./transformRange";

import type { Quill, RangeStatic, Sources } from "quill";
import type { ClientAdapter, SelectionRenderer } from "./interfaces";

class Client {
  id: string;
  editor: Quill;
  adapter: ClientAdapter;
  selectionRenderer: SelectionRenderer;
  document: Delta;
  revision: number;
  outstanding: Delta | undefined = undefined;
  buffer: Delta | undefined = undefined;

  constructor(
    editor: Quill,
    adapter: ClientAdapter,
    selectionRenderer: SelectionRenderer
  ) {
    this.id = uuid();
    this.editor = editor;
    this.adapter = adapter;
    this.selectionRenderer = selectionRenderer;
    this.document = new Delta();
    this.revision = 0;

    this.editor.disable();
    this.editor.on("text-change", this.handleEditorTextChange);
    this.editor.on("selection-change", this.handleEditorSelectionChange);

    this.adapter.onReceiveDocument(this.handleReceiveDocumennt);
    this.adapter.onReceiveAck(this.handleReceiveAck);
    this.adapter.onReceiveServerOperation(this.handleReceiveOperation);
    this.adapter.onReceiveServerSelection(this.handleReceiveSelection);

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

  handleEditorSelectionChange = (selection: RangeStatic) => {
    this.adapter.sendSelection(this.id, selection, this.revision);
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

  handleReceiveSelection = (
    clientId: string,
    selection: RangeStatic | null
  ) => {
    if (selection) {
      selection = this.transformSelection(selection);
    }
    this.selectionRenderer.renderSelection(clientId, selection);
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

  private transformSelection(selection: RangeStatic) {
    if (this.outstanding) {
      selection = transformRange(this.outstanding, selection);
      if (this.buffer) {
        selection = transformRange(this.buffer, selection);
      }
    }
    return selection;
  }
}

export default Client;
