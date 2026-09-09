'use client';

import { Node, mergeAttributes, type Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  UnderlineIcon,
  Undo2,
  Images,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  imageSizes,
  imageAlignments,
  mediaUrlKey,
  validBlogLink,
} from '@/lib/blog-utils';

const BlogImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: 'medium',
        parseHTML: (el) => el.getAttribute('data-size') || 'medium',
        renderHTML: (attrs) => ({ 'data-size': attrs.size }),
      },
      align: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') || 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs.align }),
      },
    };
  },
});

const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      poster: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'video' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        controls: 'true',
        preload: 'metadata',
      }),
    ];
  },
});

export function removeEditorMedia(editor: Editor | null, url: string) {
  if (!editor) return;
  const positions: { pos: number; size: number }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (
      ['image', 'video'].includes(node.type.name) &&
      mediaUrlKey(node.attrs.src) === mediaUrlKey(url)
    )
      positions.push({ pos, size: node.nodeSize });
  });
  const tr = editor.state.tr;
  positions.reverse().forEach(({ pos, size }) => tr.delete(pos, pos + size));
  editor.view.dispatch(tr);
}

export function updateEditorAlt(
  editor: Editor | null,
  url: string,
  alt: string,
) {
  if (!editor) return;
  const tr = editor.state.tr;
  editor.state.doc.descendants((node, pos) => {
    if (
      node.type.name === 'image' &&
      mediaUrlKey(node.attrs.src) === mediaUrlKey(url)
    )
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, alt });
  });
  editor.view.dispatch(tr);
}

function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? 'default' : 'ghost'}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={active ? 'bg-cyan-700 text-white' : ''}
    >
      {children}
    </Button>
  );
}

function toolbarState(editor: Editor | null) {
  if (!editor) return null;
  return {
    h2: editor.isActive('heading', { level: 2 }),
    h3: editor.isActive('heading', { level: 3 }),
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    bullet: editor.isActive('bulletList'),
    ordered: editor.isActive('orderedList'),
    quote: editor.isActive('blockquote'),
    link: editor.isActive('link'),
    image: editor.isActive('image'),
    video: editor.isActive('video'),
    attrs: editor.getAttributes('image'),
    undo: editor.can().undo(),
    redo: editor.can().redo(),
    left: editor.isActive({ textAlign: 'left' }),
    center: editor.isActive({ textAlign: 'center' }),
    right: editor.isActive({ textAlign: 'right' }),
  };
}

