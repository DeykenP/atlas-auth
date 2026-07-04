import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

export function createWinstonOptions(params: {
  level: string;
  isProduction: boolean;
}): winston.LoggerOptions {
  const { level, isProduction } = params;

  const developmentFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.ms(),
    nestWinstonModuleUtilities.format.nestLike('atlas-auth', {
      colors: true,
      prettyPrint: true,
    }),
  );

  const productionFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  );

  return {
    level,
    format: isProduction ? productionFormat : developmentFormat,
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
  };
}
