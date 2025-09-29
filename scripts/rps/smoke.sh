#!/bin/bash

# Smoke test for Jira setup

# Load environment variables
source .env

# Test Jira group creation
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" -H "Content-Type: application/json" "https://$JIRA_DOMAIN/rest/api/3/group" -d '{"name":"avnz-app-team"}')
if [ "$response" -ne 201 ]; then
  echo "Failed to create Jira group. HTTP status: $response"
  exit 1
fi

# Add users to group
for email in emma.johansson@avnz.io raj.patel@avnz.io lucas.meyer@avnz.io carlos.hernandez@avnz.io sophia.li@avnz.io david.oconnor@avnz.io aisha.khan@avnz.io mateo.rossi@avnz.io hannah.wright@avnz.io nguyen.minh@avnz.io olivia.brown@avnz.io fatima.elsayed@avnz.io daniel.kim@avnz.io laura.silva@avnz.io michael.carter@avnz.io anastasia.petrov@avnz.io priya.desai@avnz.io ethan.zhao@avnz.io lina.alvarez@avnz.io marco.silva@avnz.io bill.cuevas@avnz.io; do
  accountId=$(curl -s -X POST -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" -H "Content-Type: application/json" "https://$JIRA_DOMAIN/rest/api/3/user" -d '{"emailAddress":"$email"}' | jq -r '.accountId')
  response=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" -H "Content-Type: application/json" "https://$JIRA_DOMAIN/rest/api/3/group/user?groupname=avnz-app-team" -d '{"accountId":"$accountId"}')
  if [ "$response" -ne 204 ]; then
    echo "Failed to add user $email to group. HTTP status: $response"
    exit 1
  fi
done

# Verify users have appropriate roles
# (Add role verification logic here)

echo "Smoke test completed successfully."