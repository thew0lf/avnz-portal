resource "aws_db_subnet_group" "db" {
  name       = "${var.project_name}-db-subnets"
  subnet_ids = aws_subnet.db[*].id
}

resource "aws_security_group" "db" {
  name        = "${var.project_name}-db-sg"
  description = "DB security group"
  vpc_id      = aws_vpc.main.id
}

# Example RDS Postgres (swap for Aurora module if desired)
resource "aws_db_instance" "postgres" {
  identifier              = "${var.project_name}-pg"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = "db.t4g.small"
  username                = var.db_username
  password                = data.aws_ssm_parameter.db_password.value
  db_subnet_group_name    = aws_db_subnet_group.db.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  allocated_storage       = 50
  storage_encrypted       = true
  skip_final_snapshot     = true
  publicly_accessible     = false
  multi_az                = true
  db_name                 = var.db_name
}

data "aws_ssm_parameter" "db_password" {
  name            = var.db_password_ssm_name
  with_decryption = true
}

