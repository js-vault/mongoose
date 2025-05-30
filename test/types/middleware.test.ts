import { Schema, model, Model, Document, SaveOptions, Query, Aggregate, HydratedDocument, PreSaveMiddlewareFunction, ModifyResult, AnyBulkWriteOperation } from 'mongoose';
import { expectError, expectType, expectNotType, expectAssignable } from 'tsd';
import { CreateCollectionOptions } from 'mongodb';

const preMiddlewareFn: PreSaveMiddlewareFunction<Document> = function(next, opts) {
  this.$markValid('name');
  if (opts.session) {
    next();
  } else {
    next(new Error('Operation must be in Session.'));
  }
};

const schema = new Schema({ name: { type: 'String' } });

type ITest = ReturnType<Model<{ name?: string }>['hydrate']>;

schema.pre<Query<any, any>>('find', async function() {
  console.log('Find', this.getFilter());
});

schema.pre<Query<any, any>>('find', async function() {
  expectError(this.notAFunction());
});

schema.pre<Aggregate<any>>('aggregate', async function() {
  console.log('Pipeline', this.pipeline());
});

schema.post<Aggregate<any>>('aggregate', async function(res: Array<any>) {
  console.log('Pipeline', this.pipeline(), res[0]);
});

schema.post<Aggregate<ITest>>('aggregate', function(res, next) {
  expectType<ITest[]>(res);
  next();
});

schema.post<Query<ITest, ITest>>('save', function(res, next) {
  expectType<Query<ITest, ITest>>(res);
  next();
});

schema.pre(['save', 'validate'], { query: false, document: true }, async function applyChanges() {
  await Test.findOne({});
});

schema.pre('save', function(next, opts: SaveOptions) {
  console.log(opts.session);
  next();
});

schema.pre('save', function(next) {
  console.log(this.name);
});

schema.post<ITest>('save', function(res, next) {
  expectType<ITest>(res);
  next();
});

schema.post<ITest>('save', function() {
  console.log(this.name);
});

schema.post<ITest>('save', async function() {
  console.log(this.name);
});

schema.post<ITest>('save', function(err: Error, res: ITest, next: Function) {
  console.log(this.name, err.stack);
});

schema.pre<Model<ITest>>('insertMany', function() {
  const name: string = this.name;
  return Promise.resolve();
});

schema.pre<Model<ITest>>('insertMany', function() {
  console.log(this.name);
});

schema.pre<Model<ITest>>('insertMany', function(next) {
  console.log(this.name);
  next();
});

schema.pre<Model<ITest>>('insertMany', function(next, doc: ITest) {
  console.log(this.name, doc);
  next();
});

schema.pre<Model<ITest>>('insertMany', function(next, docs: Array<ITest>) {
  console.log(this.name, docs);
  next();
});

schema.pre<Model<ITest>>('bulkWrite', function(next, ops: Array<AnyBulkWriteOperation<any>>) {
  next();
});

schema.pre<Model<ITest>>('createCollection', function(next, opts?: CreateCollectionOptions) {
  next();
});

schema.pre<Query<number, any>>('estimatedDocumentCount', function(next) {});
schema.post<Query<number, any>>('estimatedDocumentCount', function(count, next) {
  expectType<number>(count);
  next();
});

schema.pre<Query<number, any>>('countDocuments', function(next) {});
schema.post<Query<number, any>>('countDocuments', function(count, next) {
  expectType<number>(count);
  next();
});

schema.post<Query<ITest, ITest>>('findOneAndDelete', function(res, next) {
  expectType<ITest | ModifyResult<ITest> | null>(res);
  next();
});

schema.post<Query<ITest, ITest>>('findOneAndUpdate', function(res, next) {
  expectType<ITest | ModifyResult<ITest> | null>(res);
  next();
});

schema.post<Query<ITest, ITest>>('findOneAndReplace', function(res, next) {
  expectType<ITest | ModifyResult<ITest> | null>(res);
  next();
});

const Test = model<ITest>('Test', schema);

function gh11480(): void {
  type IUserSchema = {
    name: string;
  };

  const UserSchema = new Schema<IUserSchema>({ name: { type: String } });

  UserSchema.pre('save', function(next) {
    expectNotType<any>(this);
    next();
  });
}

function gh12583() {
  interface IUser {
    name: string;
    email: string;
    avatar?: string;
  }

  const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String
  });

  userSchema.post('save', { errorHandler: true }, function(error, doc, next) {
    expectType<Error>(error);
    console.log(error.name);
    console.log(doc.name);
  });
}

function gh11257() {
  interface User {
    name: string;
    email: string;
    avatar?: string;
  }

  const schema = new Schema<User>({
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String
  });

  schema.pre('save', { document: true }, function() {
    expectType<HydratedDocument<User>>(this);
  });

  schema.pre('updateOne', { document: true, query: false }, function() {
    this.isNew;
  });

  schema.pre('updateOne', { document: false, query: true }, function() {
    this.find();
  });
}

function gh13601() {
  const testSchema = new Schema({
    name: String
  });

  testSchema.pre('deleteOne', { document: true }, function() {
    expectAssignable<Document>(this);
  });
}

function gh15242() {
  type PostPersisted = {
    title: string,
    postTime: Date
  };

  type ValidatorThis = DocumentValidatorThis | QueryValidatorThis;
  type DocumentValidatorThis = HydratedDocument<PostPersisted>;
  type QueryValidatorThis = Query<PostRecord, PostRecord>;

  const PostSchema = new Schema<PostPersisted>({
    title: { type: String, required: true },
    postTime: {
      type: Date,
      required: true,
      validate: {
        validator: async function(this: ValidatorThis, postTime: Date): Promise<boolean> {
          return true;
        }
      }
    }
  });

  type PostRecord = HydratedDocument<PostPersisted>;
  const PostModel = model<PostPersisted>('Post', PostSchema);
}

function gh15242WithVirtuals() {
  type PostPersisted = {
    title: string,
    postTime: Date
  };

  type ValidatorThis = DocumentValidatorThis | QueryValidatorThis;
  type DocumentValidatorThis = HydratedDocument<PostPersisted, { myVirtual: number }>;
  type QueryValidatorThis = Query<PostRecord, PostRecord>;

  const PostSchema = new Schema({
    title: { type: String, required: true },
    postTime: {
      type: Date,
      required: true,
      validate: {
        validator: async function(this: ValidatorThis, postTime: Date): Promise<boolean> {
          if (!(this instanceof Query)) {
            expectType<number>(this.myVirtual);
          }
          return true;
        }
      }
    }
  }, { virtuals: { myVirtual: { get() { return 42; } } } });

  type PostRecord = HydratedDocument<PostPersisted, { myVirtual: number }>;
  const PostModel = model<PostPersisted>('Post', PostSchema);
}
