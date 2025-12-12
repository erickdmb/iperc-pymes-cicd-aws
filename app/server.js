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
    

// Modo local opcional para pruebas (sin AWS)
const USE_LOCAL = process.env.USE_LOCAL_STORE === 'true';
const memoryStore = new Map();

// Configuración de AWS
const REGION = process.env.AWS_REGION || 'us-east-1';
app.get('/responsable/:name', async (req, res) => {
  try {
    const name = req.params.name;
    let items;
    if (USE_LOCAL) {
      items = Array.from(memoryStore.values());
    } else {
      const response = await dynamoClient.send(new ScanCommand({ TableName: TABLE_NAME }));
      items = (response.Items || []).map(unmarshall);
    }
    const filtered = items.filter(i => Array.isArray(i.rows) && i.rows.some(r => (r.responsible||'').toLowerCase() === name.toLowerCase()));
    res.send(`
      <h2>IPERC por responsable: ${name}</h2>
      <ul>
        ${filtered.map(i => `<li>${i.ipercId} - <a href="/pdf/${i.ipercId}">Ver PDF</a> | <a href="/iperc/${i.ipercId}">Editar</a></li>`).join('')}
      </ul>
      <p><a href="/list">Ver todos</a></p>
    `);
  } catch (err) {
    console.error('Error al listar por responsable:', err);
    res.status(500).send('Error al listar por responsable');
  }
});
const TABLE_NAME = 'iperc-pymes-evaluations';

const dynamoClient = new DynamoDBClient({ region: REGION });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Helper para parsear filas desde form (array o estilo rows[0].campo)
function parseRows(body) {
  if (Array.isArray(body.rows)) {
    return body.rows.map((r) => {
      const prob = parseInt(r.probability) || 0;
      const sev = parseInt(r.severity) || 0;
      const mr = prob * sev;
      const riskInfo = getRiskColorAndLevel(mr);
      return {
        activity: r.activity || '',
        hazard: r.hazard || '',
        consequence: r.consequence || '',
        existingControls: r.existingControls || '',
        probability: prob,
        severity: sev,
        mr,
        riskColor: riskInfo.color,
        riskLevel: riskInfo.level,
        newControls: r.newControls || '',
        responsible: r.responsible || ''
      };
    });
  }
  // Fallback: recorrer rows[0].campo, rows[1].campo ...
  const rows = [];
  let i = 0;
  while (body[`rows[${i}].activity`]) {
    const prob = parseInt(body[`rows[${i}].probability`]) || 0;
    const sev = parseInt(body[`rows[${i}].severity`]) || 0;
    const mr = prob * sev;
    const riskInfo = getRiskColorAndLevel(mr);
    rows.push({
      activity: body[`rows[${i}].activity`],
      hazard: body[`rows[${i}].hazard`],
      consequence: body[`rows[${i}].consequence`],
      existingControls: body[`rows[${i}].existingControls`] || '',
      probability: prob,
      severity: sev,
      mr,
      riskColor: riskInfo.color,
      riskLevel: riskInfo.level,
      newControls: body[`rows[${i}].newControls`] || '',
      responsible: body[`rows[${i}].responsible`] || ''
    });
    i++;
  }
  return rows;
}

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
    const rows = parseRows(req.body);

    console.log('POST /iperc body keys:', Object.keys(req.body));
    console.log('Rows parsed count:', rows.length);
    if (!company || !area || !process) {
      return res.status(400).send('Faltan campos obligatorios: company, area, process');
    }
    if (rows.length === 0) {
      return res.status(400).send('Debes ingresar al menos una fila en la matriz');
    }

    const ipercId = `IPERC-${new Date().getFullYear()}-${uuidv4().substring(0,6).toUpperCase()}`;
    const now = new Date().toISOString();

    const item = { ipercId, company, area, process, rows, createdAt: now, updatedAt: now };

    if (USE_LOCAL) {
      memoryStore.set(ipercId, item);
    } else {
      const params = {
        TableName: TABLE_NAME,
        Item: marshall(item)
      };
      await dynamoClient.send(new PutItemCommand(params));
    }

    res.send(`
      <h2>✅ IPERC guardado con ID: ${ipercId}</h2>
      <p><a href="/list">Ver todos</a></p>
      <p><a href="/pdf/${ipercId}">👁️ Ver PDF</a> | <a href="/pdf/${ipercId}?download=1">📥 Descargar</a></p>
      <p><a href="/">Crear otro</a></p>
    `);
  } catch (err) {
    console.error('Error al guardar IPERC:', err);
    const hint = err && err.name === 'CredentialsProviderError'
      ? 'Faltan credenciales de AWS. Configura AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY.'
      : '';
    res.status(500).send(`Error al guardar IPERC. ${hint}`);
  }
});

