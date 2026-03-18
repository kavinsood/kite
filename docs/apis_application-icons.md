# Application Icons

## Introduction

Configure your Applications icons. These icons are used for the icon of your app in the app switcher and in the file system like on your Desktop or in the Applications folder.

### MacOS

The default location for the icon folder is in the root of your repo in a folder named `icon.iconset`.

[Read Apple's developer docs](https://developer.apple.com/documentation/xcode/configuring-your-app-icon) for more details.

You should include different icon sizes in your `icon.iconset` folder. We recommend the following sizes and naming convention:

```
icon_16x16.png
[email protected]
icon_32x32.png
[email protected]
icon_128x128.png
[email protected]
icon_256x256.png
[email protected]
icon_512x512.png
[email protected]
```

You can specify a custom path for the `icon.iconset` folder in your [electrobun.config](/electrobun/docs/apis/cli/build-configuration) file.

### Windows

Set the `build.win.icon` option in your [electrobun.config](/electrobun/docs/apis/cli/build-configuration) file to a path to an `.ico` or `.png` file. If you provide a PNG, it will be automatically converted to ICO format during the build.

The icon is embedded into the launcher executable, the Bun runtime executable, and the installer, so it appears in the taskbar, desktop shortcuts, and File Explorer.

For best results with `.ico` files, include multiple sizes: 16x16, 32x32, 48x48, and 256x256. If you provide a `.png` it should be at least 256x256 pixels.

```javascript
// electrobun.config.ts
const config: ElectrobunConfig = {
  build: {
    win: {
      icon: "assets/icon.ico",
      // or use a PNG from your macOS iconset:
      // icon: "icon.iconset/icon_256x256.png",
    },
  },
};
```

### Linux

Set the `build.linux.icon` option in your [electrobun.config](/electrobun/docs/apis/cli/build-configuration) file to a path to a `.png` file. The icon should be at least 256x256 pixels.

The icon is used for the window icon, taskbar, and the generated `.desktop` entry.

```javascript
// electrobun.config.ts
const config: ElectrobunConfig = {
  build: {
    linux: {
      icon: "assets/icon.png",
      // or use a PNG from your macOS iconset:
      // icon: "icon.iconset/icon_256x256.png",
    },
  },
};
```

**Tip:** You can reuse PNGs from your macOS `icon.iconset` folder for Windows and Linux builds, so you don't need to maintain separate icon files per platform.