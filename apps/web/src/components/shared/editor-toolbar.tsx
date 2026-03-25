"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Unlink,
  Undo2,
  Redo2,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);

  // suscripcion reactiva al estado del editor
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      isBold: e?.isActive("bold") ?? false,
      isItalic: e?.isActive("italic") ?? false,
      isUnderline: e?.isActive("underline") ?? false,
      isStrike: e?.isActive("strike") ?? false,
      isH1: e?.isActive("heading", { level: 1 }) ?? false,
      isH2: e?.isActive("heading", { level: 2 }) ?? false,
      isH3: e?.isActive("heading", { level: 3 }) ?? false,
      isBulletList: e?.isActive("bulletList") ?? false,
      isOrderedList: e?.isActive("orderedList") ?? false,
      isBlockquote: e?.isActive("blockquote") ?? false,
      isAlignLeft: e?.isActive({ textAlign: "left" }) ?? false,
      isAlignCenter: e?.isActive({ textAlign: "center" }) ?? false,
      isAlignRight: e?.isActive({ textAlign: "right" }) ?? false,
      isLink: e?.isActive("link") ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  });

  if (!editor || !state) return null;

  // aplicar link y cerrar popover
  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
    setLinkUrl("");
    setLinkOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
      {/* texto */}
      <Toggle
        size="sm"
        pressed={state.isBold}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Negrita"
      >
        <Bold className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isItalic}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Cursiva"
      >
        <Italic className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isUnderline}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Subrayado"
      >
        <Underline className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isStrike}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Tachado"
      >
        <Strikethrough className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* titulos */}
      <Toggle
        size="sm"
        pressed={state.isH1}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        aria-label="Titulo 1"
      >
        <Heading1 className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isH2}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        aria-label="Titulo 2"
      >
        <Heading2 className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isH3}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        aria-label="Titulo 3"
      >
        <Heading3 className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* listas y bloques */}
      <Toggle
        size="sm"
        pressed={state.isBulletList}
        onPressedChange={() =>
          editor.chain().focus().toggleBulletList().run()
        }
        aria-label="Lista con vinetas"
      >
        <List className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isOrderedList}
        onPressedChange={() =>
          editor.chain().focus().toggleOrderedList().run()
        }
        aria-label="Lista numerada"
      >
        <ListOrdered className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isBlockquote}
        onPressedChange={() =>
          editor.chain().focus().toggleBlockquote().run()
        }
        aria-label="Cita"
      >
        <Quote className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* alineacion */}
      <Toggle
        size="sm"
        pressed={state.isAlignLeft}
        onPressedChange={() =>
          editor.chain().focus().setTextAlign("left").run()
        }
        aria-label="Alinear izquierda"
      >
        <AlignLeft className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isAlignCenter}
        onPressedChange={() =>
          editor.chain().focus().setTextAlign("center").run()
        }
        aria-label="Alinear centro"
      >
        <AlignCenter className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isAlignRight}
        onPressedChange={() =>
          editor.chain().focus().setTextAlign("right").run()
        }
        aria-label="Alinear derecha"
      >
        <AlignRight className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* link */}
      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <Toggle
            size="sm"
            pressed={state.isLink}
            onPressedChange={() => {
              if (state.isLink) {
                editor.chain().focus().unsetLink().run();
              } else {
                const attrs = editor.getAttributes("link");
                setLinkUrl(attrs.href || "");
                setLinkOpen(true);
              }
            }}
            aria-label="Enlace"
          >
            <Link className="size-4" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">URL del enlace</label>
            <div className="flex gap-2">
              <Input
                placeholder="https://ejemplo.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                }}
              />
              <Button size="sm" onClick={applyLink}>
                Aplicar
              </Button>
            </div>
            {state.isLink && (
              <Button
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setLinkOpen(false);
                }}
              >
                <Unlink className="size-4" />
                Quitar enlace
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* historial */}
      <Toggle
        size="sm"
        pressed={false}
        disabled={!state.canUndo}
        onPressedChange={() => editor.chain().focus().undo().run()}
        aria-label="Deshacer"
      >
        <Undo2 className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={false}
        disabled={!state.canRedo}
        onPressedChange={() => editor.chain().focus().redo().run()}
        aria-label="Rehacer"
      >
        <Redo2 className="size-4" />
      </Toggle>
    </div>
  );
}
