# ECS Cluster
resource "aws_ecs_cluster" "iperc" {
  name = "iperc-cluster"
}

# Task Definition
resource "aws_ecs_task_definition" "iperc" {
  family                   = "iperc-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name      = "iperc-app"
    image     = "${aws_ecr_repository.iperc_repo.repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.iperc.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
    environment = [
      { name = "AWS_REGION", value = var.aws_region },
      { name = "PORT", value = "3000" }
    ]
  }])
}

# ECS Service
resource "aws_ecs_service" "iperc" {
  name            = "iperc-service"
  cluster         = aws_ecs_cluster.iperc.id
  task_definition = aws_ecs_task_definition.iperc.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.iperc.arn
    container_name   = "iperc-app"
    container_port   = 3000
  }

  depends_on = [aws_iam_role_policy.ecs_dynamodb]
}