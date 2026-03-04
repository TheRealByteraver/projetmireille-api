/// <reference path="./types/index.d.ts" />
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { sequelize } from './models';
import { router as apiRoutes } from './routes';

const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

const app = express();

const allowedOrigins = ['http://localhost:3010', 'https://mireille.erland.info', 'https://projetmireille.vercel.app'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(
          new Error('The CORS policy for this site does not allow access from the specified Origin.'),
          false,
        );
      }
      return callback(null, true);
    },
  }),
);

app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to the REST API for Projet Mireille!',
  });
});

app.use('/api', apiRoutes);

app.use((_req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

app.use(
  (err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (enableGlobalErrorLogging) {
      console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
    }
    res.status((err as { status?: number }).status || 500).json({
      message: err.message,
      error: {},
    });
  },
);

app.set('port', process.env.PORT || 5001);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Successfully connected to the database');
  } catch (error) {
    console.log('Hey Erland, an error occured connecting to the database: ', error);
    console.log('*********************************************************');
  }
})();

sequelize
  .sync()
  .then(() => {
    const port = app.get('port') as number;
    app.listen(port, () => {
      console.log(`Express server is listening on port ${port}`);
    });
  })
  .catch((error: unknown) => {
    console.log('Hey Erland, the following error occured:');
    console.log(error);
    console.log('****************************************');
  });