// Genera PDF desde datos guardados
app.get('/pdf/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let data;
    if (USE_LOCAL) {
      data = memoryStore.get(id);
      if (!data) return res.status(404).send('IPERC no encontrado');
    } else {
      const command = new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({ ipercId: id })
      });
      const response = await dynamoClient.send(command);
      if (!response.Item) {
        return res.status(404).send('IPERC no encontrado');
      }
      data = unmarshall(response.Item);
    }

    // Seguridad: si no hay filas, retornar mensaje claro
    if (!data.rows || !Array.isArray(data.rows) || data.rows.length === 0) {
      return res.status(400).send('Este IPERC no tiene filas guardadas. Guarda nuevamente con al menos una fila.');
    }

    // === Generar PDF ===
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 30, right: 30 }
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      const dispositionType = req.query.download === '1' ? 'attachment' : 'inline';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${dispositionType}; filename=IPERC_${id}.pdf`);
      res.send(pdfBuffer);
    });

    // === Encabezado ===
    doc.fontSize(14).font('Helvetica-Bold')
       .text('MATRIZ DE IDENTIFICACIÓN DE PELIGROS Y EVALUACIÓN DE RIESGOS (IPERC)', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Según Normativa Peruana - MTPE', { align: 'center' });
    doc.moveDown(0.5);

    // Información general
    doc.fontSize(9).font('Helvetica');
    doc.text(`Razón Social: ${data.company}    |    Área: ${data.area}    |    Proceso: ${data.process}`, { align: 'center' });
    doc.moveDown(0.8);

    // === Tabla de riesgos ===
    const headers = ['N°', 'Actividad', 'Peligro', 'Consecuencia', 'Medidas Existentes', 'P', 'S', 'Mr', 'Medidas a Implementar', 'Responsable'];
    const colWidths = [25, 90, 90, 110, 85, 20, 20, 30, 90, 75];
    const startX = 30;
    let startY = doc.y;

    // Dibujar encabezados con fondo gris
    doc.font('Helvetica-Bold').fontSize(7);
    let x = startX;
    headers.forEach((header, i) => {
      doc.rect(x, startY, colWidths[i], 25).fillAndStroke('#e0e0e0', '#000000');
      doc.fillColor('black').text(header, x + 2, startY + 8, { width: colWidths[i] - 4, align: 'center' });
      x += colWidths[i];
    });

    startY += 25;
    doc.y = startY;

    // Dibujar filas de datos
    doc.font('Helvetica').fontSize(7);
    data.rows.forEach((row, i) => {
      const cells = [
        `${i + 1}`,
        row.activity || '',
        row.hazard || '',
        row.consequence || '',
        row.existingControls || '',
        row.probability.toString(),
        row.severity.toString(),
        row.mr.toString(),
        row.newControls || '',
        row.responsible || ''
      ];

      // Calcular altura de la fila basada en el contenido
      const cellHeights = cells.map((cell, idx) => 
        doc.heightOfString(cell, { width: colWidths[idx] - 4 })
      );
      const rowHeight = Math.max(...cellHeights) + 6;

      // Verificar si necesitamos nueva página
      if (doc.y + rowHeight > doc.page.height - 40) {
        doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 40, bottom: 40, left: 30, right: 30 } });
        doc.y = 40;
      }

      const currentY = doc.y;
      let currentX = startX;

      cells.forEach((cell, idx) => {
        // Celda Mr con color de fondo
        if (idx === 7) {
          doc.rect(currentX, currentY, colWidths[idx], rowHeight).fillAndStroke(row.riskColor, '#000000');
          doc.fillColor('white').font('Helvetica-Bold').fontSize(7);
          doc.text(cell, currentX + 2, currentY + (rowHeight / 2) - 3, {
            width: colWidths[idx] - 4,
            align: 'center',
            lineBreak: false
          });
          doc.fillColor('black').font('Helvetica').fontSize(7);
        } else {
          // Dibujar borde de celda
          doc.rect(currentX, currentY, colWidths[idx], rowHeight).stroke('#000000');
          doc.fillColor('black').fontSize(7).text(cell, currentX + 2, currentY + 3, {
            width: colWidths[idx] - 4,
            align: idx === 0 || idx === 5 || idx === 6 ? 'center' : 'left',
            lineBreak: true
          });
        }
        currentX += colWidths[idx];
      });

      doc.y = currentY + rowHeight;
    });

    // === Leyenda de valoración de riesgos ===
    doc.moveDown(1.5);
    doc.fontSize(9).font('Helvetica-Bold').text('LEYENDA DE VALORACIÓN DE RIESGOS', { align: 'center' });
    doc.moveDown(0.5);

    const legendData = [
      { color: '#4cd137', level: 'RIESGO BAJO', range: 'X ≤ 3' },
      { color: '#ffd700', level: 'RIESGO MEDIO', range: '3 < X ≤ 10' },
      { color: '#ffa500', level: 'RIESGO ALTO', range: '10 < X ≤ 50' },
      { color: '#ff6b6b', level: 'RIESGO CRÍTICO', range: '50 < X ≤ 250' }
    ];

    const legendY = doc.y;
    const legendX = (doc.page.width - 600) / 2;
    
    legendData.forEach((item, i) => {
      const itemX = legendX + (i * 150);
      doc.rect(itemX, legendY, 15, 15).fillAndStroke(item.color, '#000000');
      doc.fillColor('black').font('Helvetica').fontSize(8);
      doc.text(`${item.level}`, itemX + 20, legendY, { width: 120 });
      doc.text(`(${item.range})`, itemX + 20, legendY + 8, { width: 120 });
    });

    doc.end();
  } catch (err) {
    console.error('Error al generar PDF:', err);
    res.status(500).send('Error al generar PDF');
  }
});

// Listado simple de IPERC guardados
app.get('/list', async (req, res) => {
  try {
    if (USE_LOCAL) {
      const items = Array.from(memoryStore.values());
      res.send(`
        <h2>IPERC guardados (local)</h2>
        <ul>
          ${items.map(i => `<li>${i.ipercId} - <a href="/pdf/${i.ipercId}">Ver PDF</a> | <a href="/iperc/${i.ipercId}">Editar</a></li>`).join('')}
        </ul>
        <p><a href="/">Volver</a></p>
      `);
      return;
    }
    const response = await dynamoClient.send(new ScanCommand({ TableName: TABLE_NAME, Limit: 50 }));
    const items = (response.Items || []).map(unmarshall);
    res.send(`
      <h2>IPERC guardados</h2>
      <ul>
        ${items.map(i => `<li>${i.ipercId} - <a href="/pdf/${i.ipercId}">Ver PDF</a> | <a href="/iperc/${i.ipercId}">Editar</a></li>`).join('')}
      </ul>
      <p><a href="/">Volver</a></p>
    `);
  } catch (err) {
    console.error('Error al listar IPERC:', err);
    res.status(500).send('Error al listar IPERC');
  }
});

// Formulario de edición de IPERC
app.get('/iperc/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let data;
    if (USE_LOCAL) {
      data = memoryStore.get(id);
      if (!data) return res.status(404).send('IPERC no encontrado');
    } else {
      const response = await dynamoClient.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({ ipercId: id })
      }));
      if (!response.Item) return res.status(404).send('IPERC no encontrado');
      data = unmarshall(response.Item);
    }

    const rowsHtml = data.rows.map((r, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><input name="rows[${idx}].activity" value="${(r.activity||'').replace(/"/g,'&quot;')}" class="form-control" required></td>
        <td><input name="rows[${idx}].hazard" value="${(r.hazard||'').replace(/"/g,'&quot;')}" class="form-control" required></td>
        <td><textarea name="rows[${idx}].consequence" class="form-control" rows="2" required>${(r.consequence||'')}</textarea></td>
        <td><textarea name="rows[${idx}].existingControls" class="form-control" rows="2">${(r.existingControls||'')}</textarea></td>
        <td><input type="number" min="1" max="5" name="rows[${idx}].probability" value="${r.probability}" class="form-control" required></td>
        <td><input type="number" min="1" max="50" name="rows[${idx}].severity" value="${r.severity}" class="form-control" required></td>
        <td>${r.mr}</td>
        <td><textarea name="rows[${idx}].newControls" class="form-control" rows="2">${(r.newControls||'')}</textarea></td>
        <td><input name="rows[${idx}].responsible" value="${(r.responsible||'').replace(/"/g,'&quot;')}" class="form-control"></td>
      </tr>
    `).join('');

    res.send(`
      <h2>Editar IPERC ${id}</h2>
      <form method="POST" action="/iperc/${id}">
        <div class="form-grid" style="display:grid;gap:10px;grid-template-columns:repeat(2,1fr);max-width:900px;">
          <div>
            <label>Razón Social</label>
            <input name="company" value="${(data.company||'').replace(/"/g,'&quot;')}" class="form-control" required>
          </div>
          <div>
            <label>Área</label>
            <input name="area" value="${(data.area||'').replace(/"/g,'&quot;')}" class="form-control" required>
          </div>
          <div>
            <label>Proceso</label>
            <input name="process" value="${(data.process||'').replace(/"/g,'&quot;')}" class="form-control" required>
          </div>
        </div>

        <div class="risk-table-container">
          <table>
            <thead>
              <tr>
                <th>N°</th><th>Actividad</th><th>Peligro</th><th>Consecuencia</th><th>Controles Existentes</th>
                <th>P</th><th>S</th><th>Mr</th><th>Nuevos Controles</th><th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
        <button type="submit" class="btn btn-submit" style="background:#27ae60;margin-top:20px;">💾 Guardar cambios</button>
        <p style="margin-top:10px;"><a href="/pdf/${id}">Ver PDF</a> | <a href="/list">Volver</a></p>
      </form>
    `);
  } catch (err) {
    console.error('Error al cargar edición:', err);
    res.status(500).send('Error al cargar edición');
  }
});

