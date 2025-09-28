resource "aws_ecr_repository" "api" { name = "${var.project_name}-api" image_scanning_configuration { scan_on_push = false } }
resource "aws_ecr_repository" "web" { name = "${var.project_name}-web" image_scanning_configuration { scan_on_push = false } }
resource "aws_ecr_repository" "ai"  { name = "${var.project_name}-ai"  image_scanning_configuration { scan_on_push = false } }

output "api_repo" { value = aws_ecr_repository.api.repository_url }
output "web_repo" { value = aws_ecr_repository.web.repository_url }
output "ai_repo"  { value = aws_ecr_repository.ai.repository_url }

