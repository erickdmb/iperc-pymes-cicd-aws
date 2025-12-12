# IPERC PyMES — Identificación de Peligros, Evaluación de Riesgos y Controles

**Plataforma web moderna para gestión de matrices IPERC en pequeñas y medianas empresas peruanas, con despliegue automatizado en AWS.**

## 📋 Descripción del Proyecto

IPERC PyMES es una aplicación web completa para la creación, edición y gestión de matrices IPERC (Identificación de Peligros, Evaluación de Riesgos y Controles), cumpliendo con los requisitos del Ministerio del Trabajo y Promoción del Empleo (MTPE) de Perú.

### ✨ Funcionalidades Principales

- ✅ **Formulario dinámico** con filas editables (agregar/eliminar actividades)
- ✅ **Cálculo automático** de valor de riesgo en tiempo real (Mr = Probabilidad × Severidad)
- ✅ **Persistencia en DynamoDB** para almacenamiento de datos evaluaciones
- ✅ **Generación de PDF** profesional con formato landscape y color-coded risks
- ✅ **Vista HTML imprimible** de cada evaluación IPERC
- ✅ **Edición** de evaluaciones guardadas
- ✅ **Sidebar con lista** de todas las evaluaciones registradas
- ✅ **Filtrado por responsable** de la evaluación
- ✅ **Guía de valoración** integrada (Severidad vs Probabilidad)
- ✅ **Responsive design** para desktop y tablet

## 🏗️ Arquitectura

### Diagrama General

```
┌─────────────────┐
│   Navegador     │
│   (usuario)     │
└────────┬────────┘
         │ HTTP/HTTPS
         ▼
┌─────────────────────────────────────┐
│ Application Load Balancer (ALB)     │
│ Puerto 80 ──> 0.0.0.0/0             │
└─────────────┬───────────────────────┘
              │ forwarding:3000
              ▼
┌─────────────────────────────────────┐
│   AWS VPC (10.0.0.0/16)             │
│  ┌───────────────────────────────┐  │
│  │  Public Subnets (ALB)         │  │
│  └───────────────┬───────────────┘  │
│                  │ NAT Gateway       │
│  ┌───────────────▼───────────────┐  │
│  │ Private Subnets (ECS Tasks)   │  │
│  │ ┌─────────────────────────┐   │  │
│  │ │ ECS Fargate Task (3000) │   │  │
│  │ │ • Node.js app           │   │  │
│  │ │ • Express server        │   │  │
│  │ │ • 2 replicas (HA)       │   │  │
│  │ └─────────────────────────┘   │  │
│  └───────────────┬───────────────┘  │
└────────────────┼──────────────────────┘
                 │ (AWS SDK)
                 ▼
       ┌──────────────────────┐
       │  Amazon DynamoDB     │
       │ (iperc-pymes-        │
       │  evaluations)        │
       └──────────────────────┘
                 │
                 ▼
       ┌──────────────────────┐
       │  CloudWatch Logs     │
       │  (/ecs/iperc-pymes)  │
       └──────────────────────┘
```

### Stack Tecnológico

**Backend & Aplicación:**
- Node.js 18 (Alpine)
- Express.js
- AWS SDK v3 (DynamoDB)
- PDFKit (generación de PDF)
- UUID (identificadores únicos)

**Infraestructura & DevOps:**
- Docker (imagen ~45MB)
- AWS ECS Fargate (serverless containers)
- AWS ECR (registry)
- AWS VPC (networking)
- Application Load Balancer
- Amazon DynamoDB (NoSQL)
- CloudWatch (logging)
- Terraform (Infrastructure as Code)
- GitHub Actions (CI/CD)

**Frontend:**
- HTML5 + CSS3
- Vanilla JavaScript (sin frameworks)
- Fetch API
- LocalStorage (respaldo local)

---

## � Estructura del Proyecto

