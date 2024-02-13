import { useRef } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import React from "react";

type MapProps = {
  setLatitude: (latitude: number) => void;
  setLongitude: (longitude: number) => void;
  latitude: number;
  longitude: number;
};

const mapStyles = [
  {
    featureType: "all",
    elementType: "all",
    stylers: [
      {
        saturation: -100,
      },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      {
        color: "#0E257A",
        saturation: 100,
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [
      {
        color: "#4C4C4C",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#000000",
      },
    ],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [
      {
        color: "#303030",
      },
    ],
  },
];

const Map = ({ setLatitude, setLongitude, latitude, longitude }: MapProps) => {
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMarkerDragEnd = (e: any) => {
    setLatitude(e.latLng.lat());
    setLongitude(e.latLng.lng());
  };

  const checkMarkerInView = () => {
    if (mapRef.current && mapRef.current !== null) {
      const bounds = mapRef.current.getBounds();
      // If the marker is not in the bounds, move it to the center
      if (!bounds?.contains({ lat: latitude, lng: longitude })) {
        const center = mapRef.current.getCenter();
        if (!center) return;
        setLatitude(center.lat());
        setLongitude(center.lng());
      }
    }
  };

  return (
    <div className="w-full h-[320px] lg:h-[350px] flex flex-col items-center">
      <GoogleMap
        mapContainerStyle={{
          width: "100%",
          height: "95%",
          borderRadius: "10px",
          outline: "none",
        }}
        center={{ lat: latitude, lng: longitude }}
        zoom={10}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        onDragEnd={checkMarkerInView}
        onZoomChanged={checkMarkerInView}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: false,
          styles: mapStyles,
        }}
      >
        <Marker
          position={{ lat: latitude, lng: longitude }}
          draggable={true}
          onDragEnd={onMarkerDragEnd}
          icon={"/pin.svg"}
        />
      </GoogleMap>
    </div>
  );
};

export default Map;
