import { Controller, Post, Body } from '@nestjs/common';
import { pool } from './db.js';

@Controller('register')
export class RegisterController {
  @Post()
  async register(@Body() body: { orgName: string; billingEmail: string; adminEmail: string; password: string; mfaPreference: string; complianceConsent: boolean; }) {
    // Validate input and check for existing orgs
    // Create Org and initial User with OrgOwner role
    // Generate unique client short code
    // Return success response
  }
}
