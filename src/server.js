const express = require('express');
const { DynamoDBClient, PutItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = new DynamoDBClient({ region: "us-east-1" });
const TABLE_NAME = "iperc-evaluations";

app.get('/', (req, res) => {
  res.send(`
    <h2>IPERC para Pymes</h2>
    <form action="/submit" method="POST">
      <input name="activity" placeholder="Actividad" required><br><br>
      <input name="hazard" placeholder="Peligro identificado" required><br><br>
      <input name="risk" placeholder="Nivel de riesgo (Alto/Medio/Bajo)" required><br><br>
      <button type="submit">Registrar Evaluación</button>
    </form>
    <p><a href="/list">Ver evaluaciones</a></p>
  `);
});

app.post('/submit', async (req, res) => {
  const { activity, hazard, risk } = req.body;
  const evaluationId = `IPERC-${new Date().getFullYear()}-${uuidv4().substring(0,6).toUpperCase()}`;

  const params = {
    TableName: TABLE_NAME,
    Item: {
      evaluationId: { S: evaluationId },
      activity: { S: activity },
      hazard: { S: hazard },
      risk: { S: risk },
      timestamp: { S: new Date().toISOString() }
    }
  };

  await client.send(new PutItemCommand(params));
  res.send(`Evaluación registrada: ${evaluationId}<br><a href="/">Volver</a>`);
});

app.get('/list', async (req, res) => {
  const data = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
  const items = data.Items.map(item => 
    `<li>${item.evaluationId.S}: ${item.activity.S} - ${item.risk.S}</li>`
  ).join('');
  res.send(`<h3>Evaluaciones</h3><ul>${items}</ul><a href="/">Volver</a>`);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'iperc-app' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('IPERC app running on port', PORT);
});