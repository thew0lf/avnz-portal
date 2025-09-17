resource "aws_ecr_repository" "api" { name = "${var.project_name}-api" image_scanning_configuration { scan_on_push = true } }
resource "aws_ecr_repository" "web" { name = "${var.project_name}-web" image_scanning_configuration { scan_on_push = true } }
resource "aws_ecr_repository" "ai"  { name = "${var.project_name}-ai"  image_scanning_configuration { scan_on_push = true } }

