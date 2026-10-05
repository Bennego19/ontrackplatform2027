// Comprehensive API Test Script
// Run with: node test-all-routes-comprehensive.js

const http = require('http');

const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

// Test configuration
const config = {
  adminToken: null,
  studentToken: null,
  testStudentId: null,
  testMentorId: null
};

// Helper function to make HTTP requests
const request = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

const test = (name, fn) => {
  return fn().then(result => {
    if (result.success) {
      results.passed++;
      results.tests.push({ name, status: 'PASS', details: result.details });
      console.log(`✅ ${name}`);
    } else {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', details: result.error });
      console.log(`❌ ${name}: ${result.error}`);
    }
  }).catch(error => {
    results.failed++;
    results.tests.push({ name, status: 'ERROR', details: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  });
};

// ==================== ROUTES TO TEST ====================
// Based on server.mjs, these are the routes:
// /api/onboardstudents
// /api/onboardmentors
// /api/mentorstudentassignment
// /api/mentordashboard
// /api/programs
// /api/tracks
// /api/assessments
// /api/resources
// /api/events
// /api/cohorts
// /api/studentassignment
// /api/auth
// /api/adminlogin
// /api/user
// /api/addassignment
// /api/accesscontrol
// /api/mentorship
// /api/internship
// /api/skillsdevelopment
// /api/modules
// /api/projects
// /api/announcements
// /api/addtask
// /api/help-requests

const runTests = async () => {
  console.log('🧪 Starting Comprehensive API Tests');
  console.log('=====================================\n');

  // Test 1: Root endpoint
  await test('GET / - Root endpoint', async () => {
    const result = await request('GET', '/');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 2: Health check
  await test('GET /api/health - Health check', async () => {
    const result = await request('GET', '/api/health');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 3: Test endpoint
  await test('GET /api/test - Test endpoint', async () => {
    const result = await request('GET', '/api/test');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 4: Welcome endpoint
  await test('GET /api/welcome - Welcome endpoint', async () => {
    const result = await request('GET', '/api/welcome');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 5: Auth endpoint info
  await test('GET /api/auth - Auth endpoint', async () => {
    const result = await request('GET', '/api/auth');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 6: Onboard students endpoint
  await test('GET /api/onboardstudents - Get all students', async () => {
    const result = await request('GET', '/api/onboardstudents');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 7: Onboard mentors endpoint
  await test('GET /api/onboardmentors - Get all mentors', async () => {
    const result = await request('GET', '/api/onboardmentors');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 8: Programs endpoint
  await test('GET /api/programs - Get programs', async () => {
    const result = await request('GET', '/api/programs');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 9: Tracks endpoint
  await test('GET /api/tracks - Get tracks', async () => {
    const result = await request('GET', '/api/tracks');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 10: Cohorts endpoint
  await test('GET /api/cohorts - Get cohorts', async () => {
    const result = await request('GET', '/api/cohorts');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 11: Resources endpoint
  await test('GET /api/resources - Get resources', async () => {
    const result = await request('GET', '/api/resources');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 12: Events endpoint
  await test('GET /api/events - Get events', async () => {
    const result = await request('GET', '/api/events');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 13: Announcements endpoint
  await test('GET /api/announcements - Get announcements', async () => {
    const result = await request('GET', '/api/announcements');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 14: Assessments endpoint
  await test('GET /api/assessments - Get assessments', async () => {
    const result = await request('GET', '/api/assessments');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 15: Modules endpoint
  await test('GET /api/modules - Get modules', async () => {
    const result = await request('GET', '/api/modules');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 16: Projects endpoint
  await test('GET /api/projects - Get projects', async () => {
    const result = await request('GET', '/api/projects');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 17: Student assignment endpoint
  await test('GET /api/studentassignment - Get student assignments', async () => {
    const result = await request('GET', '/api/studentassignment');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 18: Mentor student assignment endpoint
  await test('GET /api/mentorstudentassignment - Get mentor assignments', async () => {
    const result = await request('GET', '/api/mentorstudentassignment');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 19: Mentor dashboard endpoint
  await test('GET /api/mentordashboard - Get mentor dashboard', async () => {
    const result = await request('GET', '/api/mentordashboard');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 20: Mentorship endpoint
  await test('GET /api/mentorship - Get mentorships', async () => {
    const result = await request('GET', '/api/mentorship');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 21: Internship endpoint
  await test('GET /api/internship - Get internships', async () => {
    const result = await request('GET', '/api/internship');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 22: Skills development endpoint
  await test('GET /api/skillsdevelopment - Get skills development', async () => {
    const result = await request('GET', '/api/skillsdevelopment');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 23: Access control endpoint
  await test('GET /api/accesscontrol - Get access control', async () => {
    const result = await request('GET', '/api/accesscontrol');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 24: Help requests endpoint
  await test('GET /api/help-requests - Get help requests', async () => {
    const result = await request('GET', '/api/help-requests');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 25: User endpoint
  await test('GET /api/user - Get user', async () => {
    const result = await request('GET', '/api/user');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 26: Add assignment endpoint
  await test('GET /api/addassignment - Get assignments', async () => {
    const result = await request('GET', '/api/addassignment');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 27: Add task endpoint
  await test('GET /api/addtask - Get tasks', async () => {
    const result = await request('GET', '/api/addtask');
    return {
      success: result.status === 200,
      error: `Expected 200, got ${result.status}`
    };
  });

  // Test 28: 404 handler
  await test('GET /api/nonexistent - 404 handler', async () => {
    const result = await request('GET', '/api/nonexistent');
    return {
      success: result.status === 404,
      error: `Expected 404, got ${result.status}`
    };
  });

  // Print summary
  console.log('\n=====================================');
  console.log('📊 Test Summary');
  console.log('=====================================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.passed + results.failed}`);
  console.log('=====================================');

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`   - ${t.name}: ${t.details}`);
    });
  }

  process.exit(results.failed > 0 ? 1 : 0);
};

runTests().catch(console.error);
