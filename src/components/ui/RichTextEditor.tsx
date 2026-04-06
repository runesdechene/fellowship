import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react'
import './RichTextEditor.css'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'rte-content',
        'data-placeholder': placeholder ?? '',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="rte-wrapper">
      <div className="rte-toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rte-btn ${editor.isActive('bold') ? 'active' : ''}`}
          title="Gras"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rte-btn ${editor.isActive('italic') ? 'active' : ''}`}
          title="Italique"
        >
          <Italic className="h-4 w-4" />
        </button>
        <div className="rte-separator" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rte-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          title="Liste"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rte-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          title="Liste numérotée"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`rte-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
          title="Citation"
        >
          <Quote className="h-4 w-4" />
        </button>
        <div className="rte-separator" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="rte-btn"
          title="Annuler"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="rte-btn"
          title="Rétablir"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
