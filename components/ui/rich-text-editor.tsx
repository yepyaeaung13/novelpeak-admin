"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import axios from "axios";
import { ImagePlus, Trash2 } from "lucide-react";
import { uploadImage } from "@/service/common";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onUploadChange?: (uploading: boolean) => void;
}

const toolButtonClass =
  "px-2 py-1 text-xs border rounded hover:bg-neutral-100 transition-colors";

const toolActiveClass = "bg-neutral-200 border-neutral-300 font-medium";

export function RichTextEditor({ value, onChange, placeholder, className, onUploadChange }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const editor = useEditor({
    extensions: [StarterKit, Link, Underline, Image.configure({ allowBase64: false })],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "min-h-64 p-3 focus:outline-none prose prose-neutral max-w-none break-words chapter-content scroll-mt-20",
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

  const handleImageUpload = async (file: File | undefined) => {
    if (!file || !editor) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setUploadError("Choose a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image must be smaller than 10 MB.");
      return;
    }

    setUploadError("");
    setIsUploading(true);
    onUploadChange?.(true);
    const position = editor.state.selection.from;
    try {
      const result = await uploadImage(file);
      if (typeof result?.url !== "string" || !result.url) {
        throw new Error("Upload did not return an image URL.");
      }
      editor.chain().focus().insertContentAt(position, [
        { type: "image", attrs: { src: result.url, alt: "" } },
        { type: "paragraph" },
      ]).run();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : error instanceof Error ? error.message : undefined;
      setUploadError(message || "Image upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      onUploadChange?.(false);
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  const isEmpty = !value || (value.replace(/<[^>]+>/g, "").trim().length === 0 && !/<img\b/i.test(value));

  return (
    <div className={`border border-neutral-200 rounded-lg ${className ?? ""}`}>
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 bg-neutral-50/95 backdrop-blur border-b border-neutral-200 p-2 rounded-t-lg">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`${toolButtonClass} ${editor.isActive("bold") ? toolActiveClass : ""}`}>Bold</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${toolButtonClass} ${editor.isActive("italic") ? toolActiveClass : ""}`}>Italic</button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`${toolButtonClass} ${editor.isActive("underline") ? toolActiveClass : ""}`}>Underline</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`${toolButtonClass} ${editor.isActive("bulletList") ? toolActiveClass : ""}`}>UL</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`${toolButtonClass} ${editor.isActive("orderedList") ? toolActiveClass : ""}`}>OL</button>
        <button type="button" onClick={() => editor.chain().focus().setNode("heading", { level: 2 }).run()} className={`${toolButtonClass} ${editor.isActive("heading", { level: 2 }) ? toolActiveClass : ""}`}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().setParagraph().run()} className={`${toolButtonClass} ${editor.isActive("paragraph") ? toolActiveClass : ""}`}>P</button>
        <span className="mx-1 h-5 w-px bg-neutral-300" />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} title="Insert image" aria-label="Insert image" className="flex h-8 w-8 items-center justify-center rounded border hover:bg-neutral-100 disabled:opacity-50"><ImagePlus size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().deleteSelection().run()} disabled={!editor.isActive("image")} title="Remove selected image" aria-label="Remove selected image" className="flex h-8 w-8 items-center justify-center rounded border hover:bg-neutral-100 disabled:opacity-50"><Trash2 size={16} /></button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => void handleImageUpload(event.target.files?.[0])} aria-label="Choose chapter image" />
        {isUploading && <span className="text-xs text-neutral-600">Uploading image...</span>}
      </div>
      {uploadError && <p role="alert" className="px-3 py-2 text-sm text-red-600">{uploadError}</p>}

      <BubbleMenu
        editor={editor}
        options={{ placement: "top-start", offset: 8 }}
        className="flex flex-wrap items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg"
      >
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`${toolButtonClass} border-0 ${editor.isActive("bold") ? toolActiveClass : ""}`}>Bold</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${toolButtonClass} border-0 ${editor.isActive("italic") ? toolActiveClass : ""}`}>Italic</button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`${toolButtonClass} border-0 ${editor.isActive("underline") ? toolActiveClass : ""}`}>Underline</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`${toolButtonClass} border-0 ${editor.isActive("bulletList") ? toolActiveClass : ""}`}>UL</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`${toolButtonClass} border-0 ${editor.isActive("orderedList") ? toolActiveClass : ""}`}>OL</button>
        <button type="button" onClick={() => editor.chain().focus().setNode("heading", { level: 2 }).run()} className={`${toolButtonClass} border-0 ${editor.isActive("heading", { level: 2 }) ? toolActiveClass : ""}`}>H2</button>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} title="Insert image" aria-label="Insert image" className="flex h-8 w-8 items-center justify-center rounded hover:bg-neutral-100 disabled:opacity-50"><ImagePlus size={16} /></button>
      </BubbleMenu>

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
