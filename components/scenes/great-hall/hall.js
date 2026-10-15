import * as THREE from "three";
import { createPbrMaterial } from "@/lib/three/pbrTextures";

// Medidas de la sala en metros. El eje -Z va hacia la mesa de profesores.
export const HALL = {
  width: 14,
  height: 9,
  front: 6,
  back: -38,
  tablesFrom: -1,
  tablesTo: -23,
  daisFront: -29,
};
HALL.length = HALL.front - HALL.back;
HALL.centerZ = (HALL.front + HALL.back) / 2;

const COLUMN_STEP = 4.5;
const TABLE_XS = [-4.6, -1.6, 1.6, 4.6];
const FOLDER = "gran-comedor";

// Coloca una copia por cada matriz en un InstancedMesh: un solo draw call
// para muchas piezas iguales.
function instanced(geometry, material, transforms) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach(({ position, rotation = [0, 0, 0] }, index) => {
    dummy.position.set(...position);
    dummy.rotation.set(...rotation);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// Estandarte con la punta en cola de golondrina. El origen queda arriba, en
// la varilla, para colgarlo fácil.
function bannerGeometry(width, height) {
  const half = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(half, -height);
  shape.lineTo(0, -height + 0.6);
  shape.lineTo(-half, -height);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

// Arma paredes, columnas, arcos, piso, tarima, mesas, bancos y estandartes.
// Devuelve el grupo y los materiales de los estandartes, que después toman el
// color de la casa.
export function buildHall(ctx, bannerColors) {
  const group = new THREE.Group();
  const { width, height, length, centerZ } = HALL;
  const half = width / 2;

  const stone = (repeat) =>
    createPbrMaterial(ctx, { folder: FOLDER, name: "medieval_blocks_03", repeat, color: "#5b5047", tint: "#d8c8b4" });
  const tiles = (repeat) =>
    createPbrMaterial(ctx, { folder: FOLDER, name: "floor_tiles_02", repeat, color: "#4a4038", tint: "#cdbba6" });
  const wood = (repeat) =>
    createPbrMaterial(ctx, { folder: FOLDER, name: "dark_wood", repeat, color: "#3a2618", roughness: 0.75 });

  // Piso y paredes.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, length), tiles([width / 2, length / 2]));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = centerZ;
  group.add(floor);

  const sideWallMaterial = stone([length / 3, height / 3]);
  const sideWallGeometry = new THREE.PlaneGeometry(length, height);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(sideWallGeometry, sideWallMaterial);
    wall.position.set(side * half, height / 2, centerZ);
    wall.rotation.y = -side * (Math.PI / 2);
    group.add(wall);
  }

  const endWallMaterial = stone([width / 3, height / 3]);
  const endWallGeometry = new THREE.PlaneGeometry(width, height);
  const backWall = new THREE.Mesh(endWallGeometry, endWallMaterial);
  backWall.position.set(0, height / 2, HALL.back);
  group.add(backWall);
  const frontWall = new THREE.Mesh(endWallGeometry, endWallMaterial);
  frontWall.position.set(0, height / 2, HALL.front);
  frontWall.rotation.y = Math.PI;
  group.add(frontWall);

  // Columnas octogonales contra las paredes laterales y arcos de medio punto
  // entre cada par. Todo instanciado: 2 draw calls para 18 columnas y 16 arcos.
  const columnZs = [];
  for (let z = HALL.front - 4; z > HALL.back + 2; z -= COLUMN_STEP) columnZs.push(z);
  const columnX = half - 0.45;
  const columnTransforms = [];
  const archTransforms = [];
  for (const side of [-1, 1]) {
    columnZs.forEach((z, index) => {
      columnTransforms.push({ position: [side * columnX, height / 2, z] });
      if (index > 0) {
        archTransforms.push({ position: [side * columnX, 5.4, z + COLUMN_STEP / 2], rotation: [0, Math.PI / 2, 0] });
      }
    });
  }
  const columnMaterial = stone([2, 4]);
  group.add(instanced(new THREE.CylinderGeometry(0.42, 0.5, height, 8), columnMaterial, columnTransforms));
  group.add(
    instanced(new THREE.TorusGeometry(COLUMN_STEP / 2 - 0.4, 0.2, 8, 24, Math.PI), columnMaterial, archTransforms),
  );

  // Tarima y mesa de profesores.
  const dais = new THREE.Mesh(new THREE.BoxGeometry(width - 1, 0.5, 8), tiles([6, 4]));
  dais.position.set(0, 0.25, HALL.daisFront - 4);
  group.add(dais);

  const tableWood = wood([1, 6]);
  const headTop = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 1.2), tableWood);
  headTop.position.set(0, 1.4, HALL.daisFront - 3);
  group.add(headTop);
  const headFront = new THREE.Mesh(new THREE.BoxGeometry(9, 0.85, 0.08), tableWood);
  headFront.position.set(0, 0.92, HALL.daisFront - 2.45);
  group.add(headFront);

  // Las cuatro mesas largas, con un banco de cada lado.
  const tableLength = HALL.tablesFrom - HALL.tablesTo;
  const tableZ = (HALL.tablesFrom + HALL.tablesTo) / 2;
  const tops = [];
  const bases = [];
  const seats = [];
  const seatBases = [];
  for (const x of TABLE_XS) {
    tops.push({ position: [x, 0.85, tableZ] });
    bases.push({ position: [x, 0.4, tableZ] });
    for (const side of [-1, 1]) {
      seats.push({ position: [x + side * 0.85, 0.48, tableZ] });
      seatBases.push({ position: [x + side * 0.85, 0.22, tableZ] });
    }
  }
  group.add(instanced(new THREE.BoxGeometry(1.1, 0.1, tableLength), tableWood, tops));
  group.add(instanced(new THREE.BoxGeometry(0.5, 0.8, tableLength - 0.4), tableWood, bases));
  group.add(instanced(new THREE.BoxGeometry(0.38, 0.08, tableLength), tableWood, seats));
  group.add(instanced(new THREE.BoxGeometry(0.2, 0.44, tableLength - 0.4), tableWood, seatBases));

  // Estandartes colgados delante de dos columnas por lado.
  const bannerGeo = bannerGeometry(1.4, 3.6);
  const rodGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.7, 8);
  const rodMaterial = new THREE.MeshStandardMaterial({ color: "#b08a3e", metalness: 0.8, roughness: 0.35 });
  const bannerZs = [columnZs[4], columnZs[6]];
  const bannerMaterials = [];
  [-1, 1].forEach((side, sideIndex) => {
    bannerZs.forEach((z, zIndex) => {
      const material = new THREE.MeshStandardMaterial({
        color: bannerColors[sideIndex * 2 + zIndex],
        roughness: 0.85,
        side: THREE.DoubleSide,
      });
      bannerMaterials.push(material);
      const banner = new THREE.Mesh(bannerGeo, material);
      banner.position.set(side * (columnX - 0.6), 7.4, z);
      banner.rotation.y = -side * (Math.PI / 2);
      group.add(banner);
      const rod = new THREE.Mesh(rodGeo, rodMaterial);
      rod.rotation.x = Math.PI / 2;
      rod.position.set(side * (columnX - 0.6), 7.4, z);
      group.add(rod);
    });
  });

  return { group, bannerMaterials };
}
