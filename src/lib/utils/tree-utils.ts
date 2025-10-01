// Tree Utility Functions for hierarchical data structures
export const TreeUtils = {
  findById: <T extends { id: string }>(items: T[], id: string): T | undefined => {
    return items.find(item => item.id === id);
  },
  
  getChildren: <T extends { id: string; parentId: string | null }>(
    items: T[], 
    parentId: string | null
  ): T[] => {
    return items.filter(item => item.parentId === parentId);
  },
  
  getPath: <T extends { id: string; parentId: string | null }>(
    items: T[], 
    id: string
  ): T[] => {
    const path: T[] = [];
    let currentId: string | null = id;
    
    while (currentId) {
      const item = items.find(item => item.id === currentId);
      if (item) {
        path.unshift(item);
        currentId = item.parentId;
      } else {
        break;
      }
    }
    
    return path;
  },

  getAllDescendants: <T extends { id: string; parentId: string | null }>(
    items: T[], 
    parentId: string | null
  ): T[] => {
    const descendants: T[] = [];
    const children = TreeUtils.getChildren(items, parentId);

    children.forEach(child => {
      descendants.push(child);
      descendants.push(...TreeUtils.getAllDescendants(items, child.id));
    });
    
    return descendants;
  },
  
  searchItems: <T extends Record<string, any>>(
    items: T[], 
    query: string, 
    searchField: keyof T = 'name'
  ): T[] => {
    return items.filter(item => 
      String(item[searchField]).toLowerCase().includes(query.toLowerCase())
    );
  },

  isDescendant: <T extends { id: string; parentId: string | null }>(
    items: T[],
    ancestorId: string,
    potentialDescendantId: string
  ): boolean => {
    const descendants = TreeUtils.getAllDescendants(items, ancestorId);
    return descendants.some(descendant => descendant.id === potentialDescendantId);
  }
};
