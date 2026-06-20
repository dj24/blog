module.exports = function wgslLoader(source) {
  return `export default ${JSON.stringify(source)};`;
};
