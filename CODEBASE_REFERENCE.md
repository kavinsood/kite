# Kite - TipTap Editor Codebase Reference

## Overview

**Kite** is a modern, feature-rich rich-text editor built with React, TypeScript, and TipTap. It's designed for deployment on Cloudflare Workers with a comprehensive component architecture, local persistence features, and extensible editor functionality.

## 🏗️ Project Architecture

### Core Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Editor**: TipTap (ProseMirror-based)
- **Styling**: SCSS with CSS custom properties
- **Deployment**: Cloudflare Workers
- **Package Manager**: pnpm ([memory reference][[memory:7050670888353255928]])

### Build & Deployment
```bash
# Development
pnpm dev

# Build
pnpm build

# Deploy to Cloudflare
pnpm deploy

# Linting
pnpm lint
```

## 📁 Directory Structure

```
kite/
├── @/                           # Source code with path alias
│   ├── components/              # All React components
│   │   ├── tiptap-extension/    # Custom TipTap extensions
│   │   ├── tiptap-icons/        # SVG icon components
│   │   ├── tiptap-node/         # Custom node implementations
│   │   ├── tiptap-templates/    # Complete editor templates
│   │   ├── tiptap-ui/           # Editor UI components
│   │   └── tiptap-ui-primitive/ # Base UI primitives
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility functions
│   └── styles/                  # Global SCSS styles
├── src/                         # App entry point
├── worker/                      # Cloudflare Worker code
└── public/                      # Static assets
```

## 🧩 Component Architecture

### 1. TipTap Extensions (`@/components/tiptap-extension/`)

#### Link Extension (`link-extension.ts`)
- **Purpose**: Enhanced link handling with click selection and keyboard navigation
- **Features**: 
  - Escape key handling for link selection
  - Auto-selection on link click
  - Safe URL parsing (excludes javascript: URLs)

#### Selection Extension (`selection-extension.ts`)
- **Purpose**: Enhanced text selection behaviors
- **Features**: Custom selection handling and state management

#### Trailing Node Extension (`trailing-node-extension.ts`)
- **Purpose**: Ensures editor always has a trailing paragraph node
- **Features**: Automatic node insertion at document end

### 2. TipTap UI Primitives (`@/components/tiptap-ui-primitive/`)

#### Button (`button/`)
- **Core Component**: `button.tsx`
- **Features**:
  - Tooltip integration with delay
  - Keyboard shortcut display (platform-aware)
  - Multiple style variants via `data-style` attribute
  - Accessibility support
- **Styling**: `button.scss`, `button-colors.scss`, `button-group.scss`

#### Toolbar (`toolbar/`)
- **Components**: `toolbar.tsx`, toolbar groups, separators
- **Features**: Responsive toolbar layout with grouping

#### Other Primitives
- **Dropdown Menu**: Custom dropdown with positioning
- **Popover**: Floating UI-based popover component
- **Separator**: Visual separators for UI organization
- **Spacer**: Flexible spacing component
- **Tooltip**: Accessible tooltip implementation

### 3. TipTap UI Components (`@/components/tiptap-ui/`)

#### Mark Button (`mark-button/`)
- **Purpose**: Toggles text formatting (bold, italic, etc.)
- **Supported Marks**: bold, italic, strike, code, underline, superscript, subscript
- **Features**:
  - Schema validation
  - Keyboard shortcuts
  - Active state management
  - Conditional visibility

#### Heading Components
- **HeadingDropdownMenu**: Level selection (H1-H6)
- **HeadingButton**: Individual heading toggle

#### List Components
- **ListDropdownMenu**: List type selection (bullet, ordered, task)
- **ListButton**: Individual list toggle

#### Special Components
- **ColorHighlightPopover**: Text highlighting with color picker
- **LinkPopover**: Link insertion/editing interface
- **ImageUploadButton**: File upload handling
- **TextAlignButton**: Text alignment controls
- **UndoRedoButton**: History navigation

#### Persistence Components
- **PersistenceControls**: Manual save/load/clear buttons
- **PersistenceIndicator**: Shows save status with timestamps

### 4. TipTap Nodes (`@/components/tiptap-node/`)

#### Image Upload Node (`image-upload-node/`)
- **Extension**: `image-upload-node-extension.ts`
- **Component**: `image-upload-node.tsx`
- **Features**:
  - Drag & drop support
  - Progress tracking
  - File size validation (5MB limit)
  - Abort capability

#### Other Nodes
- **Code Block**: Syntax-highlighted code blocks
- **List Node**: Enhanced list rendering
- **Image Node**: Basic image handling
- **Paragraph Node**: Enhanced paragraph styling

### 5. Templates (`@/components/tiptap-templates/`)

#### Simple Editor (`simple/`)
- **Main Component**: `simple-editor.tsx`
- **Features**:
  - Complete editor setup
  - Mobile-responsive toolbar
  - Theme toggle support
  - Persistence integration
  - All formatting options

