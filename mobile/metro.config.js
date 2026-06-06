// Metro config for SEED mobile inside the pnpm monorepo.
// - watchFolders: lets Metro follow workspace symlinks (@seed/api, @seed/schemas)
// - nodeModulesPaths: resolve deps from the package first, then the workspace root
// - NativeWind: compiles global.css + className props
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
