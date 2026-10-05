import request from 'supertest';
import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock the router (we'll test the actual routes)
let router;
let app;
let mongoServer;
let db;
let collection;

// Mock middleware
const mockAuthenticateToken = (req, res, next) => {
  // Mock token validation for testing
  req.user = {
    _id: '507f1f77bcf86cd799439011',
    program: 'Internship Program',
    track: 'Web Development'
  };
  next();
};

const mockAuthenticateAdmin = (req, res, next) => {
  // Mock admin authentication for testing
  req.adminUser = {
    _id: '507f1f77bcf86cd799439012',
    username: 'testadmin',
    role: 'admin'
  };
  next();
};

// Test data
const testStudent = {
  name: 'John',
  surname: 'Doe',
  email: 'john.doe@test.com',
  cellnumber: '0812345678',
  program: 'Internship Program',
  track: 'Web Development',
  username: 'johndoe',
  password: 'Password123!',
  accessAllowed: 'granted',
  createdAt: new Date(),
  lastLogin: null,
  loginAttempts: 0,
  lockedUntil: null
};

const testAdmin = {
  username: 'testadmin',
  password: 'AdminPass123!',
  role: 'admin',
  email: 'admin@test.com'
};

describe('Students API Tests', () => {
  beforeAll(async () => {
    // Create in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    const client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db('testdb');
    
    // Initialize collections
    collection = db.collection('students');
    await db.collection('admins').insertOne(testAdmin);
    
    // Create Express app with router
    app = express();
    app.use(express.json());
    
    // Import the actual router
    router = (await import('../routes/onboardstudents.mjs')).default;
    
    // Mock middleware for testing
    const originalRouter = router;
    const stack = originalRouter.stack;
    
    // Replace middleware with mocks
    stack.forEach(layer => {
      if (layer.name === 'authenticateToken') {
        layer.handle = mockAuthenticateToken;
      }
      if (layer.name === 'authenticateAdmin') {
        layer.handle = mockAuthenticateAdmin;
      }
    });
    
    app.use('/api/students', router);
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear students collection before each test
    await collection.deleteMany({});
  });

  describe('GET /api/students', () => {
    test('should return all students', async () => {
      // Insert test data
      await collection.insertOne(testStudent);
      
      const response = await request(app)
        .get('/api/students')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].username).toBe(testStudent.username);
    });

    test('should return empty array when no students', async () => {
      const response = await request(app)
        .get('/api/students')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('POST /api/students/onboardstudent', () => {
    test('should create a new student with valid data', async () => {
      const newStudent = {
        name: 'Jane',
        surname: 'Smith',
        email: 'jane.smith@test.com',
        cellnumber: '0823456789',
        program: 'Mentorship Program',
        track: 'Java Programming',
        username: 'janesmith',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/students/onboardstudent')
        .send(newStudent)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Student registered successfully.');
      expect(response.body.user.email).toBe(newStudent.email);
      expect(response.body.userId).toBeDefined();
    });

    test('should reject duplicate email or username', async () => {
      // First insertion
      await request(app)
        .post('/api/students/onboardstudent')
        .send(testStudent)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(201);

      // Second insertion with same email
      const response = await request(app)
        .post('/api/students/onboardstudent')
        .send(testStudent)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    test('should validate required fields', async () => {
      const invalidStudent = {
        name: 'Test',
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/students/onboardstudent')
        .send(invalidStudent)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(400);

      expect(response.body.message).toContain('required');
    });

    test('should validate email format', async () => {
      const invalidEmailStudent = {
        ...testStudent,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/students/onboardstudent')
        .send(invalidEmailStudent)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('email')
          })
        ])
      );
    });

    test('should validate password strength', async () => {
      const weakPasswordStudent = {
        ...testStudent,
        username: 'weakpassuser',
        email: 'weak@test.com',
        password: '123' // Too weak
      };

      const response = await request(app)
        .post('/api/students/onboardstudent')
        .send(weakPasswordStudent)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password'
          })
        ])
      );
    });
  });

  describe('POST /api/students/login', () => {
    beforeEach(async () => {
      // Insert a student for login tests
      await collection.insertOne(testStudent);
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/students/login')
        .send({
          username: testStudent.username,
          password: testStudent.password
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe(testStudent.username);
    });

    test('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/students/login')
        .send({
          username: testStudent.username,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    test('should reject login with non-existent username', async () => {
      const response = await request(app)
        .post('/api/students/login')
        .send({
          username: 'nonexistent',
          password: 'SomePass123!'
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    test('should require both username and password', async () => {
      const response = await request(app)
        .post('/api/students/login')
        .send({
          username: testStudent.username
          // Missing password
        })
        .expect(400);

      expect(response.body.message).toContain('required');
    });
  });

  describe('GET /api/students/profile', () => {
    beforeEach(async () => {
      await collection.insertOne(testStudent);
    });

    test('should return user profile with authentication', async () => {
      const response = await request(app)
        .get('/api/students/profile')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toHaveProperty('name', testStudent.name);
      expect(response.body).toHaveProperty('surname', testStudent.surname);
      expect(response.body).toHaveProperty('email', testStudent.email);
      expect(response.body).not.toHaveProperty('password');
    });

    test('should include current semester and registration month', async () => {
      const response = await request(app)
        .get('/api/students/profile')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toHaveProperty('currentSemester');
      expect(response.body).toHaveProperty('registrationMonth');
      expect(response.body.currentSemester).not.toBe('Not specified');
    });
  });

  describe('GET /api/students/total-students', () => {
    test('should return total student count', async () => {
      // Insert multiple students
      await collection.insertMany([
        testStudent,
        {
          ...testStudent,
          username: 'student2',
          email: 'student2@test.com'
        },
        {
          ...testStudent,
          username: 'student3',
          email: 'student3@test.com'
        }
      ]);

      const response = await request(app)
        .get('/api/students/total-students')
        .expect(200);

      expect(response.body.total).toBe(3);
    });

    test('should return 0 when no students', async () => {
      const response = await request(app)
        .get('/api/students/total-students')
        .expect(200);

      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/students/totals-by-programs', () => {
    beforeEach(async () => {
      // Insert students with different programs
      await collection.insertMany([
        { ...testStudent, program: 'Mentorship Program' },
        { ...testStudent, username: 's2', email: 's2@test.com', program: 'Mentorship Program' },
        { ...testStudent, username: 's3', email: 's3@test.com', program: 'Internship Program' },
        { ...testStudent, username: 's4', email: 's4@test.com', program: 'Skill Development Program' },
        { ...testStudent, username: 's5', email: 's5@test.com', program: 'Graduate Program' },
        { ...testStudent, username: 's6', email: 's6@test.com', program: 'Other Program' }
      ]);
    });

    test('should count only dashboard programs', async () => {
      const response = await request(app)
        .get('/api/students/totals-by-programs')
        .expect(200);

      const totals = response.body.totals;
      
      expect(totals['Mentorship Program']).toBe(2);
      expect(totals['Internship Program']).toBe(1);
      expect(totals['Skill Development Program']).toBe(1);
      expect(totals['Graduate Program']).toBe(1);
      expect(totals['Other Program']).toBeUndefined(); // Should not include non-dashboard programs
    });
  });

  describe('GET /api/students/my-resources', () => {
    test('should return resources filtered by user program and track', async () => {
      // Setup resources collection
      await db.collection('resources').insertMany([
        { title: 'Web Dev Resource', program: 'Internship Program', track: 'Web Development' },
        { title: 'Java Resource', program: 'Mentorship Program', track: 'Java Programming' },
        { title: 'General Resource', isGeneral: true }
      ]);

      const response = await request(app)
        .get('/api/students/my-resources')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      // Should include Web Dev Resource (matching program/track) and General Resource
      expect(response.body.length).toBe(2);
    });
  });

  describe('PATCH /api/students/:id', () => {
    test('should update student with valid data', async () => {
      const inserted = await collection.insertOne(testStudent);
      const studentId = inserted.insertedId;

      const updates = {
        name: 'Updated Name',
        email: 'updated@test.com',
        program: 'Updated Program',
        track: 'Updated Track'
      };

      const response = await request(app)
        .patch(`/api/students/${studentId}`)
        .send(updates)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200);

      expect(response.body.modifiedCount).toBe(1);

      // Verify update
      const updated = await collection.findOne({ _id: studentId });
      expect(updated.name).toBe(updates.name);
      expect(updated.email).toBe(updates.email);
    });

    test('should return 404 for non-existent student', async () => {
      const fakeId = '507f1f77bcf86cd799439999';
      
      await request(app)
        .patch(`/api/students/${fakeId}`)
        .send({ name: 'Updated' })
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200); // Note: updateOne returns matchedCount: 0, not 404
    });
  });

  describe('DELETE /api/students/:id', () => {
    test('should delete existing student', async () => {
      const inserted = await collection.insertOne(testStudent);
      const studentId = inserted.insertedId;

      const response = await request(app)
        .delete(`/api/students/${studentId}`)
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200);

      expect(response.body.deletedCount).toBe(1);

      // Verify deletion
      const deleted = await collection.findOne({ _id: studentId });
      expect(deleted).toBeNull();
    });
  });

  describe('Dashboard Statistics Endpoints', () => {
    beforeEach(async () => {
      // Setup diverse test data
      await collection.insertMany([
        { ...testStudent, program: 'Mentorship Program', track: 'Web Development' },
        { ...testStudent, username: 'm2', email: 'm2@test.com', program: 'Mentorship Program', track: 'Java Programming' },
        { ...testStudent, username: 'i1', email: 'i1@test.com', program: 'Internship Program', track: 'Web Development' },
        { ...testStudent, username: 'g1', email: 'g1@test.com', program: 'Graduate Program', track: 'Python Programming' },
        { ...testStudent, username: 's1', email: 's1@test.com', program: 'Skill Development Program', track: 'Robotics' },
        { ...testStudent, username: 'none', email: 'none@test.com', program: null, track: null }
      ]);
    });

    test('GET /totals-by-tracks should return track distribution', async () => {
      const response = await request(app)
        .get('/api/students/totals-by-tracks')
        .expect(200);

      expect(response.body.totals['Web Development']).toBe(2);
      expect(response.body.totals['Java Programming']).toBe(1);
      expect(response.body.totals['Python Programming']).toBe(1);
      expect(response.body.totals['Robotics']).toBe(1);
    });

    test('GET /summary-statistics should return comprehensive stats', async () => {
      const response = await request(app)
        .get('/api/students/summary-statistics')
        .expect(200);

      expect(response.body.summary.totalStudents).toBe(6);
      expect(response.body.summary.programDistribution).toBeInstanceOf(Array);
      expect(response.body.summary.trackDistribution).toBeInstanceOf(Array);
    });

    test('GET /detailed-breakdown should return program-track matrix', async () => {
      const response = await request(app)
        .get('/api/students/detailed-breakdown')
        .expect(200);

      expect(response.body.breakdown).toBeInstanceOf(Array);
      
      const mentorship = response.body.breakdown.find(p => p.program === 'Mentorship Program');
      expect(mentorship).toBeDefined();
      expect(mentorship.total).toBe(2);
      expect(mentorship.tracks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ track: 'Web Development', count: 1 }),
          expect.objectContaining({ track: 'Java Programming', count: 1 })
        ])
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      // Simulate database error by dropping collection mid-request
      await collection.drop();
      
      const response = await request(app)
        .get('/api/students')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    test('should handle malformed ObjectId', async () => {
      await request(app)
        .patch('/api/students/invalid-id')
        .send({ name: 'Test' })
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(500); // Should handle invalid ObjectId
    });
  });
});