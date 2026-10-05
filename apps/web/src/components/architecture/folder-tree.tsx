'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import type { FolderTreeNode } from '@/lib/architecture/folder-tree';
import { cn } from '@/lib/utils/cn';

interface FolderTreeProps {
  root: FolderTreeNode;
  selectedPath: string | null;
  onSelect: (node: FolderTreeNode) => void;
}

export function FolderTree({ root, selectedPath, onSelect }: FolderTreeProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!selectedPath) return;
    const ancestors: string[] = [];
    let acc = '';
    for (const part of selectedPath.split('/').filter(Boolean)) {
      acc = acc ? `${acc}/${part}` : part;
      ancestors.push(acc);
    }
    setOpen((prev) => {
      const next = new Set(prev);
      for (const id of ancestors) next.add(id);
      return next;
    });
  }, [selectedPath]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card"
      data-testid="folder-tree"
    >
      <div className="shrink-0 border-b border-border px-3 py-2">
        <h3 className="text-card-title tracking-tight">Folder structure</h3>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-2 text-body">
        {root.children.length === 0 ? (
          <li className="px-2 py-3 text-body text-muted-foreground">
            No files in the latest scan.
          </li>
        ) : (
          root.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={0}
              open={open}
              selectedPath={selectedPath}
              onToggle={toggle}
              onSelect={onSelect}
            />
          ))
        )}
      </ul>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  open,
  selectedPath,
  onToggle,
  onSelect,
}: {
  node: FolderTreeNode;
  depth: number;
  open: Set<string>;
  selectedPath: string | null;
  onToggle: (id: string) => void;
  onSelect: (node: FolderTreeNode) => void;
}) {
  const expanded = open.has(node.id);
  const selected = selectedPath === node.path;
  const isFolder = node.kind === 'folder';

  return (
    <li>
      <button
        type="button"
        title={node.path}
        className={cn(
          'flex min-h-11 w-full items-center gap-1 rounded-md py-0 pr-2 text-left text-body hover:bg-muted/70 md:min-h-8',
          selected && 'bg-primary/10 font-medium text-primary'
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => {
          if (isFolder) onToggle(node.id);
          onSelect(node);
        }}
      >
        {isFolder ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        {isFolder ? (
          <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && expanded ? (
        <ul>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              open={open}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
