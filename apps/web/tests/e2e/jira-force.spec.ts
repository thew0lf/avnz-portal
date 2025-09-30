test.beforeEach(async ({ request }) => {
        process.env.JIRA_DOMAIN = 'test-domain';
        process.env.JIRA_EMAIL = 'test-email';
        process.env.JIRA_API_TOKEN = 'test-token';
        process.env.JIRA_PROJECT_KEY = 'test-project';
        process.env.JIRA_DEFAULT_ORG_CODE = 'test-org-code';
        // Ensure all required variables are set
        expect(process.env.JIRA_DOMAIN).toBeTruthy();
        expect(process.env.JIRA_EMAIL).toBeTruthy();
        expect(process.env.JIRA_API_TOKEN).toBeTruthy();
        expect(process.env.JIRA_PROJECT_KEY).toBeTruthy();
        expect(process.env.JIRA_DEFAULT_ORG_CODE).toBeTruthy();
    });
