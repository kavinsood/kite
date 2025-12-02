import { useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView, Decoration, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentSelection, indentLess } from "@codemirror/commands";
import { indentUnit, syntaxTree } from "@codemirror/language";

interface EditorProps {
  content: string;
  onChange: (val: string) => void;
}

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

// Widget to hide markdown syntax characters
class HideSyntaxWidget extends WidgetType {
  constructor() {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "hidden";
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

// Image preview widget
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

// Markdown rendering plugin
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
            
            // Headings: ATXHeading1 through ATXHeading6
            if (nodeName.startsWith("ATXHeading")) {
              const level = parseInt(nodeName.replace("ATXHeading", "")) || 1;
              
              // Find the heading marker node (the # symbols)
              let markerFrom = nodeFrom;
              let markerTo = nodeFrom;
              let contentFrom = nodeFrom;
              let contentTo = nodeTo;
              
              // Traverse children to find the marker and content
              const headingText = view.state.doc.sliceString(nodeFrom, nodeTo);
              const markerMatch = /^(#{1,6})\s+/.exec(headingText);
              if (markerMatch) {
                markerTo = nodeFrom + markerMatch[0].length;
                contentFrom = markerTo;
                contentTo = nodeTo;
              }
              
              // Hide the # symbols
              if (markerTo > markerFrom) {
                builder.add(
                  markerFrom,
                  markerTo,
                  Decoration.replace({
                    widget: new HideSyntaxWidget(),
                    inclusive: false,
                  })
                );
              }
              
              // Style the heading content
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
            
            // Bold: StrongEmphasis
            else if (nodeName === "StrongEmphasis") {
              const text = view.state.doc.sliceString(nodeFrom, nodeTo);
              // Find the delimiter (either ** or __)
              const delimiterMatch = /^(\*\*|__)/.exec(text);
              if (delimiterMatch) {
                const delimiterLength = delimiterMatch[1].length;
                const contentFrom = nodeFrom + delimiterLength;
                const contentTo = nodeTo - delimiterLength;
                
                // Hide the opening delimiter
                builder.add(nodeFrom, contentFrom, Decoration.replace({
                  widget: new HideSyntaxWidget(),
                  inclusive: false,
                }));
                
                // Hide the closing delimiter
                builder.add(contentTo, nodeTo, Decoration.replace({
                  widget: new HideSyntaxWidget(),
                  inclusive: false,
                }));
                
                // Style the content
                if (contentTo > contentFrom) {
                  builder.add(contentFrom, contentTo, Decoration.mark({
                    class: "cm-markdown-bold",
                  }));
                }
              }
            }
            
            // Italic: Emphasis (but not StrongEmphasis)
            else if (nodeName === "Emphasis") {
              const text = view.state.doc.sliceString(nodeFrom, nodeTo);
              // Check if this is actually bold by checking if it starts with ** or __
              // CodeMirror may parse **text** as nested Emphasis nodes, so we skip if it looks like bold
              const isBold = text.startsWith("**") || text.startsWith("__");
              
              if (!isBold) {
                // Find the delimiter (either * or _)
                const delimiterMatch = /^(\*|_)/.exec(text);
                if (delimiterMatch) {
                  const delimiterLength = 1;
                  const contentFrom = nodeFrom + delimiterLength;
                  const contentTo = nodeTo - delimiterLength;
                  
                  // Hide the opening delimiter
                  builder.add(nodeFrom, contentFrom, Decoration.replace({
                    widget: new HideSyntaxWidget(),
                    inclusive: false,
                  }));
                  
                  // Hide the closing delimiter
                  builder.add(contentTo, nodeTo, Decoration.replace({
                    widget: new HideSyntaxWidget(),
                    inclusive: false,
                  }));
                  
                  // Style the content
                  if (contentTo > contentFrom) {
                    builder.add(contentFrom, contentTo, Decoration.mark({
                      class: "cm-markdown-italic",
                    }));
                  }
                }
              }
            }
            
            // Strikethrough
            else if (nodeName === "Strikethrough") {
              const contentFrom = nodeFrom + 2; // Skip ~~
              const contentTo = nodeTo - 2;
              
              // Hide the opening ~~
              builder.add(nodeFrom, contentFrom, Decoration.replace({
                widget: new HideSyntaxWidget(),
                inclusive: false,
              }));
              
              // Hide the closing ~~
              builder.add(contentTo, nodeTo, Decoration.replace({
                widget: new HideSyntaxWidget(),
                inclusive: false,
              }));
              
              // Style the content
              if (contentTo > contentFrom) {
                builder.add(contentFrom, contentTo, Decoration.mark({
                  class: "cm-markdown-strikethrough",
                }));
              }
            }
            
            // Images
            else if (nodeName === "Image") {
              // Extract alt text and URL from the image node
              const imageText = view.state.doc.sliceString(nodeFrom, nodeTo);
              const imageMatch = /!\[([^\]]*)\]\(([^)]+)\)/.exec(imageText);
              if (imageMatch) {
                const alt = imageMatch[1];
                const url = imageMatch[2];
                
                // Replace entire image syntax with preview widget
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

// Task checkbox widget (existing)
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

// Prevent Ctrl+/ from inserting markdown comment
const preventCommentKeymap = keymap.of([
  {
    key: "Mod-/",
    run: () => false, // Prevent default behavior
  },
]);

// Tab indentation - 2 spaces, respects copy/paste
const tabIndent = keymap.of([
  {
    key: "Tab",
    run: (view: EditorView) => {
      const selection = view.state.selection;
      if (selection.ranges.some(r => !r.empty)) {
        // If text is selected, indent the selection (uses 2 spaces from config)
        return indentSelection(view);
      } else {
        // Otherwise, insert 2 spaces
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
        // If text is selected, unindent
        return indentLess(view);
      } else {
        // Otherwise, remove 2 spaces from start of line if present
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
  const viewRef = useRef<EditorView | null>(null);

  return (
    <div ref={editorRef} className="h-full w-full overflow-hidden bg-background relative">
      <CodeMirror
        value={content}
        height="100vh"
        extensions={[
          markdown(),
          indentUnit.of("  "), // 2 spaces for indentation
          editorTheme,
          taskListPlugin,
          markdownRenderPlugin,
          preventCommentKeymap,
          tabIndent,
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged || update.selectionSet) {
              // Store view reference
              if (update.view) {
                viewRef.current = update.view;
              }
            }
          }),
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
