function isAuthorized(user: any) {
    const validRoles = ['OrgOwner', 'OrgAdmin', 'OrgAccountManager', 'OrgStaff', 'OrgEmployee']; // Updated roles
    return user && user.role && validRoles.includes(user.role);
}
