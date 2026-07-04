import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsHandler');

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url: string; method: string }>();

    const { statusCode, error, message } = this.resolve(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}: ${(exception as Error)?.message ?? exception}`,
        (exception as Error)?.stack,
      );
    }

    const body: ErrorBody = {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): {
    statusCode: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        return { statusCode: status, error: exception.name, message: payload };
      }
      const { message, error } = payload as { message?: string | string[]; error?: string };
      return {
        statusCode: status,
        error: error ?? exception.name,
        message: message ?? exception.message,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    const isProduction = this.config.get<boolean>('app.isProduction');
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: isProduction
        ? 'Something went wrong'
        : ((exception as Error)?.message ?? 'Unknown error'),
    };
  }

  private resolvePrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    error: string;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ');
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: target ? `A record with this ${target} already exists` : 'Duplicate record',
        };
      }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'Record not found',
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'This action references a record that no longer exists',
        };
      default:
        this.logger.error(`Unhandled Prisma error code ${exception.code}: ${exception.message}`);
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'Something went wrong',
        };
    }
  }
}
