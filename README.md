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
| [options.methodName] | <code>String</code> | <code>getDiff</code> | the method name for creating an object with the original values for modified properties. |


## Examples

### With Monitoring Entire Document
```js
const diffPlugin = require('mongoose-plugin-diff');
const schema = Schema({foo: String, bar: String});
schema.plugin(diffPlugin);

const Foo = mongoose.model('Foo', schema);
const newFoo = new Foo({foo: 'My orig', bar: 'My other orig'});

newFoo.getDiff(); // {foo: undefined, bar: undefined}

newFoo.save().then(foo => {
  foo.getDiff(); // {}

  foo.foo = 'My update';
  foo.getDiff(); // {foo: 'My orig'}

  return foo.save();
}).then(foo => { // {foo: 'My update', bar: 'My other orig'}
  foo.getDiff(); // {}
});
```

### With Monitoring Selected Properties
```js
const diffPlugin = require('mongoose-plugin-diff');
const schema = Schema({
  foo: String,
  bar: {
    type: String,
    diff: true // indicates to monitor this property for modification
  }
});
schema.plugin(diffPlugin);

// Alternatively, paths to monitor can be provided by the plugin options
// schema.plugin(diffPlugin, { paths: ['bar'] });

const newFoo = new Foo({foo: 'My orig', bar: 'My other orig'});

newFoo.getDiff(); // {bar: undefined}

newFoo.save().then(foo => {
  foo.getDiff(); // {}

  foo.foo = 'My update';
  foo.getDiff(); // {}

  foo.bar = 'My other update';
  foo.getDiff(); // {bar: 'My other orig'}

  return foo.save();
}).then(foo => {
  foo.getDiff(); // {}
});
```

### With Monitoring Subdocument Arrays
_CAUTION: The following does not necessarily reflect the current output due to a possible issue with Mongoose. See issue [#5904](https://github.com/Automattic/mongoose/issues/5904) for reference. This documentation and possible code changes will be made once it is resolved._

If no specific properties are monitored (either by option key or plugin config) then subdocument arrays should report modifications as expected.
```js
const diffPlugin = require('mongoose-plugin-diff');
const schema = Schema({foo: String, bar: [{far: String, boo: String}]});
schema.plugin(diffPlugin);

const Foo = mongoose.model('Foo', schema);
const newFoo = new Foo({foo: 'My orig', bar: [{}, {far: 'My sub orig'}]});

newFoo.getDiff(); // {foo: undefined, bar: [ , {far: undefined}]}

newFoo.save().then(foo => {
  foo.getDiff(); // {}

  foo.bar[1].far = 'My update';
  foo.getDiff(); // {bar: [ , {far: 'My sub orig'}]}

  return foo.save();
}).then(foo => {
  foo.getDiff(); // {}
});
```

Monitoring specific properties by option key or plugin config.
```js
const diffPlugin = require('mongoose-plugin-diff');
const schema = Schema({
  foo: String,
  bar: [{
    far: String,
    boo: {
      type: String,
      diff: true // indicates to monitor this property for modification
    }
  }]});
schema.plugin(diffPlugin);

// Alternatively, paths to monitor can be provided by the plugin options.
// Note the separator '.$.' to indicate a subdocument array path
// schema.plugin(diffPlugin, { paths: ['bar.$.boo'] });

const Foo = mongoose.model('Foo', schema);
const newFoo = new Foo({foo: 'My orig', bar: [{far: 'My sub orig', boo: 'My other sub orig'}]});

newFoo.getDiff(); // {bar: [{boo: undefined}]}

newFoo.save().then(foo => {
  foo.getDiff(); // {}

  foo.bar[0].far = 'My sub update';
  foo.getDiff(); // {}

  foo.bar[0].boo = 'My other sub update';
  foo.getDiff(); // {bar: [{boo: 'My other sub orig'}]}

  return foo.save();
}).then(foo => {
  foo.getDiff(); // {}
});
```
# License

Apache 2.0
