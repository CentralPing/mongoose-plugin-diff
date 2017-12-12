mongoose-plugin-diff
====================

[![Build Status](https://travis-ci.org/CentralPing/mongoose-plugin-diff.svg?branch=master)](https://travis-ci.org/CentralPing/mongoose-plugin-diff)
[![Coverage Status](https://coveralls.io/repos/github/CentralPing/mongoose-plugin-diff/badge.svg)](https://coveralls.io/github/CentralPing/mongoose-plugin-diff)
[![Dependency Status](https://david-dm.org/CentralPing/mongoose-plugin-diff.svg)](https://david-dm.org/CentralPing/mongoose-plugin-diff)
[![Greenkeeper Status](https://badges.greenkeeper.io/CentralPing/mongoose-plugin-diff.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/centralping/mongoose-plugin-diff/badge.svg)](https://snyk.io/test/github/centralping/mongoose-plugin-diff)
[![npm version](https://img.shields.io/npm/v/mongoose-plugin-diff.svg)](https://www.npmjs.com/package/mongoose-plugin-diff)

A [mongoose.js](https://github.com/Automattic/mongoose/) plugin to report document modification differences.

The plugin uses mongoose's modification methods for determining which properties have been changed.

*The original document values are snap shot post-init for existing documents as well as post-save for all documents.*

## Installation

`npm i --save mongoose-plugin-diff`

## API Reference
**Example**  
```js
const diffPlugin = require('mongoose-plugin-diff');
const schema = Schema({...});
schema.plugin(diffPlugin[, OPTIONS]);
```
<a name="module_mongoose-plugin-diff..diffPlugin"></a>

### mongoose-plugin-diff~diffPlugin(schema, [options])
**Kind**: inner method of [<code>mongoose-plugin-diff</code>](#module_mongoose-plugin-diff)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| schema | <code>Schema</code> |  | mongoose schema |
| [options] | <code>Object</code> |  |  |
| [options.optionKey] | <code>String</code> | <code>diff</code> | the options key to mark paths for inclusion in monitoring for modification. If no properties are marked then monitor entire document. |
| [options.paths] | <code>Array</code> |  | the paths for monitoring for modification. If specified then any option keys will be ignored. |
| [options.snapShotPath] | <code>String</code> | <code>__snapShot</code> | the path to store snap shot properties for capturing original values. |
| [options.methodName] | <code>String</code> | <code>getDiff</code> | the method name for creating an object with the original values for modified properties. |


## Examples

### With Monitoring Entire Document
```js
const diffPlugin = require('mongoose-plugin-diff');
const schema = Schema({foo: String, bar: String});
schema.plugin(diffPlugin);

const Foo = mongoose.model('Foo', schema);
Foo.findOne().then(foo => { // {foo: 'My orig', bar: 'My other orig'}
  foo.getDiff(); // {}

  foo.foo = 'My update';
  foo.getDiff(); // {foo: 'My orig'}

  foo.foo = 'My second update';
  return foo.save();
}).then(foo => { // {foo: 'My second update', bar: 'My other orig'}
  foo.getDiff(); // {foo: 'My update'}
});
```

### With Monitoring Selected Properties
```js
const diffPlugin = require('mongoose-plugin-diff');
const schema = Schema({
  foo: {
    type: String
  },
  bar: {
    type: String,
    diff: true // indicates to monitor this property for modification
  }
});
schema.plugin(diffPlugin);

// Alternatively, paths to monitor can be provided by the plugin options
// schema.plugin(diffPlugin, { paths: ['bar'] });

const Foo = mongoose.model('Foo', schema);
Foo.findOne().then(foo => { // {foo: 'My orig', bar: 'My other orig'}
  foo.getDiff(); // {}

  foo.foo = 'My update';
  foo.getDiff(); // {}

  foo.bar = 'My other update';
  foo.getDiff(); // {bar: 'My other orig'}

  foo.bar = 'My other next update';
  return foo.save();
}).then(foo => { // {foo: 'My update', bar: 'My other second update'}
  foo.getDiff(); // {foo: 'My other update'}
});
```

# License

Apache 2.0