// Guardar cambios de IPERC
app.post('/iperc/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { company, area, process } = req.body;
    const rows = parseRows(req.body);
    const now = new Date().toISOString();
    const item = { ipercId: id, company, area, process, rows, updatedAt: now };

    if (USE_LOCAL) {
      const existing = memoryStore.get(id);
      if (!existing) return res.status(404).send('IPERC no encontrado');
      memoryStore.set(id, { ...existing, ...item });
    } else {
      await dynamoClient.send(new PutItemCommand({ TableName: TABLE_NAME, Item: marshall(item) }));
    }

    res.redirect(`/iperc/${id}`);
  } catch (err) {
    console.error('Error al guardar cambios:', err);
    res.status(500).send('Error al guardar cambios');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'iperc-with-db' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ IPERC con persistencia corriendo en http://localhost:${PORT}`);
});

// API: lista de IPERC en JSON
app.get('/api/iperc', async (req, res) => {
  try {
    let items;
    if (USE_LOCAL) {
      items = Array.from(memoryStore.values());
    } else {
      const response = await dynamoClient.send(new ScanCommand({ TableName: TABLE_NAME }));
      items = (response.Items || []).map(unmarshall);
    }
    const data = items.map(i => ({
      ipercId: i.ipercId,
      company: i.company,
      area: i.area,
      process: i.process,
      updatedAt: i.updatedAt || i.createdAt
    }));
    res.json(data);
  } catch (err) {
    console.error('Error en /api/iperc:', err);
    res.status(500).json({ error: 'Error al listar IPERC' });
  }
});

