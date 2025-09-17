resource "aws_cloudwatch_log_group" "api" { name = "/ecs/${var.project_name}-api" retention_in_days = 30 }
resource "aws_cloudwatch_log_group" "web" { name = "/ecs/${var.project_name}-web" retention_in_days = 30 }
resource "aws_cloudwatch_log_group" "ai"  { name = "/ecs/${var.project_name}-ai"  retention_in_days = 30 }

resource "aws_iam_role" "task_role" {
  name               = "${var.project_name}-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
}

resource "aws_iam_policy" "task_ssm" {
  name   = "${var.project_name}-task-ssm"
  policy = jsonencode({
    Version : "2012-10-17",
    Statement : [
      { Effect: "Allow", Action: ["ssm:GetParameter"], Resource: [
        "arn:aws:ssm:*:*:parameter${var.ssm_auth_secret_name}",
        "arn:aws:ssm:*:*:parameter${var.ssm_db_url_name}",
        "arn:aws:ssm:*:*:parameter${var.ssm_app_aes_key_name}"
      ]}
    ]
  })
}

resource "aws_iam_role_policy_attachment" "task_ssm_attach" {
  role       = aws_iam_role.task_role.name
  policy_arn = aws_iam_policy.task_ssm.arn
}

locals {
  private_subnet_ids = aws_subnet.private[*].id
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project_name}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.task_exec.arn
  task_role_arn            = aws_iam_role.task_role.arn
  container_definitions    = jsonencode([
    {
      name      : "api",
      image     : var.api_image,
      essential : true,
      portMappings : [{ containerPort: 3001, hostPort: 3001, protocol: "tcp" }],
      environment : [
        { name: "PGSSL", value: "" },
        { name: "REDIS_URL", value: "redis://" } # set ElastiCache endpoint in service env if needed
      ],
      secrets : [
        { name: "AUTH_SECRET", valueFrom: var.ssm_auth_secret_name },
        { name: "DATABASE_URL", valueFrom: var.ssm_db_url_name },
        { name: "APP_AES_KEY", valueFrom: var.ssm_app_aes_key_name }
      ],
      logConfiguration : { logDriver: "awslogs", options: { awslogs-group: aws_cloudwatch_log_group.api.name, awslogs-region: var.region, awslogs-stream-prefix: "ecs" } }
    }
  ])
}

resource "aws_ecs_task_definition" "web" {
  family                   = "${var.project_name}-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.task_exec.arn
  task_role_arn            = aws_iam_role.task_role.arn
  container_definitions    = jsonencode([
    {
      name      : "web",
      image     : var.web_image,
      essential : true,
      portMappings : [{ containerPort: 3000, hostPort: 3000, protocol: "tcp" }],
      environment : [
        { name: "NEXT_PUBLIC_API_BASE", value: "https://${var.domain_name}" },
        { name: "API_BASE", value: "http://api:3001" }
      ],
      logConfiguration : { logDriver: "awslogs", options: { awslogs-group: aws_cloudwatch_log_group.web.name, awslogs-region: var.region, awslogs-stream-prefix: "ecs" } }
    }
  ])
}

resource "aws_ecs_task_definition" "ai" {
  family                   = "${var.project_name}-ai"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.task_exec.arn
  task_role_arn            = aws_iam_role.task_role.arn
  container_definitions    = jsonencode([
    {
      name      : "ai",
      image     : var.ai_image,
      essential : true,
      portMappings : [{ containerPort: 8000, hostPort: 8000, protocol: "tcp" }],
      environment : [ { name: "AUTH_SECRET", value: "" } ],
      logConfiguration : { logDriver: "awslogs", options: { awslogs-group: aws_cloudwatch_log_group.ai.name, awslogs-region: var.region, awslogs-stream-prefix: "ecs" } }
    }
  ])
}

resource "aws_ecs_service" "api" {
  name            = "${var.project_name}-api"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  launch_type     = "FARGATE"
  network_configuration { subnets = local.private_subnet_ids security_groups = [aws_security_group.ecs_service.id] assign_public_ip = false }
  load_balancer { target_group_arn = aws_lb_target_group.api.arn container_name = "api" container_port = 3001 }
  depends_on = [aws_lb_listener.https]
}

resource "aws_ecs_service" "web" {
  name            = "${var.project_name}-web"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = 2
  launch_type     = "FARGATE"
  network_configuration { subnets = local.private_subnet_ids security_groups = [aws_security_group.ecs_service.id] assign_public_ip = false }
  load_balancer { target_group_arn = aws_lb_target_group.web.arn container_name = "web" container_port = 3000 }
  depends_on = [aws_lb_listener.https]
}

resource "aws_ecs_service" "ai" {
  name            = "${var.project_name}-ai"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.ai.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration { subnets = local.private_subnet_ids security_groups = [aws_security_group.ecs_service.id] assign_public_ip = false }
  load_balancer { target_group_arn = aws_lb_target_group.ai.arn container_name = "ai" container_port = 8000 }
  depends_on = [aws_lb_listener.https]
}