```
iperc-pymes-cicd-aws/
│
├── app/                          # Aplicación Node.js
│   ├── server.js                 # Express app principal (298 líneas)
│   ├── package.json              # Dependencias
│   ├── package-lock.json
│   ├── Dockerfile                # Imagen Docker (Alpine, ~45MB)
│   └── views/
│       └── ipercForm.html        # UI principal (560 líneas HTML/CSS/JS)
│
├── infra/                        # Infraestructura Terraform
│   ├── main.tf                   # VPC module
│   ├── variables.tf              # Variables (región, nombre proyecto)
│   ├── providers.tf              # AWS provider
│   ├── outputs.tf                # Outputs (ALB DNS, ECR URL, etc)
│   ├── alb.tf                    # Application Load Balancer + Target Group
│   ├── ecs.tf                    # ECS Cluster, Task Definition, Service
│   ├── iam.tf                    # Roles IAM para ECS
│   ├── ecr.tf                    # Repositorio ECR
│   ├── dynamodb.tf               # Tabla DynamoDB
│   ├── cloudwatch.tf             # CloudWatch Logs
│   ├── terraform.tfstate         # Estado (ignorar en git)
│   └── .terraform/               # Módulos (ignorar en git)
│
├── .github/
│   └── workflows/
│       └── cicd.yml              # Pipeline GitHub Actions
│
├── docs/
│   └── arquitectura.md
│
├── .gitignore
└── README.md                      # Este archivo
```

---

## 🔧 Requisitos Previos

### Software Requerido
- **Git** — Control de versiones
- **AWS CLI** v2+ — Configurado con credenciales
- **Terraform** >= 1.0 — Infrastructure as Code
- **Docker Desktop** — (opcional, para pruebas locales)
- **Node.js** 18+ — (opcional, para desarrollo local)

### Cuenta AWS
- Acceso a una **cuenta AWS activa**
- Permisos IAM:
  - ECS, ECR, VPC, ALB, DynamoDB, CloudWatch, IAM (para crear roles)
  - O usar usuario con permiso `AdministratorAccess` (desarrollo)

### Repositorio GitHub
- **Fork o clone** de este repositorio
- **Crear 2 secretos** en Settings → Secrets and variables → Actions:
  - `AWS_ACCESS_KEY_ID` → Access Key de tu usuario IAM
  - `AWS_SECRET_ACCESS_KEY` → Secret Access Key

---

## 🚀 Despliegue en AWS ECS

### Paso 1: Preparar Credenciales AWS

```bash
# Verificar que AWS CLI está configurado
aws sts get-caller-identity

# Output esperado:
# {
#    "UserId": "...",
#    "Account": "461690068356",
#    "Arn": "arn:aws:iam::461690068356:user/tu-usuario"
# }
```

Si no está configurado:
```bash
aws configure
# Ingresar:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-east-1
# - Default output format: json
```

### Paso 2: Clonar Repositorio

```bash
git clone https://github.com/tu-usuario/iperc-pymes-cicd-aws.git
cd iperc-pymes-cicd-aws
```

### Paso 3: Desplegar Infraestructura con Terraform

```bash
cd infra

# Inicializar Terraform (descarga módulos, crea .terraform/)
terraform init

# Ver plan de recursos a crear
terraform plan

# Aplicar configuración (crea recursos en AWS)
terraform apply -auto-approve
```

**Esto creará:**
- ✅ VPC con 2 subnets públicas + 2 privadas
- ✅ Application Load Balancer (ALB)
- ✅ Target Group (puerto 3000)
- ✅ ECS Cluster + Task Definition + Service (2 replicas)
- ✅ Repositorio ECR
- ✅ Tabla DynamoDB `iperc-pymes-evaluations`
- ✅ CloudWatch Log Group
- ✅ Security Groups e IAM Roles

**Tiempo estimado:** 3-5 minutos

### Paso 4: Obtener Outputs

```bash
terraform output
```

**Output esperado:**
```
alb_dns_name = "iperc-pymes-alb-XXXXXX.us-east-1.elb.amazonaws.com"
ecr_repository_url = "461690068356.dkr.ecr.us-east-1.amazonaws.com/iperc-pymes-app"
dynamodb_table_name = "iperc-pymes-evaluations"
ecs_cluster_name = "iperc-pymes-cluster"
ecs_service_name = "iperc-pymes-service"
```

