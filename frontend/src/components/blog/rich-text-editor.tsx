'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
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
  Video,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PostMedia } from '@/types/blog';

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
      width: { default: null },
      height: { default: null },
      preload: { default: 'metadata' },
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

type Props = {
  value: string;
  onChange: (value: string) => void;
  onUploadMedia?: (file: File) => Promise<PostMedia>;
  placeholder?: string;
  className?: string;
};

type ToolButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ToolButton({ label, active, disabled, onClick, children }: ToolButtonProps) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant={active ? 'default' : 'ghost'}
      className={cn(active && 'bg-cyan-700 text-white hover:bg-cyan-800')}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  onUploadMedia,
  placeholder = 'Cuenta tu experiencia con detalles, recomendaciones y momentos especiales.',
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          loading: 'lazy',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({ placeholder }),
      VideoNode,
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'blog-content min-h-[280px] rounded-b-lg border-x border-b bg-white px-4 py-4 text-sm leading-7 outline-none focus:ring-2 focus:ring-cyan-600/30',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor || editor.getHTML() === value) {
      return;
    }

    editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value]);

  async function handleMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !editor || !onUploadMedia) {
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const maxBytes = isVideo ? 150 * 1024 * 1024 : 10 * 1024 * 1024;

    if (file.size > maxBytes) {
      toast.error(isVideo ? 'El video no puede superar 150 MB.' : 'La imagen no puede superar 10 MB.');
      return;
    }

    setIsUploading(true);

    try {
      const media = await onUploadMedia(file);

      if (media.type === 'video') {
        editor.chain().focus().insertContent({ type: 'video', attrs: { src: media.url } }).run();
      } else {
        editor.chain().focus().setImage({ src: media.url, alt: media.alt ?? 'Imagen del blog' }).run();
      }
    } catch {
      toast.error('No pudimos subir el archivo.');
    } finally {
      setIsUploading(false);
    }
  }

  function setLink() {
    if (!editor) {
      return;
    }

    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL del enlace', previousUrl ?? 'https://');

    if (url === null) {
      return;
    }

    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  if (!editor) {
    return <div className="min-h-[320px] rounded-lg border bg-white" />;
  }

  return (
    <div className={cn('overflow-hidden rounded-lg', className)}>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border bg-stone-50 p-2">
        <ToolButton label="Titulo 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 />
        </ToolButton>
        <ToolButton label="Titulo 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 />
        </ToolButton>
        <ToolButton label="Negrita" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold />
        </ToolButton>
        <ToolButton label="Cursiva" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic />
        </ToolButton>
        <ToolButton label="Subrayado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon />
        </ToolButton>
        <ToolButton label="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List />
        </ToolButton>
        <ToolButton label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered />
        </ToolButton>
        <ToolButton label="Cita" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote />
        </ToolButton>
        <ToolButton label="Alinear izquierda" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft />
        </ToolButton>
        <ToolButton label="Centrar" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter />
        </ToolButton>
        <ToolButton label="Alinear derecha" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight />
        </ToolButton>
        <ToolButton label="Enlace" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon />
        </ToolButton>
        <ToolButton label="Agregar imagen o video" disabled={!onUploadMedia || isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? <Video className="animate-pulse" /> : <ImagePlus />}
        </ToolButton>
        <ToolButton label="Deshacer" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 />
        </ToolButton>
        <ToolButton label="Rehacer" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 />
        </ToolButton>
      </div>
      <EditorContent editor={editor} />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleMedia}
      />
    </div>
  );
}
