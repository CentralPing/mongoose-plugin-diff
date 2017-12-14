const mongoose = require('mongoose');
const faker = require('faker');
const _ = require('lodash');

const diff = require('./');

const {
  npm_package_config_mongo_host: host,
  npm_package_config_mongo_port: port,
  npm_package_config_mongo_db: db
} = process.env;
const connectionString = `mongodb://${host}:${port}/${db}`;

const { Schema } = mongoose;

// Set Mongoose internal promise object to be the native Promise object
mongoose.Promise = global.Promise;

describe('Mongoose plugin: diff', () => {
  let connection;

  beforeAll((done) => {
    connection = mongoose.createConnection(connectionString);
    connection.once('connected', () => connection.db.dropDatabase(done));
  });

  afterAll((done) => {
    connection.db.dropDatabase(() => connection.close(done));
  });

  describe('with defaults', () => {
    let User;

    beforeAll(() => {
      const schema = userSchema();
      schema.plugin(diff);

      User = connection.model('User', schema, 'Users');
    });

    it('should add a `getDiff` method', () => {
      const user = new User();

      expect(user.getDiff).toBeInstanceOf(Function);
    });

    describe('with new documents', () => {
      let newUser;

      beforeEach(() => {
        newUser = new User();
      });

      it('should return differences for adding new properties', () => {
        const { username } = newUser;

        newUser.set('username', faker.internet.userName());

        expect(newUser.getDiff()).toEqual({ username });
      });

      it('should return differences for updating default properties', () => {
        newUser.set('password', faker.internet.password());

        expect(newUser.getDiff()).toEqual({ password: undefined });
      });

      it('should return differences for removing default properties', () => {
        newUser.set('password', undefined);

        expect(newUser.getDiff()).toEqual({ password: undefined });
      });

      it('should return differences for adding new sub-properties', () => {
        const { name: { first } } = newUser;

        newUser.set('name.first', faker.name.firstName());

        expect(newUser.getDiff()).toEqual({ name: { first } });
      });

      it('should return differences for adding element to array', () => {
        newUser.emails.push(faker.internet.email());

        expect(newUser.getDiff()).toEqual({ emails: undefined });
      });

      it('should return differences for adding element to sub-doc array', () => {
        newUser.nicknames.push({ name: faker.name.firstName() });

        // https://github.com/Automattic/mongoose/issues/5904
        expect(newUser.getDiff()).not.toEqual({ nicknames: [{ name: undefined }] });
      });
    });

    describe('with existing documents', () => {
      let user;

      beforeEach(() => {
        const newUser = new User({
          username: faker.internet.userName(),
          name: { first: faker.name.firstName() },
          emails: [faker.internet.email()],
          nicknames: [{ name: faker.name.firstName() }]
        });

        return newUser.save().then(
          savedUser => User.findById(savedUser).exec()
        ).then((foundUser) => {
          user = foundUser;
        });
      });

      it('should return differences for updating exisiting properties', () => {
        const { username } = user.toObject();

        user.set('username', faker.internet.userName());

        expect(user.getDiff()).toEqual({ username });
      });

      it('should return differences for removing exisiting properties', () => {
        const { username } = user.toObject();

        user.set('username', undefined);

        expect(user.getDiff()).toEqual({ username });
      });

      it('should return differences for updating exisiting sub-properties', () => {
        const { name: { first } } = user.toObject();

        user.set('name.first', faker.name.firstName());

        expect(user.getDiff()).toEqual({ name: { first } });
      });

      it('should return differences for removing exisiting sub-properties', () => {
        const { name: { first } } = user.toObject();

        user.set('name.first', undefined);

        expect(user.getDiff()).toEqual({ name: { first } });
      });

      it('should return differences for adding element to a new array', () => {
        user.phoneNumbers.push(faker.phone.phoneNumber());

        expect(user.getDiff()).toEqual({ phoneNumbers: [] });
      });

      it('should return differences for adding element to an existing array', () => {
        const { emails: [email] } = user.toObject();

        user.emails.push(faker.internet.email());

        expect(user.getDiff()).toEqual({ emails: [email] });
      });

      it('should return differences for updating exisiting array element', () => {
        const { emails: [email] } = user.toObject();

        user.emails.set(0, faker.internet.email());

        expect(user.getDiff()).toEqual({ emails: [email] });
      });

      it('should return differences for removing exisiting array element', () => {
        const { emails: [email] } = user.toObject();

        user.emails.pop();

        expect(user.getDiff()).toEqual({ emails: [email] });
      });

      it('should return differences for adding element to sub-doc array', () => {
        user.nicknames.push({ name: faker.name.firstName() });

        // https://github.com/Automattic/mongoose/issues/5904
        expect(user.getDiff()).not.toEqual({ nicknames: [undefined, { name: undefined }] });
      });

      it('should return differences for updating exisiting sub-doc array element', () => {
        const { nicknames: [{ name }] } = user.toObject();

        user.nicknames[0].set('name', faker.name.firstName());

        expect(user.getDiff()).toEqual({ nicknames: [{ name }] });
      });

      it('should return differences for removing exisiting sub-doc array element', () => {
        const { nicknames: [nickname] } = user.toObject();

        user.nicknames.pop();

        expect(user.getDiff()).toEqual({ nicknames: [nickname] });
      });
    });
  });

  describe('with selecting specific paths via option key', () => {
    let User;

    beforeAll(() => {
      const schema = userSchema();
      schema.path('username').options.diff = true;
      schema.path('name.first').options.diff = true;
      schema.path('emails').options.diff = true;
      schema.path('nicknames').schema.path('name').options.diff = true;
      schema.plugin(diff);

      User = connection.model('User', schema, 'Users');
    });

    describe('with new documents', () => {
      let newUser;

      beforeEach(() => {
        newUser = new User();
      });

      it('should return differences for adding new marked properties', () => {
        const { username } = newUser;

        newUser.set('username', faker.internet.userName());
        newUser.set('password', faker.internet.password());

        expect(newUser.getDiff()).toEqual({ username });
      });

      it('should return differences for adding new marked sub-properties', () => {
        const { name: { first } } = newUser;

        newUser.set('name.first', faker.name.firstName());
        newUser.set('name.last', faker.name.lastName());

        expect(newUser.getDiff()).toEqual({ name: { first } });
      });

      it('should return differences for adding element to marked array', () => {
        newUser.emails.push(faker.internet.email());
        newUser.phoneNumbers.push(faker.phone.phoneNumber());

        expect(newUser.getDiff()).toEqual({ emails: undefined });
      });

      it('should return differences for adding element to sub-doc array', () => {
        newUser.nicknames.push({ name: faker.name.firstName(), primary: true });

        // https://github.com/Automattic/mongoose/issues/5904
        expect(newUser.getDiff()).not.toEqual({ nicknames: [{ name: undefined }] });
      });
    });

    describe('with existing documents', () => {
      let user;

      beforeEach(() => {
        const newUser = new User({
          username: faker.internet.userName(),
          name: {
            first: faker.name.firstName(),
            last: faker.name.lastName()
          },
          emails: [faker.internet.email()],
          nicknames: [{ name: faker.name.firstName() }]
        });

        return newUser.save().then(
          savedUser => User.findById(savedUser).exec()
        ).then((foundUser) => {
          user = foundUser;
        });
      });

      it('should return differences for updating properties', () => {
        const { username } = user;

        user.set('username', faker.internet.userName());
        user.set('password', faker.internet.password());

        expect(user.getDiff()).toEqual({ username });
      });

      it('should return differences for removing properties', () => {
        const { username } = user;

        user.set('username', undefined);
        user.set('password', undefined);

        expect(user.getDiff()).toEqual({ username });
      });

      it('should return differences for updating sub-properties', () => {
        const { name: { first } } = user;

        user.set('name.first', faker.name.firstName());
        user.set('name.last', faker.name.lastName());

        expect(user.getDiff()).toEqual({ name: { first } });
      });

      it('should return differences for removing sub-properties', () => {
        const { name: { first } } = user;

        user.set('name.first', undefined);
        user.set('name.last', undefined);

        expect(user.getDiff()).toEqual({ name: { first } });
      });

      it('should return differences for adding element to an array', () => {
        const { emails: [email] } = user.toObject();

        user.emails.push(faker.internet.email());
        user.phoneNumbers.push(faker.phone.phoneNumber());

        expect(user.getDiff()).toEqual({ emails: [email] });
      });

      it('should return differences for updating exisiting array element', () => {
        const { emails: [email] } = user.toObject();

        user.emails.set(0, faker.internet.email());
        user.phoneNumbers.set(0, faker.phone.phoneNumber());

        expect(user.getDiff()).toEqual({ emails: [email] });
      });

      it('should return differences for removing exisiting array element', () => {
        const { emails: [email] } = user.toObject();

        user.emails.pop();
        user.phoneNumbers.pop();

        expect(user.getDiff()).toEqual({ emails: [email] });
      });

      it('should return differences for adding element to sub-doc array', () => {
        user.nicknames.push({ name: faker.name.firstName() });

        // https://github.com/Automattic/mongoose/issues/5904
        expect(user.getDiff()).not.toEqual({ nicknames: [undefined, { name: undefined }] });
      });

      it('should return differences for updating exisiting sub-doc array element', () => {
        const { nicknames: [{ name }] } = user.toObject();

        user.nicknames[0].set('name', faker.name.firstName());

        expect(user.getDiff()).toEqual({ nicknames: [{ name }] });
      });

      it('should return differences for removing exisiting sub-doc array element', () => {
        const { nicknames: [nickname] } = user.toObject();

        user.nicknames.pop();

        // https://github.com/Automattic/mongoose/issues/5904
        expect(user.getDiff()).not.toEqual({ nicknames: [nickname] });
      });
    });
  });

  describe('with specific paths via options', () => {
    let User;

    beforeAll(() => {
      const schema = userSchema();
      schema.plugin(diff, {
        paths: [
          'username',
          'name.first',
          'emails',
          'nicknames.$.name'
        ]
      });

      User = connection.model('User', schema, 'Users');
    });

    describe('with new documents', () => {
      let newUser;

      beforeEach(() => {
        newUser = new User();
      });

      it('should return differences for adding new marked properties', () => {
        const { username } = newUser;

        newUser.set('username', faker.internet.userName());
        newUser.set('password', faker.internet.password());

        expect(newUser.getDiff()).toEqual({ username });
      });

      it('should return differences for adding new marked sub-properties', () => {
        const { name: { first } } = newUser;

        newUser.set('name.first', faker.name.firstName());
        newUser.set('name.last', faker.name.lastName());

        expect(newUser.getDiff()).toEqual({ name: { first } });
      });

      it('should return differences for adding element to marked array', () => {
        newUser.emails.push(faker.internet.email());
        newUser.phoneNumbers.push(faker.phone.phoneNumber());

        expect(newUser.getDiff()).toEqual({ emails: undefined });
      });

      it('should return differences for adding element to sub-doc array', () => {
        newUser.nicknames.push({ name: faker.name.firstName(), primary: true });

        // https://github.com/Automattic/mongoose/issues/5904
        expect(newUser.getDiff()).not.toEqual({ nicknames: [{ name: undefined }] });
      });
    });

    describe('with existing documents', () => {
      let user;

      beforeEach(() => {
        const newUser = new User({
          username: faker.internet.userName(),
          name: {
            first: faker.name.firstName(),
            last: faker.name.lastName()
          },
          emails: [faker.internet.email()],
          nicknames: [{ name: faker.name.firstName() }]
        });

        return newUser.save().then(
          savedUser => User.findById(savedUser).exec()
        ).then((foundUser) => {
          user = foundUser;
        });
      });

      it('should return differences for updating properties', () => {
        const { username } = user;

        user.set('username', faker.internet.userName());
        user.set('password', faker.internet.password());

        expect(user.getDiff()).toEqual({ username });
      });

      it('should return differences for removing properties', () => {
        const { username } = user;

        user.set('username', undefined);
        user.set('password', undefined);

        expect(user.getDiff()).toEqual({ username });
      });

      it('should return differences for updating sub-properties', () => {
        const { name: { first } } = user;

        user.set('name.first', faker.name.firstName());
        user.set('name.last', faker.name.lastName());

        expect(user.getDiff()).toEqual({ name: { first } });
      });

      it('should return differences for removing sub-properties', () => {
        const { name: { first } } = user;

        user.set('name.first', undefined);
        user.set('name.last', undefined);

        expect(user.getDiff()).toEqual({ name: { first } });
      });

      it('should return differences for adding element to an array', () => {
        const { emails: [email] } = user.toObject();

        user.emails.push(faker.internet.email());
        user.phoneNumbers.push(faker.phone.phoneNumber());

        expect(user.getDiff()).toEqual({ emails: [email] });
      });

      it('should return differences for updating exisiting array element', () => {
        const { emails: [email] } = user.toObject();

        user.emails.set(0, faker.internet.email());
        user.phoneNumbers.set(0, faker.phone.phoneNumber());

        expect(user.getDiff()).toEqual({ emails: [email] });
      });

      it('should return differences for removing exisiting array element', () => {
        const { emails: [email] } = user.toObject();

        user.emails.pop();
        user.phoneNumbers.pop();

        expect(user.getDiff()).toEqual({ emails: [email] });
      });

      it('should return differences for adding element to sub-doc array', () => {
        user.nicknames.push({ name: faker.name.firstName() });

        // https://github.com/Automattic/mongoose/issues/5904
        expect(user.getDiff()).not.toEqual({ nicknames: [undefined, { name: undefined }] });
      });

      it('should return differences for updating exisiting sub-doc array element', () => {
        const { nicknames: [{ name }] } = user.toObject();

        user.nicknames[0].set('name', faker.name.firstName());

        expect(user.getDiff()).toEqual({ nicknames: [{ name }] });
      });

      it('should return differences for removing exisiting sub-doc array element', () => {
        const { nicknames: [nickname] } = user.toObject();

        user.nicknames.pop();

        // https://github.com/Automattic/mongoose/issues/5904
        expect(user.getDiff()).not.toEqual({ nicknames: [nickname] });
      });
    });
  });
});

function userSchema(sub) {
  const schema = _.defaultsDeep({
    username: String,
    password: { type: String, default: faker.internet.password() },
    name: {
      first: String,
      last: String
    },
    emails: [String],
    phoneNumbers: [String],
    nicknames: [{
      name: String,
      primary: { type: Boolean, default: false }
    }]
  }, sub);

  return new Schema(schema);
}
