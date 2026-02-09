import type { MarkdownEntry, TreeNode } from "../types";

function ensurePath(
  root: Map<string, TreeNode>,
  parts: string[],
  filePath: string
): void {
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    const relativePath = parts.slice(0, i + 1).join("/");

    if (isLast) {
      const node: TreeNode = {
        name: part,
        fullPath: filePath,
        relativePath,
        children: [],
        isFile: true,
      };
      if (!current.has(part)) {
        current.set(part, node);
      } else {
        const existing = current.get(part)!;
        existing.fullPath = filePath;
        existing.isFile = true;
      }
      return;
    }

    if (!current.has(part)) {
      const node: TreeNode = {
        name: part,
        fullPath: "",
        relativePath,
        children: [],
        isFile: false,
      };
      (node as unknown as { _map: Map<string, TreeNode> })._map = new Map();
      current.set(part, node);
    }
    const node = current.get(part)!;
    const childMap = (node as unknown as { _map: Map<string, TreeNode> })._map;
    current = childMap;
  }
}

function toTreeArray(map: Map<string, TreeNode>): TreeNode[] {
  const nodes = Array.from(map.values());
  for (const n of nodes) {
    const childMap = (n as unknown as { _map?: Map<string, TreeNode> })._map;
    if (childMap) {
      n.children = toTreeArray(childMap).sort((a, b) => {
        if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });
      delete (n as unknown as { _map?: Map<string, TreeNode> })._map;
    }
  }
  return nodes.sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

export function buildTree(entries: MarkdownEntry[]): TreeNode[] {
  const root = new Map<string, TreeNode>();
  for (const e of entries) {
    const parts = e.relative_path.split("/").filter(Boolean);
    if (parts.length) ensurePath(root, parts, e.path);
  }
  return toTreeArray(root);
}