### Paso 5: Configurar GitHub Secrets

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Crea los secretos:
   - **AWS_ACCESS_KEY_ID** → Copia tu Access Key
   - **AWS_SECRET_ACCESS_KEY** → Copia tu Secret Access Key

### Paso 6: Hacer Push para Activar CI/CD

```bash
cd ..
git add .
git commit -m "Initial deployment to AWS ECS"
git push origin main
```

**El workflow automático hará:**
1. ✅ Checkout del código
2. ✅ Login a ECR
3. ✅ Build de imagen Docker desde `./app`
4. ✅ Push a ECR con tag del commit SHA
5. ✅ Actualización de Task Definition
6. ✅ Deploy a ECS Service

**Tiempo estimado:** 2-3 minutos

### Paso 7: Verificar Deployment

```bash
# Ver estado del servicio
aws ecs describe-services \
  --cluster iperc-pymes-cluster \
  --services iperc-pymes-service \
  --query 'services[0].[desiredCount,runningCount]'

# Output esperado: [2, 2] (2 tareas deseadas, 2 en ejecución)

# Ver health de targets en ALB
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:461690068356:targetgroup/iperc-pymes-tg/... \
  --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]'

# Output esperado:
# [
#   ["10.0.1.134", "healthy"],
#   ["10.0.2.78", "healthy"]
# ]
```

---

## 🌐 Acceder a la Aplicación

Una vez que el deployment esté completo:

```
http://iperc-pymes-alb-XXXXXX.us-east-1.elb.amazonaws.com
```

Reemplaza `XXXXXX` con el DNS real del ALB (ver en `terraform output`).

### Pantalla Principal

Verás un formulario IPERC con:
- **Información General:** Empresa, Área, Proceso
- **Matriz de Riesgos:** Filas dinámicas con actividad, peligro, consecuencia, probabilidad, severidad
- **Cálculo Automático:** Mr (Valor de Riesgo) se calcula en tiempo real
- **Tres Botones:**
  - 💾 **Guardar** → Almacena en DynamoDB, muestra lista de IPERC
  - 📤 **Exportar PDF** → Descarga PDF landscape profesional
  - 📚 **Ver Lista** → Abre sidebar con evaluaciones guardadas

---

## 📝 Funcionalidades Detalladas

### 1. Crear Nueva Evaluación IPERC

1. Completa "Información General" (empresa, área, proceso)
2. Agrega filas en la matriz:
   - Click en **+** para nueva fila
   - Click en **🗑️** para eliminar fila
3. Completa datos de cada riesgo:
   - Actividad, Peligro, Consecuencia
   - Controles existentes, Controles nuevos
   - Probabilidad (1-5), Severidad (1-50)
   - Responsable (obligatorio)
4. **Mr se calcula automáticamente** (Probabilidad × Severidad)
5. Click en **💾 Guardar**

### 2. Descargar PDF

1. Completa la matriz IPERC
2. Click en **📤 Exportar PDF**
3. Descarga archivo con nombre `iperc-XXXXXXXX.pdf`
4. PDF incluye:
   - Encabezado con datos de empresa
   - Tabla profesional con bordes
   - Celdas de "Mr" color-coded por riesgo
   - Guía de valoración en últimas páginas

### 3. Ver y Editar Evaluaciones

1. Click en **📚 Ver Lista** o **↻ Actualizar**
2. Sidebar muestra todas las evaluaciones guardadas
3. Para cada IPERC:
   - Click **Ver** → Abre en vista HTML (para imprimir)
   - Click **Editar** → Carga datos en formulario para editar
4. Cambios se guardan con mismo ID

### 4. Filtrar por Responsable

En URL o API:
```
GET http://ALB-DNS/responsable/Juan%20Pérez
```

Retorna solo IPERC donde responsable sea "Juan Pérez"

---

## 🔍 Monitoreo y Troubleshooting

### Ver Logs en Tiempo Real

