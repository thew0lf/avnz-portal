resource "aws_lb" "app" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = []
  subnets            = aws_subnet.public[*].id
}

# Listener and target groups per service would be defined here.

