resource "aws_cloudwatch_log_group" "iperc" {
  name              = "/ecs/${var.project_name}-app"
  retention_in_days = 7
}