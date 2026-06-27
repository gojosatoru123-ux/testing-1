export interface MindNode {
    id: string;
    text: string;
    depth: number;
    children: MindNode[];
    // Optional positioning attributes injected during structural parsing
    side?: 'left' | 'right' | 'center';
    w?: number;
    h?: number;
  }
  
  export interface MindmapData {
    id: string;
    title: string;
    root: MindNode;
  }
  
  /**
   * Optional Helper function to construct a safe, deeply hierarchical node 
   * when translating raw JSON definitions or frontmatter trees into the mindmap canvas.
   */
  export function createMindNode(id: string, text: string, depth = 0, children: MindNode[] = []): MindNode {
    return {
      id,
      text,
      depth,
      children,
    };
  }