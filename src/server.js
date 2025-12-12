const express = require('express');
const path = require('path');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
  UpdateItemCommand
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de AWS
const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = 'iperc-pymes-evaluations';

const dynamoClient = new DynamoDBClient({ region: REGION });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Función para obtener color y nivel de riesgo
function getRiskColorAndLevel(mr) {
  if (mr <= 3) return { color: '#4cd137', level: 'BAJO', class: 'verde' };
  if (mr <= 10) return { color: '#ffd700', level: 'MEDIO', class: 'amarillo' };
  if (mr <= 50) return { color: '#ffa500', level: 'ALTO', class: 'naranja' };
  if (mr <= 250) return { color: '#ff6b6b', level: 'CRÍTICO', class: 'rojo' };
  return { color: '#cccccc', level: 'NO DEFINIDO', class: 'gris' };
}

// Sirve formulario
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'ipercForm.html'));
});

// Guarda nuevo IPERC
app.post('/iperc', async (req, res) => {
  try {
    const { company, area, process } = req.body;
    const rows = [];
    let i = 0;
    while (req.body[`rows[${i}].activity`]) {
      const prob = parseInt(req.body[`rows[${i}].probability`]) || 0;
      const sev = parseInt(req.body[`rows[${i}].severity`]) || 0;
      const mr = prob * sev;
      const riskInfo = getRiskColorAndLevel(mr);

      rows.push({
        activity: req.body[`rows[${i}].activity`],
        hazard: req.body[`rows[${i}].hazard`],
        consequence: req.body[`rows[${i}].consequence`],
        existingControls: req.body[`rows[${i}].existingControls`] || '',
        probability: prob,
        severity: sev,
        mr: mr,
        riskColor: riskInfo.color,
        riskLevel: riskInfo.level,
        newControls: req.body[`rows[${i}].newControls`] || '',
        responsible: req.body[`rows[${i}].responsible`] || ''
      });
      i++;
    }

    const ipercId = `IPERC-${new Date().getFullYear()}-${uuidv4().substring(0,6).toUpperCase()}`;
    const now = new Date().toISOString();

    const params = {
      TableName: TABLE_NAME,
      Item: marshall({
        ipercId,
        company,
        area,
        process,
        rows,
        createdAt: now,
        updatedAt: now
      })
    };

    await dynamoClient.send(new PutItemCommand(params));

    res.send(`
      <h2>✅ IPERC guardado con ID: ${ipercId}</h2>
      <p><a href="/list">Ver todos</a></p>
      <p><a href="/pdf/${ipercId}">📥 Descargar PDF</a></p>
      <p><a href="/">Crear otro</a></p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al guardar IPERC');
  }
});

// Genera PDF desde datos guardados
app.get('/pdf/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const command = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ ipercId: id })
    });
    const response = await dynamoClient.send(command);

    if (!response.Item) {
      return res.status(404).send('IPERC no encontrado');
    }

    const data = unmarshall(response.Item);

    // === Generar PDF ===
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 50, right: 50 }
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=IPERC_${id}.pdf`);
      res.send(pdfBuffer);
    });

    // === Encabezado ===
    doc.fontSize(16).font('Helvetica-Bold').text('MATRIZ DE IDENTIFICACIÓN DE PELIGROS Y EVALUACIÓN DE RIESGOS (IPERC)', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Según Normativa Peruana - MTPE', { align: 'center' });
    doc.moveDown();

    // Información general
    doc.fontSize(11);
    doc.text(`Razón Social: ${data.company}`, { continued: false });
    doc.text(`Área: ${data.area}`, { continued: false });
    doc.text(`Proceso: ${data.process}`, { continued: false });
    doc.moveDown();

    // === Tabla de riesgos ===
    doc.fontSize(12).font('Helvetica-Bold').text('MATRIZ DE EVALUACIÓN DE RIESGOS');
    doc.moveDown();

    // Cabeceras de tabla
    const headers = ['N°', 'Actividad', 'Peligro', 'Consecuencia', 'Medidas Existentes', 'P', 'S', 'Mr', 'Medidas a Implementar', 'Responsable'];
    const colWidths = [25, 80, 80, 100, 80, 25, 25, 35, 80, 60];
    let x = 50;

    // Dibujar cabeceras
    doc.font('Helvetica-Bold').fontSize(8);
    headers.forEach((header, i) => {
      doc.text(header, x, doc.y, { width: colWidths[i], align: 'center' });
      x += colWidths[i];
    });
    doc.moveDown();

    // Dibujar filas
    doc.font('Helvetica').fontSize(7);
    data.rows.forEach((row, i) => {
      const yStart = doc.y;
      const cells = [
        `${i + 1}`,
        row.activity,
        row.hazard,
        row.consequence,
        row.existingControls,
        row.probability.toString(),
        row.severity.toString(),
        row.mr.toString(),
        row.newControls,
        row.responsible
      ];

      // Dibujar cada celda
      let currentX = 50;
      cells.forEach((cell, idx) => {
        if (idx === 7) { // Es la columna "Mr"
          doc.rect(currentX, yStart, colWidths[idx], doc.heightOfString(cell, { width: colWidths[idx] }) + 2)
             .fill(row.riskColor);
          doc.fillColor('black').text(cell, currentX, yStart, {
            width: colWidths[idx],
            align: 'center'
          });
        } else {
          doc.text(cell, currentX, yStart, {
            width: colWidths[idx],
            align: 'left'
          });
        }
        currentX += colWidths[idx];
      });

      // Mover Y al final de la fila más alta
      doc.y = Math.max(...cells.map((_, idx) => {
        return doc.heightOfString(cells[idx], { width: colWidths[idx] }) + yStart;
      }));

      doc.moveDown(0.2);
    });

    // === Leyenda de valoración de riesgos ===
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica-Bold').text('LEYENDA DE VALORACIÓN DE RIESGOS');
    doc.moveDown();

    const legendData = [
      { color: '#4cd137', level: 'RIESGO BAJO', range: 'X ≤ 3' },
      { color: '#ffd700', level: 'RIESGO MEDIO', range: '3 < X ≤ 10' },
      { color: '#ffa500', level: 'RIESGO ALTO', range: '10 < X ≤ 50' },
      { color: '#ff6b6b', level: 'RIESGO CRÍTICO', range: '50 < X ≤ 250' }
    ];

    legendData.forEach(item => {
      doc.rect(50, doc.y, 10, 10).fill(item.color);
      doc.text(`  ${item.level} (${item.range})`, { continued: false });
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al generar PDF');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'iperc-with-db' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ IPERC con persistencia corriendo en http://localhost:${PORT}`);
});