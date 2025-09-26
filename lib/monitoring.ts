'use server';

/**
 * T041: 监控和日志
 * lib/monitoring.ts
 */

import { performanceMonitor } from './performance';
import { env } from './env';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
  service?: string;
  version?: string;
  environment?: string;
}

export interface MetricEntry {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
}

/**
 * 结构化日志记录器
 */
export class StructuredLogger {
  private serviceName: string;
  private version: string;
  private environment: string;

  constructor(
    serviceName = 'ai-chatbot',
    version = '1.0.0',
    environment: string = env.NODE_ENV,
  ) {
    this.serviceName = serviceName;
    this.version = version;
    this.environment = environment;
  }

  /**
   * 记录调试信息
   */
  debug(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string,
  ): void {
    this.log(LogLevel.DEBUG, message, context, requestId, userId);
  }

  /**
   * 记录一般信息
   */
  info(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string,
  ): void {
    this.log(LogLevel.INFO, message, context, requestId, userId);
  }

  /**
   * 记录警告信息
   */
  warn(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string,
  ): void {
    this.log(LogLevel.WARN, message, context, requestId, userId);
  }

  /**
   * 记录错误信息
   */
  error(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string,
  ): void {
    this.log(LogLevel.ERROR, message, context, requestId, userId);
  }

  /**
   * 记录致命错误
   */
  fatal(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string,
  ): void {
    this.log(LogLevel.FATAL, message, context, requestId, userId);
  }

  /**
   * 核心日志记录方法
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string,
  ): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      userId,
      requestId,
      service: this.serviceName,
      version: this.version,
      environment: this.environment,
    };

    // 输出到控制台
    this.outputToConsole(logEntry);

    // 在生产环境中发送到外部日志服务
    if (this.environment === 'production') {
      this.sendToLogService(logEntry);
    }
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const logData = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      service: entry.service,
      message: entry.message,
      requestId: entry.requestId,
      userId: entry.userId,
      ...entry.context,
    };

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(logData));
        break;
      case LogLevel.INFO:
        console.info(JSON.stringify(logData));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(logData));
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(JSON.stringify(logData));
        break;
    }
  }

  /**
   * 发送到外部日志服务
   */
  private async sendToLogService(entry: LogEntry): Promise<void> {
    // 这里可以集成外部日志服务，如 ElasticSearch, Splunk, DataDog 等
    // 当前实现为空操作，避免产生不可达代码
  }

  /**
   * 记录性能指标
   */
  metric(
    name: string,
    value: number,
    type: MetricEntry['type'] = 'gauge',
    tags?: Record<string, string>,
  ): void {
    const metric: MetricEntry = {
      name,
      value,
      timestamp: new Date(),
      tags: {
        service: this.serviceName,
        environment: this.environment,
        ...tags,
      },
      type,
    };

    this.outputMetric(metric);

    if (this.environment === 'production') {
      this.sendMetricToService(metric);
    }
  }

  /**
   * 输出指标
   */
  private outputMetric(metric: MetricEntry): void {
    console.log(
      `METRIC [${metric.type}] ${metric.name}=${metric.value} ${JSON.stringify(metric.tags)}`,
    );
  }

  /**
   * 发送指标到监控服务
   */
  private async sendMetricToService(metric: MetricEntry): Promise<void> {
    // 集成监控服务，如 Prometheus, DataDog, New Relic 等
  }
}

/**
 * 全局日志记录器
 */
export const logger = new StructuredLogger();

/**
 * 应用程序指标收集器
 */
export class MetricsCollector {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  /**
   * 递增计数器
   */
  incrementCounter(
    name: string,
    value = 1,
    tags?: Record<string, string>,
  ): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
    logger.metric(name, current + value, 'counter', tags);
  }

  /**
   * 设置计量器值
   */
  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    this.gauges.set(name, value);
    logger.metric(name, value, 'gauge', tags);
  }

  /**
   * 记录直方图值
   */
  recordHistogram(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    this.histograms.set(name, values);
    logger.metric(name, value, 'histogram', tags);
  }

  /**
   * 计时器装饰器
   */
  timer(name: string, tags?: Record<string, string>) {
    return <T extends (...args: any[]) => any>(
      target: any,
      propertyName: string,
      descriptor: TypedPropertyDescriptor<T>,
    ) => {
      const method = descriptor.value as T;

      descriptor.value = async function (this: any, ...args: any[]) {
        const startTime = Date.now();

        try {
          const result = await method.apply(this, args);
          const duration = Date.now() - startTime;

          logger.metric(`${name}.duration`, duration, 'timer', {
            ...tags,
            status: 'success',
          });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;

          logger.metric(`${name}.duration`, duration, 'timer', {
            ...tags,
            status: 'error',
          });

          throw error;
        }
      } as any;

      return descriptor;
    };
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, { count: number; values: number[] }>;
  } {
    const histogramData: Record<string, { count: number; values: number[] }> =
      {};

    for (const [name, values] of this.histograms) {
      histogramData[name] = {
        count: values.length,
        values: [...values],
      };
    }

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramData,
    };
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

/**
 * 全局指标收集器
 */
