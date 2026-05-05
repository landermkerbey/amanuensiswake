import type { Node } from "unist";
import type { OrgData } from "uniorg";

export type { OrgData };

export interface OrgKeyword extends Node {
  type: "keyword";
  key: string;
  value: string;
}

export interface OrgSection extends Node {
  type: "section";
  children: OrgNode[];
}

export interface OrgHeadline extends Node {
  type: "headline";
  level: number;
  rawValue: string;
  tags: string[];
  children: OrgNode[];
}

export interface OrgParagraph extends Node {
  type: "paragraph";
  children: OrgNode[];
}

export interface OrgText extends Node {
  type: "text";
  value: string;
}

export type OrgNode =
  | OrgKeyword
  | OrgSection
  | OrgHeadline
  | OrgParagraph
  | OrgText
  | Node;

export interface BuildContext {
  filePath: string;
  title: string;
  date: string;
  tags: string[];
}

export type Transform = (ast: OrgData, context: BuildContext) => OrgData;

export function visitNodes(
  node: OrgNode,
  visitor: (node: OrgNode) => void
): void {
  visitor(node);
  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children as OrgNode[]) {
      visitNodes(child, visitor);
    }
  }
}