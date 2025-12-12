resource "aws_dynamodb_table" "iperc" {
  name         = "${var.project_name}-evaluations"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ipercId"

  attribute {
    name = "ipercId"
    type = "S"
  }

  tags = { Project = var.project_name }
}