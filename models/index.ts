import path from 'path';
import { Sequelize } from 'sequelize';

const configPath = path.join(process.cwd(), 'config', 'config.json');
const config = require(configPath) as Record<string, Record<string, unknown>>;

const env = process.env.NODE_ENV || 'development';
const envConfig = (config as Record<string, Record<string, unknown>>)[env];

const db: Record<string, unknown> = {};

let sequelize: Sequelize;
if (envConfig && (envConfig as { use_env_variable?: string }).use_env_variable) {
  const useEnv = (envConfig as { use_env_variable: string }).use_env_variable;
  sequelize = new Sequelize(process.env[useEnv] as string, envConfig as object);
} else {
  sequelize = new Sequelize(
    (envConfig as { database: string }).database,
    (envConfig as { username: string }).username,
    (envConfig as { password?: string | null }).password ?? undefined,
    envConfig as object
  );
}

import initUser from './User';
import initExerciseList from './ExerciseList';

const User = initUser(sequelize);
const ExerciseList = initExerciseList(sequelize);

db.User = User;
db.ExerciseList = ExerciseList;

(User as { associate?: (models: Record<string, unknown>) => void }).associate?.(db);
(ExerciseList as { associate?: (models: Record<string, unknown>) => void }).associate?.(db);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export { sequelize, User, ExerciseList };
export default db;
