import bcrypt from 'bcryptjs';
import Context from './context';

// ---------------------------------------------------------------------------
// Seed data types reflecting data.json
// ---------------------------------------------------------------------------

interface SeedUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  roles: string;
}

interface SeedLineGraphExercise {
  startNumber: number;
  step: number;
  questionPosition: number;
  nrOfSteps: number;
  level: 'CE1' | 'CE2';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface SeedExerciseItem {
  exerciseType: 'lineGraph';
  exerciseData: SeedLineGraphExercise;
}

interface SeedExerciseList {
  id: number;
  name: string;
  userId: number;
  exercises: SeedExerciseItem[];
}

export interface SeedData {
  users: SeedUser[];
  exerciseList: SeedExerciseList[];
}

export default class Database {
  users: SeedUser[];
  exerciseList: SeedExerciseList[];
  enableLogging: boolean;
  context: Context;

  constructor(seedData: SeedData, enableLogging: boolean) {
    this.users = seedData.users;
    this.exerciseList = seedData.exerciseList ?? [];
    this.enableLogging = enableLogging;
    this.context = new Context('projetmireille.db', enableLogging);
  }

  log(message: string): void {
    if (this.enableLogging) {
      console.info(message);
    }
  }

  tableExists(tableName: string): Promise<unknown> {
    this.log(`Checking if the ${tableName} table exists...`);
    return this.context.retrieveValue(
      `
        SELECT EXISTS (
          SELECT 1
          FROM sqlite_master
          WHERE type = 'table' AND name = ?
        );
      `,
      tableName,
    );
  }

  createUser(user: SeedUser): Promise<void> {
    return this.context.execute(
      `
        INSERT INTO Users
          (firstName, lastName, username, password, roles)
        VALUES
          (?, ?, ?, ?, ?);
      `,
      user.firstName ?? '',
      user.lastName ?? '',
      user.username,
      user.password,
      user.roles,
    );
  }

  createExerciseList(row: SeedExerciseList): Promise<void> {
    const exercisesJson = JSON.stringify(row.exercises);
    console.log('createExerciseList gives json:', exercisesJson);
    return this.context.execute(
      `
        INSERT INTO ExerciseList
          (name, userId, exercises)
        VALUES
          (?, ?, ?);
      `,
      row.name,
      row.userId,
      exercisesJson,
    );
  }

  async hashUserPasswords(users: SeedUser[]): Promise<SeedUser[]> {
    const result: SeedUser[] = [];
    for (const user of users) {
      const hashed = await bcrypt.hash(user.password, 10);
      result.push({ ...user, password: hashed });
    }
    return result;
  }

  async createUsers(users: SeedUser[]): Promise<void> {
    for (const user of users) {
      await this.createUser(user);
    }
  }

  async createExerciseLists(rows: SeedExerciseList[]): Promise<void> {
    for (const row of rows) {
      await this.createExerciseList(row);
    }
  }

  async init(): Promise<void> {
    // ----- Users -----
    const userTableExists = await this.tableExists('Users');
    if (userTableExists) {
      this.log('Dropping the Users table...');
      await this.context.execute(`DROP TABLE IF EXISTS Users;`);
    }

    this.log('Creating the Users table...');
    await this.context.execute(`
      CREATE TABLE Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName VARCHAR(255) NOT NULL DEFAULT '',
        lastName VARCHAR(255) NOT NULL DEFAULT '',
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL DEFAULT '',
        roles VARCHAR(255) NOT NULL DEFAULT '',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // TODO: UPDATE ALL USERS???
    await this.context.execute(`
      CREATE TRIGGER Users_updatedAt
      AFTER UPDATE ON Users
      FOR EACH ROW
      BEGIN
        UPDATE Users SET updatedAt = datetime('now') WHERE id = NEW.id;
      END;
    `);

    this.log('Hashing the user passwords...');
    const usersWithHashed = await this.hashUserPasswords(this.users);
    this.log('Creating the user records...');
    await this.createUsers(usersWithHashed);

    // ----- ExerciseList (exercises stored as JSON in TEXT) -----
    const exerciseListTableExists = await this.tableExists('ExerciseList');
    if (exerciseListTableExists) {
      this.log('Dropping the ExerciseList table...');
      await this.context.execute(`DROP TABLE IF EXISTS ExerciseList;`);
    }

    this.log('Creating the ExerciseList table...');
    await this.context.execute(`
      CREATE TABLE ExerciseList (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL DEFAULT '',
        userId INTEGER NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        exercises TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY (userId) REFERENCES Users (id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await this.context.execute(`
      CREATE TRIGGER ExerciseList_updatedAt
      AFTER UPDATE ON ExerciseList
      FOR EACH ROW
      BEGIN
        UPDATE ExerciseList SET updatedAt = datetime('now') WHERE id = NEW.id;
      END;
    `);

    this.log('Creating the exercise list records...');
    await this.createExerciseLists(this.exerciseList);

    this.log('Database successfully initialized!');
  }
}
