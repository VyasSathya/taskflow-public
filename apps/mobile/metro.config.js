const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get monorepo root
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const appsNodeModules = path.resolve(projectRoot, '../node_modules');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  appsNodeModules,  // apps/node_modules (where expo-router is hoisted)
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure we can resolve the shared package
config.resolver.extraNodeModules = {
  '@vibetasks/shared': path.resolve(workspaceRoot, 'packages/shared'),
};

module.exports = config;
