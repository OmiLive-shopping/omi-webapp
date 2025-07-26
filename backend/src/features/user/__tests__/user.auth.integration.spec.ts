import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import express from 'express';
import { PrismaService } from '../../../config/prisma.config.js';
import userRoutes from '../routes/user.routes.js';
import { apiErrorMiddleware } from '../../../middleware/api-error.middleware.js';

// Skip integration tests in CI environment
const skipInCI = process.env.CI ? it.skip : it;

describe('User Authentication Integration Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });
  });

  describe('POST /v1/users/register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Test123456!',
      password2: 'Test123456!',
      firstName: 'Test',
    };

    it('should successfully register a new user', async () => {
      const response = await request(app)
        .post('/v1/users/register')
        .send(validRegisterData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            email: validRegisterData.email,
            username: validRegisterData.username,
            firstName: validRegisterData.firstName,
            isAdmin: false,
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            expiresIn: 1800,
          },
          streamKey: expect.any(String),
        },
      });

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: validRegisterData.email },
      });
      expect(user).toBeTruthy();
      expect(user?.username).toBe(validRegisterData.username);
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/v1/users/register')
        .send({
          ...validRegisterData,
          password: 'weak',
          password2: 'weak',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        data: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'password',
              message: expect.stringContaining('Password must contain'),
            }),
          ]),
        },
      });
    });

    it('should fail when passwords do not match', async () => {
      const response = await request(app)
        .post('/v1/users/register')
        .send({
          ...validRegisterData,
          password2: 'DifferentPassword123!',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        data: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'password2',
              message: 'Passwords do not match',
            }),
          ]),
        },
      });
    });

    it('should fail when email already exists', async () => {
      // Create user first
      await prisma.user.create({
        data: {
          email: validRegisterData.email,
          username: 'existinguser',
          password: await bcrypt.hash('password', 10),
          firstName: 'Existing',
        },
      });

      const response = await request(app)
        .post('/v1/users/register')
        .send(validRegisterData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User already exists with this email',
      });
    });

    it('should fail when username already exists', async () => {
      // Create user first
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          username: validRegisterData.username,
          password: await bcrypt.hash('password', 10),
          firstName: 'Existing',
        },
      });

      const response = await request(app)
        .post('/v1/users/register')
        .send(validRegisterData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User already exists with this username',
      });
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/v1/users/register')
        .send({
          email: validRegisterData.email,
          password: validRegisterData.password,
          // missing username, password2, firstName
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        data: {
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'username' }),
            expect.objectContaining({ field: 'password2' }),
            expect.objectContaining({ field: 'firstName' }),
          ]),
        },
      });
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/v1/users/register')
        .send({
          ...validRegisterData,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        data: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: 'Invalid email format',
            }),
          ]),
        },
      });
    });
  });

  describe('POST /v1/users/login', () => {
    const testUser = {
      email: 'testlogin@example.com',
      username: 'testloginuser',
      password: 'Test123456!',
      firstName: 'Test',
    };

    beforeEach(async () => {
      // Create test user for login tests
      await prisma.user.create({
        data: {
          ...testUser,
          password: await bcrypt.hash(testUser.password, 10),
        },
      });
    });

    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/v1/users/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            email: testUser.email,
            username: testUser.username,
            firstName: testUser.firstName,
            isAdmin: false,
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            expiresIn: 1800,
          },
        },
      });

      // Verify JWT token structure
      const token = response.body.data.tokens.accessToken;
      const tokenParts = token.split('.');
      expect(tokenParts).toHaveLength(3); // JWT should have 3 parts
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/v1/users/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/v1/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User not found',
      });
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/v1/users/login')
        .send({
          email: testUser.email,
          // missing password
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        data: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'password',
              message: 'Password is required',
            }),
          ]),
        },
      });
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/v1/users/login')
        .send({
          email: 'invalid-email',
          password: testUser.password,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        data: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: 'Invalid email format',
            }),
          ]),
        },
      });
    });

    it('should be rate limited after multiple failed attempts', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/v1/users/login')
          .send({
            email: testUser.email,
            password: 'WrongPassword123!',
          });
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/v1/users/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Too many requests'),
      });
    });
  });

  describe('Authentication Flow E2E', () => {
    it('should complete full registration and login flow', async () => {
      const userData = {
        email: 'e2etest@example.com',
        username: 'e2etestuser',
        password: 'E2ETest123456!',
        password2: 'E2ETest123456!',
        firstName: 'E2E',
      };

      // Step 1: Register
      const registerResponse = await request(app)
        .post('/v1/users/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      const registerToken = registerResponse.body.data.tokens.accessToken;

      // Step 2: Use token to get profile
      const profileResponse = await request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200);

      expect(profileResponse.body).toMatchObject({
        success: true,
        data: {
          email: userData.email,
          username: userData.username,
          firstName: userData.firstName,
        },
      });

      // Step 3: Login with same credentials
      const loginResponse = await request(app)
        .post('/v1/users/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      const loginToken = loginResponse.body.data.tokens.accessToken;

      // Step 4: Verify both tokens work
      const profileWithLoginToken = await request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(profileWithLoginToken.body.data.email).toBe(userData.email);
    });
  });
});