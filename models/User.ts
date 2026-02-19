import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class User extends Model {}

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
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'Users',
      timestamps: true,
    }
  );

  (User as typeof User & { associate?: (models: Record<string, unknown>) => void }).associate = (models: Record<string, unknown>) => {
    User.hasMany(models.ExerciseList as never, {
      foreignKey: 'userId',
    });
  };

  return User;
};
