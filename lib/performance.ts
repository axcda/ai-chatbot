'use server';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
}

/**
 * 内存缓存管理器
 */
export class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 1000, defaultTTL = 300000) {
    // 默认5分钟TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * 设置缓存项
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * 获取缓存项
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
    };
  }

  private calculateHitRate(): number {
    // 这里可以实现更复杂的命中率计算
    return 0;
  }
}

/**
 * 全局缓存实例
 */
export const globalCache = new MemoryCache();

/**
 * 缓存装饰器工厂
 */
export function cached(
  ttl = 300000, // 5分钟
  keyGenerator?: (...args: any[]) => string,
) {
  return <T extends (...args: any[]) => any>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    const method = descriptor.value as T;

    descriptor.value = async function (this: any, ...args: any[]) {
      const cacheKey = keyGenerator
        ? keyGenerator(...args)
        : `${target.constructor.name}.${propertyName}:${JSON.stringify(args)}`;

      // 尝试从缓存获取
      const cached = globalCache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // 执行原方法
      const result = await method.apply(this, args);

      // 缓存结果
      globalCache.set(cacheKey, result, ttl);

      return result;
    } as any;

    return descriptor;
  };
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private requestTimes: Map<string, number[]> = new Map();

  /**
   * 记录请求开始时间
   */
  startRequest(endpoint: string): string {
    const requestId = `${endpoint}-${Date.now()}-${Math.random()}`;
    const times = this.requestTimes.get(endpoint) || [];
    times.push(Date.now());
    this.requestTimes.set(endpoint, times);
    return requestId;
  }

  /**
   * 记录请求结束时间
   */
  endRequest(endpoint: string, success = true): void {
    const times = this.requestTimes.get(endpoint) || [];
    if (times.length === 0) return;

    const startTime = times.shift();
    if (startTime === undefined) return;
    const duration = Date.now() - startTime;

    // 更新指标
    const current = this.metrics.get(endpoint) || {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
    };

    current.requestCount++;
    current.averageResponseTime =
      (current.averageResponseTime * (current.requestCount - 1) + duration) /
      current.requestCount;

    if (!success) {
      current.errorRate =
        (current.errorRate * (current.requestCount - 1) + 1) /
        current.requestCount;
    } else {
      current.errorRate =
        (current.errorRate * (current.requestCount - 1)) / current.requestCount;
    }

    this.metrics.set(endpoint, current);
  }

  /**
   * 获取指定端点的指标
   */
  getMetrics(endpoint: string): PerformanceMetrics | null {
    return this.metrics.get(endpoint) || null;
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): Record<string, PerformanceMetrics> {
    const result: Record<string, PerformanceMetrics> = {};
    for (const [endpoint, metrics] of this.metrics) {
      result[endpoint] = metrics;
    }
    return result;
  }

  /**
   * 重置指标
   */
  reset(endpoint?: string): void {
    if (endpoint) {
      this.metrics.delete(endpoint);
      this.requestTimes.delete(endpoint);
    } else {
      this.metrics.clear();
      this.requestTimes.clear();
    }
  }
}

/**
 * 全局性能监控器
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能监控中间件助手
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  endpoint: string,
): T {
  return (async (...args: any[]) => {
    performanceMonitor.startRequest(endpoint);

    try {
      const result = await fn(...args);
      performanceMonitor.endRequest(endpoint, true);
      return result;
    } catch (error) {
      performanceMonitor.endRequest(endpoint, false);
      throw error;
    }
  }) as any;
}

/**
 * 数据库查询优化器
 */
export class QueryOptimizer {
  private queryCache = new MemoryCache(500, 600000); // 10分钟TTL
  private slowQueryThreshold = 1000; // 1秒

  /**
   * 缓存查询结果
   */
  async cacheQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // 检查缓存
    const cached = this.queryCache.get<T>(queryKey);
    if (cached !== null) {
      return cached;
    }

