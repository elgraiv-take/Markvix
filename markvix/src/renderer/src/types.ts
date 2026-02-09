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

export type TreeNode = {
  name: string;
  fullPath: string;
  relativePath: string;
  children: TreeNode[];
  isFile: boolean;
};
