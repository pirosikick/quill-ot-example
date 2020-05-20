import Quill, { RangeStatic } from "quill";
import { SelectionRenderer } from "./interfaces";

export default class SimpleSelectionRenderer implements SelectionRenderer {
  editor: Quill;
  container: HTMLElement;
  selections: Record<string, HTMLElement>;

  constructor(editor: Quill, container: HTMLElement = document.body) {
    this.editor = editor;
    this.container = container;
    this.selections = {};
  }

  renderSelection(clientId: string, selection: RangeStatic | null) {
    if (!this.selections[clientId]) {
      this.selections[clientId] = this.createSelectionElement(clientId);
    }

    if (selection) {
      const bounds = this.editor.getBounds(selection.index, selection.length);
      const root = this.editor.root.getBoundingClientRect();
      this.selections[clientId].style.display = "block";
      this.selections[clientId].style.top = `${root.top + bounds.top}px`;
      this.selections[clientId].style.left = `${root.left + bounds.left}px`;
      this.selections[clientId].style.width = bounds.width
        ? `${bounds.width}px`
        : "1px";
      this.selections[clientId].style.height = `${bounds.height}px`;
    } else {
      this.hideSelectionElement(clientId);
    }
  }

  private createSelectionElement(clientId: string) {
    const div = document.createElement("div");
    div.title = clientId;
    div.style.position = "fixed";
    const h = rangeRandom(0, 360);
    const l = rangeRandom(25, 50);
    div.style.backgroundColor = `hsl(${h}, 100%, ${l}%)`;
    div.style.opacity = "0.5";

    this.container.appendChild(div);

    return div;
  }

  private hideSelectionElement(clientId: string) {
    if (this.selections[clientId]) {
      this.selections[clientId].style.display = "none";
    }
  }
}

const rangeRandom = (min: number, max: number) => {
  return Math.random() * (max - min + 1) + min;
};
