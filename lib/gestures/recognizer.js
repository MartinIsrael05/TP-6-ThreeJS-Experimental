// Reconocedor de trazos de un solo movimiento: implementación propia del
// algoritmo $1 Unistroke Recognizer (Wobbrock, Wilson y Li, UIST 2007).
//
// Cada trazo se normaliza igual: se remuestrea a una cantidad fija de puntos,
// se gira según su ángulo característico, se escala a un cuadrado y se
// centra en el origen. Después se compara punto a punto con cada plantilla,
// probando giros chicos, y gana la de menor distancia media.

const SAMPLES = 64;
const SQUARE = 250;
const HALF_DIAGONAL = 0.5 * Math.hypot(SQUARE, SQUARE);
const ANGLE_RANGE = (45 * Math.PI) / 180;
const ANGLE_PRECISION = (2 * Math.PI) / 180;
const PHI = 0.5 * (-1 + Math.sqrt(5));

function pathLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return length;
}

function resample(input, count) {
  const points = input.map((point) => ({ ...point }));
  const step = pathLength(points) / (count - 1);
  const result = [{ ...points[0] }];
  let accumulated = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
    if (accumulated + distance >= step && distance > 0) {
      const t = (step - accumulated) / distance;
      const point = { x: previous.x + t * (current.x - previous.x), y: previous.y + t * (current.y - previous.y) };
      result.push(point);
      points.splice(index, 0, point); // el punto nuevo es el inicio del próximo tramo
      accumulated = 0;
    } else {
      accumulated += distance;
    }
  }
  while (result.length < count) result.push({ ...points[points.length - 1] });
  return result.slice(0, count);
}

function centroid(points) {
  const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function rotateBy(points, angle) {
  const center = centroid(points);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((point) => ({
    x: (point.x - center.x) * cos - (point.y - center.y) * sin + center.x,
    y: (point.x - center.x) * sin + (point.y - center.y) * cos + center.y,
  }));
}

function scaleToSquare(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs) || 1;
  const height = Math.max(...ys) - Math.min(...ys) || 1;
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return points.map((point) => ({ x: ((point.x - minX) * SQUARE) / width, y: ((point.y - minY) * SQUARE) / height }));
}

function translateToOrigin(points) {
  const center = centroid(points);
  return points.map((point) => ({ x: point.x - center.x, y: point.y - center.y }));
}

function normalize(rawPoints) {
  const points = resample(rawPoints, SAMPLES);
  const center = centroid(points);
  const indicative = Math.atan2(center.y - points[0].y, center.x - points[0].x);
  return translateToOrigin(scaleToSquare(rotateBy(points, -indicative)));
}

function pathDistance(a, b) {
  let total = 0;
  for (let index = 0; index < a.length; index += 1) total += Math.hypot(a[index].x - b[index].x, a[index].y - b[index].y);
  return total / a.length;
}

// Busca el giro que mejor alinea el trazo con la plantilla (sección áurea).
function distanceAtBestAngle(points, template) {
  let from = -ANGLE_RANGE;
  let to = ANGLE_RANGE;
  let x1 = PHI * from + (1 - PHI) * to;
  let f1 = pathDistance(rotateBy(points, x1), template);
  let x2 = (1 - PHI) * from + PHI * to;
  let f2 = pathDistance(rotateBy(points, x2), template);
  while (Math.abs(to - from) > ANGLE_PRECISION) {
    if (f1 < f2) {
      to = x2;
      x2 = x1;
      f2 = f1;
      x1 = PHI * from + (1 - PHI) * to;
      f1 = pathDistance(rotateBy(points, x1), template);
    } else {
      from = x1;
      x1 = x2;
      f1 = f2;
      x2 = (1 - PHI) * from + PHI * to;
      f2 = pathDistance(rotateBy(points, x2), template);
    }
  }
  return Math.min(f1, f2);
}

// Variantes de cada forma: al revés (se puede dibujar en cualquier sentido)
// y, si es cerrada, empezando desde cada vértice.
function variants(points) {
  const list = [points, [...points].reverse()];
  const first = points[0];
  const last = points[points.length - 1];
  const closed = Math.hypot(first.x - last.x, first.y - last.y) < 1e-6;
  if (closed) {
    const ring = points.slice(0, -1);
    for (let shift = 1; shift < ring.length; shift += 1) {
      const rotated = [...ring.slice(shift), ...ring.slice(0, shift)];
      rotated.push(rotated[0]);
      list.push(rotated, [...rotated].reverse());
    }
  }
  return list;
}

// shapes: [{ id, points: [[x, y], ...] }]. Devuelve recognize(puntos).
export function createRecognizer(shapes) {
  const templates = shapes.flatMap(({ id, points }) =>
    variants(points.map(([x, y]) => ({ x, y }))).map((variant) => ({ id, points: normalize(variant) })),
  );

  // Devuelve { id, score } de la mejor plantilla; score va de 0 a 1.
  return function recognize(rawPoints) {
    if (rawPoints.length < 8 || pathLength(rawPoints) < 60) return { id: null, score: 0 };
    const points = normalize(rawPoints);
    let best = { id: null, distance: Infinity };
    for (const template of templates) {
      const distance = distanceAtBestAngle(points, template.points);
      if (distance < best.distance) best = { id: template.id, distance };
    }
    return { id: best.id, score: 1 - best.distance / HALF_DIAGONAL };
  };
}
