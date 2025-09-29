async forceStart(@Req() req: any, @Query('format') format?: string) {
    const keys: string[] = Array.isArray(req.body.keys) ? req.body.keys : [];
    if (!keys.length) throw new BadRequestException('missing keys');
    
    // Check for missing JIRA_DOMAIN
    const domain = process.env.JIRA_DOMAIN || '';
    if (!domain) throw new BadRequestException('missing JIRA_DOMAIN configuration');

    // Check for authorization
    if (!req.headers.authorization) {
        throw new ForbiddenException('You do not have permission to access this resource.');
    }

    for (const key of keys) {
        if (!/^[A-Z]+-\d+$/.test(key)) {
            throw new BadRequestException(`Invalid issue key format: ${key}`);
        }
    }
    const results = [];
    const basic = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    for (const key of keys) {
        const issueKey = String(key || '');
        const infoRes = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,description`, {
            headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' }
        });
        if (!infoRes.ok) {
            results.push({ key, error: `fetch_info_${infoRes.status}` });
            continue;
        }
        const data = await infoRes.json();
        results.push({ key, data });
    }
    return results;
}