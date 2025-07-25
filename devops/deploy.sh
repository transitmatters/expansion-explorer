#!/bin/bash
set -e

export AWS_PROFILE=transitmatters
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

PRODUCTION=false

# Argument parsing
# pass "-p" flag to deploy to production

while getopts "p" opt; do
    case $opt in
        p)
            PRODUCTION=true
            ;;
  esac
done

# TODO: Update these to the new domain and cert ARN
$PRODUCTION && HOSTNAME="expansion-beta.labs.transitmatters.org" || HOSTNAME="expansion-beta.labs.transitmatters.org"
$PRODUCTION && DOMAIN="labs.transitmatters.org" || DOMAIN="labs.transitmatters.org"
$PRODUCTION && CERT_ARN="$TM_LABS_WILDCARD_CERT_ARN" || CERT_ARN="$TM_LABS_WILDCARD_CERT_ARN"

$PRODUCTION && STACK_NAME="expansion" || STACK_NAME="expansion-beta"

# Identify the version and commit of the current deploy
export GIT_SHA=`git rev-parse HEAD`
echo "Deploying version $GIT_SHA"

echo "Deploying Expansion Explorer to $HOSTNAME..."
echo "View stack log here: https://$AWS_REGION.console.aws.amazon.com/cloudformation/home?region=$AWS_REGION"

aws cloudformation deploy --stack-name $STACK_NAME \
    --template-file cloudformation.json \
    --capabilities CAPABILITY_NAMED_IAM \
    --no-fail-on-empty-changeset \
    --tags service=expansion-explorer \
    --parameter-overrides \
    ExpansionHostname=$HOSTNAME \
    ExpansionDomain=$DOMAIN \
    ExpansionCertArn=$CERT_ARN

# Look up the physical ID of the EC2 instance currently associated with the stack
INSTANCE_PHYSICAL_ID=$(aws cloudformation list-stack-resources --stack-name $STACK_NAME --query "StackResourceSummaries[?LogicalResourceId=='ExpansionInstance'].PhysicalResourceId" --output text)
# Look up the hostname of the instance by physical ID
INSTANCE_HOSTNAME=$(aws ec2 describe-instances --instance-ids $INSTANCE_PHYSICAL_ID --query "Reservations[*].Instances[*].PublicDnsName" --output text)

# Get the current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Run the playbook! :-)
export ANSIBLE_HOST_KEY_CHECKING=False # If it's a new host, ssh known_hosts not having the key fingerprint will cause an error. Silence it
ansible-playbook -v -i $INSTANCE_HOSTNAME, -u ubuntu --private-key ~/.ssh/transitmatters-expansion.pem playbook.yml --extra-vars "branch=$CURRENT_BRANCH"

# Grab the cloudfront ID and invalidate its cache
CLOUDFRONT_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items!=null] | [?contains(Aliases.Items, '$HOSTNAME')].Id | [0]" --output text)
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
