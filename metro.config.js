// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Adicionar suporte a arquivos wasm
config.resolver.assetExts.push('wasm');
module.exports = config