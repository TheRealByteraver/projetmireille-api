import { Model, DataTypes, Sequelize } from 'sequelize';

export interface UserAttributes {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  roles: string;
  createdAt: Date;
  updatedAt: Date;
}

export default (sequelize: Sequelize) => {
  class User extends Model<UserAttributes> implements UserAttributes {
    declare id: number;
    declare firstName: string;
    declare lastName: string;
    declare username: string;
    declare password: string;
    declare roles: string;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      firstName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: '',
      },
      lastName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: '',
      },
      username: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: '',
      },
      roles: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: '',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: new Date(),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: new Date(),
      },
    },
    {
      sequelize,
      tableName: 'Users',
      timestamps: true,
    },
  );

  (User as typeof User & { associate?: (models: Record<string, unknown>) => void }).associate = (
    models: Record<string, unknown>,
  ) => {
    User.hasMany(models.ExerciseList as never, {
      foreignKey: 'userId',
    });
  };

  return User;
};