export const metrics = new MetricsCollector();

/**
 * 健康检查监控器
 */
export class HealthMonitor {
  private checks: Map<string, () => Promise<boolean>> = new Map();
  private lastResults: Map<
    string,
    { healthy: boolean; timestamp: Date; error?: string }
  > = new Map();

  /**
   * 注册健康检查
   */
  registerCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.checks.set(name, checkFn);
  }

  /**
   * 执行所有健康检查
   */
  async runAllChecks(): Promise<{
    overall: boolean;
    checks: Record<
      string,
      { healthy: boolean; timestamp: Date; error?: string }
    >;
  }> {
    const results: Record<
      string,
      { healthy: boolean; timestamp: Date; error?: string }
    > = {};
    let overall = true;

    for (const [name, checkFn] of this.checks) {
      try {
        const healthy = await checkFn();
        const result = {
          healthy,
          timestamp: new Date(),
        };

        results[name] = result;
        this.lastResults.set(name, result);

        if (!healthy) {
          overall = false;
        }

        // 记录指标
        metrics.setGauge(`health.${name}`, healthy ? 1 : 0);
      } catch (error: any) {
        const result = {
          healthy: false,
          timestamp: new Date(),
          error: error.message,
        };

        results[name] = result;
        this.lastResults.set(name, result);
        overall = false;

        // 记录错误
        logger.error(`Health check failed: ${name}`, { error: error.message });
        metrics.setGauge(`health.${name}`, 0);
      }
    }

    // 记录整体健康状态
    metrics.setGauge('health.overall', overall ? 1 : 0);

    return { overall, checks: results };
  }

  /**
   * 获取最后的检查结果
   */
  getLastResults(): Record<
    string,
    { healthy: boolean; timestamp: Date; error?: string }
  > {
    return Object.fromEntries(this.lastResults);
  }
}

/**
 * 全局健康监控器
 */
export const healthMonitor = new HealthMonitor();

/**
 * 请求追踪器
 */
export class RequestTracker {
  private activeRequests = new Map<
    string,
    {
      startTime: Date;
      endpoint: string;
      method: string;
      userId?: string;
    }
  >();

  /**
   * 开始追踪请求
   */
  startRequest(
    requestId: string,
    endpoint: string,
    method: string,
    userId?: string,
  ): void {
    this.activeRequests.set(requestId, {
      startTime: new Date(),
      endpoint,
      method,
      userId,
    });

    logger.info('Request started', {
      requestId,
      endpoint,
      method,
      userId,
    });

    metrics.incrementCounter('requests.started', 1, {
      endpoint,
      method,
    });
  }

  /**
   * 结束追踪请求
   */
  endRequest(requestId: string, statusCode: number, error?: string): void {
    const request = this.activeRequests.get(requestId);

    if (!request) {
      logger.warn('Request not found for tracking', { requestId });
      return;
    }

    const duration = Date.now() - request.startTime.getTime();

    logger.info('Request completed', {
      requestId,
      endpoint: request.endpoint,
      method: request.method,
      statusCode,
      duration,
      userId: request.userId,
      error,
    });

    // 记录指标
    metrics.incrementCounter('requests.completed', 1, {
      endpoint: request.endpoint,
      method: request.method,
      status: statusCode.toString(),
    });

    metrics.recordHistogram('request.duration', duration, {
      endpoint: request.endpoint,
      method: request.method,
    });

    if (error) {
      metrics.incrementCounter('requests.errors', 1, {
        endpoint: request.endpoint,
        method: request.method,
      });
    }

    this.activeRequests.delete(requestId);
  }

  /**
   * 获取活跃请求数量
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * 获取活跃请求列表
   */
  getActiveRequests(): Array<{
    requestId: string;
    startTime: Date;
    endpoint: string;
    method: string;
    userId?: string;
    duration: number;
  }> {
    const now = Date.now();
    const requests: Array<any> = [];

    for (const [requestId, request] of this.activeRequests) {
      requests.push({
        requestId,
        ...request,
        duration: now - request.startTime.getTime(),
      });
    }

    return requests;
  }
}

/**
 * 全局请求追踪器
 */
export const requestTracker = new RequestTracker();

/**
 * 初始化监控系统
 */
export function initializeMonitoring(): void {
  // 注册基础健康检查
  healthMonitor.registerCheck('system', async () => {
    // 检查系统资源
    return true;
  });

  // 定期收集性能指标
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      // 收集性能指标
      const performanceMetrics = performanceMonitor.getAllMetrics();

      for (const [endpoint, metric] of Object.entries(performanceMetrics)) {
        metrics.setGauge(
          `performance.${endpoint}.request_count`,
          metric.requestCount,
        );
        metrics.setGauge(
          `performance.${endpoint}.avg_response_time`,
          metric.averageResponseTime,
        );
        metrics.setGauge(
          `performance.${endpoint}.error_rate`,
          metric.errorRate,
        );
      }

      // 记录活跃请求数
      metrics.setGauge(
        'requests.active',
        requestTracker.getActiveRequestCount(),
      );
    }, 60000); // 每分钟收集一次
  }

  logger.info('Monitoring system initialized');
}
