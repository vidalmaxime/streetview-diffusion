import { useState, useEffect } from "react";
import { Tab } from "@headlessui/react";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type PowerLevelsProps = {
  modelType: string;
  setModelType: (category: string) => void;
};

export default function PowerLevels({
  modelType,
  setModelType,
}: PowerLevelsProps) {
  const [powerLevels] = useState(["remix", "morph"]);
  const [selectedTab, setSelectedTab] = useState(0);
  const powerLevelsMap: { [key: string]: string } = {
    remix: "cn",
    morph: "sd",
  };
  const modelTypesMap: { [key: string]: string } = {
    cn: "remix",
    sd: "morph",
  };

  useEffect(() => {
    setSelectedTab(powerLevels.indexOf(modelTypesMap[modelType]));
    console.log(modelType);
  }, [modelType]);

  return (
    <div className="w-full max-w-lg  py-2  text-black">
      transformation power
      <Tab.Group
        defaultIndex={selectedTab}
        selectedIndex={selectedTab}
        onChange={setSelectedTab}
      >
        <Tab.List className="flex space-x-1 rounded-xl bg-orange-900/20 p-1">
          {powerLevels.map((powerLevel) => (
            <Tab
              key={powerLevel}
              className={({ selected }) =>
                classNames(
                  "w-full rounded-lg py-2 text-sm font-medium leading-5 ring-0 focus:outline-none ",
                  selected
                    ? "bg-black text-accent shadow"
                    : "text-blue-100 hover:bg-white/[0.12] hover:text-white"
                )
              }
              onClick={() => setModelType(powerLevelsMap[powerLevel])}
            >
              {powerLevel}
            </Tab>
          ))}
        </Tab.List>
      </Tab.Group>
    </div>
  );
}
