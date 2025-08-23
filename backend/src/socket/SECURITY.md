# WebSocket Security Implementation

This document outlines the comprehensive security measures implemented for the WebSocket infrastructure in OMI Live.

## Overview

The WebSocket security system provides multi-layered protection against various attack vectors including:
- CORS policy violations
- Rate limiting abuse
- Payload injection attacks
- DDoS attempts
- Origin spoofing
- Session hijacking
- Unauthorized access

## Security Components

### 1. Security Configuration (`security.config.ts`)

Centralized configuration system that defines:
- **CORS policies** - Allowed origins, methods, headers
- **Rate limiting** - Connection, message, and event limits
- **Payload validation** - Size limits and content filtering
- **Security policies** - Anonymous access, activity thresholds
- **Monitoring settings** - Alert thresholds and health checks

### 2. Security Manager (`security.manager.ts`)

Core security orchestrator that handles:
- **Connection validation** - IP blocking, origin verification
- **Event validation** - Payload inspection, authentication checks
- **Rate limiting** - Multi-level limits (IP, user, event type)
- **Audit logging** - Security event tracking
- **Threat detection** - Suspicious activity monitoring

### 3. IP Reputation Manager

Advanced IP tracking and blocking system:
- **Connection tracking** - Per-IP connection history
- **Reputation scoring** - Suspicious activity detection
- **Dynamic blocking** - Automatic IP blocking on threshold breach
- **Rate limiting** - IP-based connection/message limits

### 4. Payload Validator

Message and data validation system:
- **Size limits** - Configurable payload size restrictions
- **Content sanitization** - XSS and injection prevention
- **Event type validation** - Whitelist-based event filtering
- **Authentication requirements** - Per-event auth enforcement

## Security Features

### CORS Protection

Enhanced CORS implementation with:
```typescript
cors: {
  origin: (origin, callback) => {
    // Dynamic origin validation
    const isAllowed = validateOrigin(origin);
    callback(isAllowed ? null : new Error('CORS policy violation'), isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Authorization', 'Content-Type']
}
```

**Features:**
- Dynamic origin validation
- Development localhost support
- Production whitelist enforcement
- Credential handling security

### Rate Limiting

Multi-tiered rate limiting system:

1. **Connection Rate Limiting**
   - Per-IP connection limits
   - Configurable time windows
   - Automatic IP blocking on abuse

2. **Message Rate Limiting**
   - Per-user/IP message limits
   - Role-based rate adjustment
   - Chat flood protection

3. **Event Rate Limiting**
   - Per-connection event limits
   - Event-type specific limits
   - Burst protection

### Payload Security

Comprehensive payload validation:
- **Size validation** - 1MB default limit
- **Message length** - 10KB text limit
- **Content sanitization** - XSS/script removal
- **JSON validation** - Malformed data rejection

### Authentication Integration

Seamless auth integration with:
- **JWT validation** - Token-based authentication
- **Role-based access** - Event-level permissions
- **Anonymous limits** - Restricted anonymous access
- **Session validation** - Active session verification

### Audit Logging

Comprehensive security event logging:
```typescript
interface SecurityAuditLog {
  id: string;
  timestamp: Date;
  eventType: SecurityEventType;
  ip: string;
  socketId?: string;
  userId?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}
```

**Logged Events:**
- Connection attempts/blocks
- Authentication failures
- Rate limit violations
- Payload violations
- Suspicious activities
- IP blocks/unblocks

### Monitoring & Alerting

Real-time security monitoring:
- **Connection metrics** - Active connections, anonymous users
- **Violation tracking** - Rate limits, payload violations
- **Alert thresholds** - Configurable warning levels
- **Health checks** - System status monitoring

## Security Middleware

### Connection Security

Applied at connection level:
```typescript
io.use(securityMiddleware);
```

**Validation steps:**
1. IP reputation check
2. Origin validation
3. Connection rate limiting
4. Anonymous connection limits
5. Security event logging

### Event Security

Applied to each WebSocket event:
```typescript
socket.on('event:name', validateEvent('event:name', handler));
```

**Validation steps:**
1. Event rate limiting
2. Payload size validation
3. Authentication requirement check
4. Content sanitization
5. Security event logging

## API Endpoints

Security management API routes (`/api/security`):

### Monitoring Endpoints
- `GET /metrics` - Security metrics overview
- `GET /audit-logs` - Filtered audit log retrieval
- `GET /dashboard` - Security dashboard data
- `GET /health` - Security health check

