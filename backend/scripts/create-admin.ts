#!/usr/bin/env tsx
/**
 * Script to create admin user via Better Auth API
 * Run: tsx scripts/create-admin.ts
 */

async function createAdminUser() {
  const baseURL = 'http://localhost:9000/v1/auth';

  // First, sign up the admin user
  const signupResponse = await fetch(`${baseURL}/sign-up`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@omi.live',
      password: 'password123',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
    }),
  });

  if (!signupResponse.ok) {
    const error = await signupResponse.text();
    console.error('Failed to create admin user:', error);
    return;
  }

  const result = await signupResponse.json();
  console.log('✅ Admin user created successfully:', result.user.email);

  // Note: To make them admin, you'd need to update the isAdmin field
  // This would require a separate admin endpoint or direct DB update
}

// Make sure backend is running first!
console.log('📝 Creating admin user via Better Auth...');
console.log('⚠️  Make sure backend is running on port 9000!');

setTimeout(() => {
  createAdminUser().catch(console.error);
}, 2000);