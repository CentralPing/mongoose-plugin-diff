'use strict';

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

function diffPlugin(schema, options) {
  /**
   * @param {object} [options]
   * @param {string} [options.optionKey=diff] - the path options key to mark paths for inclusion in monitoring for modification. If no paths are tagged, document modification is monitored.
   * @param {string} [options.snapShotPath=__snapShot] - the path to store snap shot properties for capturing original values.
   * @param {string} [options.methodName=getDiff] - the method name for creating an object with the original values for modified properties.
   */
  options = _.merge({
    optionKey: 'diff',
    snapShotPath: '__snapShot',
    methodName: 'getDiff'
  }, options);

  const paths = Object.keys(schema.paths).filter(path => {
    const schemaType = schema.path(path);

    return _.get(schemaType, `options.${options.optionKey}`);
  });

  const setSnapShotFn = _.partial(setSnapShot, options.snapShotPath, paths);
  schema.post('init', setSnapShotFn);
  schema.post('save', setSnapShotFn);

  const getDiffFn = _.partial(getDiff, options.snapShotPath);
  schema.method(options.methodName, getDiffFn);
}

function setSnapShot(snapShotPath, paths, doc) {
  let snapShot = doc.toObject({ depopulate: true });

  if (paths.length) {
    snapShot = _.pick(snapShot, paths);
  }

  _.set(doc, snapShotPath, snapShot);
}

function getDiff(snapShotPath) {
  const doc = this;

  return _.pick(
    _.get(doc, snapShotPath, {}),
    doc.modifiedPaths().filter(modPath => doc.isDirectModified(modPath))
  );
}
