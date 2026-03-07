"use client";

import { memo, useCallback, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { MindMapNodeData } from "@/lib/types/mind-map";
import { useMapStore } from "@/stores/map-store";
import { cn } from "@/lib/utils/cn";

type MindMapNodeProps = NodeProps<Node<MindMapNodeData>>;

function MindMapNodeComponent({ id, data, selected }: MindMapNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeLabel = useMapStore((s) => s.updateNodeLabel);

  const label = data.label as string;
  const description = data.description as string | undefined;
  const color = data.color as string;
  const level = data.level as number;
  const side = (data.side as string) || "right";

  const isRoot = level === 0;
  const isBranch = level === 1;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    setEditValue(label);
    setIsEditing(true);
  }, [label]);

  const finishEditing = useCallback(() => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== label) {
      updateNodeLabel(id, editValue.trim());
    }
  }, [id, editValue, label, updateNodeLabel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        finishEditing();
      } else if (e.key === "Escape") {
        setIsEditing(false);
      }
    },
    [finishEditing]
  );

  // For radial layout: root has handles on both sides,
  // left-side nodes have source on LEFT / target on RIGHT (reversed),
  // right-side nodes keep source RIGHT / target LEFT
  const isLeft = side === "left";

  return (
    <div
      className={cn(
        "relative group transition-all",
        isRoot && "min-w-[180px]",
        isBranch && "min-w-[140px]",
        !isRoot && !isBranch && "min-w-[100px]"
      )}
      onDoubleClick={handleDoubleClick}
    >
      {/* Target handle — where parent connects TO this node */}
      {!isRoot && (
        <Handle
          type="target"
          position={isLeft ? Position.Right : Position.Left}
          className="!w-2 !h-2 !border-2 !bg-bg"
          style={{ borderColor: color }}
        />
      )}

      {/* Root gets handles on both sides */}
      {isRoot && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className="!w-2 !h-2 !border-2 !bg-bg"
            style={{ borderColor: color }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="left"
            className="!w-2 !h-2 !border-2 !bg-bg"
            style={{ borderColor: color }}
          />
        </>
      )}

      <div
        className={cn(
          "px-4 py-2.5 rounded-xl border-2 transition-all",
          "hover:shadow-lg cursor-pointer",
          selected && "ring-[3px]",
          isRoot && "px-6 py-4"
        )}
        style={{
          backgroundColor: selected ? `${color}25` : `${color}15`,
          borderColor: selected ? color : `${color}60`,
          boxShadow: selected
            ? `0 0 24px ${color}50, 0 0 48px ${color}20, inset 0 0 12px ${color}10`
            : `0 0 8px ${color}10`,
          // @ts-expect-error -- CSS custom prop for ring color
          "--tw-ring-color": selected ? `${color}90` : "transparent",
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            className={cn(
              "bg-transparent outline-none w-full text-center",
              isRoot
                ? "text-base font-bold"
                : isBranch
                ? "text-sm font-semibold"
                : "text-xs font-medium"
            )}
            style={{ color }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "text-center leading-tight",
                isRoot
                  ? "text-base font-bold"
                  : isBranch
                  ? "text-sm font-semibold"
                  : "text-xs font-medium"
              )}
              style={{ color }}
            >
              {label}
            </span>
            {description && (
              <span className="text-[10px] text-cream-dim/60 text-center max-w-[160px] truncate">
                {description}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Source handle — where THIS node connects to children */}
      {!isRoot && (
        <Handle
          type="source"
          position={isLeft ? Position.Left : Position.Right}
          className="!w-2 !h-2 !border-2 !bg-bg"
          style={{ borderColor: color }}
        />
      )}
    </div>
  );
}

export const MindMapNodeType = memo(MindMapNodeComponent);
