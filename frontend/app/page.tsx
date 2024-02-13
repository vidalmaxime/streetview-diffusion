"use client";
import React, { useEffect, useState, useRef } from "react";
import { toast, Toaster } from "sonner";
import { track } from "@vercel/analytics";
import { useMedia } from "react-use";
import AutoComplete from "react-google-autocomplete";
import { LoadScript } from "@react-google-maps/api";
import { motion } from "framer-motion";
import Button from "@/components/Button";
import Image from "next/image";
import { ReactPhotoSphereViewer } from "react-photo-sphere-viewer";
import * as photoViewer from "@photo-sphere-viewer/core";
import { useSearchParams } from "next/navigation";
import { EyeIcon } from "@heroicons/react/20/solid";
import { EyeSlashIcon } from "@heroicons/react/20/solid";

import Map from "../components/Map";
import Globe from "../components/Globe";
import PowerLevels from "../components/PowerLevels";
import { MyDrawer } from "../components/Drawer";
import { fetchImages, fetchImagesFromId } from "./utils";
import { curatedPrompts, curatedPlaces, examples } from "./constants";

const zoom = 90;

function App() {
  const initialPlace =
    curatedPlaces[Math.floor(Math.random() * curatedPlaces.length)];
  const initialPrompt =
    curatedPrompts[Math.floor(Math.random() * curatedPrompts.length)];

  const [latitude, setLatitude] = useState<number>(initialPlace.lat);
  const [longitude, setLongitude] = useState<number>(initialPlace.lng);
  const [images, setImages] = useState<string>("");
  const [panoParams, setPanoParams] = useState<{
    id: string;
    latitude: number;
    longitude: number;
    prompt: string;
    modelType: string;
  }>({ id: "", latitude: 0, longitude: 0, prompt: "", modelType: "cn" });
  const [originalImages, setOriginalImages] = useState<string>("");
  const [prompt, setPrompt] = useState<string>(initialPrompt);
  const [modelType, setModelType] = useState<string>("cn");
  const [loadingImages, setLoadingImages] = useState<boolean>(false);
  const [showingOriginals, setShowingOriginals] = useState<boolean>(false);
  const [opacityLeftKey, setOpacityLeftKey] = useState<number>(1);
  const [opacityRightKey, setOpacityRightKey] = useState<number>(1);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  const isWide = useMedia("(min-width: 1024px)", true);

  const searchParams = useSearchParams();
  const linkId = searchParams.get("panoId");
  const linkLatitude = searchParams.get("latitude");
  const linkLongitude = searchParams.get("longitude");
  const linkPrompt = searchParams.get("prompt");
  const linkModelType = searchParams.get("modelType");

  useEffect(() => {
    if (
      linkId &&
      linkLatitude &&
      linkLongitude &&
      linkPrompt &&
      linkModelType
    ) {
      setLatitude(Number(linkLatitude));
      setLongitude(Number(linkLongitude));
      setPrompt(decodeURI(linkPrompt));
      setModelType(String(linkModelType));
      setLoadingImages(true);
      fetchImagesFromId(linkId).then((result) => {
        setImages(result.image);
        setOriginalImages(result.original);
        setPanoParams(result.panoParams);
        setLoadingImages(false);
      });
    }
  }, [linkId, linkLatitude, linkLongitude, linkPrompt, linkModelType]);

  const promptInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const conditionsAtPreviousTeleportRef = useRef<{
    latitude: number;
    longitude: number;
    prompt: string;
    modelType: string;
  }>({
    latitude: 0,
    longitude: 0,
    prompt: "",
    modelType: "cn",
  });
  const justShowedOriginals = useRef<boolean>(false);
  const photoSphereRef = useRef<any>(null);

  const teleport = async () => {
    if (!latitude || !longitude) {
      toast("Please enter a latitude and a longitude.");
      return;
    }
    if (!prompt) {
      toast("Please enter a prompt.");
      return;
    }
    if (loadingImages) {
      toast("Please wait for the images to load.");
      return;
    }
    const teleportDisabled =
      loadingImages ||
      (conditionsAtPreviousTeleportRef.current.latitude === latitude &&
        conditionsAtPreviousTeleportRef.current.longitude === longitude &&
        conditionsAtPreviousTeleportRef.current.prompt === prompt &&
        conditionsAtPreviousTeleportRef.current.modelType === modelType);
    if (teleportDisabled) {
      toast("You are already there.");
      return;
    }
    const isStreetViewAvailable = await checkStreetView();
    if (!isStreetViewAvailable) {
      toast(
        "Street view not available in this location. Please try again closer to a road."
      );
      setLoadingImages(false);
      return;
    }
    setLoadingImages(true);

    const newImages = await fetchImages(modelType, latitude, longitude, prompt);
    track("teleport", {
      prompt: String(prompt + "," + modelType),
      location: String(latitude + "," + longitude),
    });
    setLoadingImages(false);
    if ((newImages.image ?? []).length === 0) {
      toast("You can teleport once every 20s. Please try again soon.");
      return;
    }
    conditionsAtPreviousTeleportRef.current.latitude = latitude;
    conditionsAtPreviousTeleportRef.current.longitude = longitude;
    conditionsAtPreviousTeleportRef.current.prompt = prompt;
    conditionsAtPreviousTeleportRef.current.modelType = modelType;
    setImages(newImages.image);
    setOriginalImages(newImages.original);
    setPanoParams(newImages.panoParams);
  };

  const clickToTeleport = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    teleport();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      teleport();
    }
  };

  const shareImage = () => {
    if (!panoParams.id) {
      toast("Don't share examples, share your own creation.");
      return;
    }
    track("share");
    const processedPrompt = panoParams.prompt.replace(/ /g, "%20");
    const url = `https://panoramai.xyz/?panoId=${panoParams.id}&latitude=${panoParams.latitude}&longitude=${panoParams.longitude}&prompt=${processedPrompt}&modelType=${panoParams.modelType}`;
    navigator.clipboard.writeText(url);

    toast("Share URL copied to clipboard. Link will expire in 24 hours.");
  };

  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => {
      if (document.activeElement === promptInputRef.current) return;
      if (document.activeElement === searchInputRef.current) return;
      if (e.key === "ArrowLeft") {
        setOpacityLeftKey(0.5);
        setTimeout(() => {
          setOpacityLeftKey(1);
        }, 200);
      } else if (e.key === "ArrowRight") {
        setOpacityRightKey(0.5);
        setTimeout(() => {
          setOpacityRightKey(1);
        }, 200);
      } else if (e.key === " ") {
        if (justShowedOriginals.current) {
          return;
        }
        track("show-originals");
        setShowingOriginals(true);
        justShowedOriginals.current = true;
      }
    };
    document.addEventListener("keydown", keyDownHandler);
    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, [images]);

  useEffect(() => {
    const keyUpHandler = (e: KeyboardEvent) => {
      if (document.activeElement === promptInputRef.current) return;
      if (e.key === " ") {
        setShowingOriginals(false);
        justShowedOriginals.current = false;
      }
    };
    document.addEventListener("keyup", keyUpHandler);
    return () => {
      document.removeEventListener("keyup", keyUpHandler);
    };
  }, []);

  // check if there is a street view available in this location
  const checkStreetView = async () => {
    const streetViewService = new google.maps.StreetViewService();
    const radius = 50;
    const streetViewAvailable = await new Promise((resolve) => {
      streetViewService.getPanorama(
        { location: { lat: latitude, lng: longitude }, radius },
        (data, status) => {
          if (status === "OK") {
            resolve(true);
            console.log("Street view available");
          } else {
            resolve(false);
            console.log("Street view not available");
          }
        }
      );
    });
    return streetViewAvailable;
  };

  return (
    <div className="App font-primary">
      <div className="w-screen h-dvh bg-white overflow-hidden flex flex-col lg:flex-row-reverse">
        <div
          className={`h-full w-full lg:w-2/3 p-4  lg:p-8 ${
            images.length > 0 || loadingImages ? "flex" : "hidden md:flex"
          } flex-col`}
        >
          {images.length > 0 && !loadingImages ? (
            <div className="w-full h-full relative flex flex-col">
              <p className="text-gray-500 self-center hidden lg:block absolute -top-6">
                press space to go back home
              </p>

              <div
                className={`w-full h-full absolute ${
                  showingOriginals ? "opacity-0" : "opacity-100"
                }`}
              >
                <ReactPhotoSphereViewer
                  src={images}
                  height={"100%"}
                  width={"100%"}
                  minFov={zoom}
                  maxFov={zoom}
                  defaultPitch={0}
                  keyboard={"always"}
                  containerClass="border border-black rounded-3xl overflow-hidden"
                  ref={photoSphereRef}
                  panoData={{
                    fullWidth: 3072,
                    fullHeight: 1536,
                    croppedWidth: 3072,
                    croppedHeight: 1024,
                    croppedX: 0,
                    croppedY: 256,
                    poseHeading: 0, // 0 to 360
                    posePitch: 0, // -90 to 90
                    poseRoll: 0, // -180 to 180
                    isEquirectangular: true,
                  }}
                  navbar={[]}
                  keyboardActions={{
                    ...photoViewer.DEFAULTS.keyboardActions,
                    ArrowUp: () => {},
                    ArrowDown: () => {},
                    Space: () => {},
                  }}
                  onPositionChange={() => {
                    // Block any change in pitch (keep at 0)
                    if (photoSphereRef.current) {
                      const position = photoSphereRef.current.getPosition();
                      if (position.pitch !== 0)
                        photoSphereRef.current.rotate({
                          pitch: 0,
                          yaw: position.yaw,
                        });
                    }
                  }}
                ></ReactPhotoSphereViewer>
              </div>
              <div
                className={`w-full h-full absolute ${
                  showingOriginals ? "opacity-100" : "opacity-0"
                }`}
              >
                <ReactPhotoSphereViewer
                  src={originalImages}
                  height={"100%"}
                  width={"100%"}
                  minFov={zoom}
                  maxFov={zoom}
                  defaultPitch={0}
                  keyboard={"always"}
                  containerClass="border border-black rounded-3xl overflow-hidden"
                  ref={photoSphereRef}
                  panoData={{
                    fullWidth: 3072,
                    fullHeight: 1536,
                    croppedWidth: 3072,
                    croppedHeight: 1024,
                    croppedX: 0,
                    croppedY: 256,
                    poseHeading: 0, // 0 to 360
                    posePitch: 0, // -90 to 90
                    poseRoll: 0, // -180 to 180
                    isEquirectangular: true,
                  }}
                  navbar={[]}
                  keyboardActions={{
                    ...photoViewer.DEFAULTS.keyboardActions,
                    ArrowUp: () => {},
                    ArrowDown: () => {},
                    Space: () => {},
                  }}
                  onPositionChange={() => {
                    // Block any change in pitch (keep at 0)
                    if (photoSphereRef.current) {
                      const position = photoSphereRef.current.getPosition();
                      if (position.pitch !== 0)
                        photoSphereRef.current.rotate({
                          pitch: 0,
                          yaw: position.yaw,
                        });
                    }
                  }}
                ></ReactPhotoSphereViewer>
              </div>
              <button
                className="w-10 h-8 absolute top-2 right-2
               bg-black rounded-xl z-90 flex justify-center items-center md:hidden"
                onClick={() => {
                  setShowingOriginals(!showingOriginals);
                }}
              >
                {" "}
                {showingOriginals ? (
                  <EyeSlashIcon className="w-4 h-4  text-white" />
                ) : (
                  <EyeIcon className="w-4 h-4  text-white" />
                )}
              </button>
              <button
                className="absolute -bottom-10 lg:bottom-1/2 lg:translate-y-5 left-5 hover:opacity-80"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.blur();
                  if (photoSphereRef.current) {
                    const currentYaw = photoSphereRef.current.getPosition().yaw;
                    photoSphereRef.current.animate({
                      yaw: currentYaw - 0.3,
                      speed: "3rpm",
                      pitch: 0,
                      zoom: zoom,
                    });
                  }
                }}
              >
                <motion.img
                  src="/arrow-right.svg"
                  alt="right"
                  width={30}
                  animate={{ opacity: opacityLeftKey }}
                />
              </button>
              <button
                className="absolute -bottom-10 lg:bottom-1/2 lg:translate-y-5 right-5 hover:opacity-80"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.blur();
                  if (photoSphereRef.current) {
                    const currentYaw = photoSphereRef.current.getPosition().yaw;
                    photoSphereRef.current.animate({
                      yaw: currentYaw + 0.3,
                      speed: "3rpm",
                      pitch: 0,
                      zoom: 90,
                    });
                  }
                }}
              >
                <motion.img
                  src="/arrow-left.svg"
                  alt="left"
                  width={30}
                  animate={{ opacity: opacityRightKey }}
                />
              </button>
              <div
                className={`flex items-end absolute text-black space-x-4 -bottom-11 lg:-bottom-5  self-center`}
              >
                <button
                  onClick={(e) => {
                    e.currentTarget.blur();
                    shareImage();
                  }}
                  hidden={loadingImages || images.length === 0}
                  className=" hover:text-accent text-white bg-black/100 px-4 py-2 rounded-lg focus:outline-none focus:border-black"
                >
                  share
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`w-full h-full relative flex flex-col 
                  border border-black rounded-3xl overflow-hidden`}
            >
              {loadingImages && (
                <div className="absolute self-center top-48 -mt-4 h-96 z-30">
                  <Globe />
                </div>
              )}

              <div className="flex flex-col items-center justify-center h-full">
                <motion.img
                  src="/departing-man.png"
                  alt="departingMan"
                  className="h-full self-center"
                />
                {!loadingImages && (
                  <div className="absolute self-center top-48 flex flex-col items-center">
                    <p className="text-black">ready to explore</p>
                    <p className="text-gray-500">waiting for destination</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col w-full lg:w-1/3 h-full bg-white p-4 ">
          <Image
            src="/logo.png"
            alt="logo"
            width={200}
            height={200}
            className="mb-0 hidden md:block"
          />
          {!isScriptLoaded && (
            <div className=" flex text-black h-[316px] lg:h-[386px] items-center justify-center">
              Loading...
            </div> // This is your placeholder
          )}

          <LoadScript
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""}
            libraries={["places"]}
            onLoad={() => setIsScriptLoaded(true)}
          >
            <AutoComplete
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_API_KEY}
              onPlaceSelected={(place) => {
                setLatitude(
                  place.geometry?.location?.lat() || initialPlace.lat
                );
                setLongitude(
                  place.geometry?.location?.lng() || initialPlace.lng
                );
              }}
              options={{
                types: [],
                fields: ["geometry.location"],
              }}
              style={{
                border: "1px solid #1f2937",
                width: "100%",
                height: "40px",
                borderRadius: "5px",
                paddingTop: "10px",
                paddingBottom: "5px",
                paddingLeft: "5px",
                paddingRight: "5px",
                color: "black",
                outline: "none",
              }}
              placeholder="search for a location"
              ref={searchInputRef}
              hidden={!isWide}
            />
            <div
              className={`flex-col  ${
                isWide || !(images.length > 0 || loadingImages)
                  ? "flex"
                  : "hidden"
              }`}
            >
              <div className="flex items-center text-gray-400 text-sm h-[20px]">
                <div>latitude: {latitude.toFixed(4)},</div>
                <div className="ml-2">longitude: {longitude.toFixed(4)}</div>
              </div>
              <Map
                setLatitude={setLatitude}
                setLongitude={setLongitude}
                latitude={latitude}
                longitude={longitude}
              />
            </div>
          </LoadScript>

          <MyDrawer
            setLatitude={setLatitude}
            setLongitude={setLongitude}
            setPrompt={setPrompt}
            setImages={setImages}
            setOriginalImages={setOriginalImages}
            setLoadingImages={setLoadingImages}
            setModelType={setModelType}
            photoSphereRef={photoSphereRef}
            examples={examples}
          />
          <div className="flex flex-col w-full py-1 rounded-lg bg-accent  flex-1 justify-between ">
            {/* <div className=" grid-pattern absolute h-64 w-96 opacity-20 ml-8"></div> */}
            <div className="flex flex-col space-y-4 w-full">
              <div className="flex-col items-center px-4 w-full">
                <p className="text-black">what is it like</p>
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Monet painting"
                  onKeyDown={handleKeyDown}
                  className="w-full border border-white rounded-lg text-white px-2 py-2 bg-accent focus:outline-none focus:border-black"
                  ref={promptInputRef}
                />
              </div>
              <div className="w-full flex-col items-center px-4">
                <PowerLevels
                  modelType={modelType}
                  setModelType={setModelType}
                />
              </div>
            </div>

            <div className="px-4 py-2 w-full flex items-center justify-center">
              <Button clickToTeleport={clickToTeleport} />
            </div>
          </div>
          {!isWide && images.length > 0 && (
            <div className="flex items-centers w-full justify-center mt-2 md:py-0 px-4 text-gray-600">
              <button
                onClick={() => {
                  setImages("");
                  conditionsAtPreviousTeleportRef.current.latitude = 0;
                  conditionsAtPreviousTeleportRef.current.longitude = 0;
                  conditionsAtPreviousTeleportRef.current.prompt = "";
                  conditionsAtPreviousTeleportRef.current.modelType = "cn";
                }}
              >
                change location
              </button>
            </div>
          )}
        </div>
      </div>
      <Toaster
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "bg-white text-black px-4 py-4 text-sm rounded-xl border border-black",
          },
        }}
      />
    </div>
  );
}

export default App;
