    const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || '';
    if (!domain || !email || !apiToken || !orgCode) throw new BadRequestException('missing_jira_env');