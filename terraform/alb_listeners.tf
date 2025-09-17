resource "aws_lb_target_group" "web" {
  name     = "${var.project_name}-tg-web"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check { path = "/" matcher = "200-399" port = "3000" }
}

resource "aws_lb_target_group" "api" {
  name     = "${var.project_name}-tg-api"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check { path = "/health" matcher = "200-399" port = "3001" }
}

resource "aws_lb_target_group" "ai" {
  name     = "${var.project_name}-tg-ai"
  port     = 8000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check { path = "/health" matcher = "200-399" port = "8000" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"
  default_action { type = "redirect" redirect { port = "443" protocol = "HTTPS" status_code = "HTTP_301" } }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action { type = "forward" target_group_arn = aws_lb_target_group.web.arn }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10
  action { type = "forward" target_group_arn = aws_lb_target_group.api.arn }
  condition { path_pattern { values = ["/api/*"] } }
}

resource "aws_lb_listener_rule" "ai" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20
  action { type = "forward" target_group_arn = aws_lb_target_group.ai.arn }
  condition { path_pattern { values = ["/ai/*"] } }
}

