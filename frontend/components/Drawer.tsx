"use client";
import React, { useState } from "react";
import { Drawer } from "vaul";
import { track } from "@vercel/analytics";
import Image from "next/image";

type MyDrawerProps = {
  setLatitude: (latitude: number) => void;
  setLongitude: (longitude: number) => void;
  setPrompt: (prompt: string) => void;
  setImages: (images: string) => void;
  setOriginalImages: (images: string) => void;
  setLoadingImages: (loadingImages: boolean) => void;
  setModelType: (modelType: string) => void;
  photoSphereRef: React.MutableRefObject<any | null>;
  examples: {
    name: string;
    prompt: string;
    original: string;
    transformed: string;
    latitude: number;
    longitude: number;
    modelType: string;
  }[];
};

export function MyDrawer({
  setLatitude,
  setLongitude,
  setPrompt,
  setImages,
  setOriginalImages,
  setLoadingImages,
  setModelType,
  photoSphereRef,
  examples,
}: MyDrawerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer.Root shouldScaleBackground open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          className="px-4 self-end text-gray-400 hover:text-black mt-2 lg:mt-0"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.blur();
            track("examples");
            setOpen(!open);
          }}
        >
          examples
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="bg-zinc-100 flex flex-col rounded-t-[50px] h-[35%] md:h-[30%] mt-24 fixed bottom-0 left-0 right-0">
          <div className="p-4 bg-white rounded-t-[20px] flex-1">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-300 mb-4" />
            <div className="max-w-[95%] mx-auto ">
              <Drawer.Title className="text-lg mb-0 text-black">
                examples
              </Drawer.Title>
              <div className="blur-edges">
                <div className="flex flex-shrink-0  space-x-2 space-y-2 w-full overflow-x-scroll">
                  {examples.map((example, index) => {
                    return (
                      <button
                        key={index}
                        className="flex items-center justify-between"
                        onClick={() => {
                          if (photoSphereRef.current) {
                            setLoadingImages(true);
                            setTimeout(() => {
                              setLoadingImages(false);
                            }, 1000);
                          }
                          setLatitude(example.latitude);
                          setLongitude(example.longitude);
                          setPrompt(example.prompt);
                          setImages(example.transformed);
                          setOriginalImages(example.original);
                          setModelType(example.modelType);
                          setOpen(false);
                        }}
                      >
                        <div className="items-start p-0 rounded-xl flex flex-col w-96 mb-8">
                          <p className="font-medium text-black self-center">
                            {example.name}
                          </p>
                          <Image
                            src={example.transformed}
                            alt={example.name}
                            width={500}
                            height={100}
                            className="rounded-xl"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
