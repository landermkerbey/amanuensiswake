/**
 * rehype-verse.ts
 *
 * A small rehype plugin that rewrites the output of uniorg-rehype for
 * #+BEGIN_VERSE...#+END_VERSE blocks.
 *
 * uniorg-rehype renders verse blocks as:
 *   <pre class="verse">…content…</pre>
 *
 * This plugin replaces that with:
 *   <div class="aw-verse">…content…</div>
 *
 * The CSS class applies `white-space: pre` so the author's horizontal
 * whitespace is preserved as a semantic element.
 */

import type { Plugin } from "unified";
import type { Root, Element } from "hast";
import { visit } from "unist-util-visit";

const rehypeVerse: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (
        node.tagName === "pre" &&
        Array.isArray(node.properties?.className) &&
        (node.properties.className as string[]).includes("verse")
      ) {
        // Replace <pre class="verse"> with <div class="aw-verse">
        node.tagName = "div";
        node.properties = {
          ...node.properties,
          className: ["aw-verse"],
        };
      }
    });
  };
};

export default rehypeVerse;