// src/app/core/leaflet-fix.ts   (o cualquier nombre)
import L from 'leaflet';
import 'leaflet-rotatedmarker';

// ESTAS 3 LÍNEAS SON LAS QUE FUNCIONAN EN TODOS LOS PROYECTOS IONIC + ANGULAR 17/18 + CAPACITOR
delete (L as any).default;                    // Elimina el .default que mete ESBuild
delete (L as any).default?.prototype;         // Por si acaso
(window as any).L = L;                        // Forzamos el global

export {};