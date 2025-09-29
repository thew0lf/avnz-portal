# Authentication Flow Diagram

## Overview
This document outlines the multi-tenant authentication flow and Role-Based Access Control (RBAC) system.

## Flow Diagram
1. **User Registration**
   - User accesses the registration page.
   - User submits registration form.
   - System creates the first organization and assigns the OrgOwner role.

2. **Client Registration**
   - After organization creation, user registers a client.
   - System generates a unique client short code.

3. **User Invitation**
   - Admin sends invitations via email/SMS.
   - Invited users receive a link to set up their accounts.

4. **Login Process**
   - User logs in using client short code, username, and password.
   - System verifies credentials and assigns roles based on user type.

5. **Role Assignment**
   - Admin assigns roles to users within the organization.
   - Role permissions are enforced at both the server and UI levels.

6. **Access Control**
   - Users access features based on their assigned roles.
   - Unauthorized access attempts are logged and denied.