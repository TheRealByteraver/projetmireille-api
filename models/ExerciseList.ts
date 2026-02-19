import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class ExerciseList extends Model {}

  ExerciseList.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: '',
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      exercises: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: '[]',
        get(): unknown[] {
          const raw = this.getDataValue('exercises');
          if (typeof raw !== 'string') return [];
          try {
            return JSON.parse(raw) as unknown[];
          } catch {
            return [];
          }
        },
        set(val: unknown) {
          const str = typeof val === 'string' ? val : JSON.stringify(val ?? []);
          this.setDataValue('exercises', str);
        },
      },
    },
    {
      sequelize,
      tableName: 'ExerciseList',
      timestamps: true,
    },
  );

  (ExerciseList as typeof ExerciseList & { associate: (models: Record<string, unknown>) => void }).associate = (
    models: Record<string, unknown>,
  ) => {
    ExerciseList.belongsTo(models.User as never, {
      as: 'user',
      foreignKey: { name: 'userId', allowNull: false },
    });
  };

  return ExerciseList;
};
