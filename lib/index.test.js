'use strict';

const mongoose = require('mongoose');
const faker = require('faker');
const _ = require('lodash');

const diff = require('./');

const connectionString = process.env.MONGO_URL || 'mongodb://localhost/unit_test';

const Schema = mongoose.Schema;

const userData = {
  username: faker.internet.userName(),
  password: faker.internet.password(),
  name: {first: faker.name.firstName(), last: faker.name.lastName()},
  emails: [faker.internet.email()]
};

// Mongoose uses internal caching for models.
// While {cache: false} works with most models, models using references
// use the internal model cache for the reference.
// This removes the mongoose entirely from node's cache
delete require.cache.mongoose;

// Set Mongoose internal promise object to be the native Promise object
mongoose.Promise = global.Promise;

describe('Mongoose plugin: diff', () => {
  let connection;

  beforeAll(done => {
    connection = mongoose.createConnection(connectionString);
    connection.once('connected', done);
  });

  afterAll(done => {
    connection.db.dropDatabase(() => {
      connection.close(done);
    });
  });

  describe('with document creation', () => {
    let user;

    beforeEach(() => {
      const schema = userSchema();
      schema.plugin(diff);

      const User = model(connection, schema);

      user = new User(userData);
    });

    it('should have a `getDiff` method', () => {
      expect(user.getDiff).toBeInstanceOf(Function);
    });

    it('should not return differences on creation', () => {
      expect(user.getDiff()).toEqual({});
    });

    it('should return differences after initial save', () => {
      const origUsername = user.username;
      const origFirstName = user.name.first;

      return user.save({new: true}).then(savedUser => {
        savedUser.username = faker.internet.userName();
        savedUser.name.first = faker.name.firstName();

        expect(savedUser.getDiff()).toEqual({
          username: origUsername,
          name: {
            first: origFirstName
          }
        });

        return savedUser.save({new: true});
      });
    });

    it('should return differences after subsequent saves', () => {
      return user.save({new: true}).then(savedUser => {
        savedUser.username = faker.internet.userName();
        savedUser.name.first = faker.name.firstName();

        return savedUser.save({new: true});
      }).then(updatedUser => {
        const updatedUserName = updatedUser.username;
        updatedUser.username = faker.internet.userName();

        expect(updatedUser.getDiff()).toEqual({
          username: updatedUserName
        });
      });
    });
  });

  describe('with existing document manipulations', () => {
    let User;
    let user;

    beforeAll(() => {
      const schema = userSchema();

      schema.plugin(diff);

      User = model(connection, schema);
    });

    beforeEach(() => {
      const newUser = new User(userData);

      return newUser.save().then(savedUser =>
        User.findById(savedUser).exec()
      ).then(foundUser => user = foundUser);
    });

    it('should return differences', () => {
      const origUsername = user.username;
      const origFirstName = user.name.first;

      user.username = faker.internet.userName();
      user.name.first = faker.name.firstName();

      expect(user.getDiff()).toEqual({
        username: origUsername,
        name: {
          first: origFirstName
        }
      });
    });
  });

  describe('with specific paths', () => {
    let User;
    let user;

    beforeEach(() => {
      const schema = userSchema();

      schema.path('name.first').options.diff = true;
      schema.plugin(diff);

      User = model(connection, schema);
    });

    beforeEach(() => {
      const newUser = new User(userData);

      return newUser.save().then(savedUser =>
        User.findById(savedUser).exec()
      ).then(foundUser => user = foundUser);
    });

    it('should not return differences without matched path diff', () => {
      user.username = faker.internet.userName();
      user.name.last = faker.name.lastName();

      expect(user.getDiff()).toEqual({});
    });

    it('should return differences with matched path diff', () => {
      const origFirstName = user.name.first;
      user.name.first = faker.name.firstName();

      expect(user.getDiff()).toEqual({
        name: {
          first: origFirstName
        }
      });
    });
  });

  describe('with specific paths via options', () => {
    let User;
    let user;

    beforeEach(() => {
      const schema = userSchema();

      schema.plugin(diff, { paths: ['name.first'] });

      User = model(connection, schema);
    });

    beforeEach(() => {
      const newUser = new User(userData);

      return newUser.save().then(savedUser =>
        User.findById(savedUser).exec()
      ).then(foundUser => user = foundUser);
    });

    it('should not return differences without matched path diff', () => {
      user.username = faker.internet.userName();
      user.name.last = faker.name.lastName();

      expect(user.getDiff()).toEqual({});
    });

    it('should return differences with matched path diff', () => {
      const origFirstName = user.name.first;
      user.name.first = faker.name.firstName();

      expect(user.getDiff()).toEqual({
        name: {
          first: origFirstName
        }
      });
    });
  });

  describe('with subdocs', () => {
    let User;
    let user;

    beforeAll(() => {
      const sub = subSchema();

      const schema = userSchema({nicknames: [sub]});
      schema.plugin(diff);

      User = model(connection, schema);
    });

    beforeEach(() => {
      const newUser = new User(userData);

      newUser.nicknames.push({name: faker.name.firstName()});
      newUser.nicknames.push({name: faker.name.firstName()});

      return newUser.save().then(savedUser =>
        User.findById(savedUser).exec()
      ).then(foundUser => user = foundUser);
    });

    it('should return differences', () => {
      const origNickName = user.nicknames[0].name;

      user.nicknames[0].name = faker.name.firstName();

      expect(user.getDiff()).toEqual({
        nicknames: [{
          name: origNickName
        }]
      });
    });
  });

  describe('with specific paths on subdocs', () => {
    let User;
    let user;

    beforeEach(() => {
      const sub = subSchema();
      sub.path('name').options.diff = true;

      const schema = userSchema({nicknames: [sub]});

      schema.plugin(diff);

      User = model(connection, schema);
    });

    beforeEach(() => {
      const newUser = new User(userData);

      newUser.nicknames.push({name: faker.name.firstName()});
      newUser.nicknames.push({name: faker.name.firstName()});

      return newUser.save().then(savedUser =>
        User.findById(savedUser).exec()
      ).then(foundUser => user = foundUser);
    });

    it('should not return differences without matched path diff', () => {
      user.nicknames[0].primary = true;

      expect(user.getDiff()).toEqual({});
    });

    it('should return differences with matched path diff', () => {
      const origNickName = user.nicknames[0].name;

      user.nicknames[0].name = faker.name.firstName();

      expect(user.getDiff()).toEqual({
        nicknames: [{
          name: origNickName
        }]
      });
    });
  });
});

function model(connection, name, schema) {
  if (arguments.length === 2) {
    schema = name;
    name = 'Model';
  }

  // Specifying a collection name allows the model to be overwritten in
  // Mongoose's model cache
  return connection.model(name, schema, name);
}

function userSchema(sub) {
  const schema = _.defaults({
    username: String,
    password: String,
    name: {
      first: String,
      last: String
    },
    emails: [String],
    created: {type: Date, default: Date.now},
  }, sub);

  return new Schema(schema);
}

function subSchema() {
  return new Schema({
    name: String,
    primary: Boolean,
    created: {type: Date, default: Date.now}
  });
}
