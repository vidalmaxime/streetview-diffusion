const curatedPrompts = [
  "monet painting spaces empire",
  "psychedelic countryside",
  "world full of animals and life, waterfalls and oasis",
  "futuristic solarpunk studio ghibli, gaudi, happy, plants, art nouveau",
  "cyberpunk traditional japanese",
];

const curatedPlaces = [
  { lat: 40.75797, lng: -73.98554 },
  { lat: 48.8567826, lng: 2.2966567 },
  { lat: 37.80899, lng: -122.47281 },
  { lat: 43.69567, lng: 7.27421 },
  { lat: 46.52023, lng: 6.62553 },
  { lat: -13.1632, lng: -72.54526 },
  { lat: 41.89021, lng: 12.49223 },
];

const examples = [
  {
    name: "psychedelic countryside",
    prompt: "psychedelic day in the countryside",
    original: "/examples/psy_original.png",
    transformed: "/examples/psy_transformed.png",
    latitude: 46.52023,
    longitude: 6.62553,
    modelType: "cn",
  },
  {
    name: "cyberworld",
    prompt:
      "an alien world, a futuristic society with architectural structures sequenced to follow the patterns of Fibonacci and fractal-based quantum concepts, a sci-fi steampunk town Madmaxville, creative illu",
    original: "/examples/cyb_original.png",
    transformed: "/examples/cyb_transformed.png",
    latitude: 51.511239395635954,
    longitude: -0.015762713183589128,
    modelType: "sd",
  },
  {
    name: "dali city",
    prompt: "surrealist painting, inspired by Salvador Dalí",
    original: "/examples/dali_original.png",
    transformed: "/examples/dali_transformed.png",
    latitude: 60.39126279999999,
    longitude: 5.3220544,
    modelType: "sd",
  },
  {
    name: "alien spaceship",
    prompt:
      "H R Giger nightmarish alien spaceship, highly detailed and photorealistic machine madness, tubes and liquid dripping, trending on artstation",
    original: "/examples/alien_original.png",
    transformed: "/examples/alien_transformed.png",
    latitude: 48.86224194439807,
    longitude: 2.345932045507828,
    modelType: "cn",
  },
  {
    name: "anime machu pichu",
    prompt:
      "anime artwork ” outer planet overgrown with wild flowers, [ art by paul lehr, cinematic, detailed, epic, widescreen, opening, establishing, mattepainting, photorealistic, realistic textures, octane render ] ”",
    original: "/examples/ma_original.png",
    transformed: "/examples/ma_transformed.png",
    latitude: -13.1631988,
    longitude: -72.5452621,
    modelType: "sd",
  },
  {
    name: "inside studio ghibli",
    prompt:
      "anime landscape from Studio Ghibli, serene with clean lines, nature, light, wind, artist_ Gene Luen Yang, Neue Sachlichkeit style, Backlight",
    original: "/examples/ghibli_original.png",
    transformed: "/examples/ghibli_transformed.png",
    latitude: 43.8251345,
    longitude: 7.1228181,
    modelType: "sd",
  },
  {
    name: "matrix city",
    prompt:
      "matrix in manhattan the movie, black and green lines of code, crisp detailed, trending on artstation",
    original: "/examples/matrix_original.png",
    transformed: "/examples/matrix_transformed.png",
    latitude: 40.75797,
    longitude: -73.98554,
    modelType: "cn",
  },
  {
    name: "atlantis new york",
    prompt:
      "Atlantis under the water psychedelic fractal background, illustrative character design, concept art, tales of earthsea, sky witch, colorful, matte painting, soft illumination, painting by gaston bussiere, craig mullin",
    original: "/examples/atl_original.png",
    transformed: "/examples/atl_transformed.png",
    latitude: 40.7579747,
    longitude: -73.9855426,
    modelType: "sd",
  },
  {
    name: "scary sagrada",
    prompt:
      "black and white HR Giger nightmarish interior of alien spaceship, dark and pale, machinic desire, polished drooling alien blood",
    original: "/examples/sag_original.png",
    transformed: "/examples/sag_transformed.png",
    latitude: 41.403155103484075,
    longitude: 2.1749512504013024,
    modelType: "sd",
  },
  {
    name: "monnet in times square",
    prompt:
      "hispanicore, light red and white, distinctive noses, claude monet, post-impressionism, dazzling cityscapes",
    original: "/examples/mon_original.png",
    transformed: "/examples/mon_transformed.png",
    latitude: 40.7579747,
    longitude: -73.9855426,
    modelType: "sd",
  },
  {
    name: "lego town",
    prompt:
      "french street market LEGO City set, LEGO® City, Lego bricks, HD detailed",
    original: "/examples/lego_original.png",
    transformed: "/examples/lego_transformed.png",
    latitude: 43.69567,
    longitude: 7.27421,
    modelType: "cn",
  },
  {
    name: "trippy mosque",
    prompt:
      "psychedelic DMT LSD abstract visual hallucinations, pattern of symmetries and abstract geometry, color fractals, HD trending on artstation",
    original: "/examples/mos_original.png",
    transformed: "/examples/mos_transformed.png",
    latitude: 24.411417020864963,
    longitude: 54.4752643109158,
    modelType: "sd",
  },
  {
    name: "nighmare on the louvre",
    prompt: "H.R. Giger's Nightmarish Art, trending on artstation",
    original: "/examples/lv_original.png",
    transformed: "/examples/lv_transformed.png",
    latitude: 48.86118,
    longitude: 2.33511,
    modelType: "sd",
  },
];

export { curatedPrompts, curatedPlaces, examples };
