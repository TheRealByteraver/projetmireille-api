/// <reference path="./promise-finally.d.ts" />
import path from 'path';
import promiseFinally from 'promise.prototype.finally';
import Database, { SeedData } from './database';

const dataPath = path.join(process.cwd(), 'seed', 'data.json');
const data = require(dataPath) as SeedData;

const enableLogging = process.env.DB_ENABLE_LOGGING === 'true';
const database = new Database(data as SeedData, enableLogging);

promiseFinally.shim();

database
  .init()
  .catch((err: Error) => console.error(err))
  .finally(() => process.exit());
