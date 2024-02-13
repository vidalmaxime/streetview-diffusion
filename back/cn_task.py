import base64
import numpy as np
import PIL.Image
import torch
import io
import requests
from io import BytesIO
import base64
import PIL.Image
from PIL import Image
import torch
from celery import Task
import cv2
import onnxruntime
from diffusers import AutoPipelineForInpainting
from diffusers import (
    ControlNetModel,
    StableDiffusionXLControlNetPipeline,
    AutoencoderKL,
)


class CNTask(Task):

    def __init__(
        self,
        base_model_path,
        controlnet_model_path,
        vae_model_path,
        google_key,
        inpainting_model_path,
        load_model=False,
    ):
        self.base_model_path = base_model_path
        self.google_key = google_key
        self.inpainting_model_path = inpainting_model_path
        self.controlnet_model_path = controlnet_model_path
        self.vae_model_path = vae_model_path

        self.load_model = load_model
        self.name = "cn"

        if self.load_model:
            # Controlnet
            controlnet = ControlNetModel.from_pretrained(
                self.controlnet_model_path, torch_dtype=torch.float16
            )
            vae = AutoencoderKL.from_pretrained(
                self.vae_model_path, torch_dtype=torch.float16
            )
            self.cn_pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
                self.base_model_path,
                controlnet=controlnet,
                vae=vae,
                torch_dtype=torch.float16,
            )
            self.cn_pipe = self.cn_pipe.to("cuda")

            # Inpainting
            self.inp_pipe = AutoPipelineForInpainting.from_pretrained(
                self.inpainting_model_path,
                torch_dtype=torch.float16,
                variant="fp16",
            ).to("cuda")

    @staticmethod
    def resize_to_allowed_dimensions(width, height):
        # List of SDXL dimensions
        allowed_dimensions = [
            (512, 2048),
            (512, 1984),
            (512, 1920),
            (512, 1856),
            (576, 1792),
            (576, 1728),
            (576, 1664),
            (640, 1600),
            (640, 1536),
            (704, 1472),
            (704, 1408),
            (704, 1344),
            (768, 1344),
            (768, 1280),
            (832, 1216),
            (832, 1152),
            (896, 1152),
            (896, 1088),
            (960, 1088),
            (960, 1024),
            (1024, 1024),
            (1024, 960),
            (1088, 960),
            (1088, 896),
            (1152, 896),
            (1152, 832),
            (1216, 832),
            (1280, 768),
            (1344, 768),
            (1408, 704),
            (1472, 704),
            (1536, 640),
            (1600, 640),
            (1664, 576),
            (1728, 576),
            (1792, 576),
            (1856, 512),
            (1920, 512),
            (1984, 512),
            (2048, 512),
        ]
        # Calculate the aspect ratio
        aspect_ratio = width / height
        print(f"Aspect Ratio: {aspect_ratio:.2f}")
        # Find the closest allowed dimensions that maintain the aspect ratio
        closest_dimensions = min(
            allowed_dimensions, key=lambda dim: abs(dim[0] / dim[1] - aspect_ratio)
        )
        return closest_dimensions

    @torch.inference_mode()
    def predict_cn(self, init_image, prompt, steps, controlnet_conditioning_scale=0.42):

        image_width, image_height = init_image.size
        new_width, new_height = self.resize_to_allowed_dimensions(
            image_width, image_height
        )
        image = init_image.resize((new_width, new_height))
        print(f"Resized image to: {new_width}x{new_height}")

        image = np.array(image)
        image = cv2.Canny(image, threshold1=100, threshold2=200)
        image = image[:, :, None]
        image = np.concatenate([image, image, image], axis=2)
        image = Image.fromarray(image)

        results = self.cn_pipe(
            prompt=prompt,
            negative_prompt="low quality, bad quality, sketches",
            image=image,
            num_inference_steps=steps,
            controlnet_conditioning_scale=controlnet_conditioning_scale,
        )
        return results.images[0]

    def predict_inpainting(self, init_image, prompt, width=600, height=600):
        mask_image = PIL.Image.new("RGB", init_image.size, (0, 0, 0))
        mask_image.paste(
            (255, 255, 255),
            (
                2 * init_image.width // 5,
                0,
                3 * init_image.width // 5,
                init_image.height,
            ),
        )
        mask_image = mask_image.convert("RGB")
        negative_prompt = "low quality, bad quality, sketches, sharp discontinuities"
        image = self.inp_pipe(
            prompt=prompt,
            image=init_image,
            mask_image=mask_image,
            num_inference_steps=10,
            strength=0.99,
            width=width,
            height=height,
            guidance_scale=3.5,
            negative_prompt=negative_prompt,
        ).images[0]
        return image

    @staticmethod
    def pre_process(img: np.array) -> np.array:
        # H, W, C -> C, H, W
        img = np.transpose(img[:, :, 0:3], (2, 0, 1))
        # C, H, W -> 1, C, H, W
        img = np.expand_dims(img, axis=0).astype(np.float32)
        return img

    @staticmethod
    def post_process(img: np.array) -> np.array:
        # 1, C, H, W -> C, H, W
        img = np.squeeze(img)
        # C, H, W -> H, W, C
        img = np.transpose(img, (1, 2, 0))[:, :, ::-1].astype(np.uint8)
        return img

    @staticmethod
    def inference(model_path: str, img_array: np.array) -> np.array:
        options = onnxruntime.SessionOptions()
        options.intra_op_num_threads = 1
        options.inter_op_num_threads = 1
        ort_session = onnxruntime.InferenceSession(model_path, options)
        ort_inputs = {ort_session.get_inputs()[0].name: img_array}
        ort_outs = ort_session.run(None, ort_inputs)

        return ort_outs[0]

    @staticmethod
    def convert_pil_to_cv2(image):
        # pil_image = image.convert("RGB")
        open_cv_image = np.array(image)
        # RGB to BGR
        open_cv_image = open_cv_image[:, :, ::-1].copy()
        return open_cv_image

    def upscale(self, image):
        model_path = "models/models_modelx4.ort"
        img = self.convert_pil_to_cv2(image)
        if img.ndim == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

        if img.shape[2] == 4:
            alpha = img[:, :, 3]  # GRAY
            alpha = cv2.cvtColor(alpha, cv2.COLOR_GRAY2BGR)  # BGR

            alpha_output = self.post_process(
                self.inference(model_path, self.pre_process(alpha))
            )  # BGR
            alpha_output = cv2.cvtColor(alpha_output, cv2.COLOR_BGR2GRAY)  # GRAY

            img = img[:, :, 0:3]  # BGR
            image_output = self.post_process(
                self.inference(model_path, self.pre_process(img))
            )  # BGR

            image_output = cv2.cvtColor(image_output, cv2.COLOR_BGR2BGRA)  # BGRA
            image_output[:, :, 3] = alpha_output

        elif img.shape[2] == 3:
            image_output = self.post_process(
                self.inference(model_path, self.pre_process(img))
            )  # BGR

        return image_output

    @staticmethod
    def increase_aspect_ratio_black_bands(final_pano):
        final_pano_sized = Image.new(
            "RGB", (final_pano.width, int(final_pano.width / 3))
        )
        # Paste image in the middle of the new image
        final_pano_sized.paste(
            final_pano, (0, (final_pano_sized.height - final_pano.height) // 2)
        )
        return final_pano_sized

    def run(self, prompt, location, strength=0.5, steps=50, guidance_scale=4.0):
        all_orig = []
        print("Starting streetview")
        angles = [0, 120, 240]
        for angle in angles:
            streetview_url = "https://maps.googleapis.com/maps/api/streetview?size={dimensions}&location={location}&fov=120&heading={heading}&key={key}"
            streetview_url = streetview_url.format(
                dimensions="640x640",
                location=location,
                heading=str(angle),
                key=self.google_key,
            )
            response = requests.get(streetview_url)
            img = Image.open(BytesIO(response.content))
            img = np.array(img)
            img = PIL.Image.fromarray(img)
            all_orig.append(img)

        # Combine all in large image
        orig_pano = Image.new(
            "RGB", (all_orig[0].width * len(all_orig), all_orig[0].height)
        )
        for i, img in enumerate(all_orig):
            orig_pano.paste(img, (i * img.width, 0))

        # Cut a thin band horitonzally that takes 75% of the height
        orig_pano = orig_pano.crop(
            (0, orig_pano.height // 8, orig_pano.width, 7 * orig_pano.height // 8)
        )

        # Run controlnet
        diffused = self.predict_cn(
            orig_pano, prompt, steps, controlnet_conditioning_scale=0.4
        )

        # Split in 3 images: first 1/8, middle 3/4, last 1/8
        first_img = diffused.crop((0, 0, diffused.width // 8, diffused.height))
        last_img = diffused.crop(
            (7 * diffused.width // 8, 0, diffused.width, diffused.height)
        )
        middle_img = diffused.crop(
            (diffused.width // 8, 0, 7 * diffused.width // 8, diffused.height)
        )

        orig_first_img = orig_pano.crop((0, 0, orig_pano.width // 8, orig_pano.height))
        orig_last_img = orig_pano.crop(
            (7 * orig_pano.width // 8, 0, orig_pano.width, orig_pano.height)
        )
        orig_middle_img = orig_pano.crop(
            (orig_pano.width // 8, 0, 7 * orig_pano.width // 8, orig_pano.height)
        )

        # Combine the first and the last image for inpainting
        combined = Image.new(
            "RGB", (first_img.width + last_img.width, first_img.height)
        )
        combined.paste(last_img, (0, 0))
        combined.paste(first_img, (first_img.width, 0))

        orig_combined = Image.new(
            "RGB", (orig_first_img.width + orig_last_img.width, orig_first_img.height)
        )
        orig_combined.paste(orig_last_img, (0, 0))
        orig_combined.paste(orig_first_img, (orig_first_img.width, 0))

        # Inpaint the combined image
        inpainted = self.predict_inpainting(
            combined, prompt, width=combined.width, height=combined.height
        )

        # Combine the inpainted image with the middle image
        final_pano = Image.new(
            "RGB", (middle_img.width + inpainted.width, middle_img.height)
        )
        final_pano.paste(middle_img, (0, 0))
        final_pano.paste(inpainted, (middle_img.width, 0))

        # Do the same thing for the original images
        final_orig_pano = Image.new(
            "RGB", (orig_middle_img.width + orig_combined.width, orig_middle_img.height)
        )
        final_orig_pano.paste(orig_middle_img, (0, 0))
        final_orig_pano.paste(orig_combined, (orig_middle_img.width, 0))

        # Increase aspect ration with black bands
        final_pano_sized = self.increase_aspect_ratio_black_bands(final_pano)
        final_orig_pano_sized = self.increase_aspect_ratio_black_bands(final_orig_pano)

        # Upscale and save to string
        final_pano_upscaled = self.upscale(final_pano_sized)
        final_pano_upscaled = PIL.Image.fromarray(final_pano_upscaled)
        # Add thin horizontal band to new image to get aspect ratio of 4
        final_pano_sized = Image.new(
            "RGB", (final_pano_upscaled.width, int(final_pano_upscaled.width / 3))
        )
        # Paste image in the middle of the new image
        final_pano_sized.paste(
            final_pano_upscaled,
            (0, (final_pano_sized.height - final_pano_upscaled.height) // 2),
        )
        final_pano_buffered = io.BytesIO()
        final_pano_sized.save(final_pano_buffered, format="JPEG")
        final_pano_str = base64.b64encode(final_pano_buffered.getvalue()).decode(
            "utf-8"
        )

        # Do the same for the original image
        final_orig_pano_upscaled = self.upscale(final_orig_pano_sized)
        final_orig_pano_upscaled = PIL.Image.fromarray(final_orig_pano_upscaled)
        # Add thin horizontal band to new image to get aspect ratio of 4
        final_orig_pano_sized = Image.new(
            "RGB",
            (final_orig_pano_upscaled.width, int(final_orig_pano_upscaled.width / 3)),
        )
        # Paste image in the middle of the new image
        final_orig_pano_sized.paste(
            final_orig_pano_upscaled,
            (0, (final_orig_pano_sized.height - final_orig_pano_upscaled.height) // 2),
        )
        final_orig_pano_buffered = io.BytesIO()
        final_orig_pano_sized.save(final_orig_pano_buffered, format="JPEG")
        orig_final_pano_str = base64.b64encode(
            final_orig_pano_buffered.getvalue()
        ).decode("utf-8")

        return {"image": final_pano_str, "original": orig_final_pano_str}
