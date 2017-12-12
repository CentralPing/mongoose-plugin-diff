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
 * @param {String} [options.snapShotPath=__snapShot] - the path to store snap shot properties for
 * capturing original values.
 * @param {String} [options.methodName=getDiff] - the method name for creating an object with the
 * original values for modified properties.
 */
function diffPlugin(schema, {
  optionKey = 'diff',
  paths = Object.keys(schema.paths).filter((path) => {
    const schemaType = schema.path(path);

    return _.get(schemaType, `options.${optionKey}`);
  }),
  snapShotPath = '__snapShot',
  methodName = 'getDiff'
} = {}) {
  const setSnapShotFn = _.partial(setSnapShot, snapShotPath, paths);
  schema.post('init', setSnapShotFn);
  schema.post('save', setSnapShotFn);

  const getDiffFn = _.partial(getDiff, snapShotPath, paths);
  schema.method(methodName, getDiffFn);
}

function setSnapShot(snapShotPath, paths, doc) {
  let snapShot = doc.toObject({ depopulate: true });

  if (paths.length) {
    snapShot = _.pick(snapShot, paths);
  }

  _.set(doc, snapShotPath, snapShot);
}

function getDiff(snapShotPath, paths) {
  const doc = this;
  const modifiedPaths = paths.length ?
    paths.filter(path => doc.isModified(path)) :
    doc.modifiedPaths().filter(modPath => doc.isDirectModified(modPath));

  return _.pick(
    _.get(doc, snapShotPath, {}),
    modifiedPaths
  );
}
