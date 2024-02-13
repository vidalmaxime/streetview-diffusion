import base64
import numpy as np
import PIL.Image
import torch
from diffusers import AutoPipelineForImage2Image, AutoPipelineForInpainting
import math
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


class SDTask(Task):
    def __init__(self, base_model_path, google_key, inpainting_model_path, load_model=False):
        self.base_model_path = base_model_path
        self.google_key = google_key
        self.inpainting_model_path = inpainting_model_path

        self.load_model = load_model
        self.name = "sd"

        if self.load_model:
            self.i2i_pipe = self.load_i2i_pipe(self.base_model_path)
            self.i2i_pipe.enable_xformers_memory_efficient_attention()
            self.inp_pipe = AutoPipelineForInpainting.from_pretrained(self.inpainting_model_path, torch_dtype=torch.float16, variant="fp16").to("cuda")
            self.inp_pipe = self.inp_pipe.to("cuda")

    def load_i2i_pipe(self, base_model_path):
        torch_device = (
            torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
        )
        torch_dtype = torch.float16
        i2i_pipe = AutoPipelineForImage2Image.from_pretrained(
            base_model_path,
            safety_checker=None,
            torch_dtype=torch_dtype,
            variant="fp16" if torch_dtype == torch.float16 else "fp32",
        )
        i2i_pipe.to(device=torch_device, dtype=torch_dtype)
        i2i_pipe.set_progress_bar_config(disable=True)
        return i2i_pipe

    def predict_i2i(
        self,
        init_image,
        prompt,
        strength,
        steps,
        seed=1231231,
        guidance_scale=4.0,
    ):
        generator = torch.manual_seed(seed)

        if int(steps * strength) < 1:
            steps = math.ceil(1 / max(0.10, strength))

        results = self.i2i_pipe(
            prompt=prompt,
            image=init_image,
            generator=generator,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            strength=strength,
            width=600,
            height=600,
            output_type="pil",
        )
        return results.images
    
    def predict_inpainting(self, init_image, prompt, guidance_scale=4.0):
        mask_image = PIL.Image.new("RGB", init_image.size, (0, 0, 0))
        mask_image.paste((255, 255, 255), (init_image.width // 2 - 100, 0, init_image.width // 2 + 100, init_image.height))
        mask_image = mask_image.convert("RGB")
        negative_prompt = ""
        image = self.inp_pipe(prompt=prompt,
                        image=init_image,
                        mask_image=mask_image,
                        num_inference_steps=20,
                        strength=0.99,
                        guidance_scale=guidance_scale,
                        negative_prompt=negative_prompt).images[0]
        return image
    
    def split_half_images(self, images):
        half_images = []
        for img in images:
            half_images.append(img.crop((0, 0, img.width // 2, img.height)))
            half_images.append(img.crop((img.width // 2, 0, img.width, img.height)))
        return half_images
    
    def combine_images(self, half_images):
        # Combine half images into one but with a delta of 1
        combined_images = []
        for i in range(1, len(half_images) - 1, 2):
            combined_image =  Image.new("RGB", (half_images[i-1].width + half_images[i].width, half_images[i-1].height))
            combined_image.paste(half_images[i], (0, 0))
            combined_image.paste(half_images[i+1], (half_images[i-1].width, 0))
            combined_images.append(combined_image)

        # Combine last half with first half
        combined_image =  Image.new("RGB", (half_images[-1].width + half_images[0].width, half_images[-1].height))
        combined_image.paste(half_images[-1], (0, 0))
        combined_image.paste(half_images[0], (half_images[-1].width, 0))
        combined_images.append(combined_image)

        return combined_images
    
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
            alpha_output = self.post_process(self.inference(model_path, self.pre_process(alpha)))  # BGR
            alpha_output = cv2.cvtColor(alpha_output, cv2.COLOR_BGR2GRAY)  # GRAY

            img = img[:, :, 0:3]  # BGR
            image_output = self.post_process(self.inference(model_path, self.pre_process(img)))  # BGR
            image_output = cv2.cvtColor(image_output, cv2.COLOR_BGR2BGRA)  # BGRA
            image_output[:, :, 3] = alpha_output

        elif img.shape[2] == 3:
            image_output = self.post_process(self.inference(model_path, self.pre_process(img)))  # BGR

        return image_output

    def run(self, prompt, strength, steps, location, guidance_scale=4.0):
        all_orig = []
        all_output = []
        print("Starting streetview")
        angles = [0, 120, 240]
        for angle in angles:
            streetview_url = "https://maps.googleapis.com/maps/api/streetview?size={dimensions}&location={location}&fov=120&heading={heading}&key={key}"
            streetview_url = streetview_url.format(
                dimensions="600x600",
                location=location,
                heading=str(angle),
                key=self.google_key,
            )
            response = requests.get(streetview_url)
            img = Image.open(BytesIO(response.content))
            img = np.array(img)
            img = PIL.Image.fromarray(img)
            all_orig.append(img)
            output = self.predict_i2i(
                [img],
                [prompt],
                strength,
                steps,
                guidance_scale=guidance_scale,
            )[0]
            all_output.append(output)

        half_output_images = self.split_half_images(all_output)
        half_orig_images = self.split_half_images(all_orig)
        combined_output_images = self.combine_images(half_output_images)
        combined_orig_images = self.combine_images(half_orig_images)

        inpaint_images = []
        for img in combined_output_images:
            inpaint_images.append(self.predict_inpainting(img, prompt, guidance_scale=guidance_scale))
        
        final_image =  Image.new("RGB", (inpaint_images[0].width * len(inpaint_images), inpaint_images[0].height))
        for i, img in enumerate(inpaint_images):
            final_image.paste(img, (i * img.width, 0))
        
        # Upscale
        final_image = self.upscale(final_image)
        final_image = PIL.Image.fromarray(final_image)

        final_image_buffered = io.BytesIO()
        final_image.save(final_image_buffered, format="JPEG")
        final_image_str = base64.b64encode(final_image_buffered.getvalue()).decode("utf-8")

        orig_final_image =  Image.new("RGB", (combined_orig_images[0].width * len(combined_orig_images), combined_orig_images[0].height))
        for i, img in enumerate(combined_orig_images):
            orig_final_image.paste(img, (i * img.width, 0))

        # Upscale
        orig_final_image = self.upscale(orig_final_image)
        orig_final_image = PIL.Image.fromarray(orig_final_image)
        
        orig_final_image_buffered = io.BytesIO()
        orig_final_image.save(orig_final_image_buffered, format="JPEG")
        orig_final_image_str = base64.b64encode(orig_final_image_buffered.getvalue()).decode("utf-8")

        return {"image": final_image_str, "original": orig_final_image_str}
