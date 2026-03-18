# Electrobun CLI Commands

The Electrobun CLI provides commands for initializing new projects and building your applications for different environments.

## Installation

When you install Electrobun, the CLI tool is added to your `node_modules/bin` folder:

```
bun install electrobun
```

This makes the `electrobun` command available in your npm scripts or via `bunx`/`npx`.

## Commands

### `electrobun init`

Initializes a new Electrobun project with starter templates.

#### Usage

```bash
# Interactive template selection
electrobun init

# Direct template selection
electrobun init [template-name]
```

#### Available Templates

*   `hello-world` - Basic single-window application
*   `photo-booth` - Camera app with photo capture functionality
*   `interactive-playground` - An interactive playground of Electrobun apis
*   `multitab-browser` - Multi-tabbed web browser

#### Examples

```bash
# Choose template interactively
bunx electrobun init

# Initialize with photo-booth template directly
bunx electrobun init photo-booth

# Initialize with multitab-browser template
bunx electrobun init multitab-browser
```

### `electrobun build`

Builds your Electrobun application according to the configuration in `electrobun.config.ts`.

#### Usage

```
electrobun build [options]
```

#### Options

Option

Description

Values

Default

`--env`

Build environment

`dev`, `canary`, `stable`

`dev`

Builds always target the current host platform and architecture. To build for multiple platforms, use CI runners for each OS/architecture (see [Cross-Platform Development](/electrobun/docs/guides/cross-platform-development)).

#### Examples

```bash
# Development build for current platform
electrobun build

# Development build with environment flag
electrobun build --env=dev

# Canary build
electrobun build --env=canary

# Stable (production) build
electrobun build --env=stable
```

## Build Environments

### Development (`dev`)

*   Outputs logs and errors to terminal
*   No code signing or notarization
*   Creates build in `build/` folder
*   No artifacts generated
*   Fast iteration for testing

### Canary

*   Pre-release/beta builds
*   Optional code signing and notarization
*   Generates distribution artifacts
*   Creates update manifests for auto-updates
*   Suitable for testing with limited users

### Stable

*   Production-ready builds
*   Full code signing and notarization (if configured)
*   Optimized and compressed artifacts
*   Ready for distribution to end users
*   Generates all update files

## Build Script Examples

### Basic Setup

```javascript
// package.json
{
  "scripts": {
    "dev": "electrobun build && electrobun dev",
    "build": "electrobun build --env=canary",
    "build:stable": "electrobun build --env=stable"
  }
}
```

### Development Workflow

```javascript
// package.json
{
  "scripts": {
    "dev": "electrobun build --env=dev && electrobun dev",
    "dev:watch": "nodemon --watch src --exec 'bun run dev'",
    "test": "bun test && bun run build"
  }
}
```

### CI Build Scripts

For multi-platform distribution, run the same build command on each platform's CI runner:

```javascript
// package.json
{
  "scripts": {
    "build:dev": "electrobun build",
    "build:canary": "electrobun build --env=canary",
    "build:stable": "electrobun build --env=stable"
  }
}
```