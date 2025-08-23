import { EventEmitter } from 'events';
import { PerformanceAlert, WebSocketMetrics } from './websocket-performance-monitor';

/**
 * Alert notification channel types
 */
export type NotificationChannel = 'console' | 'ui' | 'webhook' | 'email' | 'analytics';

/**
 * Alert rule configuration
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: keyof WebSocketMetrics;
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';
  threshold: number;
  duration?: number; // How long condition must be true (ms)
  severity: 'info' | 'warning' | 'critical';
  channels: NotificationChannel[];
  cooldown?: number; // Minimum time between alerts (ms)
  enabled: boolean;
  metadata?: Record<string, any>;
}

/**
 * Alert notification
 */
export interface AlertNotification {
  alert: PerformanceAlert;
  rule: AlertRule;
  timestamp: Date;
  channel: NotificationChannel;
  delivered: boolean;
  error?: string;
}

/**
 * Alert history entry
 */
export interface AlertHistoryEntry {
  alert: PerformanceAlert;
  rule: AlertRule;
  triggeredAt: Date;
  resolvedAt?: Date;
  notifications: AlertNotification[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  notes?: string;
}

/**
 * Webhook payload
 */
export interface WebhookPayload {
  alert: PerformanceAlert;
  rule: AlertRule;
  metrics: Partial<WebSocketMetrics>;
  timestamp: string;
  environment?: string;
  service?: string;
}

/**
 * Alert manager configuration
 */
export interface AlertManagerConfig {
  webhookUrl?: string;
  emailEndpoint?: string;
  analyticsEndpoint?: string;
  maxHistorySize: number;
  defaultCooldown: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * WebSocket Alert Manager
 * Manages alert rules, notifications, and history
 */
export class WebSocketAlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private history: AlertHistoryEntry[] = [];
  private activeAlerts: Map<string, AlertHistoryEntry> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private conditionTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: AlertManagerConfig;
  
  constructor(config?: Partial<AlertManagerConfig>) {
    super();
    
    this.config = {
      maxHistorySize: 1000,
      defaultCooldown: 60000, // 1 minute
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
    
    this.initializeDefaultRules();
  }
  
  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // High latency rule
    this.addRule({
      id: 'high-latency',
      name: 'High Latency Alert',
      description: 'Triggers when latency exceeds threshold',
      metric: 'currentLatency',
      condition: 'gt',
      threshold: 100,
      duration: 5000,
      severity: 'warning',
      channels: ['console', 'ui'],
      cooldown: 60000,
      enabled: true
    });
    
    // Critical latency rule
    this.addRule({
      id: 'critical-latency',
      name: 'Critical Latency Alert',
      description: 'Triggers when latency is critically high',
      metric: 'currentLatency',
      condition: 'gt',
      threshold: 500,
      severity: 'critical',
      channels: ['console', 'ui', 'webhook'],
      cooldown: 30000,
      enabled: true
    });
    
    // High error rate rule
    this.addRule({
      id: 'high-error-rate',
      name: 'High Error Rate Alert',
      description: 'Triggers when error rate exceeds threshold',
      metric: 'errorRate',
      condition: 'gt',
      threshold: 0.05,
      duration: 10000,
      severity: 'critical',
      channels: ['console', 'ui', 'webhook', 'analytics'],
      cooldown: 120000,
      enabled: true
    });
    
    // Connection loss rule
    this.addRule({
      id: 'connection-loss',
      name: 'Connection Loss Alert',
      description: 'Triggers when disconnections occur frequently',
      metric: 'disconnectionCount',
      condition: 'gt',
      threshold: 3,
      severity: 'critical',
      channels: ['console', 'ui', 'webhook'],
      enabled: true
    });
    
    // Memory usage rule
    this.addRule({
      id: 'high-memory',
      name: 'High Memory Usage Alert',
      description: 'Triggers when memory usage is high',
      metric: 'memoryUsage',
      condition: 'gt',
      threshold: 100 * 1024 * 1024, // 100MB
      duration: 30000,
      severity: 'warning',
      channels: ['console', 'ui', 'analytics'],
      cooldown: 300000,
      enabled: true
    });
    
    // Queue overflow rule
    this.addRule({
      id: 'queue-overflow',
      name: 'Queue Overflow Alert',
      description: 'Triggers when message queue is too large',
      metric: 'queueSize',
      condition: 'gt',
      threshold: 100,
      severity: 'critical',
      channels: ['console', 'ui', 'webhook'],
      cooldown: 60000,
      enabled: true
    });
    
    // Low throughput rule
    this.addRule({
      id: 'low-throughput',
      name: 'Low Throughput Alert',
      description: 'Triggers when throughput drops below threshold',
      metric: 'throughput',
      condition: 'lt',
      threshold: 10000, // 10KB/s
      duration: 15000,
      severity: 'warning',
      channels: ['console', 'ui'],
      cooldown: 180000,
      enabled: true
    });
  }
  