export function RichTextEditor({
  value,
  onChange,
  onReady,
  onUpload,
  onLibrary,
  onAltChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onReady: (editor: Editor) => void;
  onUpload: () => void;
  onLibrary: () => void;
  onAltChange: (url: string, alt: string) => void;
  disabled?: boolean;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [linkError, setLinkError] = useState('');
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: false,
        trailingNode: false,
      }),
      Link.configure({
        openOnClick: false,
        defaultProtocol: 'https',
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      BlogImage.configure({ allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder:
          'Cuenta cómo fue tu visita, qué disfrutaste y qué recomendarías a otros viajeros…',
      }),
      VideoNode,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'blog-content min-h-[380px] px-4 py-5 sm:px-7 outline-none',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Contenido',
        id: 'blog-body',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const state =
    useEditorState({
      editor,
      selector: (snapshot) => toolbarState(snapshot.editor),
    }) ?? toolbarState(editor);
  useEffect(() => {
    if (editor) onReady(editor);
  }, [editor, onReady]);
  useEffect(() => {
    if (editor && editor.getHTML() !== (value || '<p></p>'))
      editor
        .chain()
        .setMeta('addToHistory', false)
        .setContent(value || '', { emitUpdate: false })
        .run();
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  if (!editor || !state)
    return (
      <div
        role="status"
        className="min-h-[380px] rounded-lg border p-5 text-sm"
      >
        Preparando editor…
      </div>
    );
  return (
    <div className="min-w-0 rounded-lg border bg-white focus-within:ring-2 focus-within:ring-cyan-600/30">
      <div
        role="toolbar"
        aria-label="Formato del contenido"
        className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b bg-stone-50 p-2"
      >
        <Tool
          label="Título 2"
          active={state.h2}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 />
        </Tool>
        <Tool
          label="Título 3"
          active={state.h3}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 />
        </Tool>
        <Tool
          label="Negrita"
          active={state.bold}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </Tool>
        <Tool
          label="Cursiva"
          active={state.italic}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </Tool>
        <Tool
          label="Subrayado"
          active={state.underline}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </Tool>
        <Tool
          label="Lista"
          active={state.bullet}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </Tool>
        <Tool
          label="Lista numerada"
          active={state.ordered}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </Tool>
        <Tool
          label="Cita"
          active={state.quote}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </Tool>
        <Tool
          label="Alinear texto a la izquierda"
          active={state.left}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft />
        </Tool>
        <Tool
          label="Centrar texto"
          active={state.center}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter />
        </Tool>
        <Tool
          label="Alinear texto a la derecha"
          active={state.right}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight />
        </Tool>
        <Tool
          label="Editar enlace"
          active={state.link}
          disabled={disabled}
          onClick={() => {
            setUrl(editor.getAttributes('link').href || '');
            setLinkError('');
            setLinkOpen(true);
          }}
        >
          <LinkIcon />
        </Tool>
        <Tool
          label="Subir imagen o video"
          disabled={disabled}
          onClick={onUpload}
        >
          <ImagePlus />
        </Tool>
        <Tool
          label="Usar archivo de la biblioteca"
          disabled={disabled}
          onClick={onLibrary}
        >
          <Images />
        </Tool>
        <Tool
          label="Deshacer"
          disabled={disabled || !state.undo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 />
        </Tool>
        <Tool
          label="Rehacer"
          disabled={disabled || !state.redo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 />
        </Tool>
      </div>
      {state.image && (
        <fieldset
          disabled={disabled}
          className="grid gap-3 border-b bg-cyan-50 p-3 sm:grid-cols-2"
        >
          <label className="grid gap-1 text-sm">
            Tamaño de imagen
            <select
              aria-label="Tamaño de imagen"
              className="h-10 rounded-md border bg-white px-2"
              value={state.attrs.size || 'medium'}
              onChange={(e) =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes('image', { size: e.target.value })
                  .run()
              }
            >
              {Object.entries(imageSizes).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Alineación de imagen
            <select
              aria-label="Alineación de imagen"
              className="h-10 rounded-md border bg-white px-2"
              value={state.attrs.align || 'center'}
              onChange={(e) =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes('image', { align: e.target.value })
                  .run()
              }
            >
              {Object.entries(imageAlignments).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Descripción de la imagen
            <Input
              aria-label="Descripción de la imagen"
              maxLength={255}
              value={state.attrs.alt || ''}
              onChange={(e) => {
                editor
                  .chain()
                  .updateAttributes('image', { alt: e.target.value })
                  .run();
                onAltChange(String(state.attrs.src), e.target.value);
              }}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => editor.chain().focus().deleteSelection().run()}
          >
            Quitar del contenido
          </Button>
        </fieldset>
      )}
      {state.video && (
        <Button
          type="button"
          disabled={disabled}
          variant="outline"
          className="m-3"
          onClick={() => editor.chain().focus().deleteSelection().run()}
        >
          Quitar video del contenido
        </Button>
      )}
      <EditorContent editor={editor} />
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent closeLabel="Cerrar enlace">
          <DialogTitle>Enlace</DialogTitle>
          <DialogDescription>
            Selecciona texto para enlazarlo. Puedes usar una dirección web o un
            correo con mailto:.
          </DialogDescription>
          <Label htmlFor="blog-link">Dirección</Label>
          <Input
            id="blog-link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://ejemplo.com"
            aria-invalid={!!linkError}
          />
          {linkError && (
            <p role="alert" className="text-sm text-red-700">
              {linkError}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange('link')
                  .unsetLink()
                  .run();
                setLinkOpen(false);
              }}
            >
              Quitar enlace
            </Button>
            <Button
              type="button"
              onClick={() => {
                const href = validBlogLink(url.trim());
                if (!href) {
                  setLinkError(
                    'Escribe una dirección válida que empiece por https://, http:// o mailto:.',
                  );
                  return;
                }
                const chain = editor.chain().focus().extendMarkRange('link');
                if (editor.state.selection.empty && !state.link)
                  chain
                    .insertContent({
                      type: 'text',
                      text: href,
                      marks: [{ type: 'link', attrs: { href } }],
                    })
                    .run();
                else chain.setLink({ href }).run();
                setLinkOpen(false);
              }}
            >
              Aplicar enlace
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