    // 执行查询并监控性能
    const startTime = Date.now();
    const result = await queryFn();
    const duration = Date.now() - startTime;

    // 记录慢查询
    if (duration > this.slowQueryThreshold) {
      console.warn(`Slow query detected: ${queryKey} took ${duration}ms`);
    }

    // 缓存结果
    this.queryCache.set(queryKey, result, ttl);

    return result;
  }

  /**
   * 批处理查询
   */
  async batchQueries<T>(queries: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(queries.map((query) => query()));
  }

  /**
   * 清除查询缓存
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // 实现模式匹配清除（简化版本）
      this.queryCache.clear();
    } else {
      this.queryCache.clear();
    }
  }
}

/**
 * 全局查询优化器
 */
export const queryOptimizer = new QueryOptimizer();

/**
 * Firebase缓存优化
 */
export class FirebaseCache {
  private tokenCache = new MemoryCache(100, 3600000); // 1小时TTL
  private userCache = new MemoryCache(1000, 1800000); // 30分钟TTL

  /**
   * 缓存Firebase ID Token验证结果
   */
  cacheTokenVerification(token: string, result: any): void {
    // 只缓存前30个字符作为key，避免存储完整token
    const tokenKey = token.substring(0, 30);
    this.tokenCache.set(tokenKey, result, 1800000); // 30分钟
  }

  /**
   * 获取缓存的Token验证结果
   */
  getCachedTokenVerification(token: string): any | null {
    const tokenKey = token.substring(0, 30);
    return this.tokenCache.get(tokenKey);
  }

  /**
   * 缓存用户信息
   */
  cacheUser(uid: string, user: any): void {
    this.userCache.set(`user:${uid}`, user);
  }

  /**
   * 获取缓存的用户信息
   */
  getCachedUser(uid: string): any | null {
    return this.userCache.get(`user:${uid}`);
  }

  /**
   * 清除用户缓存
   */
  clearUserCache(uid?: string): void {
    if (uid) {
      this.userCache.delete(`user:${uid}`);
    } else {
      this.userCache.clear();
    }
  }
}

/**
 * 全局Firebase缓存
 */
export const firebaseCache = new FirebaseCache();

/**
 * 响应压缩助手
 */
export function shouldCompress(
  contentType: string,
  contentLength?: number,
): boolean {
  // 压缩文本类型的响应
  const compressibleTypes = [
    'application/json',
    'application/javascript',
    'text/html',
    'text/css',
    'text/plain',
    'text/xml',
  ];

  if (!compressibleTypes.some((type) => contentType.includes(type))) {
    return false;
  }

  // 只压缩大于1KB的响应
  if (contentLength && contentLength < 1024) {
    return false;
  }

  return true;
}

/**
 * 连接池管理
 */
export class ConnectionPool {
  private pools = new Map<string, any[]>();
  private maxConnections: number;

  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
  }

  /**
   * 获取连接
   */
  async getConnection(poolName: string): Promise<any> {
    const pool = this.pools.get(poolName) || [];

    if (pool.length > 0) {
      return pool.pop();
    }

    // 创建新连接（这里需要具体的连接实现）
    return this.createConnection(poolName);
  }

  /**
   * 释放连接
   */
  releaseConnection(poolName: string, connection: any): void {
    const pool = this.pools.get(poolName) || [];

    if (pool.length < this.maxConnections) {
      pool.push(connection);
      this.pools.set(poolName, pool);
    } else {
      // 关闭多余的连接
      this.closeConnection(connection);
    }
  }

  private async createConnection(poolName: string): Promise<any> {
    // 具体的连接创建逻辑
    return {};
  }

  private closeConnection(connection: any): void {
    // 具体的连接关闭逻辑
  }
}

/**
 * 获取系统资源使用情况
 */
export function getResourceUsage() {
  if (typeof process !== 'undefined') {
    const usage = process.memoryUsage();
    return {
      memory: {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
      },
      uptime: process.uptime(),
    };
  }
  return null;
}
