module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated v4 delega al plugin di worklets — deve essere SEMPRE l'ultimo
      'react-native-worklets/plugin',
    ],
  };
};
