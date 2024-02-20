import axios from "axios";

const diffuseImagesUrl = process.env.NEXT_PUBLIC_BACKEND_URL + "/process-image";
const diffuseImagesPollingUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL + "/result-process-image";
const diffuseImagesTimeoutMs = 600000;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const taskBasedApiCall = async (
  url: string,
  data: unknown,
  config: object,
  timeoutMs: number,
  pollingUrl: string
) => {
  const response = await axios.post(url, data, config).catch((error) => {
    console.log(error);
  });
  if (!response) {
    console.log("First request failed");
    return {
      success: false,
      data: null,
    };
  }
  const report_id = response.data["report_id"];
  const taskResultRequestConfig = {
    timeout: timeoutMs,
  };

  let requestPending = true;
  let timeout = false;
  const startTime = Date.now();
  var taskResultRequestResult;
  while (requestPending && !timeout) {
    await sleep(1000);
    taskResultRequestResult = await axios
      .get(pollingUrl + "/" + report_id, taskResultRequestConfig)
      .catch((error) => {
        console.log(error);
        return null;
      });
    if (!taskResultRequestResult) {
      console.log("Internal request timed-out");
      timeout = true;
      break;
    }

    requestPending = taskResultRequestResult.data["task_status"] === "PENDING";

    timeout = Date.now() - startTime > timeoutMs;
  }
  let success = false;
  if (taskResultRequestResult) {
    if (!timeout && taskResultRequestResult.data["task_status"] === "SUCCESS") {
      success = true;
    }
    if (timeout) {
      console.log("Task timed-out");
    }

    return {
      success: success,
      data: taskResultRequestResult.data["task_result"],
      id: report_id,
    };
  } else {
    return {
      success: false,
      data: null,
      id: report_id,
    };
  }
};

const fetchImages = async (
  modelType: string,
  latitude: number,
  longitude: number,
  prompt: string
) => {
  const data = {
    prompt: prompt,
    strength: 0.5,
    guidance_scale: 1.5,
    steps: modelType === "sd" ? 10 : 40,
    location: String(latitude + "," + longitude),
    model_type: modelType,
  };

  const config = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    maxBodyLength: Infinity,
  };

  const result = await taskBasedApiCall(
    diffuseImagesUrl,
    data,
    config,
    diffuseImagesTimeoutMs,
    diffuseImagesPollingUrl
  );
  if (result.success) {
    const responseData = result.data;
    const base64Image = responseData.image;
    const base64Original = responseData.original;
    const image = `data:image/png;base64,${base64Image}`;
    const original = `data:image/png;base64,${base64Original}`;

    return {
      image: image,
      original: original,
      panoParams: {
        id: result.id,
        latitude: latitude,
        longitude: longitude,
        prompt: prompt,
        modelType: modelType,
      },
    };
  }
  console.log("Failed to fetch images");
  return {
    image: "",
    original: "",
    panoParams: {
      id: "",
      latitude: 0,
      longitude: 0,
      prompt: "",
      modelType: "cn",
    },
  };
};

const fetchImagesFromId = async (id: string) => {
  const taskResultRequestConfig = {
    timeout: 10000,
  };

  const taskResultRequestResult = await axios
    .get(diffuseImagesPollingUrl + "/" + id, taskResultRequestConfig)
    .catch((error) => {
      console.log(error);
      return null;
    });
  if (!taskResultRequestResult) {
    console.log("Internal request timed-out");
    return {
      image: "",
      original: "",
      panoParams: {
        id: "",
        latitude: 0,
        longitude: 0,
        prompt: "",
        modelType: "cn",
      },
    };
  }

  if (taskResultRequestResult.data["task_status"] === "SUCCESS") {
    const responseData = taskResultRequestResult.data["task_result"];
    const base64Image = responseData.image;
    const base64Original = responseData.original;
    const image = `data:image/png;base64,${base64Image}`;
    const original = `data:image/png;base64,${base64Original}`;

    return {
      image: image,
      original: original,
      panoParams: {
        id: id,
        latitude: responseData.latitude,
        longitude: responseData.longitude,
        prompt: responseData.prompt,
        modelType: responseData.model_type,
      },
    };
  }
  console.log("Failed to fetch images");
  return {
    image: "",
    original: "",
    panoParams: {
      id: "",
      latitude: 0,
      longitude: 0,
      prompt: "",
      modelType: "cn",
    },
  };
};

export { sleep, fetchImages, fetchImagesFromId };
