resource "aws_dynamodb_table" "iperc_table" {
  name         = "iperc-pymes-evaluations"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ipercId"

  attribute {
    name = "ipercId"
    type = "S"
  }
}