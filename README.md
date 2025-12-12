Proyecto Final CI/CD en AWS con ECS — IPERC para Pymes
========================================================

Descripción
-----------
Proyecto de despliegue automatizado de una aplicación IPERC (Identificación de Peligros, Evaluación de Riesgos y Controles) para pymes peruanas, desarrollada en Node.js y desplegada en AWS utilizando contenedores Docker, orquestación con ECS Fargate y pipeline CI/CD con GitHub Actions.

Funcionalidades:
- Formulario dinámico para registro de riesgos laborales
- Persistencia en Amazon DynamoDB
- Generación de PDF oficial al vuelo
- Acceso, edición y consulta en cualquier momento
- Cumplimiento con formato del MTPE (Perú)

Arquitectura
------------
Componentes Principales:
- Aplicación: Node.js 18 con Express
- Contenedor: Docker (imagen optimizada)
- Orquestación: AWS ECS Fargate
- Networking: VPC con subnets públicas y privadas
- Load Balancer: Application Load Balancer (ALB)
- Base de datos: Amazon DynamoDB
- Registro: Amazon ECR
- CI/CD: GitHub Actions
- IaC: Terraform
- Monitoreo: CloudWatch (logs)
- Escalado: Auto Scaling basado en CPU/Memoria

Diagrama de Arquitectura:
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Application Load Balancer (ALB)   │
│         (Subnets Públicas)          │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      ECS Service (Fargate)          │
│    (Subnets Privadas con NAT)       │
│  ┌────────┐        ┌────────┐       │
│  │ Task 1 │        │ Task 2 │       │
│  │Container│       │Container│       │
│  └────────┘        └────────┘       │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│    Amazon ECR (Container Registry)  │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      Amazon DynamoDB (Datos)        │
└─────────────────────────────────────┘

Stack Tecnológico
-----------------
Infraestructura:
- AWS VPC: Red virtual privada
- AWS ECS: Orquestación de contenedores
- AWS Fargate: Serverless compute
- AWS ECR: Registro de imágenes Docker
- Application Load Balancer
- Amazon DynamoDB
- CloudWatch: Monitoreo y logs

Desarrollo:
- Node.js 18
- Express
- PDFKit (generación de PDF)
- Docker
- Terraform
- GitHub Actions
- Git

Estructura del Proyecto
-----------------------
iperc-pymes-cicd-aws/
├── app/
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   └── views/
│       └── ipercForm.html
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── vpc.tf
│   ├── security-groups.tf
│   ├── ecr.tf
│   ├── iam.tf
│   ├── alb.tf
│   ├── ecs.tf
│   ├── dynamodb.tf
│   └── cloudwatch.tf
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── docs/
│   └── arquitectura.md
└── README.md

Despliegue
----------

Prerrequisitos:
- AWS CLI configurado
- Terraform >= 1.0
- Docker Desktop
- Git
- Node.js 18+
- Cuenta de AWS

Instalación:
1. Clonar repositorio
   git clone https://github.com/erickdmn/pymes-cicd-aws.git
   cd iperc-pymes-cicd-aws

2. Desplegar infraestructura
   cd terraform
   terraform init
   terraform apply

3. La app se despliega automáticamente en push a main

Pipeline CI/CD
--------------
Flujo Automático:
- Push a main → Activa pipeline
- Build → Construye imagen Docker
- Push → Sube a ECR con tag de commit
- Deploy → Actualiza servicio ECS
- Verify → Espera estabilidad del servicio

Estrategia de Despliegue:
- Rolling update con 0 downtime
- Health checks en /health
- Máximo 2 tareas en paralelo

Monitoreo
---------
- Logs en CloudWatch: /ecs/iperc-app
- Ver en tiempo real:
  aws logs tail "/ecs/iperc-app" --follow
- Métricas: CPU, memoria, tráfico (CloudWatch Console)

Seguridad
---------
- Contenedores en subnets privadas
- NAT Gateway para salida controlada
- Security Groups restrictivos
- IAM roles con mínimos privilegios
- Credenciales en GitHub Secrets (nunca en código)
- Datos sensibles no expuestos

Uso de la Aplicación
--------------------
1. Acceder a la URL del ALB (tras despliegue)
2. Llenar formulario IPERC con:
   - Información general (empresa, área, proceso)
   - Matriz de riesgos (actividad, peligro, consecuencia, etc.)
3. Guardar → se genera ID único
4. Descargar PDF o editar en cualquier momento

Enlaces
-------
- Aplicación: http://[ALB-DNS-AWS] (disponible tras primer despliegue)
- Repositorio: https://github.com/tu-usuario/iperc-pymes-cicd-aws
- CloudWatch: AWS Console → CloudWatch → Logs

Autores
-------
- Erick DMB

Licencia
--------
MIT

Soporte
-------
Para reportar problemas: GitHub Issues