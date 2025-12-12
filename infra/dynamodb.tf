resource "aws_dynamodb_table" "iperc_table" {
  name         = "${var.project_name}-evaluations"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "evaluationId"

  attribute {
    name = "evaluationId"
    type = "S"
  }

  tags = {
    Environment = "dev"
    Project     = var.project_name
  }
}