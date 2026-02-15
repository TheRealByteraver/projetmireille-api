import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class Course extends Model {}

  Course.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: 'A title is required' },
          notEmpty: { msg: 'Please provide a title' },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notNull: { msg: 'A description is required' },
          notEmpty: { msg: 'Please provide a description' },
        },
      },
      estimatedTime: {
        type: DataTypes.STRING,
      },
      materialsNeeded: {
        type: DataTypes.STRING,
      },
    },
    { sequelize }
  );

  (Course as typeof Course & { associate: (models: Record<string, unknown>) => void }).associate = (models: Record<string, unknown>) => {
    Course.belongsTo(models.User as never, {
      as: 'courseUser',
      foreignKey: {
        name: 'userId',
        allowNull: false,
      },
    });
  };

  return Course;
};
