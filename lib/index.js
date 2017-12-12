const _ = require('lodash');

/**
 * @module mongoose-plugin-diff
 * @example
```js
const diffPlugin = require('mongoose-plugin-diff');
const schema = Schema({...});
schema.plugin(diffPlugin[, OPTIONS]);
```
*/

module.exports = diffPlugin;

/**
 * @param {Schema} schema - mongoose schema
 * @param {Object} [options]
 * @param {String} [options.optionKey=diff] - the options key to mark paths for inclusion in
 * monitoring for modification. If no properties are marked then monitor entire document.
 * @param {Array} [options.paths] - the paths for monitoring for modification. If specified then any
 * option keys will be ignored.
 * @param {String} [options.methodName=getDiff] - the method name for creating an object with the
 * original values for modified properties.
 */
function diffPlugin(schema, {
  optionKey = 'diff',
  paths = Object.keys(schema.paths).filter((path) => {
    const schemaType = schema.path(path);

    return _.get(schemaType, `options.${optionKey}`);
  }),
  methodName = 'getDiff'
} = {}) {
  const snapShot = [{}];

  const setSnapShotFn = _.partial(setSnapShot, snapShot, paths);
  schema.post('init', setSnapShotFn);
  schema.post('save', setSnapShotFn);

  const getDiffFn = _.partial(getDiff, snapShot, paths);
  schema.method(methodName, getDiffFn);
}

function setSnapShot(snapShot, paths, doc) {
  snapShot[0] = doc.toObject({ depopulate: true });

  if (paths.length) {
    snapShot[0] = _.pick(snapShot[0], paths);
  }
}

function getDiff(snapShot, paths) {
  const doc = this;
  const modifiedPaths = paths.length ?
    paths.filter(path => doc.isModified(path)) :
    doc.modifiedPaths().filter(modPath => doc.isDirectModified(modPath));

  return _.pick(snapShot[0], modifiedPaths);
}
