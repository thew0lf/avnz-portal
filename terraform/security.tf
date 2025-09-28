resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "ALB SG"
  vpc_id      = aws_vpc.main.id
  ingress { from_port = 80  to_port = 80  protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] ipv6_cidr_blocks = ["::/0"] }
  ingress { from_port = 443 to_port = 443 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] ipv6_cidr_blocks = ["::/0"] }
  egress  { from_port = 0   to_port = 0   protocol = "-1" cidr_blocks = ["0.0.0.0/0"] ipv6_cidr_blocks = ["::/0"] }
}

resource "aws_security_group" "ecs_service" {
  name        = "${var.project_name}-ecs-svc-sg"
  description = "ECS services SG"
  vpc_id      = aws_vpc.main.id
  # inbound from alb only
  ingress { from_port = 3000 to_port = 3001 protocol = "tcp" security_groups = [aws_security_group.alb.id] }
  ingress { from_port = 8000 to_port = 8000 protocol = "tcp" security_groups = [aws_security_group.alb.id] }
  egress  { from_port = 0    to_port = 0    protocol = "-1" cidr_blocks = ["0.0.0.0/0"] ipv6_cidr_blocks = ["::/0"] }
}

resource "aws_security_group_rule" "alb_to_ecs_web" {
  type                     = "ingress"
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ecs_service.id
  source_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "alb_to_ecs_api" {
  type                     = "ingress"
  from_port                = 3001
  to_port                  = 3001
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ecs_service.id
  source_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "alb_to_ecs_ai" {
  type                     = "ingress"
  from_port                = 8000
  to_port                  = 8000
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ecs_service.id
  source_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "ecs_to_db" {
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  security_group_id = aws_security_group.db.id
  cidr_blocks       = []
  source_security_group_id = aws_security_group.ecs_service.id
}

