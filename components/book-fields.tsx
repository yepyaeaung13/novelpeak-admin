"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BOOK_TYPES, GENRES, STORY_STATUSES, LANGUAGES, type BookFormData } from "@/lib/book";

export function BookFields({ book, onChange, disabled = false }: {
  book: BookFormData;
  onChange: (book: BookFormData) => void;
  disabled?: boolean;
}) {
  const update = <K extends keyof BookFormData>(key: K, value: BookFormData[K]) => onChange({ ...book, [key]: value });
  return (
    <fieldset disabled={disabled} className="space-y-5">
      <label className="block space-y-2 text-sm font-medium">
        <span>Title *</span>
        <Input value={book.title} required onChange={e => update("title", e.target.value)} placeholder="Enter book title" />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>Author *</span>
        <Input value={book.author} required onChange={e => update("author", e.target.value)} placeholder="Author name" />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {([
          ["bookType", "Book type", BOOK_TYPES],
          ["status", "Story status", STORY_STATUSES],
          ["language", "Language", LANGUAGES],
          ["publicationStatus", "Publication status", ["Draft", "Published"]],
        ] as const).map(([key, label, options]) => (
          <label key={key} className="block space-y-2 text-sm font-medium">
            <span>{label}</span>
            <select value={book[key]} onChange={e => update(key, e.target.value as BookFormData[typeof key])} className="w-full border rounded-md px-3 py-2 bg-white">
              {options.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        ))}
      </div>
      <p className="text-sm text-neutral-500">Draft books are visible only to admins. Published books appear on the reader website.</p>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Genres</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {GENRES.map(genre => (
            <label key={genre} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={book.genres.includes(genre)} onChange={e => update("genres", e.target.checked ? [...book.genres, genre] : book.genres.filter(item => item !== genre))} />
              {genre}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block space-y-2 text-sm font-medium">
        <span>Description</span>
        <Textarea value={book.description} onChange={e => update("description", e.target.value)} placeholder="Write a synopsis..." className="h-32 md:h-40" />
      </label>
    </fieldset>
  );
}
