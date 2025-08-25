const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://sup.tasavia.com',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1NTM4MDIyMCwiZXhwIjo0OTExMDUzODIwLCJyb2xlIjoiYW5vbiJ9.WF4YneDOiESLMHiIamU4svFYX20A4TkWjlTk2dLFvi0'
);

async function testAdminAPI() {
  try {
    console.log('Signing in with test user...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'eshagh@fennaver.com',
      password: 'Eshagh611'
    });
    
    if (signInError) {
      console.error('Sign in error:', signInError);
      return;
    }
    
    console.log('Sign in successful, user ID:', signInData.user.id);
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      return;
    }
    
    console.log('Got session, making admin API call...');
    const response = await fetch('http://localhost:3000/api/admin/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response body:', result);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testAdminAPI();