// Vista de solo lectura del IPERC (HTML imprimible)
app.get('/iperc/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    let data;
    if (USE_LOCAL) {
      data = memoryStore.get(id);
      if (!data) return res.status(404).send('IPERC no encontrado');
    } else {
      const response = await dynamoClient.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({ ipercId: id })
      }));
      if (!response.Item) return res.status(404).send('IPERC no encontrado');
      data = unmarshall(response.Item);
    }

    const rowsHtml = (data.rows || []).map((r, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${r.activity || ''}</td>
        <td>${r.hazard || ''}</td>
        <td>${r.consequence || ''}</td>
        <td>${r.existingControls || ''}</td>
        <td>${r.probability}</td>
        <td>${r.severity}</td>
        <td style="background:${r.riskColor};color:${r.riskColor==='#ffd700'||r.riskColor==='#ffa500'?'black':'white'};font-weight:600;">${r.mr}</td>
        <td>${r.newControls || ''}</td>
        <td>${r.responsible || ''}</td>
      </tr>
    `).join('');

    res.send(`
      <style>
        body{font-family:Segoe UI,Tahoma,Verdana,sans-serif;margin:20px;color:#333}
        h2{margin-bottom:10px}
        .meta{margin-bottom:15px;font-size:0.95rem;color:#555}
        table{width:100%;border-collapse:collapse;font-size:0.9rem}
        th,td{border:1px solid #ddd;padding:8px;text-align:left}
        th{background:#f0f3f5}
      </style>
      <h2>IPERC ${id}</h2>
      <div class="meta">Razón Social: ${data.company} | Área: ${data.area} | Proceso: ${data.process}</div>
      <table>
        <thead>
          <tr>
            <th>N°</th><th>Actividad</th><th>Peligro</th><th>Consecuencia</th><th>Controles Existentes</th>
            <th>P</th><th>S</th><th>Mr</th><th>Nuevos Controles</th><th>Responsable</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <p style="margin-top:10px"><a href="/iperc/${id}">Editar</a> | <a href="/list">Volver</a></p>
    `);
  } catch (err) {
    console.error('Error en vista /iperc/:id/view:', err);
    res.status(500).send('Error al mostrar IPERC');
  }
});