### Configuration Endpoints
- `GET /config` - Current security configuration
- `PUT /config` - Update security configuration

### Management Endpoints
- `POST /block-ip` - Block IP address
- `POST /unblock-ip` - Unblock IP address
- `GET /report` - Generate security reports

## Configuration Examples

### Development Configuration
```typescript
const devConfig = {
  cors: {
    allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
    allowCredentials: true
  },
  rateLimiting: {
    connectionLimit: { maxConnections: 100, windowMs: 60000 },
    messageLimit: { maxMessages: 200, windowMs: 60000 }
  },
  security: {
    allowAnonymous: true,
    maxAnonymousConnections: 500,
    enableAuditLogging: true
  }
};
```

### Production Configuration
```typescript
const prodConfig = {
  cors: {
    allowedOrigins: ['https://omilive.com', 'https://app.omilive.com'],
    allowCredentials: true
  },
  rateLimiting: {
    connectionLimit: { maxConnections: 50, windowMs: 60000 },
    messageLimit: { maxMessages: 100, windowMs: 60000 }
  },
  security: {
    allowAnonymous: true,
    maxAnonymousConnections: 1000,
    suspiciousActivityThreshold: 5,
    blockSuspiciousIps: true,
    enableAuditLogging: true
  }
};
```

## Environment Variables

Security-related environment variables:

```bash
# CORS Configuration
WHITE_LIST_URLS=https://omilive.com,https://app.omilive.com

# Socket.IO Admin (Development)
SOCKET_ADMIN_USERNAME=admin
SOCKET_ADMIN_PASSWORD=secure_admin_password

# Redis (for distributed rate limiting)
REDIS_URL=redis://localhost:6379
```

## Security Best Practices

### 1. Regular Security Audits
- Review audit logs weekly
- Monitor for unusual patterns
- Update threat signatures
- Verify configuration effectiveness

### 2. Rate Limit Tuning
- Monitor rate limit hit rates
- Adjust limits based on usage patterns
- Consider user roles and behaviors
- Balance security with user experience

### 3. IP Reputation Management
- Regular review of blocked IPs
- Whitelist trusted sources
- Monitor false positive rates
- Implement appeals process

### 4. Configuration Management
- Use environment-specific configs
- Regular security configuration reviews
- Automated configuration testing
- Change control procedures

## Threat Response

### Automated Responses
1. **Rate Limit Exceeded** - Temporary connection throttling
2. **Suspicious Activity** - Activity scoring and monitoring
3. **Threshold Breach** - Automatic IP blocking
4. **Payload Violations** - Event rejection and logging

### Manual Responses
1. **Critical Events** - Admin notification
2. **IP Management** - Manual block/unblock
3. **Configuration Updates** - Real-time security tuning
4. **Incident Investigation** - Audit log analysis

## Testing

### Security Test Categories
1. **CORS Testing** - Origin validation
2. **Rate Limit Testing** - Abuse simulation
3. **Payload Testing** - Malicious content injection
4. **Authentication Testing** - Auth bypass attempts
5. **DDoS Testing** - Connection flood simulation

### Test Tools
- Custom WebSocket test clients
- Rate limiting simulation scripts
- Origin spoofing tests
- Payload injection test suites

## Compliance

The security implementation supports:
- **GDPR** - Data protection and audit trails
- **SOC 2** - Security controls and monitoring
- **PCI DSS** - Payment card industry standards
- **ISO 27001** - Information security management

## Future Enhancements

Planned security improvements:
1. **GeoIP blocking** - Country-based access control
2. **ML-based threat detection** - Advanced pattern recognition
3. **WAF integration** - Web application firewall
4. **Certificate pinning** - Enhanced transport security
5. **Behavioral analysis** - User pattern monitoring

## Support

For security-related issues:
- Review audit logs: `GET /api/security/audit-logs`
- Check health status: `GET /api/security/health`
- Monitor metrics: `GET /api/security/dashboard`
- Generate reports: `GET /api/security/report`

## Emergency Procedures

### Security Incident Response
1. **Immediate containment** - Block malicious IPs
2. **Evidence preservation** - Export audit logs
3. **Impact assessment** - Review affected systems
4. **Remediation** - Apply security fixes
5. **Post-incident review** - Update procedures

### Contact Information
- Security Team: security@omilive.com
- Emergency Contact: +1-XXX-XXX-XXXX
- Incident Portal: security.omilive.com/incidents
