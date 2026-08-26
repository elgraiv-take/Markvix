export interface MarkdownEntry {
  path: string;
  relative_path: string;
}

export interface OpenTab {
  id: string;
  path: string;
  title: string;
  content: string;
}

export interface RecentDirectory {
  id: string;
  path: string;
  openedAt: string;
  exists: boolean;
}

export type TreeNode = {
  name: string;
  fullPath: string;
  relativePath: string;
  children: TreeNode[];
  isFile: boolean;
};
