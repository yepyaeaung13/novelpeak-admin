"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Link, Underline],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "min-h-64 p-3 focus:outline-none prose prose-neutral max-w-none break-words",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  const isEmpty = !value || value.replace(/<[^>]+>/g, "").trim().length === 0;

  return (
    <div className={`border border-neutral-200 rounded-lg ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-2 bg-neutral-50 border-b border-neutral-200 p-2 rounded-t-lg">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className="px-2 py-1 text-xs border rounded hover:bg-neutral-100">Bold</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className="px-2 py-1 text-xs border rounded hover:bg-neutral-100">Italic</button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className="px-2 py-1 text-xs border rounded hover:bg-neutral-100">Underline</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className="px-2 py-1 text-xs border rounded hover:bg-neutral-100">UL</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className="px-2 py-1 text-xs border rounded hover:bg-neutral-100">OL</button>
        <button type="button" onClick={() => editor.chain().focus().setNode("heading", { level: 2 }).run()} className="px-2 py-1 text-xs border rounded hover:bg-neutral-100">H2</button>
        <button type="button" onClick={() => editor.chain().focus().setParagraph().run()} className="px-2 py-1 text-xs border rounded hover:bg-neutral-100">P</button>
      </div>

      <div className="relative">
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 p-3 text-neutral-400 whitespace-pre-wrap">
            {placeholder ?? "Enter content here..."}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
