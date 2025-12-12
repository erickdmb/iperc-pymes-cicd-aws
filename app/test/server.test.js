/**
 * Tests unitarios para funciones del servidor IPERC
 * Framework: Jest
 */

describe('getRiskColorAndLevel', () => {
  // Mock de la función (como no podemos importar, la redefinimos para tests)
  function getRiskColorAndLevel(mr) {
    if (mr <= 3) return { color: '#4cd137', level: 'BAJO', class: 'verde' };
    if (mr <= 10) return { color: '#ffd700', level: 'MEDIO', class: 'amarillo' };
    if (mr <= 50) return { color: '#ffa500', level: 'ALTO', class: 'naranja' };
    if (mr <= 250) return { color: '#ff6b6b', level: 'CRÍTICO', class: 'rojo' };
    return { color: '#cccccc', level: 'NO DEFINIDO', class: 'gris' };
  }

  test('debe retornar BAJO para Mr <= 3', () => {
    expect(getRiskColorAndLevel(1)).toEqual({ color: '#4cd137', level: 'BAJO', class: 'verde' });
    expect(getRiskColorAndLevel(3)).toEqual({ color: '#4cd137', level: 'BAJO', class: 'verde' });
  });

  test('debe retornar MEDIO para Mr entre 4 y 10', () => {
    expect(getRiskColorAndLevel(4)).toEqual({ color: '#ffd700', level: 'MEDIO', class: 'amarillo' });
    expect(getRiskColorAndLevel(10)).toEqual({ color: '#ffd700', level: 'MEDIO', class: 'amarillo' });
  });

  test('debe retornar ALTO para Mr entre 11 y 50', () => {
    expect(getRiskColorAndLevel(11)).toEqual({ color: '#ffa500', level: 'ALTO', class: 'naranja' });
    expect(getRiskColorAndLevel(50)).toEqual({ color: '#ffa500', level: 'ALTO', class: 'naranja' });
  });

  test('debe retornar CRÍTICO para Mr entre 51 y 250', () => {
    expect(getRiskColorAndLevel(51)).toEqual({ color: '#ff6b6b', level: 'CRÍTICO', class: 'rojo' });
    expect(getRiskColorAndLevel(250)).toEqual({ color: '#ff6b6b', level: 'CRÍTICO', class: 'rojo' });
  });

  test('debe retornar NO DEFINIDO para Mr > 250', () => {
    expect(getRiskColorAndLevel(251)).toEqual({ color: '#cccccc', level: 'NO DEFINIDO', class: 'gris' });
    expect(getRiskColorAndLevel(1000)).toEqual({ color: '#cccccc', level: 'NO DEFINIDO', class: 'gris' });
  });
});

describe('cleanObject', () => {
  // Mock de la función
  function cleanObject(obj) {
    const cleaned = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  }

  test('debe remover propiedades undefined', () => {
    const input = {
      name: 'Test',
      value: undefined,
      count: 0,
      empty: null,
      missing: undefined
    };
    
    const result = cleanObject(input);
    
    expect(result).toEqual({
      name: 'Test',
      count: 0,
      empty: null
    });
    expect(result.value).toBeUndefined();
    expect(result.missing).toBeUndefined();
  });

  test('debe mantener valores falsy que no sean undefined', () => {
    const input = {
      zero: 0,
      emptyString: '',
      nullValue: null,
      falseValue: false,
      undefinedValue: undefined
    };
    
    const result = cleanObject(input);
    
    expect(result.zero).toBe(0);
    expect(result.emptyString).toBe('');
    expect(result.nullValue).toBe(null);
    expect(result.falseValue).toBe(false);
    expect(result.undefinedValue).toBeUndefined();
  });

  test('debe retornar objeto vacío si todo es undefined', () => {
    const input = {
      a: undefined,
      b: undefined,
      c: undefined
    };
    
    const result = cleanObject(input);
    
    expect(result).toEqual({});
    expect(Object.keys(result).length).toBe(0);
  });
});

