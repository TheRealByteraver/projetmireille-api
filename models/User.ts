import { Model, DataTypes, Sequelize } from 'sequelize';
import bcrypt from 'bcrypt';

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
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: 'A first name is required' },
          notEmpty: { msg: 'Please provide a first name' },
        },
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: 'A last name is required' },
          notEmpty: { msg: 'Please provide a last name' },
        },
      },
      emailAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: { msg: 'The email address you entered already exists' } as { name: string; msg: string },
        validate: {
          notNull: { msg: 'An email address is required' },
          notEmpty: { msg: 'Please provide an email address' },
          isEmail: { name: 'isEmail', msg: 'Please provide a valid email address' },
        } as { notNull: { msg: string }; notEmpty: { msg: string }; isEmail: { name: string; msg: string } },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        set(val: string) {
          const passwordLen = val.length;
          if (passwordLen >= 8 && passwordLen <= 20) {
            const hashedPassword = bcrypt.hashSync(val, 10);
            this.setDataValue('password', hashedPassword);
          }
        },
        validate: {
          notNull: { msg: 'A password between 8 and 20 characters in length is required' },
          notEmpty: { msg: 'Please provide a password between 8 and 20 characters in length' },
        },
      },
    },
    { sequelize }
  );

  (User as typeof User & { associate: (models: Record<string, unknown>) => void }).associate = (models: Record<string, unknown>) => {
    User.hasMany(models.Course as never, {
      as: 'courseUser',
      foreignKey: {
        name: 'userId',
        allowNull: false,
      },
    });
  };

  return User;
};