  /**
   * Add alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.emit('rule:added', rule);
  }
  
  /**
   * Update alert rule
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.rules.get(ruleId);
    if (!rule) return;
    
    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);
    this.emit('rule:updated', updatedRule);
  }
  
  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) return;
    
    this.rules.delete(ruleId);
    
    // Clear any active timers
    const timer = this.conditionTimers.get(ruleId);
    if (timer) {
      clearTimeout(timer);
      this.conditionTimers.delete(ruleId);
    }
    
    this.emit('rule:removed', rule);
  }
  
  /**
   * Enable/disable rule
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (!rule) return;
    
    rule.enabled = enabled;
    this.emit('rule:toggled', { rule, enabled });
  }
  
  /**
   * Check metrics against rules
   */
  checkMetrics(metrics: WebSocketMetrics): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      // Check if in cooldown
      if (this.isInCooldown(rule.id)) continue;
      
      const value = metrics[rule.metric] as number;
      const conditionMet = this.evaluateCondition(value, rule.condition, rule.threshold);
      
      if (conditionMet) {
        if (rule.duration && rule.duration > 0) {
          this.handleDurationBasedRule(rule, metrics);
        } else {
          this.triggerAlert(rule, metrics);
        }
      } else {
        // Clear timer if condition no longer met
        const timer = this.conditionTimers.get(rule.id);
        if (timer) {
          clearTimeout(timer);
          this.conditionTimers.delete(rule.id);
        }
        
        // Check if alert should be resolved
        this.checkForResolution(rule, metrics);
      }
    }
  }
  
  /**
   * Evaluate condition
   */
  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'neq': return value !== threshold;
      default: return false;
    }
  }
  
  /**
   * Handle duration-based rule
   */
  private handleDurationBasedRule(rule: AlertRule, metrics: WebSocketMetrics): void {
    // Check if timer already exists
    if (this.conditionTimers.has(rule.id)) return;
    
    // Start timer
    const timer = setTimeout(() => {
      // Re-check condition after duration
      const currentValue = metrics[rule.metric] as number;
      if (this.evaluateCondition(currentValue, rule.condition, rule.threshold)) {
        this.triggerAlert(rule, metrics);
      }
      this.conditionTimers.delete(rule.id);
    }, rule.duration);
    
    this.conditionTimers.set(rule.id, timer);
  }
  
  /**
   * Trigger alert
   */
  private triggerAlert(rule: AlertRule, metrics: WebSocketMetrics): void {
    // Check if alert already active
    if (this.activeAlerts.has(rule.id)) return;
    
    const alert: PerformanceAlert = {
      id: `${rule.id}_${Date.now()}`,
      type: rule.severity === 'critical' ? 'critical' : 'warning',
      metric: rule.metric,
      threshold: rule.threshold,
      currentValue: metrics[rule.metric] as number,
      message: rule.description,
      timestamp: new Date(),
      resolved: false
    };
    
    const historyEntry: AlertHistoryEntry = {
      alert,
      rule,
      triggeredAt: new Date(),
      notifications: [],
      acknowledged: false
    };
    
    // Add to active alerts
    this.activeAlerts.set(rule.id, historyEntry);
    
    // Add to history
    this.addToHistory(historyEntry);
    
    // Set cooldown
    this.setCooldown(rule.id, rule.cooldown || this.config.defaultCooldown);
    
    // Send notifications
    this.sendNotifications(historyEntry, metrics);
    
    // Emit event
    this.emit('alert:triggered', { alert, rule, metrics });
  }
  
  /**
   * Check for alert resolution
   */
  private checkForResolution(rule: AlertRule, metrics: WebSocketMetrics): void {
    const activeAlert = this.activeAlerts.get(rule.id);
    if (!activeAlert || activeAlert.alert.resolved) return;
    
    // Mark as resolved
    activeAlert.alert.resolved = true;
    activeAlert.resolvedAt = new Date();
    
    // Remove from active alerts
    this.activeAlerts.delete(rule.id);
    
    // Emit event
    this.emit('alert:resolved', { 
      alert: activeAlert.alert, 
      rule, 
      duration: activeAlert.resolvedAt.getTime() - activeAlert.triggeredAt.getTime() 
    });
  }
  
  /**
   * Send notifications
   */
  private async sendNotifications(entry: AlertHistoryEntry, metrics: WebSocketMetrics): Promise<void> {
    for (const channel of entry.rule.channels) {
      const notification: AlertNotification = {
        alert: entry.alert,
        rule: entry.rule,
        timestamp: new Date(),
        channel,
        delivered: false
      };
      
      try {
        await this.sendToChannel(channel, entry, metrics);
        notification.delivered = true;
      } catch (error) {
        notification.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to send notification to ${channel}:`, error);
      }
      
      entry.notifications.push(notification);
    }
  }
  
  /**
   * Send notification to specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel, 
    entry: AlertHistoryEntry, 
    metrics: WebSocketMetrics
  ): Promise<void> {
    switch (channel) {
      case 'console':
        this.sendToConsole(entry);
        break;
        
      case 'ui':
        this.sendToUI(entry);
        break;
        
      case 'webhook':
        await this.sendToWebhook(entry, metrics);
        break;
        
      case 'email':
        await this.sendToEmail(entry);
        break;
        
      case 'analytics':
        await this.sendToAnalytics(entry, metrics);
        break;
    }
  }
  
  /**
   * Send to console
   */
  private sendToConsole(entry: AlertHistoryEntry): void {
    const { alert, rule } = entry;
    const prefix = rule.severity === 'critical' ? '🚨' : '⚠️';
    
    console.warn(
      `${prefix} [WebSocket Alert] ${rule.name}:`,
      `${alert.metric} = ${alert.currentValue} (threshold: ${alert.threshold})`,
      alert.message
    );
  }
  
  /**
   * Send to UI
   */
  private sendToUI(entry: AlertHistoryEntry): void {
    this.emit('notification:ui', entry);
  }
  
  /**
   * Send to webhook
   */
  private async sendToWebhook(entry: AlertHistoryEntry, metrics: WebSocketMetrics): Promise<void> {
    if (!this.config.webhookUrl) return;
    
    const payload: WebhookPayload = {
      alert: entry.alert,
      rule: entry.rule,
      metrics: {
        currentLatency: metrics.currentLatency,
        errorRate: metrics.errorRate,
        messageRate: metrics.messageRate,
        queueSize: metrics.queueSize,
        throughput: metrics.throughput
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      service: 'websocket-monitor'
    };
    
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Webhook notification failed:', error);
      throw error;
    }
  }
  
  /**
   * Send to email (placeholder)
   */
  private async sendToEmail(entry: AlertHistoryEntry): Promise<void> {
    if (!this.config.emailEndpoint) return;
    
    // Email implementation would go here
    console.log('Email notification:', entry.rule.name);
  }
  
  /**
   * Send to analytics
   */
  private async sendToAnalytics(entry: AlertHistoryEntry, metrics: WebSocketMetrics): Promise<void> {
    // Analytics implementation
    this.emit('analytics:track', {
      event: 'websocket_alert',
      properties: {
        alertId: entry.alert.id,
        ruleName: entry.rule.name,
        severity: entry.rule.severity,
        metric: entry.alert.metric,
        value: entry.alert.currentValue,
        threshold: entry.alert.threshold,
        ...metrics
      }
    });
  }
  
  /**
   * Check if rule is in cooldown
   */
  private isInCooldown(ruleId: string): boolean {
    const cooldownEnd = this.cooldowns.get(ruleId);
    if (!cooldownEnd) return false;
    
    if (Date.now() < cooldownEnd) {
      return true;
    } else {
      this.cooldowns.delete(ruleId);
      return false;
    }
  }
  
  /**
   * Set cooldown for rule
   */
  private setCooldown(ruleId: string, duration: number): void {
    this.cooldowns.set(ruleId, Date.now() + duration);
  }
  
  /**
   * Add to history
   */
  private addToHistory(entry: AlertHistoryEntry): void {
    this.history.unshift(entry);
    
    // Trim history if needed
    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(0, this.config.maxHistorySize);
    }
  }
  
  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string, notes?: string): void {
    const entry = Array.from(this.activeAlerts.values())
      .find(e => e.alert.id === alertId);
    
    if (entry) {
      entry.acknowledged = true;
      entry.acknowledgedBy = acknowledgedBy;
      entry.acknowledgedAt = new Date();
      entry.notes = notes;
      
      this.emit('alert:acknowledged', entry);
    }
  }
  
  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertHistoryEntry[] {
    return Array.from(this.activeAlerts.values());
  }
  
  /**
   * Get alert history
   */
  getHistory(limit?: number): AlertHistoryEntry[] {
    return limit ? this.history.slice(0, limit) : [...this.history];
  }
  
  /**
   * Get rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }
  
  /**
   * Export configuration
   */
  exportConfig(): { rules: AlertRule[]; config: AlertManagerConfig } {
    return {
      rules: this.getRules(),
      config: this.config
    };
  }
  
  /**
   * Import configuration
   */
  importConfig(data: { rules: AlertRule[]; config?: Partial<AlertManagerConfig> }): void {
    // Clear existing rules
    this.rules.clear();
    
    // Import rules
    for (const rule of data.rules) {
      this.addRule(rule);
    }
    
    // Update config if provided
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }
    
    this.emit('config:imported');
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    // Clear all timers
    for (const timer of this.conditionTimers.values()) {
      clearTimeout(timer);
    }
    
    this.conditionTimers.clear();
    this.rules.clear();
    this.activeAlerts.clear();
    this.cooldowns.clear();
    this.history = [];
    
    this.removeAllListeners();
  }
}

// Export singleton instance
export const wsAlertManager = new WebSocketAlertManager();