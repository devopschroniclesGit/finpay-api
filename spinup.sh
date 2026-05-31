#!/bin/bash
set -e

echo "=== FinPay Environment Spin Up ==="
echo ""

# Step 1 — Clock sync
echo "1. Syncing VM clock..."
sudo chronyc makestep
echo "   Done"

# Step 2 — Get instance details
echo "2. Getting EB instance details..."
INSTANCE_ID=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name finpay-production \
  --region us-east-1 \
  --query 'EnvironmentResources.Instances[0].Id' \
  --output text)
echo "   Instance: $INSTANCE_ID"

EB_SG=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region us-east-1 \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)
echo "   EB SG: $EB_SG"

ALB_SG=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=finpay-production-alb-sg \
  --region us-east-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text)
echo "   ALB SG: $ALB_SG"

RDS_SG=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=finpay-production-rds-sg \
  --region us-east-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text)
echo "   RDS SG: $RDS_SG"

# Step 3 — ALB security group rule
echo "3. Adding ALB to EB security group rule..."
aws ec2 authorize-security-group-ingress \
  --group-id $EB_SG \
  --protocol tcp \
  --port 80 \
  --source-group $ALB_SG \
  --region us-east-1 2>/dev/null || echo "   Rule already exists, continuing..."

# Step 4 — RDS security group rule
echo "4. Adding EB to RDS security group rule..."
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $EB_SG \
  --region us-east-1 2>/dev/null || echo "   Rule already exists, continuing..."

# Step 5 — Register target
echo "5. Registering EB instance in ALB target group..."
TG_ARN=$(aws elbv2 describe-target-groups \
  --names finpay-tg \
  --region us-east-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

aws elbv2 register-targets \
  --target-group-arn $TG_ARN \
  --targets Id=$INSTANCE_ID,Port=80 \
  --region us-east-1

echo "   Registered. Waiting 45s for health check..."
sleep 45

# Step 6 — Verify health
echo "6. Checking target health..."
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region us-east-1 \
  --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]' \
  --output table

# Step 7 — Cloudflare reminder
CLOUDFRONT_DOMAIN=$(cd ~/finpay-infrastructure && terraform output -raw cloudfront_domain)
echo ""
echo "=== MANUAL STEP REQUIRED ==="
echo "Update Cloudflare DNS:"
echo "  Type:  CNAME"
echo "  Name:  finpay"
echo "  Value: $CLOUDFRONT_DOMAIN"
echo "  Proxy: DNS only (grey cloud)"
echo ""

# Step 8 — Trigger pipeline
echo "7. Triggering CI/CD pipeline..."
cd ~/finpay-api
git commit --allow-empty -m "chore: trigger pipeline after environment redeploy"
git push
echo "   Pipeline triggered (~5-8 min)"
echo ""

# Step 9 — First time only reminder
echo "=== FIRST TIME ONLY ==="
echo "If this is a fresh RDS (after terraform destroy):"
echo "Run migrations and seed manually:"
echo ""
echo "  # Open RDS to your IP temporarily"
echo "  MY_IP=\$(curl -s ifconfig.me)"
echo "  aws ec2 authorize-security-group-ingress \\"
echo "    --group-id \$RDS_SG --protocol tcp --port 5432 \\"
echo "    --cidr \$MY_IP/32 --region us-east-1"
echo "  aws rds modify-db-instance --db-instance-identifier finpay-postgres \\"
echo "    --publicly-accessible --apply-immediately --region us-east-1"
echo "  aws rds wait db-instance-available \\"
echo "    --db-instance-identifier finpay-postgres --region us-east-1"
echo ""
echo "  # Run seed"
echo "  cd ~/finpay-api && node prisma/seed.cjs"
echo ""
echo "  # Close RDS immediately after"
echo "  aws rds modify-db-instance --db-instance-identifier finpay-postgres \\"
echo "    --no-publicly-accessible --apply-immediately --region us-east-1"
echo "  aws ec2 revoke-security-group-ingress \\"
echo "    --group-id \$RDS_SG --protocol tcp --port 5432 \\"
echo "    --cidr \$MY_IP/32 --region us-east-1"
echo ""
echo "=== Spin up complete ==="
echo "Verify: curl -I https://finpay.devopschronicles.com/api/v1/health"