## 🪝 Custom Hooks (`@/hooks/`)

### Core Editor Hook
#### `use-tiptap-editor.ts`
- **Purpose**: Provides access to editor instance from context or prop
- **Usage**: Consistent editor access across components

### Persistence Hook
#### `use-editor-persistence.ts`
- **Purpose**: Automatic content persistence to localStorage
- **Features**:
  - Auto-save with debouncing (1s default)
  - Manual save/load/clear operations
  - Status tracking (saving, saved, unsaved)
  - Error handling
  - Timestamp tracking
- **Configuration**:
  ```typescript
  {
    storageKey?: string          // localStorage key
    debounceMs?: number         // Auto-save delay (1000ms)
    autoSave?: boolean          // Enable auto-save (true)
    onSave?: (content) => void  // Save callback
    onLoad?: (content) => void  // Load callback
    onError?: (error) => void   // Error callback
  }
  ```

### UI Hooks
#### `use-mobile.ts`
- **Purpose**: Detects mobile viewport
- **Breakpoint**: 768px

#### `use-window-size.ts`
- **Purpose**: Tracks window dimensions
- **Features**: Debounced resize handling

#### `use-cursor-visibility.ts`
- **Purpose**: Manages cursor visibility states
- **Features**: Focus/blur tracking, selection monitoring

#### `use-menu-navigation.ts`
- **Purpose**: Keyboard navigation for dropdown menus
- **Features**: Arrow key navigation, escape handling

#### `use-focus-mode.ts`
- **Purpose**: Creates a distraction-free writing experience by fading out the toolbar when the user is typing.
- **Behavior**:
  - **Activation**: Focus mode is triggered automatically after a brief period of typing (`enterFocusDelay`).
  - **Typing**: While actively typing, the toolbar is forced to be hidden, regardless of mouse position. The fade-out is a long, smooth transition to feel elegant.
  - **Reveal**: Moving the mouse (even slightly) immediately cancels the "typing" state, allowing the toolbar to fade back into view based on a hover state.
  - **Inactivity**: The "typing" state automatically ends after a configurable period of inactivity (`exitFocusDelay`), allowing the hover-to-reveal behavior to resume. Focus mode itself remains active.
  - **Manual Exit**: Pressing `Escape` or `Cmd/Ctrl+/` will fully exit focus mode. It also exits automatically if the editor loses focus.
- **Features**:
  - Auto-detects typing via editor `update` events.
  - Distinguishes between active typing and mouse hover to control toolbar visibility.
  - Configurable enter/exit delays.
  - Mobile-aware (disabled on mobile viewports).
  - Manual state controls for programmatic use.
- **Configuration**:
  ```typescript
  {
    editor: Editor | null         // TipTap editor instance
    enterFocusDelay?: number     // Delay before fade-out begins (e.g., 100ms)
    exitFocusDelay?: number      // Delay to reset typing status after inactivity (e.g., 3000ms)
    enabled?: boolean            // Enable/disable focus mode (true)
  }
  ```

## 🛠️ Utilities (`@/lib/`)

### TipTap Utils (`tiptap-utils.ts`)

#### Schema Validation
```typescript
isMarkInSchema(markName: string, editor: Editor): boolean
isNodeInSchema(nodeName: string, editor: Editor): boolean
```

#### Mark Operations
```typescript
getActiveMarkAttrs(editor: Editor, markName: string): Attrs | null
```

#### Node Utilities
```typescript
isEmptyNode(node?: Node): boolean
findNodePosition({ editor, node?, nodePos? }): { pos: number; node: Node } | null
```

#### Image Upload
```typescript
handleImageUpload(file: File, onProgress?, abortSignal?): Promise<string>
convertFileToBase64(file: File, abortSignal?): Promise<string>
```

#### CSS Utilities
```typescript
cn(...classes): string  // Conditional class names
```

## 🎨 Styling System (`@/styles/`)

### Variables (`_variables.scss`)
- **Color System**: Light/dark mode with alpha variants
- **Brand Colors**: Purple-based brand palette
- **Semantic Colors**: Green, yellow, red for status
- **Spacing**: Consistent radius and spacing scales
- **Transitions**: Predefined easing and durations
- **Shadows**: Elevation system

### Theme Support
- **Light Mode**: Default theme with light background
- **Dark Mode**: Dark theme activated via `.dark` class
- **CSS Custom Properties**: Dynamic theming support

### Animations (`_keyframe-animations.scss`)
- **Loading Animations**: Spinner, pulse effects
- **Transition Effects**: Smooth state changes

## 🔧 Configuration Files

### TypeScript Configuration
- **tsconfig.json**: Base TypeScript config
- **tsconfig.app.json**: App-specific settings
- **tsconfig.node.json**: Node.js compatibility
- **tsconfig.worker.json**: Worker-specific types