```bash
# CloudWatch Logs de ECS
aws logs tail /ecs/iperc-pymes-app --follow

# O en AWS Console: CloudWatch → Log Groups → /ecs/iperc-pymes-app
```

### Verificar Estado del Servicio ECS

```bash
# Descripción completa del servicio
aws ecs describe-services \
  --cluster iperc-pymes-cluster \
  --services iperc-pymes-service

# Ver tareas en ejecución
aws ecs list-tasks \
  --cluster iperc-pymes-cluster \
  --service-name iperc-pymes-service

# Detalles de una tarea específica
aws ecs describe-tasks \
  --cluster iperc-pymes-cluster \
  --tasks arn:aws:ecs:us-east-1:461690068356:task/...
```

### Reimplementar/Reiniciar Servicio

```bash
# Fuerza nuevo deployment
aws ecs update-service \
  --cluster iperc-pymes-cluster \
  --service iperc-pymes-service \
  --force-new-deployment
```

### Ver Imágenes en ECR

```bash
aws ecr describe-images \
  --repository-name iperc-pymes-app \
  --query 'imageDetails[*].[imageTags,imagePushedAt]'
```

---

## 💰 Costos Estimados (Mes)

| Servicio | Estimado |
|----------|----------|
| ECS Fargate (2×512 CPU, 1GB RAM) | ~$30 |
| ALB | ~$16 |
| DynamoDB (on-demand) | ~$5-15 |
| NAT Gateway | ~$32 |
| Data Transfer | ~$0-5 |
| **TOTAL** | **~$85-100/mes** |

*Valores aproximados para us-east-1, incluye free tier hasta límite*

---

## 🔐 Seguridad

### Buenas Prácticas Implementadas

✅ **Networking:**
- Aplicación en subnets privadas
- NAT Gateway para salida controlada
- Security Groups restrictivos (solo ALB → ECS:3000)

✅ **Datos:**
- DynamoDB con encriptación en reposo
- Sin datos sensibles expuestos en logs
- LocalStorage para fallback local

✅ **Credenciales:**
- Almacenadas en AWS Secrets Manager (via GitHub Secrets)
- Nunca en código ni commits
- IAM roles con mínimos privilegios

✅ **Actualizaciones:**
- Imágenes escaneadas en ECR
- Rolling updates sin downtime

---

## 📚 Rutas API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Formulario IPERC (HTML) |
| POST | `/iperc` | Guardar nuevo IPERC |
| GET | `/iperc/:id` | Cargar para editar |
| POST | `/iperc/:id` | Actualizar IPERC |
| GET | `/iperc/:id/view` | Vista HTML (lectura) |
| GET | `/pdf/:id` | Descargar PDF |
| GET | `/api/iperc` | Listar IPERC (JSON) |
| GET | `/responsable/:name` | Filtrar por responsable |
| GET | `/list` | HTML con lista (sidebar) |
| GET | `/health` | Health check (ALB) |

---

## 🛠️ Desarrollo Local (Opcional)

```bash
# Instalar dependencias
cd app
npm install

# Ejecutar en modo local (sin AWS)
export USE_LOCAL_STORE=true
npm start

# Acceder
open http://localhost:3000
```

---

## 📝 Notas

- **Data Persistence:** Los IPERC se guardan en DynamoDB. Para modo local, se usan en memoria.
- **PDF Generation:** Usa PDFKit con formato landscape A4
- **Timeouts:** ALB health check cada 30s, timeout 5s
- **Despliegue:** Zero-downtime rolling updates

---

## 👥 Autores

Proyecto desarrollado por **Erick DMB** para gestión de seguridad y salud ocupacional en PyMES.

## 📄 Licencia

MIT — Libre para usar, modificar y distribuir.

---

## 📞 Soporte

Para reportar bugs o sugerencias:
- GitHub Issues: [iperc-pymes-cicd-aws/issues](https://github.com/erickdmb/iperc-pymes-cicd-aws/issues)
- Email: contacto@tudominio.com

---

**Última actualización:** Diciembre 2025