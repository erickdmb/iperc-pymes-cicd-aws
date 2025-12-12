let rowIndex = 1;

// Modo oscuro
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('themeToggle').textContent = isDark ? 'Modo Claro' : 'Modo Oscuro';
}

// Cargar tema guardado
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeToggle').textContent = 'Modo Claro';
  }
  loadIpercList();
});

async function loadIpercList() {
  try {
    const res = await fetch('/api/iperc');
    const data = await res.json();
    const ul = document.getElementById('ipercList');
    ul.innerHTML = data.map(d => `
      <li>
        <span>
          <a href="/iperc/${d.ipercId}/view" target="_blank">${d.ipercId}</a>
          <div class="meta">${d.company || ''} · ${d.area || ''} · ${d.process || ''}</div>
        </span>
        <button onclick="editIperc('${d.ipercId}')" style="background:#6c757d; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem;">Editar</button>
      </li>
    `).join('');
  } catch (e) {
    console.error('Error cargando lista IPERC', e);
  }
}

async function editIperc(ipercId) {
  try {
    const res = await fetch(`/api/iperc`);
    const data = await res.json();
    const iperc = data.find(d => d.ipercId === ipercId);
    
    if (!iperc) {
      alert('No se encontró el IPERC');
      return;
    }

    // Establecer el ipercId en el campo oculto
    document.getElementById('ipercId').value = ipercId;

    // Cargar datos en el formulario
    document.getElementById('company').value = iperc.company || '';
    document.getElementById('area').value = iperc.area || '';
    document.getElementById('process').value = iperc.process || '';

    // Limpiar tabla y agregar filas
    const tbody = document.querySelector('#ipercTable tbody');
    tbody.innerHTML = '';
    rowIndex = 0;

    iperc.rows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      // Asegurarse de escapar comillas en los valores para evitar problemas con innerHTML
      const activity = (row.activity || '').replace(/"/g, '&quot;');
      const hazard = (row.hazard || '').replace(/"/g, '&quot;');
      const consequence = (row.consequence || '').replace(/"/g, '&quot;');
      const existingControls = (row.existingControls || '').replace(/"/g, '&quot;');
      const probability = row.probability || '';
      const severity = row.severity || '';
      const newControls = (row.newControls || '').replace(/"/g, '&quot;');
      const responsible = (row.responsible || '').replace(/"/g, '&quot;');
      const mr = (row.probability * row.severity) || '—';
      
      tr.innerHTML = `
        <td class="col-n">${idx + 1}</td>
        <td class="col-actividad"><input name="rows[${idx}].activity" class="form-control" value="${activity}" required></td>
        <td class="col-peligro"><input name="rows[${idx}].hazard" class="form-control" value="${hazard}" required></td>
        <td class="col-consecuencia"><textarea name="rows[${idx}].consequence" class="form-control" rows="2" required>${consequence}</textarea></td>
        <td class="col-medidas-exist"><textarea name="rows[${idx}].existingControls" class="form-control" rows="2">${existingControls}</textarea></td>
        <td class="col-prob"><input type="number" min="1" max="5" name="rows[${idx}].probability" class="form-control" value="${probability}" required></td>
        <td class="col-sev"><input type="number" min="1" max="50" name="rows[${idx}].severity" class="form-control" value="${severity}" required></td>
        <td class="col-mr"><span id="mr-${idx}">${mr}</span></td>
        <td class="col-medidas-impl"><textarea name="rows[${idx}].newControls" class="form-control" rows="2">${newControls}</textarea></td>
        <td class="col-responsable"><input name="rows[${idx}].responsible" class="form-control" value="${responsible}" required></td>
        <td><button type="button" onclick="removeRow(this)" class="btn-action btn-delete">Eliminar</button></td>
      `;
      tbody.appendChild(tr);
      rowIndex = idx + 1;
    });

    // Scroll al formulario
    window.scrollTo({ top: document.querySelector('.section').offsetTop - 100, behavior: 'smooth' });
    alert(`IPERC ${ipercId} cargado para edición`);
  } catch (e) {
    console.error('Error al editar IPERC', e);
    alert('Error al cargar IPERC para editar');
  }
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.toggle('collapsed');
  const tb = document.getElementById('toggleBtn');
  if (tb) tb.textContent = sb.classList.contains('collapsed') ? '›' : '‹';
}

function newMatriz() {
  if (confirm('¿Desea crear una nueva matriz? Se perderán los datos no guardados.')) {
    document.getElementById('ipercForm').reset();
    document.getElementById('ipercId').value = ''; // Limpiar ipercId
    const tbody = document.querySelector('#ipercTable tbody');
    tbody.innerHTML = '';
    rowIndex = 0;
    addRow(); // Agregar primera fila
    window.scrollTo({ top: 0, behavior: 'smooth' });
    alert('Nueva matriz lista');
  }
}

function showList(){
  const sb = document.getElementById('sidebar');
  if (sb.classList.contains('collapsed')) sb.classList.remove('collapsed');
  loadIpercList();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function submitForm(action) {
  const form = document.getElementById('ipercForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Construir objeto de datos manualmente
  const company = document.getElementById('company').value;
  const area = document.getElementById('area').value;
  const process = document.getElementById('process').value;
  const ipercId = document.getElementById('ipercId').value;
  
  // Extraer filas
  const rows = [];
  const tableRows = document.querySelectorAll('#ipercTable tbody tr');
  
  tableRows.forEach(tr => {
    const inputs = {};
    tr.querySelectorAll('input, textarea').forEach(el => {
      if (el.name.match(/rows\[\d+\]\.(.*)/)) {
        const fieldName = el.name.match(/rows\[\d+\]\.(.*)/)[1];
        inputs[fieldName] = el.value;
      }
    });
    
    if (inputs.activity && inputs.activity.trim()) {
      rows.push({
        activity: inputs.activity || '',
        hazard: inputs.hazard || '',
        consequence: inputs.consequence || '',
        existingControls: inputs.existingControls || '',
        probability: parseInt(inputs.probability) || 0,
        severity: parseInt(inputs.severity) || 0,
        newControls: inputs.newControls || '',
        responsible: inputs.responsible || ''
      });
    }
  });

  if (rows.length === 0) {
    alert('Debes completar al menos una fila');
    return;
  }

  const data = { company, area, process, ipercId, rows };

  try {
    const response = await fetch('/iperc-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const text = await response.text();
      alert('Error: ' + text);
      return;
    }

    const result = await response.json();
    const ipercIdResult = result.ipercId;
    const isUpdate = ipercId !== '';
    
    if (action === 'save') {
      alert(`✓ IPERC ${isUpdate ? 'actualizado' : 'guardado'}: ${ipercIdResult}`);
      showList();
    } else if (action === 'export') {
      window.open(`/pdf/${ipercIdResult}?download=1`, '_blank');
      setTimeout(() => showList(), 500);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function addRow() {
  const tbody = document.querySelector('#ipercTable tbody');
  const newRow = document.createElement('tr');
  newRow.innerHTML = `
    <td class="col-n">${rowIndex + 1}</td>
    <td class="col-actividad"><input name="rows[${rowIndex}].activity" class="form-control" placeholder="Ej: Operación de maquinaria" required></td>
    <td class="col-peligro"><input name="rows[${rowIndex}].hazard" class="form-control" placeholder="Ej: Atrapamiento en engranajes" required></td>
    <td class="col-consecuencia"><textarea name="rows[${rowIndex}].consequence" class="form-control" rows="2" placeholder="Ej: Amputación de extremidades" required></textarea></td>
    <td class="col-medidas-exist"><textarea name="rows[${rowIndex}].existingControls" class="form-control" rows="2" placeholder="Ej: Guardas de seguridad"></textarea></td>
    <td class="col-prob"><input type="number" min="1" max="5" name="rows[${rowIndex}].probability" class="form-control" placeholder="1-5" required></td>
    <td class="col-sev"><input type="number" min="1" max="50" name="rows[${rowIndex}].severity" class="form-control" placeholder="1-50" required></td>
    <td class="col-mr"><span id="mr-${rowIndex}">—</span></td>
    <td class="col-medidas-impl"><textarea name="rows[${rowIndex}].newControls" class="form-control" rows="2" placeholder="Ej: Instalación de sensores de parada"></textarea></td>
    <td class="col-responsable"><input name="rows[${rowIndex}].responsible" class="form-control" placeholder="Ej: María López" required></td>
    <td><button type="button" onclick="removeRow(this)" class="btn-action btn-delete">Eliminar</button></td>
  `;
  tbody.appendChild(newRow);
  rowIndex++;
}

function removeRow(button) {
  const row = button.closest('tr');
  if (document.querySelectorAll('#ipercTable tbody tr').length > 1) {
    row.remove();
    // Actualizar números y nombres de inputs
    document.querySelectorAll('#ipercTable tbody tr').forEach((tr, i) => {
      tr.cells[0].textContent = i + 1;
      // Actualizar todos los nombres de inputs en esta fila
      tr.querySelectorAll('input, textarea').forEach(input => {
        const oldName = input.name;
        if (oldName && oldName.startsWith('rows[')) {
          input.name = oldName.replace(/rows\[\d+\]/, `rows[${i}]`);
        }
      });
      // Actualizar id del span del Mr
      const mrSpan = tr.querySelector('[id^="mr-"]');
      if (mrSpan) {
        mrSpan.id = `mr-${i}`;
      }
    });
  } else {
    alert('Debe haber al menos una fila en la matriz.');
  }
}

// Calcular Mr en tiempo real
document.addEventListener('input', (e) => {
  if (e.target.name && e.target.name.startsWith('rows[')) {
    const name = e.target.name;
    const index = name.match(/\[(\d+)\]/)[1];
    const prob = parseInt(document.querySelector(`input[name="rows[${index}].probability"]`).value) || 0;
    const sev = parseInt(document.querySelector(`input[name="rows[${index}].severity"]`).value) || 0;
    const mr = prob * sev;
    const mrCell = document.getElementById(`mr-${index}`);
    mrCell.textContent = mr;

    // Aplicar color según valor
    let className = '';
    if (mr <= 3) className = 'mr-verde';
    else if (mr <= 10) className = 'mr-amarillo';
    else if (mr <= 50) className = 'mr-naranja';
    else if (mr <= 250) className = 'mr-rojo';

    mrCell.className = `col-mr ${className}`;
  }
});
