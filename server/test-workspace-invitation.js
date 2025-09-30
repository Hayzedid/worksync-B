import { sendWorkspaceInvitation } from './src/services/emailServices.js';

async function testWorkspaceInvitationEmail() {
  try {
    console.log('🧪 Testing workspace invitation email functionality...');
    
    // Test email for existing user
    console.log('\n📧 Testing invitation email for existing user...');
    const existingUserResult = await sendWorkspaceInvitation({
      to: 'existing-user@example.com',
      workspaceName: 'Test Workspace',
      inviterName: 'John Doe',
      inviteUrl: 'https://worksync.com/workspace?ws=123',
      isExistingUser: true
    });
    
    console.log('Existing user email result:', existingUserResult);

    // Test email for new user
    console.log('\n📧 Testing invitation email for new user...');
    const newUserResult = await sendWorkspaceInvitation({
      to: 'new-user@example.com',
      workspaceName: 'Test Workspace',
      inviterName: 'John Doe',
      inviteUrl: 'https://worksync.com/invite/abc123token',
      isExistingUser: false
    });
    
    console.log('New user email result:', newUserResult);
    
  } catch (error) {
    console.error('❌ Error testing workspace invitation email:', error);
  } finally {
    process.exit(0);
  }
}

testWorkspaceInvitationEmail();