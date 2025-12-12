resource "aws_ecr_repository" "iperc" {
  name = "${var.project_name}-app"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Project = var.project_name }
}