const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  };

  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext: string) => ext !== 'svg'), // Fixed: Added : string
    sourceExts: [...resolver.sourceExts, 'svg'],
    unstable_enablePackageExports: false,

    // Fixed: Added types to context, moduleName, and platform
    resolveRequest: (context: any, moduleName: string, platform: string | null) => {
      if (moduleName === 'axios' || moduleName.startsWith('axios/')) {
        return context.resolveRequest(
          context,
          'axios/dist/browser/axios.cjs',
          platform
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  };

  return config;
})();