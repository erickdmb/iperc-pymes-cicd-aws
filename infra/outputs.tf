output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.iperc.dns_name
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.iperc.repository_url
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.iperc.name
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.iperc.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.iperc.name
}
