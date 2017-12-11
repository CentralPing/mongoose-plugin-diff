mongoose-plugin-diff
====================

[![Build Status](https://travis-ci.org/CentralPing/mongoose-plugin-diff.svg?branch=master)](https://travis-ci.org/CentralPing/mongoose-plugin-diff)
[![Coverage Status](https://coveralls.io/repos/github/CentralPing/mongoose-plugin-diff/badge.svg)](https://coveralls.io/github/CentralPing/mongoose-plugin-diff)
[![Dependency Status for CentralPing/mongoose-plugin-diff](https://david-dm.org/CentralPing/mongoose-plugin-diff.svg)](https://david-dm.org/CentralPing/mongoose-plugin-diff)
[![Known Vulnerabilities](https://snyk.io/test/github/centralping/mongoose-plugin-diff/badge.svg)](https://snyk.io/test/github/centralping/mongoose-plugin-diff)

A [mongoose.js](https://github.com/Automattic/mongoose/) plugin to report document modification differences.

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
<a name="module_mongoose-plugin-diff..options"></a>

### mongoose-plugin-diff~options
**Kind**: inner property of [<code>mongoose-plugin-diff</code>](#module_mongoose-plugin-diff)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>object</code> |  |  |
| [options.optionKey] | <code>string</code> | <code>&quot;diff&quot;</code> | the path options key to mark paths for inclusion in monitoring for modification. If no paths are tagged, document modification is monitored. |
| [options.snapShotPath] | <code>string</code> | <code>&quot;__snapShot&quot;</code> | the path to store snap shot properties for capturing original values. |
| [options.methodName] | <code>string</code> | <code>&quot;getDiff&quot;</code> | the method name for creating an object with the original values for modified properties. |


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
    diff: true // indicates to monitor this field for modification
  }
});
schema.plugin(diffPlugin);

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
