import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttpException
      ? exception.getResponse()
      : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message: this.extractMessage(payload),
      error: this.extractError(payload),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private extractMessage(payload: string | object): string | string[] {
    if (typeof payload === 'string') {
      return payload;
    }

    if ('message' in payload) {
      return payload.message as string | string[];
    }

    return 'Unexpected error';
  }

  private extractError(payload: string | object): string {
    if (typeof payload === 'string') {
      return 'Error';
    }

    if ('error' in payload && typeof payload.error === 'string') {
      return payload.error;
    }

    return 'Error';
  }
}