### Build Configuration
#### Vite (`vite.config.ts`)
- **Plugins**: React, Cloudflare integration
- **Path Alias**: `@` mapped to `./@`
- **Build Optimization**: Production optimizations

#### Cloudflare (`wrangler.jsonc`)
- **Worker Configuration**: Entry point, compatibility date
- **Assets**: SPA routing support
- **Observability**: Monitoring enabled

### Linting ([memory reference][[memory:442055615282021518]])
#### ESLint (`eslint.config.js`)
- **Plugins**: react-hooks, react-refresh, react-x, react-dom
- **Configuration**: Recommended rules for all plugins
- **TypeScript Support**: Full TypeScript integration

### Package Management
#### `package.json`
- **Dependencies**: TipTap ecosystem, React 19, utility libraries
- **DevDependencies**: Build tools, linting, TypeScript
- **Scripts**: Development, build, deploy, lint workflows

## 🚀 Features

### Editor Capabilities
- **Rich Text Formatting**: Bold, italic, underline, strikethrough, code
- **Headings**: H1-H6 with dropdown selection
- **Lists**: Bullet, ordered, task lists
- **Blocks**: Blockquotes, code blocks
- **Media**: Image upload with progress tracking
- **Links**: Enhanced link handling with popover editor
- **Text Alignment**: Left, center, right, justify
- **Typography**: Subscript, superscript, highlighting
- **History**: Undo/redo functionality

### Persistence Features ([Detailed in PERSISTENCE_FEATURES.md])
- **Auto-save**: 1-second debounced automatic saving
- **Manual Controls**: Save, load, clear buttons
- **Status Indicator**: Real-time save status with timestamps
- **Local Storage**: Browser-based content persistence
- **Error Handling**: Graceful localStorage failure handling

### Responsive Design
- **Mobile Support**: Adaptive toolbar for mobile devices
- **Touch Optimization**: Touch-friendly controls
- **Responsive Layout**: Flexible editor sizing

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: Comprehensive accessibility labels
- **Focus Management**: Proper focus handling
- **Screen Reader Support**: Semantic markup

## 🔄 Cloudflare Worker

### Worker Entry (`worker/index.ts`)
- **API Routes**: `/api/*` endpoint handling
- **Static Assets**: SPA fallback support
- **Simple API**: Basic JSON response example

### Deployment
```bash
pnpm deploy  # Build and deploy to Cloudflare
```

## 📋 Development Guidelines

### Component Structure
1. **Imports**: Group by category (React, TipTap, custom)
2. **Types**: Define interfaces before components
3. **Hooks**: Custom hooks before component logic
4. **Exports**: Named exports with default export

### Styling Conventions
1. **SCSS Modules**: Component-specific styles
2. **CSS Variables**: Use design tokens
3. **Class Naming**: BEM-inspired with `tiptap-` prefix
4. **Responsive**: Mobile-first approach

### State Management
1. **Local State**: React useState for component state
2. **Context**: Editor context for shared state
3. **Persistence**: localStorage for content persistence
4. **No External State**: No Redux/Zustand needed

## 🧪 Testing & Quality

### Linting
- **ESLint**: React, TypeScript, accessibility rules
- **Prettier**: Code formatting (via ESLint integration)

### Type Safety
- **Strict TypeScript**: Full type checking enabled
- **Editor Types**: TipTap type definitions
- **Worker Types**: Cloudflare Worker types

## 📚 Key Dependencies

### Core Dependencies
- **@tiptap/react**: TipTap React integration
- **@tiptap/starter-kit**: Essential TipTap extensions
- **@tiptap/extension-***: Individual TipTap extensions
- **@floating-ui/react**: Popover positioning
- **tiptap-markdown**: Markdown support

### Development Dependencies
- **@vitejs/plugin-react**: React Vite integration
- **@cloudflare/vite-plugin**: Cloudflare deployment
- **sass-embedded**: SCSS compilation
- **typescript-eslint**: TypeScript ESLint integration

## 🎯 Usage Examples

### Basic Editor Setup
```tsx
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor'

function App() {
  return <SimpleEditor />
}
```

### Custom Component Integration
```tsx
import { MarkButton } from '@/components/tiptap-ui/mark-button'

// Bold button with custom styling
<MarkButton type="bold" className="custom-bold" />
```

### Persistence Hook Usage
```tsx
import { useEditorPersistence } from '@/hooks/use-editor-persistence'

const { save, load, clear, isSaving, lastSaved } = useEditorPersistence(editor, {
  storageKey: 'my-editor-content',
  debounceMs: 2000,
  onSave: (content) => console.log('Saved:', content)
})
```

This reference document provides a complete overview of the Kite TipTap editor codebase. Each component, hook, and utility is designed to work together to create a powerful, extensible rich-text editing experience. 