import { useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView, Decoration, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentSelection, indentLess } from "@codemirror/commands";
import { indentUnit, syntaxTree, HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

interface EditorProps {
  content: string;
  onChange: (val: string) => void;
}

// Override the default highlight style to remove underlines from headings
const customHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, textDecoration: "none", fontWeight: "bold" },
  { tag: tags.heading1, textDecoration: "none", fontWeight: "bold" },
  { tag: tags.heading2, textDecoration: "none", fontWeight: "bold" },
  { tag: tags.heading3, textDecoration: "none", fontWeight: "bold" },
  { tag: tags.heading4, textDecoration: "none", fontWeight: "bold" },
  { tag: tags.heading5, textDecoration: "none", fontWeight: "bold" },
  { tag: tags.heading6, textDecoration: "none", fontWeight: "bold" },
]);

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
  },
  ".cm-content": {
    padding: "1.5rem 1.75rem",
    fontSize: "15px",
    lineHeight: "1.6",
    maxWidth: "48rem",
    margin: "0 auto",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-line": {
    padding: "0 0 0.1rem 0",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#e2a727",
  },
  // Hide markdown syntax that we're rendering visually
  ".cm-markdown-heading": {
    fontSize: "inherit",
    fontWeight: "inherit",
  },
  ".cm-markdown-bold": {
    fontWeight: "bold",
  },
  ".cm-markdown-italic": {
    fontStyle: "italic",
  },
  ".cm-markdown-strikethrough": {
    textDecoration: "line-through",
  },
});

