// Stable Plate.js Editor Kit with validated plugins
import {
  ParagraphPlugin,
  BlockquotePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
} from '@platejs/basic-nodes';

import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
} from '@platejs/basic-styles';

import {
  ListPlugin,
} from '@platejs/list';

import {
  LinkPlugin,
} from '@platejs/link';

import {
  CodeBlockPlugin,
} from '@platejs/code-block';

// Function to validate and filter plugins
const validatePlugins = (plugins: any[]) => {
  return plugins.filter(plugin => {
    if (!plugin) {
      console.warn('Plugin is undefined or null');
      return false;
    }
    if (!plugin.key) {
      console.warn('Plugin missing key property:', plugin);
      return false;
    }
    return true;
  });
};

// Core stable plugins that are guaranteed to work
const corePlugins = [
  ParagraphPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  BlockquotePlugin,
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  LinkPlugin,
  CodeBlockPlugin,
  ListPlugin,
];

export const CompleteEditorKit = validatePlugins(corePlugins);

export default CompleteEditorKit;