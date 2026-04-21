import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical, Pencil } from "lucide-react";

/**
 * Grade horizontal de fotos com reordenação por arrastar.
 *
 * Mobile: long-press de ~280ms na miniatura inicia o arraste,
 *   evitando conflito com o scroll horizontal.
 * Desktop: arrasta direto (delay menor).
 *
 * Mudanças de ordem são reportadas via `onReorder` com a nova lista
 * completa — o pai persiste a ordem no banco em batch.
 */
export type SortablePhoto = {
  id: string;
  url: string;
  legenda?: string | null;
};

type Props<T extends SortablePhoto> = {
  photos: T[];
  onReorder: (next: T[]) => void;
  onRemove?: (photo: T) => void;
  onPreview?: (photo: T) => void;
  onEditCaption?: (photo: T) => void;
  /** Conteúdo extra renderizado dentro de cada card (ex: badge de IA). */
  renderBadge?: (photo: T) => React.ReactNode;
  /** Tamanho da miniatura em pixels. Default 80. */
  size?: number;
  /** Texto alt das imagens. */
  alt?: string;
};

export function SortablePhotoGrid<T extends SortablePhoto>({
  photos,
  onReorder,
  onRemove,
  onPreview,
  onEditCaption,
  renderBadge,
  size = 80,
  alt = "Foto",
}: Props<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    // Mouse: arraste imediato (5px de tolerância para distinguir de clique).
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    // Touch: long-press para não brigar com scroll horizontal.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 280, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(photos, oldIndex, newIndex));
  }

  const activePhoto = activeId ? photos.find((p) => p.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={photos.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p) => (
            <SortableItem
              key={p.id}
              photo={p}
              size={size}
              alt={alt}
              onRemove={onRemove}
              onPreview={onPreview}
              onEditCaption={onEditCaption}
              renderBadge={renderBadge}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activePhoto ? (
          <img
            src={activePhoto.url}
            alt={alt}
            style={{ width: size, height: size }}
            className="rounded-lg object-cover shadow-elevated ring-2 ring-primary"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableItem<T extends SortablePhoto>({
  photo,
  size,
  alt,
  onRemove,
  onPreview,
  onEditCaption,
  renderBadge,
}: {
  photo: T;
  size: number;
  alt: string;
  onRemove?: (photo: T) => void;
  onPreview?: (photo: T) => void;
  onEditCaption?: (photo: T) => void;
  renderBadge?: (photo: T) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    width: size,
    height: size,
    touchAction: "manipulation",
  };

  return (
    <div ref={setNodeRef} style={style} className="relative shrink-0">
      {/* Área de arraste = a miniatura inteira (long-press no mobile) */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => {
          // listeners do dnd-kit já cancelam click quando há drag; aqui é
          // apenas o tap normal → abrir preview.
          e.preventDefault();
          onPreview?.(photo);
        }}
        className="block h-full w-full cursor-grab overflow-hidden rounded-lg active:cursor-grabbing"
        aria-label="Arraste para reordenar ou toque para ampliar"
      >
        <img
          src={photo.url}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      </button>

      {/* Handle visual (apenas indicação no canto inferior direito) */}
      <div className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/45 p-0.5 text-white">
        <GripVertical className="h-3 w-3" />
      </div>

      {/* Botão de legenda (lápis) */}
      {onEditCaption && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditCaption(photo);
          }}
          className={`absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full shadow ${
            photo.legenda
              ? "bg-primary text-primary-foreground"
              : "bg-black/55 text-white"
          }`}
          aria-label={photo.legenda ? "Editar legenda" : "Adicionar legenda"}
          title={photo.legenda ?? "Adicionar legenda"}
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}

      {renderBadge?.(photo)}

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(photo);
          }}
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
          aria-label="Remover foto"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