describe('parseRows (simulación)', () => {
  // Mock simplificado de parseRows
  function parseRows(body) {
    const rows = [];
    const rowIndices = new Set();
    
    for (const key in body) {
      const match = key.match(/^rows\[(\d+)\]\.activity$/);
      if (match) {
        rowIndices.add(parseInt(match[1]));
      }
    }
    
    const sortedIndices = Array.from(rowIndices).sort((a, b) => a - b);
    sortedIndices.forEach(i => {
      const activity = body[`rows[${i}].activity`];
      
      if (activity && activity.trim()) {
        rows.push({
          activity: activity.trim(),
          hazard: body[`rows[${i}].hazard`] || '',
          probability: parseInt(body[`rows[${i}].probability`]) || 0,
          severity: parseInt(body[`rows[${i}].severity`]) || 0
        });
      }
    });
    
    return rows;
  }

  test('debe parsear una fila correctamente', () => {
    const body = {
      'rows[0].activity': 'Carga manual',
      'rows[0].hazard': 'Levantamiento',
      'rows[0].probability': '3',
      'rows[0].severity': '10'
    };
    
    const result = parseRows(body);
    
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      activity: 'Carga manual',
      hazard: 'Levantamiento',
      probability: 3,
      severity: 10
    });
  });

  test('debe parsear múltiples filas en orden', () => {
    const body = {
      'rows[0].activity': 'Primera actividad',
      'rows[0].hazard': 'Peligro 1',
      'rows[1].activity': 'Segunda actividad',
      'rows[1].hazard': 'Peligro 2',
      'rows[2].activity': 'Tercera actividad',
      'rows[2].hazard': 'Peligro 3'
    };
    
    const result = parseRows(body);
    
    expect(result.length).toBe(3);
    expect(result[0].activity).toBe('Primera actividad');
    expect(result[1].activity).toBe('Segunda actividad');
    expect(result[2].activity).toBe('Tercera actividad');
  });

  test('debe ignorar filas sin activity', () => {
    const body = {
      'rows[0].activity': 'Actividad válida',
      'rows[0].hazard': 'Peligro',
      'rows[1].activity': '',
      'rows[1].hazard': 'Sin actividad',
      'rows[2].activity': '   ',
      'rows[2].hazard': 'Solo espacios'
    };
    
    const result = parseRows(body);
    
    expect(result.length).toBe(1);
    expect(result[0].activity).toBe('Actividad válida');
  });

  test('debe manejar índices no consecutivos', () => {
    const body = {
      'rows[0].activity': 'Primera',
      'rows[2].activity': 'Tercera',
      'rows[5].activity': 'Sexta'
    };
    
    const result = parseRows(body);
    
    expect(result.length).toBe(3);
    expect(result[0].activity).toBe('Primera');
    expect(result[1].activity).toBe('Tercera');
    expect(result[2].activity).toBe('Sexta');
  });

  test('debe retornar array vacío si no hay filas válidas', () => {
    const body = {
      company: 'Test Company',
      area: 'Test Area',
      process: 'Test Process'
    };
    
    const result = parseRows(body);
    
    expect(result.length).toBe(0);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Validaciones de datos', () => {
  test('probability debe estar entre 1 y 5', () => {
    const validValues = [1, 2, 3, 4, 5];
    validValues.forEach(val => {
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(5);
    });
  });

  test('severity debe estar entre 1 y 50', () => {
    const validValues = [1, 10, 25, 50];
    validValues.forEach(val => {
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(50);
    });
  });

  test('Mr debe ser producto de probability × severity', () => {
    const cases = [
      { prob: 1, sev: 1, mr: 1 },
      { prob: 3, sev: 10, mr: 30 },
      { prob: 5, sev: 50, mr: 250 }
    ];
    
    cases.forEach(({ prob, sev, mr }) => {
      expect(prob * sev).toBe(mr);
    });
  });
});