class HideSyntaxWidget extends WidgetType {
  constructor() {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    // Use a zero-width space character to maintain cursor position
    // without affecting layout or creating phantom cursors
    span.textContent = "\u200B"; // Zero-width space
    span.style.color = "transparent";
    span.style.fontSize = "0";
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

class ImagePreviewWidget extends WidgetType {
  url: string;
  alt: string;

  constructor(url: string, alt: string) {
    super();
    this.url = url;
    this.alt = alt;
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "inline-block my-2 max-w-full";
    
    const img = document.createElement("img");
    img.src = this.url;
    img.alt = this.alt || "image";
    img.className = "max-w-full h-auto rounded border border-border";
    img.style.maxHeight = "400px";
    img.onerror = () => {
      img.style.display = "none";
      const errorSpan = document.createElement("span");
      errorSpan.className = "text-xs text-muted-foreground";
      errorSpan.textContent = `[Image: ${this.alt || this.url}]`;
      wrap.appendChild(errorSpan);
    };
    
    wrap.appendChild(img);
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

const markdownRenderPlugin = ViewPlugin.fromClass(
  class {
    decorations;
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }
    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      const tree = syntaxTree(view.state);
      
      for (const { from, to } of view.visibleRanges) {
        tree.iterate({
          from,
          to,
          enter(node) {
            const nodeName = node.name;
            const nodeFrom = node.from;
            const nodeTo = node.to;

            if (nodeName.startsWith("ATXHeading")) {
              const level = parseInt(nodeName.replace("ATXHeading", "")) || 1;

              let markerFrom = nodeFrom;
              let markerTo = nodeFrom;
              let contentFrom = nodeFrom;
              let contentTo = nodeTo;

              const headingText = view.state.doc.sliceString(nodeFrom, nodeTo);
              const markerMatch = /^(#{1,6})\s+/.exec(headingText);
              if (markerMatch) {
                markerTo = nodeFrom + markerMatch[0].length;
                contentFrom = markerTo;
                contentTo = nodeTo;
              }
              if (markerTo > markerFrom) {
                // Use mark instead of replace to hide syntax with CSS
                // This preserves cursor positions and prevents phantom cursors
                builder.add(
                  markerFrom,
                  markerTo,
                  Decoration.mark({
                    class: "cm-hidden-syntax",
                  })
                );
              }
              const headingSize = {
                1: "1.6rem",
                2: "1.35rem",
                3: "1.2rem",
                4: "1.1rem",
                5: "1.05rem",
                6: "1rem",
              }[level] || "1rem";
              
              if (contentTo > contentFrom) {
                builder.add(
                  contentFrom,
                  contentTo,
                  Decoration.mark({
                    class: "cm-markdown-heading",
                    attributes: { style: `font-size: ${headingSize}; font-weight: 600;` },
                  })
                );
              }
            }
            
            else if (nodeName === "StrongEmphasis") {
              const text = view.state.doc.sliceString(nodeFrom, nodeTo);
              const delimiterMatch = /^(\*\*|__)/.exec(text);
              if (delimiterMatch) {
                const delimiterLength = delimiterMatch[1].length;
                const contentFrom = nodeFrom + delimiterLength;
                const contentTo = nodeTo - delimiterLength;

                builder.add(nodeFrom, contentFrom, Decoration.replace({
                  widget: new HideSyntaxWidget(),
                  inclusive: false,
                  block: false,
                }));

                builder.add(contentTo, nodeTo, Decoration.replace({
                  widget: new HideSyntaxWidget(),
                  inclusive: false,
                  block: false,
                }));

                if (contentTo > contentFrom) {
                  builder.add(contentFrom, contentTo, Decoration.mark({
                    class: "cm-markdown-bold",
                  }));
                }
              }
            }
            
            else if (nodeName === "Emphasis") {
              const text = view.state.doc.sliceString(nodeFrom, nodeTo);
              const isBold = text.startsWith("**") || text.startsWith("__");
              
              if (!isBold) {
                const delimiterMatch = /^(\*|_)/.exec(text);
                if (delimiterMatch) {
                  const delimiterLength = 1;
                  const contentFrom = nodeFrom + delimiterLength;
                  const contentTo = nodeTo - delimiterLength;

                  builder.add(nodeFrom, contentFrom, Decoration.replace({
                    widget: new HideSyntaxWidget(),
                    inclusive: false,
                  }));

                  builder.add(contentTo, nodeTo, Decoration.replace({
                    widget: new HideSyntaxWidget(),
                    inclusive: false,
                  }));

                  if (contentTo > contentFrom) {
                    builder.add(contentFrom, contentTo, Decoration.mark({
                      class: "cm-markdown-italic",
                    }));
                  }
                }
              }
            }
            
            else if (nodeName === "Strikethrough") {
              const contentFrom = nodeFrom + 2;
              const contentTo = nodeTo - 2;

              builder.add(nodeFrom, contentFrom, Decoration.replace({
                widget: new HideSyntaxWidget(),
                inclusive: false,
              }));

              builder.add(contentTo, nodeTo, Decoration.replace({
                widget: new HideSyntaxWidget(),
                inclusive: false,
              }));

              if (contentTo > contentFrom) {
                builder.add(contentFrom, contentTo, Decoration.mark({
                  class: "cm-markdown-strikethrough",
                }));
              }
            }
            
            else if (nodeName === "Image") {
              const imageText = view.state.doc.sliceString(nodeFrom, nodeTo);
              const imageMatch = /!\[([^\]]*)\]\(([^)]+)\)/.exec(imageText);
              if (imageMatch) {
                const alt = imageMatch[1];
                const url = imageMatch[2];

                builder.add(nodeFrom, nodeTo, Decoration.replace({
                  widget: new ImagePreviewWidget(url, alt),
                  inclusive: false,
                }));
              }
            }
          },
        });
      }
      
      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

class TaskCheckboxWidget extends WidgetType {
  checked: boolean;
  lineFrom: number;
  constructor(lineFrom: number, checked: boolean) {
    super();
    this.lineFrom = lineFrom;
    this.checked = checked;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement("span");
    wrap.className = "inline-flex items-center mr-2";

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = this.checked;
    box.className = "h-3.5 w-3.5 rounded border border-border bg-background align-middle cursor-pointer";

    box.onclick = (event) => {
      event.preventDefault();
      const line = view.state.doc.lineAt(this.lineFrom);
      const text = line.text;
      const match = /^- \[( |x|X)\] /.exec(text);
      if (!match) return;
      const markPos = line.from + 3;
      const currentChar = view.state.doc.sliceString(markPos, markPos + 1);
      const nextChar = currentChar.toLowerCase() === "x" ? " " : "x";
      view.dispatch({
        changes: { from: markPos, to: markPos + 1, insert: nextChar },
      });
    };

    wrap.appendChild(box);
    return wrap;
  }
}

const taskListPlugin = ViewPlugin.fromClass(
  class {
    decorations;
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }
    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to; ) {
          const line = view.state.doc.lineAt(pos);
          const text = line.text;
          const match = /^- \[( |x|X)\] /.exec(text);
          if (match) {
            const checked = match[1].toLowerCase() === "x";
            const deco = Decoration.replace({
              widget: new TaskCheckboxWidget(line.from, checked),
              inclusive: false,
            });
            builder.add(line.from, line.from + match[0].length, deco);
          }
          pos = line.to + 1;
        }
      }
      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

const preventCommentKeymap = keymap.of([
  {
    key: "Mod-/",
    run: () => false,
  },
]);

const tabIndent = keymap.of([
  {
    key: "Tab",
    run: (view: EditorView) => {
      const selection = view.state.selection;
      if (selection.ranges.some(r => !r.empty)) {
        return indentSelection(view);
      } else {
        view.dispatch({
          changes: { from: selection.main.from, insert: "  " },
          selection: { anchor: selection.main.from + 2 },
        });
        return true;
      }
    },
  },
  {
    key: "Shift-Tab",
    run: (view: EditorView) => {
      const selection = view.state.selection;
      if (selection.ranges.some(r => !r.empty)) {
        return indentLess(view);
      } else {
        const line = view.state.doc.lineAt(selection.main.from);
        const lineText = line.text;
        if (lineText.startsWith("  ")) {
          view.dispatch({
            changes: { from: line.from, to: line.from + 2, insert: "" },
          });
          return true;
        }
        return false;
      }
    },
  },
]);

export function Editor({ content, onChange }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={editorRef} className="h-full w-full overflow-hidden bg-background relative">
      <CodeMirror
        value={content}
        height="100vh"
        extensions={[
          markdown(),
          indentUnit.of("  "),
          editorTheme,
          syntaxHighlighting(customHighlightStyle),
          taskListPlugin,
          markdownRenderPlugin,
          preventCommentKeymap,
          tabIndent,
          EditorView.lineWrapping,
        ]}
        onChange={onChange}
        className="h-full"
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
        }}
      />
    </div>
  );
}
