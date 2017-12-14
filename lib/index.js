const _ = require('lodash');

const PATH_SEP = '.$.';

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
  paths = getPaths(schema, optionKey),
  methodName = 'getDiff'
} = {}) {
  // Use a single element array for maintain a reference to the snap shot. This makes it easier to
  //  replace the snap shot with needing to clear the object between snap shots.
  const snapShot = [{}];

  const setSnapShotFn = _.partial(setSnapShot, snapShot, paths);
  schema.post('init', setSnapShotFn);
  schema.post('save', setSnapShotFn);

  const getDiffFn = _.partial(getDiff, snapShot, paths);
  schema.method(methodName, getDiffFn);
}

/**
 * @private
 * @param {Object[]} snapShot - A single element array with the snap shop of the original values.
 * @param {String[]} paths - the options key to mark paths for inclusion in
 * monitoring for modification.
 * @param {MongooseDocument} doc - the mongoose document being monitored.
 * @return {Object} - object with original values that have been modified.
 */
function setSnapShot(snapShot, paths, doc) {
  snapShot[0] = doc.toObject({ depopulate: true });
}

/**
 * @private
 * @param {Object[]} snapShot - A single element array with the snap shop of the original values.
 * @param {String[]} paths - the options key to mark paths for inclusion in
 * monitoring for modification.
 * @return {Object} - object with original values that have been modified.
 */
function getDiff(snapShot, paths) {
  const doc = this;

  return doc.modifiedPaths().reduce((diff, path) => {
    if (paths.length) {
      const matchPath = path.replace(/\.\d+\./g, PATH_SEP);

      if (paths.indexOf(matchPath) > -1) {
        _.set(diff, path, _.get(snapShot[0], path));
      }
    } else if (doc.isDirectModified(path)) {
      _.set(diff, path, _.get(snapShot[0], path));
    }

    return diff;
  }, {});
}

/**
 * @private
 * @param {Schema} schema - mongoose schema
 * @param {String} optionKey - the options key to mark paths for inclusion in
 * monitoring for modification.
 * @return {String[]} - full paths for property that is marked by optionkey
 */
function getPaths(schema, optionKey) {
  return Object.keys(schema.paths).reduce((paths, path) => {
    const schemaType = schema.path(path);

    if (_.get(schemaType, `options.${optionKey}`)) {
      paths.push(path);
    }

    if (_.has(schemaType, 'schema')) {
      const subPaths = getPaths(schemaType.schema, optionKey).map(subPath => `${path}${PATH_SEP}${subPath}`);
      paths.push(...subPaths);
    }

    return paths;
  }, []);
}
