import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GeoJsonGeometry } from "three-geojson-geometry";
import { geoGraticule10 } from "d3-geo";

const ThreeCountries = () => {
  const [geoJson, setGeoJson] = useState<any>(null);

  const getGeoJson = async () => {
    try {
      const response = await fetch(
        "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson"
      );

      if (!response.ok) {
        throw new Error();
      }
      const data = await response.json();
      setGeoJson(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getGeoJson();
  }, []);

  return (
    <group>
      {geoJson
        ? geoJson.features.map(
            (
              data: { geometry: any },
              index: string | number | bigint | undefined
            ) => {
              const { geometry } = data;
              return (
                <lineSegments
                  key={index}
                  geometry={new GeoJsonGeometry(geometry, 1)}
                >
                  <lineBasicMaterial color="#5c5c5c" />
                </lineSegments>
              );
            }
          )
        : null}
    </group>
  );
};

const ThreeGraticule = () => {
  return (
    <group>
      <lineSegments geometry={new GeoJsonGeometry(geoGraticule10(), 1)}>
        <lineBasicMaterial color="#3c3c3c" transparent={true} opacity={0.1} />
      </lineSegments>
    </group>
  );
};

const ThreeMesh = () => {
  return (
    <mesh>
      <sphereGeometry args={[1, 32]} />
      <meshPhongMaterial color="#191919" transparent={true} opacity={0.2} />
      <ThreeGraticule />
      <ThreeCountries />
    </mesh>
  );
};

const Global = () => {
  return (
    <Canvas
      camera={{
        fov: 75,
        position: [0, 1, 2.1],
      }}
      style={{
        cursor: "move",
      }}
    >
      <OrbitControls
        autoRotate={true}
        autoRotateSpeed={25}
        enableRotate={false}
        enableZoom={false}
        enablePan={false}
      />
      <ambientLight intensity={1.3} />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />
      <ThreeMesh />
    </Canvas>
  );
};

export default Global;
