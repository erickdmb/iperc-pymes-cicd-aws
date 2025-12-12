resource "aws_iam_role_policy" "ecs_dynamodb" {
  name = "ecs-dynamodb-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Scan"
        ],
        Resource = aws_dynamodb_table.iperc_table.arn
      }
    ]
  })
}